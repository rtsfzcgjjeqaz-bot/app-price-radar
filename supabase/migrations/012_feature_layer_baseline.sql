-- ============================================================
-- App Price Radar — Migration 012
-- Phase 1.5 Feature Layer Baseline
--
-- Creates four feature tables that store derived, pre-launch
-- baseline features for the AIS, CIS, and CPS scoring models.
-- All features are computed from data already in the database
-- (apps, plans, countries, current_prices, price_history,
-- exchange_rates, crawl_jobs, price_observations).
--
-- No ML. No training targets. No page_metrics.
-- No search_console_metrics. No scoring_training_examples.
--
-- Tables created:
--   app_features     — per-app supply-side signals
--   country_features — per-country pricing signals
--   crawl_features   — per app×country crawl quality signals
--   feature_history  — append-only daily snapshots of all three
--
-- Refresh pattern:
--   scripts/backfill-scoring-features.ts recomputes all three
--   tables from scratch and writes a feature_history snapshot.
--   Run once manually after this migration, then daily via CI.
--
-- Safe to re-run: all DDL uses IF NOT EXISTS.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE 1: app_features
-- ────────────────────────────────────────────────────────────
--
-- One row per tracked app. Derived from:
--   apps, plans, current_prices, price_history, price_observations
--
create table if not exists app_features (
  app_id                    text         primary key references apps(id) on delete cascade,

  -- Plan supply
  plan_count                int          not null default 0,
    -- total plans in plans table for this app
  has_default_plan          boolean      not null default false,
    -- true if at least one plan has is_default = true
  default_billing_period    text         not null default 'unknown'
                                         check (default_billing_period in
                                           ('monthly','annual','one_time','free','unknown')),
    -- billing_period of the is_default plan; 'unknown' if no plans

  -- Price coverage (how many countries have a price row)
  countries_with_price      int          not null default 0,
    -- count of distinct country_codes in current_prices where plan_id is null
  price_coverage_pct        numeric(5,2) not null default 0,
    -- countries_with_price / 20 × 100
  countries_with_plan_price int          not null default 0,
    -- count of distinct country_codes in current_prices where plan_id is not null

  -- Price levels (USD, default/null plan only)
  price_usd_us              numeric(10,4),
    -- current_prices price × rate_to_usd for country_code = 'US'
  price_usd_min             numeric(10,4),
    -- cheapest USD price across all countries
  price_usd_max             numeric(10,4),
    -- most expensive USD price across all countries
  price_usd_range           numeric(10,4),
    -- price_usd_max - price_usd_min (absolute savings potential)

  -- Data quality
  source_type_mix           jsonb        not null default '{}',
    -- {manual_seed: N, itunes_lookup: N, community: N}
  manual_seed_pct           numeric(5,2) not null default 0,
    -- % of price rows that are manual_seed (higher = less automated coverage)
  avg_confidence            numeric(5,2) not null default 0,
    -- mean of (high=2, medium=1, low=0) × 50 mapped to 0–100
  days_since_any_verification numeric(8,2) not null default 9999,
    -- days since max(last_verified_at) across all price rows for this app

  -- Price history signals
  history_row_count         int          not null default 0,
    -- total price_history rows for this app (all countries)
  price_changed_30d         boolean      not null default false,
    -- true if any country had a price change in the last 30 days in price_history
  max_delta_pct_30d         numeric(8,2) not null default 0,
    -- largest absolute price_delta_pct across any country in the last 30 days

  -- Crawl pipeline signals
  crawl_jobs_total          int          not null default 0,
  crawl_jobs_done           int          not null default 0,
  crawl_jobs_failed         int          not null default 0,
  crawl_success_rate        numeric(5,2) not null default 0,
    -- crawl_jobs_done / crawl_jobs_total × 100; 0 if no jobs

  -- Observation quality (price_observations)
  observations_total        int          not null default 0,
  observations_verified     int          not null default 0,
  observations_rejected     int          not null default 0,
  observation_rejection_rate numeric(5,2) not null default 0,
    -- observations_rejected / observations_total × 100

  computed_at               timestamptz  not null default now(),
  unique (app_id)  -- enforce via PK, explicit for clarity
);

create index if not exists idx_app_features_coverage
  on app_features(price_coverage_pct desc);

create index if not exists idx_app_features_staleness
  on app_features(days_since_any_verification);

create index if not exists idx_app_features_computed_at
  on app_features(computed_at desc);

alter table app_features enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'public read app_features'
  ) then
    create policy "public read app_features"
      on app_features for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where policyname = 'service role write app_features'
  ) then
    create policy "service role write app_features"
      on app_features for all to service_role using (true) with check (true);
  end if;
