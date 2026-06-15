-- ============================================================
-- App Price Radar — Migration 011
-- Feature collection infrastructure for post-launch learning
--
-- What this migration does:
--   1. Adds UPDATE RLS policies on analytics tables
--      (migration 010 only added INSERT — UPDATE is needed for
--      back-filling target_clicks_7d / target_impressions_30d
--      once observation windows close).
--   2. Creates create_training_snapshot(snapshot_date date)
--      — a SQL function that creates one scoring_training_examples
--      row per active app×country pair for the given date using
--      only data available at or before that date (no look-ahead).
--   3. Creates backfill_target_labels()
--      — a SQL function that closes observation windows and
--      derives labels for rows whose window_end has passed and
--      page_metrics / search_console_metrics data is available.
--
-- Does NOT modify: current_prices, UI, crawl logic.
-- Does NOT implement: ML training, automatic weight updates.
-- Safe to re-run: all DDL uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1: UPDATE RLS policies for analytics tables
-- ────────────────────────────────────────────────────────────
-- Required so the weekly target back-fill job can write
-- target_clicks_7d, target_impressions_30d, and label.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'service role update scoring_training_examples'
      and tablename = 'scoring_training_examples'
  ) then
    create policy "service role update scoring_training_examples"
      on scoring_training_examples for update to service_role using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'service role update page_metrics'
      and tablename = 'page_metrics'
  ) then
    create policy "service role update page_metrics"
      on page_metrics for update to service_role using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'service role update search_console_metrics'
      and tablename = 'search_console_metrics'
  ) then
    create policy "service role update search_console_metrics"
      on search_console_metrics for update to service_role using (true);
  end if;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- SECTION 2: create_training_snapshot(snapshot_date)
-- ────────────────────────────────────────────────────────────
--
-- Creates one scoring_training_examples row per app×country pair
-- for the given snapshot_date. All feature values are read from
-- data that existed at or before snapshot_date — no look-ahead.
--
-- Feature sourcing:
--   inclusion_score, demand/savings/coverage/market_score
--     → inclusion_scores (static; does not vary by date)
--   app_score, country_score
--     → app_scores, country_scores (static)
--   price_usd
--     → price_history row closest to snapshot_date
--       (falls back to current_prices if no history row exists)
--   price_delta_pct_30d
--     → (price_on_date − price_30_days_prior) / price_30_days_prior
--   source_type_encoded, confidence_level_encoded
--     → current_prices.source_type / confidence_level at snapshot time
--       (via price_history if available)
--   prev_views_7d, prev_clicks_7d
--     → sum of page_metrics.views/clicks in [snapshot_date-7, snapshot_date-1]
--   prev_impressions_30d, avg_position_30d
--     → aggregated search_console_metrics in [snapshot_date-30, snapshot_date-1]
--   is_default_plan
--     → 1 if plan_id IS NULL or plans.is_default = true
--   billing_period_encoded
--     → monthly=3, annual=2, one_time=1, free=0
--
-- Observation window:
--   window_start = snapshot_date
--   window_end   = snapshot_date + 7  (targets collected after this date)
--
-- Returns: count of rows inserted.

create or replace function create_training_snapshot(p_snapshot_date date)
returns int
language plpgsql
security definer
as $$
declare
  v_inserted int := 0;
