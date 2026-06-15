-- ============================================================
-- App Price Radar — Migration 010
-- LightGBM Scoring Framework: config tables + RLS for analytics
--
-- What this migration does:
--   1. Creates scoring_config — stores named weight/threshold
--      vectors for all four scoring models (AIS, CIS, CPS, VP).
--      Default static weights match current gen-scores.js values.
--   2. Creates scoring_model_registry — tracks the active config
--      version per model, enabling Phase 3 ML weight swap-in.
--   3. Seeds the default static weight configs for all four models.
--   4. Adds INSERT RLS policies for page_metrics and
--      search_console_metrics (required before anaaalytics ingestion).
--   5. Fixes scoring_training_examples unique constraint to include
--      plan_id (was missing from migration 008).
--
-- Does NOT modify: current_prices, UI, crawler logic.
-- Does NOT implement: automatic weight learning.
-- Safe to re-run: all DDL uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SECTION 1: scoring_config
-- ────────────────────────────────────────────────────────────
--
-- Stores named versioned weight+threshold vectors for each scoring
-- model. The weights JSONB column holds model-specific fields;
-- the thresholds JSONB column holds tier cutoff values.
--
-- model_type values:
--   ais  — App Inclusion Score (app_scores table)
--   cis  — Country Inclusion Score (country_scores table)
--   cps  — Combined Pair Score (inclusion_scores table)
--   vp   — Verification Priority (price_observations delta logic)
--
-- source values:
--   static   — hand-tuned weights (current state)
--   lightgbm — future learned weights from scoring_training_examples
--
create table if not exists scoring_config (
  id              bigserial    primary key,

  -- Which scoring model this config applies to
  model_type      text         not null
                               check (model_type in ('ais','cis','cps','vp')),

  -- Human label for this version, e.g. 'static-v1', 'lgbm-2026-07-01'
  version_label   text         not null,

  -- How these weights were produced
  source          text         not null default 'static'
                               check (source in ('static','lightgbm','xgboost','manual')),

  -- Weight vector — model-specific keys, all values 0.0–1.0
  -- AIS  keys: w_popularity, w_category, w_price_range, w_coverage
  -- CIS  keys: w_savings_potential, w_market_size, w_data_quality, w_user_demand
  -- CPS  keys: w_demand, w_savings, w_coverage, w_market
  -- VP   keys: max_delta_pct (threshold, not a weight)
  weights         jsonb        not null default '{}',

  -- Tier thresholds — score cutoffs that determine label
  -- Standard keys: critical, high, medium (low = below medium)
  thresholds      jsonb        not null default '{"critical":80,"high":60,"medium":40}',

  -- Provenance / audit
  notes           text         not null default '',
  trained_at      timestamptz,          -- null for static configs
  training_rows   int,                  -- number of labelled examples used, if ML
  eval_accuracy   numeric(6,4),         -- held-out accuracy, if ML
  created_at      timestamptz  not null default now(),
  created_by      text         not null default 'migration',

  unique (model_type, version_label)
);

create index if not exists idx_scoring_config_model_type
  on scoring_config(model_type);

create index if not exists idx_scoring_config_source
  on scoring_config(model_type, source, created_at desc);

alter table scoring_config enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'public read scoring_config' and tablename = 'scoring_config'
  ) then
    create policy "public read scoring_config"
      on scoring_config for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where policyname = 'service role write scoring_config' and tablename = 'scoring_config'
  ) then
    create policy "service role write scoring_config"
      on scoring_config for all to service_role using (true) with check (true);
  end if;
end;
$$;

comment on table  scoring_config            is 'Versioned weight/threshold configs for each scoring model. One active row per model_type points to scoring_model_registry.';
comment on column scoring_config.model_type is 'ais=App Inclusion Score | cis=Country Inclusion Score | cps=Combined Pair Score | vp=Verification Priority';
comment on column scoring_config.source     is 'static=hand-tuned | lightgbm/xgboost=learned from scoring_training_examples';
comment on column scoring_config.weights    is 'Model-specific weight vector. Keys vary by model_type — see migration comment for per-model key specs.';
comment on column scoring_config.thresholds is 'Tier cutoff values. Standard keys: critical (≥80), high (≥60), medium (≥40). low = below medium.';

-- ────────────────────────────────────────────────────────────
-- SECTION 2: scoring_model_registry
-- ────────────────────────────────────────────────────────────
--
-- One row per model_type. Points to the currently active
-- scoring_config. Swapping the active_config_id is the only
-- change needed to promote a new LightGBM weight set.
--
create table if not exists scoring_model_registry (
  model_type        text         primary key
                                 check (model_type in ('ais','cis','cps','vp')),

  -- FK to the currently active config
  active_config_id  bigint       references scoring_config(id) on delete restrict,

  -- When this registry entry was last updated
  activated_at      timestamptz  not null default now(),
  activated_by      text         not null default 'migration',

  -- Free-text description of what changed
  change_notes      text         not null default ''
);

alter table scoring_model_registry enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'public read scoring_model_registry' and tablename = 'scoring_model_registry'
  ) then
    create policy "public read scoring_model_registry"
      on scoring_model_registry for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where policyname = 'service role write scoring_model_registry' and tablename = 'scoring_model_registry'
  ) then
    create policy "service role write scoring_model_registry"
      on scoring_model_registry for all to service_role using (true) with check (true);
  end if;
end;
$$;

comment on table  scoring_model_registry                  is 'One row per scoring model. Points to the active scoring_config. To deploy new ML weights: insert a new scoring_config row, then update active_config_id here.';
comment on column scoring_model_registry.active_config_id is 'FK to scoring_config. Changing this is the only step needed to activate new weights.';