end;
$$;

comment on table  app_features is
  'Pre-launch baseline feature vector per app. Derived from apps, plans, current_prices, price_history, price_observations, crawl_jobs. Refreshed daily by backfill-scoring-features.ts.';
comment on column app_features.price_coverage_pct is
  'Fraction of 20 tracked countries that have a current price. 100 = full coverage.';
comment on column app_features.manual_seed_pct is
  'Fraction of price rows that are manually curated (not auto-crawled). High value = fragile coverage.';
comment on column app_features.days_since_any_verification is
  'Days since the most recently verified price row for this app. 9999 = never verified.';
comment on column app_features.crawl_success_rate is
  'Fraction of crawl_jobs that completed successfully. 0 if no jobs exist for this app.';

-- ────────────────────────────────────────────────────────────
-- TABLE 2: country_features
-- ────────────────────────────────────────────────────────────
--
-- One row per tracked country. Derived from:
--   countries, current_prices, price_history, exchange_rates
--
create table if not exists country_features (
  country_code              char(2)      primary key references countries(code) on delete cascade,

  -- Price coverage
  apps_with_price           int          not null default 0,
    -- count of distinct app_ids in current_prices for this country (plan_id is null)
  price_coverage_pct        numeric(5,2) not null default 0,
    -- apps_with_price / 85 × 100

  -- Savings vs US baseline (computed from current_prices)
  avg_price_usd             numeric(10,4),
    -- mean USD price across all apps with a price in this country
  us_avg_price_usd          numeric(10,4),
    -- reference: mean USD price across the same apps in the US
  savings_vs_us_pct         numeric(8,2) not null default 0,
    -- (us_avg - country_avg) / us_avg × 100; negative = more expensive than US
  apps_cheaper_than_us      int          not null default 0,
    -- count of apps where this country's price < US price
  apps_cheaper_pct          numeric(5,2) not null default 0,
    -- apps_cheaper_than_us / apps_with_price × 100

  -- Data quality
  source_type_mix           jsonb        not null default '{}',
  manual_seed_pct           numeric(5,2) not null default 0,
  avg_confidence            numeric(5,2) not null default 0,
  days_since_any_verification numeric(8,2) not null default 9999,

  -- Price volatility (from price_history)
  history_row_count         int          not null default 0,
  price_changes_30d         int          not null default 0,
    -- count of apps in this country with any price change in last 30 days
  avg_delta_pct_30d         numeric(8,2) not null default 0,
    -- mean absolute price_delta_pct across all price_observations
    -- for this country in the last 30 days

  -- Currency
  currency                  char(3)      not null default '',
  rate_to_usd               numeric(18,8),
  rate_to_cny               numeric(18,8),

  computed_at               timestamptz  not null default now()
);

create index if not exists idx_country_features_savings
  on country_features(savings_vs_us_pct desc);

create index if not exists idx_country_features_coverage
  on country_features(price_coverage_pct desc);

create index if not exists idx_country_features_computed_at
  on country_features(computed_at desc);

alter table country_features enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'public read country_features'
  ) then
    create policy "public read country_features"
      on country_features for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where policyname = 'service role write country_features'
  ) then
    create policy "service role write country_features"
      on country_features for all to service_role using (true) with check (true);
  end if;
end;
$$;

comment on table  country_features is
  'Pre-launch baseline feature vector per country. Derived from countries, current_prices, price_history, exchange_rates. Refreshed daily.';
comment on column country_features.savings_vs_us_pct is
  'Mean price saving vs US across all tracked apps. Positive = cheaper than US. Derived from current_prices.';
comment on column country_features.avg_delta_pct_30d is
  'Mean absolute price change across price_observations for this country in the last 30 days. Proxy for currency/pricing volatility.';