begin
  insert into scoring_training_examples (
    app_id, country_code, plan_id, features,
    observation_window_start, observation_window_end
  )
  select
    i.app_id,
    i.country_code,
    null::text as plan_id,

    jsonb_build_object(
      -- CPS component scores
      'inclusion_score',    i.score,
      'demand_score',       i.demand_score,
      'savings_score',      i.savings_score,
      'coverage_score',     i.coverage_score,
      'market_score',       i.market_score,

      -- Per-app and per-country scores
      'app_score',          coalesce(a.score, 0),
      'country_score',      coalesce(c.score, 0),

      -- Price at snapshot time (from price_history or current_prices)
      'price_usd',          coalesce(
                              ph_snap.price_usd,
                              cp.price * coalesce(er.rate_to_usd, 1)
                            ),

      -- 30-day price change
      'price_delta_pct_30d', case
        when ph_30.price_usd > 0 and ph_snap.price_usd is not null
          then round(
            ((ph_snap.price_usd - ph_30.price_usd) / ph_30.price_usd * 100)::numeric, 2
          )
        else 0
      end,

      -- Source quality encoding: itunes_lookup=2, manual_seed=1, community=0
      'source_type_encoded', case cp.source_type
        when 'itunes_lookup' then 2
        when 'manual_seed'   then 1
        else 0
      end,

      -- Confidence encoding: high=2, medium=1, low=0
      'confidence_level_encoded', case cp.confidence_level
        when 'high'   then 2
        when 'medium' then 1
        else 0
      end,

      -- On-site engagement in prior 7 days
      'prev_views_7d',  coalesce(pm.views,  0),
      'prev_clicks_7d', coalesce(pm.clicks, 0),

      -- Search Console signals in prior 30 days
      'prev_impressions_30d', coalesce(gsc.impressions, 0),
      'avg_position_30d',     coalesce(gsc.avg_position, 0),

      -- Plan metadata
      'is_default_plan',        1,  -- null plan_id rows represent default/app-level price
      'billing_period_encoded', coalesce(
        (select case pl.billing_period
           when 'monthly'  then 3
           when 'annual'   then 2
           when 'one_time' then 1
           else 0
         end
         from plans pl
         where pl.app_id = i.app_id and pl.is_default = true
         limit 1),
        3  -- default to monthly if no plan record
      )
    ),

    p_snapshot_date,
    p_snapshot_date + 7

  from inclusion_scores i

  -- App-level score
  left join app_scores a on a.app_id = i.app_id

  -- Country-level score
  left join country_scores c on c.country_code = i.country_code

  -- Live price (used for source_type / confidence)
  left join current_prices cp
    on cp.app_id = i.app_id
   and cp.country_code = i.country_code
   and cp.plan_id is null

  -- Exchange rate for live price
  left join exchange_rates er on er.currency = cp.currency

  -- Price at snapshot date (closest price_history row on or before p_snapshot_date)
  left join lateral (
    select round((ph.price * er2.rate_to_usd)::numeric, 4) as price_usd
    from price_history ph
    left join exchange_rates er2 on er2.currency = ph.currency
    where ph.app_id = i.app_id
      and ph.country_code = i.country_code
      and ph.plan_id is null
      and ph.snapshot_date <= p_snapshot_date
    order by ph.snapshot_date desc
    limit 1
  ) ph_snap on true

  -- Price 30 days prior (for delta calc)
  left join lateral (
    select round((ph.price * er2.rate_to_usd)::numeric, 4) as price_usd
    from price_history ph
    left join exchange_rates er2 on er2.currency = ph.currency
    where ph.app_id = i.app_id
      and ph.country_code = i.country_code
      and ph.plan_id is null
      and ph.snapshot_date <= (p_snapshot_date - 30)
    order by ph.snapshot_date desc
    limit 1
  ) ph_30 on true

  -- On-site engagement: views + clicks in prior 7 days
  left join lateral (
    select
      sum(pm2.views)  as views,
      sum(pm2.clicks) as clicks
    from page_metrics pm2
    where pm2.app_id = i.app_id
      and pm2.date >= (p_snapshot_date - 7)
      and pm2.date <  p_snapshot_date
  ) pm on true

  -- GSC signals: impressions + position in prior 30 days
  left join lateral (
    select
      sum(g.impressions)         as impressions,
      round(avg(g.position)::numeric, 2) as avg_position
    from search_console_metrics g
    where g.page_url = '/apps/' || i.app_id
      and g.date >= (p_snapshot_date - 30)
      and g.date <  p_snapshot_date
  ) gsc on true

  -- Skip pairs with no price data at all
  where cp.price is not null or ph_snap.price_usd is not null

  on conflict (app_id, country_code, observation_window_start)
    where plan_id is null
  do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

comment on function create_training_snapshot(date) is
  'Creates scoring_training_examples rows for one snapshot date. '
  'Features are assembled from data available at or before that date. '
  'Safe to re-run — ON CONFLICT DO NOTHING. '
  'Run weekly via scripts/create-training-examples.ts.';

-- ────────────────────────────────────────────────────────────
-- SECTION 3: backfill_target_labels()
-- ────────────────────────────────────────────────────────────
--
-- Closes observation windows whose window_end has passed.
-- For each unlabelled row where window_end < today:
--   1. Aggregates target_clicks_7d from page_metrics
--   2. Aggregates target_impressions_30d from search_console_metrics
--   3. Derives label:
--        high   — clicks_7d >= 10 OR impressions_30d >= 500
--        low    — clicks_7d <  3  AND impressions_30d < 100
--        medium — everything else
--   4. Sets targets_collected_at = now()
--
-- Returns count of rows labelled.

create or replace function backfill_target_labels()
returns int
language plpgsql
security definer
as $$
declare
  v_labelled int := 0;
begin
  update scoring_training_examples ste
  set
    target_clicks_7d = coalesce((
      select sum(pm.clicks)
      from page_metrics pm
      where pm.app_id = ste.app_id
        and pm.date >= ste.observation_window_start
        and pm.date <  ste.observation_window_end
    ), 0),

    target_impressions_30d = coalesce((
      select sum(g.impressions)
      from search_console_metrics g
      where g.page_url = '/apps/' || ste.app_id
        and g.date >= ste.observation_window_start
        and g.date <  (ste.observation_window_start + 30)
    ), 0),

    label = case
      when
        coalesce((
          select sum(pm.clicks) from page_metrics pm
          where pm.app_id = ste.app_id
            and pm.date >= ste.observation_window_start
            and pm.date <  ste.observation_window_end
        ), 0) >= 10
        or
        coalesce((
          select sum(g.impressions) from search_console_metrics g
          where g.page_url = '/apps/' || ste.app_id
            and g.date >= ste.observation_window_start
            and g.date <  (ste.observation_window_start + 30)
        ), 0) >= 500
      then 'high'
      when
        coalesce((
          select sum(pm.clicks) from page_metrics pm
          where pm.app_id = ste.app_id
            and pm.date >= ste.observation_window_start
            and pm.date <  ste.observation_window_end
        ), 0) < 3
        and
        coalesce((
          select sum(g.impressions) from search_console_metrics g
          where g.page_url = '/apps/' || ste.app_id
            and g.date >= ste.observation_window_start
            and g.date <  (ste.observation_window_start + 30)
        ), 0) < 100
      then 'low'
      else 'medium'
    end,

    targets_collected_at = now()

  where ste.label is null
    and ste.observation_window_end < current_date;

  get diagnostics v_labelled = row_count;
  return v_labelled;
end;
$$;

comment on function backfill_target_labels() is
  'Closes open observation windows and derives labels for '
  'scoring_training_examples rows where window_end has passed. '
  'Label rules: high if clicks_7d>=10 or impressions_30d>=500; '
  'low if clicks_7d<3 and impressions_30d<100; medium otherwise. '
  'Run weekly via scripts/create-training-examples.ts after creating new snapshots.';