-- ────────────────────────────────────────────────────────────
-- SECTION 3: Seed default static weight configs
-- ────────────────────────────────────────────────────────────
--
-- Values are transcribed directly from scripts/gen-scores.js
-- and scripts/crawl-itunes.ts so the database is the single
-- source of truth going forward.

-- AIS — App Inclusion Score
-- score = 0.40*popularity + 0.25*category + 0.20*price_range + 0.15*coverage
insert into scoring_config
  (model_type, version_label, source, weights, thresholds, notes, created_by)
values (
  'ais',
  'static-v1',
  'static',
  '{
    "w_popularity":   0.40,
    "w_category":     0.25,
    "w_price_range":  0.20,
    "w_coverage":     0.15
  }',
  '{"critical": 80, "high": 60, "medium": 40}',
  'Hand-tuned. popularity=global demand proxy; category=strategic value; price_range=savings potential; coverage=country completeness.',
  'migration_010'
)
on conflict (model_type, version_label) do nothing;

-- CIS — Country Inclusion Score
-- score = 0.35*savings_potential + 0.30*market_size + 0.20*data_quality + 0.15*user_demand
insert into scoring_config
  (model_type, version_label, source, weights, thresholds, notes, created_by)
values (
  'cis',
  'static-v1',
  'static',
  '{
    "w_savings_potential": 0.35,
    "w_market_size":       0.30,
    "w_data_quality":      0.20,
    "w_user_demand":       0.15
  }',
  '{"critical": 80, "high": 60, "medium": 40}',
  'Hand-tuned. savings_potential=% cheaper than US; market_size=App Store user base; data_quality=currency stability; user_demand=inferred query volume.',
  'migration_010'
)
on conflict (model_type, version_label) do nothing;

-- CPS — Combined Pair Score (app×country inclusion_scores)
-- score = 0.35*demand + 0.30*savings + 0.20*coverage + 0.15*market
insert into scoring_config
  (model_type, version_label, source, weights, thresholds, notes, created_by)
values (
  'cps',
  'static-v1',
  'static',
  '{
    "w_demand":   0.35,
    "w_savings":  0.30,
    "w_coverage": 0.20,
    "w_market":   0.15
  }',
  '{"critical": 80, "high": 60, "medium": 40}',
  'Hand-tuned. demand≈app popularity; savings=country savings vs US; coverage=source quality+freshness; market=country market size.',
  'migration_010'
)
on conflict (model_type, version_label) do nothing;

-- VP — Verification Priority (price_observations delta thresholds)
-- Not a weighted sum — uses a single threshold to gate auto-verification.
-- max_delta_pct: if abs(price_delta) > this value, observation stays pending for manual review.
-- confidence_high_threshold: delta <= this → confidence=high; else confidence=low.
insert into scoring_config
  (model_type, version_label, source, weights, thresholds, notes, created_by)
values (
  'vp',
  'static-v1',
  'static',
  '{
    "max_auto_verify_delta_pct": 50,
    "confidence_high_max_delta_pct": 50
  }',
  '{
    "auto_verify_below_pct": 50,
    "manual_review_above_pct": 50
  }',
  'Hand-tuned. If |delta| <= 50% vs current price: auto-verify (observation_status=verified, confidence=high). If |delta| > 50%: flag for manual review (observation_status=pending, confidence=low). manual_seed prices always rejected.',
  'migration_010'
)
on conflict (model_type, version_label) do nothing;

-- Register all four models as active (insert-only if not exists)
insert into scoring_model_registry (model_type, active_config_id, activated_by, change_notes)
select
  sc.model_type,
  sc.id,
  'migration_010',
  'Initial static weights from gen-scores.js and crawl-itunes.ts'
from scoring_config sc
where sc.version_label = 'static-v1'
on conflict (model_type) do nothing;

-- ────────────────────────────────────────────────────────────
-- SECTION 4: INSERT RLS policies for analytics tables
-- ────────────────────────────────────────────────────────────
--
-- Required before analytics ingestion scripts can write data.
-- service_role bypasses RLS by default, but explicit policies
-- make the intent clear and support future role separation.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'service role write page_metrics' and tablename = 'page_metrics'
  ) then
    create policy "service role write page_metrics"
      on page_metrics for insert to service_role with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'service role write search_console_metrics' and tablename = 'search_console_metrics'
  ) then
    create policy "service role write search_console_metrics"
      on search_console_metrics for insert to service_role with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'service role write scoring_training_examples' and tablename = 'scoring_training_examples'
  ) then
    create policy "service role write scoring_training_examples"
      on scoring_training_examples for insert to service_role with check (true);
  end if;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- SECTION 5: Fix scoring_training_examples unique constraint
-- ────────────────────────────────────────────────────────────
--
-- Migration 008 created UNIQUE (app_id, country_code, observation_window_start).
-- This fails for plan-level training examples (plan_id IS NOT NULL)
-- because the same app×country can have multiple plans.
-- Same two-partial-index fix as applied to current_prices in migration 009.

-- Drop the old 3-column unique constraint if it exists
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'scoring_training_examples'::regclass
    and contype  = 'u'
    and array_length(conkey, 1) = 3
  limit 1;

  if v_conname is not null then
    execute format('alter table scoring_training_examples drop constraint %I', v_conname);
    raise notice 'Dropped scoring_training_examples constraint: %', v_conname;
  else
    raise notice 'No 3-column unique constraint on scoring_training_examples (already fixed or never existed).';
  end if;
end;
$$;

create unique index if not exists uq_training_examples_no_plan
  on scoring_training_examples (app_id, country_code, observation_window_start)
  where plan_id is null;

create unique index if not exists uq_training_examples_with_plan
  on scoring_training_examples (app_id, country_code, plan_id, observation_window_start)
  where plan_id is not null;