-- ────────────────────────────────────────────────────────────
-- TABLE 3: crawl_features
-- ────────────────────────────────────────────────────────────
--
-- One row per app×country pair. Derived from:
--   crawl_jobs, price_observations, current_prices
--
create table if not exists crawl_features (
  id                        bigserial    primary key,
  app_id                    text         not null references apps(id) on delete cascade,
  country_code              char(2)      not null references countries(code) on delete cascade,

  -- Most recent completed crawl job
  last_crawl_status         text         not null default 'never'
                                         check (last_crawl_status in
                                           ('never','done','failed','skipped','pending','running')),
  last_crawl_at             timestamptz,
    -- completed_at of the most recent crawl_job for this pair
  days_since_last_crawl     numeric(8,2) not null default 9999,
    -- null last_crawl_at → 9999

  -- Crawl reliability
  total_crawl_attempts      int          not null default 0,
  successful_crawls         int          not null default 0,
  failed_crawls             int          not null default 0,
  crawl_success_rate        numeric(5,2) not null default 0,
  max_retry_count           int          not null default 0,
    -- max retry_count across all jobs for this pair (signals problematic pairs)

  -- Most recent observation
  last_observation_status   text
                                         check (last_observation_status in
                                           ('pending','verified','rejected','stale')),
  last_observation_at       timestamptz,
  last_confidence_level     text
                                         check (last_confidence_level in ('high','medium','low')),
  last_price_delta_pct      numeric(8,4),
    -- price_delta_pct from the most recent observation (null if no observations)

  -- Observation history for this pair
  total_observations        int          not null default 0,
  verified_observations     int          not null default 0,
  rejected_observations     int          not null default 0,
  pending_observations      int          not null default 0,
    -- pending = flagged for manual review (confidence=low, delta > 50%)
  observation_reject_rate   numeric(5,2) not null default 0,

  -- Current price state
  has_current_price         boolean      not null default false,
  current_source_type       text,
  current_confidence        text,
  current_last_verified_at  timestamptz,
  days_since_verification   numeric(8,2) not null default 9999,

  computed_at               timestamptz  not null default now(),

  unique (app_id, country_code)
);

create index if not exists idx_crawl_features_app_id
  on crawl_features(app_id);

create index if not exists idx_crawl_features_country_code
  on crawl_features(country_code);

create index if not exists idx_crawl_features_staleness
  on crawl_features(days_since_last_crawl desc);

create index if not exists idx_crawl_features_pending_obs
  on crawl_features(pending_observations desc)
  where pending_observations > 0;

create index if not exists idx_crawl_features_computed_at
  on crawl_features(computed_at desc);

alter table crawl_features enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'public read crawl_features'
  ) then
    create policy "public read crawl_features"
      on crawl_features for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where policyname = 'service role write crawl_features'
  ) then
    create policy "service role write crawl_features"
      on crawl_features for all to service_role using (true) with check (true);
  end if;
end;
$$;

comment on table  crawl_features is
  'Per app×country crawl and observation quality signals. Derived from crawl_jobs, price_observations, current_prices. Refreshed daily.';
comment on column crawl_features.days_since_last_crawl is
  '9999 = never crawled. Used to prioritise stale pairs in crawl scheduling.';
comment on column crawl_features.pending_observations is
  'Observations with confidence=low flagged for manual review. Positive value requires human action.';
comment on column crawl_features.observation_reject_rate is
  'Fraction of observations rejected (price=0, manual_seed block, outlier). High value signals a problematic app×country pair.';

-- ────────────────────────────────────────────────────────────
-- TABLE 4: feature_history
-- ────────────────────────────────────────────────────────────
--
-- Append-only daily snapshots of all three feature tables.
-- Stores a JSONB snapshot so the schema can evolve without
-- requiring backfill of historical rows.
--
-- entity_type: 'app' | 'country' | 'crawl_pair'
-- entity_id:
--   app         → apps.id
--   country     → countries.code
--   crawl_pair  → '{app_id}:{country_code}'
--
create table if not exists feature_history (
  id              bigserial    primary key,
  entity_type     text         not null
                               check (entity_type in ('app','country','crawl_pair')),
  entity_id       text         not null,
  snapshot_date   date         not null default current_date,
  features        jsonb        not null default '{}',
  computed_at     timestamptz  not null default now()
);

create index if not exists idx_feature_history_entity
  on feature_history(entity_type, entity_id, snapshot_date desc);

create index if not exists idx_feature_history_date
  on feature_history(snapshot_date desc);

create index if not exists idx_feature_history_features
  on feature_history using gin(features);

-- One snapshot per entity per day
create unique index if not exists uq_feature_history_entity_day
  on feature_history(entity_type, entity_id, snapshot_date);

alter table feature_history enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'public read feature_history'
  ) then
    create policy "public read feature_history"
      on feature_history for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where policyname = 'service role write feature_history'
  ) then
    create policy "service role write feature_history"
      on feature_history for all to service_role using (true) with check (true);
  end if;
end;
$$;

comment on table  feature_history is
  'Append-only daily snapshots of app_features, country_features, and crawl_features. One row per entity per day. JSONB schema evolves without needing historical backfill.';
comment on column feature_history.entity_id is
  'For app: apps.id. For country: countries.code. For crawl_pair: "{app_id}:{country_code}".';
comment on column feature_history.features is
  'Full feature row as JSONB at snapshot_date. Keys match the source table columns.';
