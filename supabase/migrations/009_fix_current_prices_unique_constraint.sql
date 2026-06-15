-- ============================================================
-- App Price Radar — Migration 009
-- Fix unique constraints on current_prices and price_history,
-- and rewrite promote_verified_observations() to match.
--
-- Requirements:
--   1. current_prices unique on (app_id, country_code) / (app_id, country_code, plan_id)
--   2. price_history  unique on (app_id, country_code, snapshot_date) per plan branch
--   3. promote_verified_observations targets the correct partial index per branch
--   4. Existing data preserved — no DROP TABLE, no TRUNCATE
--
-- Safe to re-run: all DDL uses IF NOT EXISTS / IF EXISTS / CREATE OR REPLACE.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1: current_prices uniqueness
-- ────────────────────────────────────────────────────────────

-- Drop the original 2-column UNIQUE (app_id, country_code) from migration 001.
-- Found by shape rather than name (Supabase may auto-name it).
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'current_prices'::regclass
    and contype  = 'u'
    and array_length(conkey, 1) = 2
  limit 1;

  if v_conname is not null then
    execute format('alter table current_prices drop constraint %I', v_conname);
    raise notice 'Dropped current_prices constraint: %', v_conname;
  else
    raise notice 'No 2-column unique constraint on current_prices (already removed or never existed).';
  end if;
end;
$$;

-- Two partial unique indexes handle nullable plan_id correctly.
-- A single index on (app_id, country_code, plan_id) would allow duplicate
-- null-plan rows because NULL != NULL in PostgreSQL unique indexes.

create unique index if not exists uq_current_prices_no_plan
  on current_prices (app_id, country_code)
  where plan_id is null;

create unique index if not exists uq_current_prices_with_plan
  on current_prices (app_id, country_code, plan_id)
  where plan_id is not null;

-- ────────────────────────────────────────────────────────────
-- SECTION 2: price_history snapshot_date column + uniqueness
-- ────────────────────────────────────────────────────────────
--
-- date_trunc() inside a unique index expression is rejected by PostgreSQL
-- (ERROR 42P17: functions in index expression must be marked IMMUTABLE).
-- Solution: add a plain date column snapshot_date, backfill it, then index on it.

alter table price_history
  add column if not exists snapshot_date date;

-- Backfill existing rows from recorded_at (cast is immutable).
update price_history
set snapshot_date = recorded_at::date
where snapshot_date is null;

-- Make snapshot_date non-nullable going forward.
alter table price_history
  alter column snapshot_date set not null,
  alter column snapshot_date set default current_date;

-- Unique partial indexes — same two-branch pattern as current_prices.
create unique index if not exists uq_price_history_no_plan_day
  on price_history (app_id, country_code, snapshot_date)
  where plan_id is null;

create unique index if not exists uq_price_history_with_plan_day
  on price_history (app_id, country_code, plan_id, snapshot_date)
  where plan_id is not null;

-- ────────────────────────────────────────────────────────────
-- SECTION 3: promote_verified_observations() rewrite
-- ────────────────────────────────────────────────────────────
--
-- Migration 007 used ON CONFLICT (app_id, country_code), which targeted
-- the old 2-column constraint that no longer exists after Section 1.
-- This version branches on plan_id nullability so each ON CONFLICT clause
-- references the correct partial index.

create or replace function promote_verified_observations()
returns table(promoted int, skipped_manual_lock int, skipped_manual_seed int)
language plpgsql as $$
declare
  v_promoted   int := 0;
  v_skip_lock  int := 0;
  v_skip_seed  int := 0;
  obs price_observations%rowtype;
begin
  for obs in
    select * from price_observations
    where observation_status = 'verified'
      and manual_lock = false
    order by observed_at
  loop
    -- Skip if the live price for this app×country×plan is protected manual_seed.
    if exists (
      select 1 from current_prices cp
      where cp.app_id       = obs.app_id
        and cp.country_code = obs.country_code
        and (
              (obs.plan_id is null     and cp.plan_id is null) or
              (obs.plan_id is not null and cp.plan_id = obs.plan_id)
            )
        and cp.source_type = 'manual_seed'
    ) then
      v_skip_seed := v_skip_seed + 1;
      update price_observations set observation_status = 'stale' where id = obs.id;
      continue;
    end if;

    if obs.plan_id is null then
      -- Targets: uq_current_prices_no_plan (app_id, country_code) WHERE plan_id IS NULL
      insert into current_prices
        (app_id, country_code, plan_id, price, currency, updated_at,
         source_type, source_name, source_url, confidence_level, last_verified_at)
      values
        (obs.app_id, obs.country_code, null, obs.price, obs.currency, now(),
         obs.source_type, obs.source_type, obs.source_url, obs.confidence_level, now())
      on conflict (app_id, country_code) where plan_id is null
      do update set
        price            = excluded.price,
        currency         = excluded.currency,
        updated_at       = excluded.updated_at,
        source_type      = excluded.source_type,
        source_name      = excluded.source_name,
        source_url       = excluded.source_url,
        confidence_level = excluded.confidence_level,
        last_verified_at = excluded.last_verified_at
      where current_prices.source_type != 'manual_seed';
    else
      -- Targets: uq_current_prices_with_plan (app_id, country_code, plan_id) WHERE plan_id IS NOT NULL
      insert into current_prices
        (app_id, country_code, plan_id, price, currency, updated_at,
         source_type, source_name, source_url, confidence_level, last_verified_at)
      values
        (obs.app_id, obs.country_code, obs.plan_id, obs.price, obs.currency, now(),
         obs.source_type, obs.source_type, obs.source_url, obs.confidence_level, now())
      on conflict (app_id, country_code, plan_id) where plan_id is not null
      do update set
        price            = excluded.price,
        currency         = excluded.currency,
        updated_at       = excluded.updated_at,
        source_type      = excluded.source_type,
        source_name      = excluded.source_name,
        source_url       = excluded.source_url,
        confidence_level = excluded.confidence_level,
        last_verified_at = excluded.last_verified_at
      where current_prices.source_type != 'manual_seed';
    end if;

    update price_observations set observation_status = 'stale' where id = obs.id;
    v_promoted := v_promoted + 1;
  end loop;

  return query select v_promoted, v_skip_lock, v_skip_seed;
end;
$$;

comment on column price_history.snapshot_date is
  'UTC date of this snapshot row. Used for day-level unique constraint.';

comment on function promote_verified_observations is
  'Promotes verified price_observations into current_prices. '
  'Uses two ON CONFLICT branches targeting the correct partial unique index '
  'for rows with and without plan_id. Protects manual_seed rows.';
