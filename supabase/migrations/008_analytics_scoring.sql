-- ============================================================
-- App Price Radar V2 — Analytics & ML Training Data
-- Migration 008: page_metrics, search_console_metrics,
-- scoring_training_examples.
-- No UI changes. No modifications to existing tables.
-- ============================================================

-- ── page_metrics ─────────────────────────────────────────────
-- Tracks engagement for every page served by App Price Radar.
-- Populated by a server-side analytics event or a nightly
-- aggregation job from your analytics provider (Plausible,
-- PostHog, Vercel Analytics, etc.).
create table if not exists page_metrics (
  id              bigserial    primary key,

  -- Page identity
  page_url        text         not null,
  page_type       text         not null default 'unknown'
                               check (page_type in (
                                 'app_detail','country_detail','app_ranking',
                                 'country_ranking','search','homepage',
                                 'cheapest','compare','other','unknown'
                               )),

  -- Dimensional context (nullable — not every page has all three)
  app_id          text         references apps(id)        on delete set null,
  plan_id         text         references plans(id)       on delete set null,
  country_code    char(2)      references countries(code) on delete set null,

  -- Metrics
  views           int          not null default 0,
  clicks          int          not null default 0,  -- outbound or CTA clicks
  engagement_rate numeric(6,4) not null default 0,  -- 0.0–1.0

  -- Granularity
  date            date         not null default current_date,

  -- Prevent duplicate rows for the same page+date
  unique (page_url, date)
);

create index if not exists idx_page_metrics_app_id
  on page_metrics(app_id) where app_id is not null;

create index if not exists idx_page_metrics_country_code
  on page_metrics(country_code) where country_code is not null;

create index if not exists idx_page_metrics_date
  on page_metrics(date desc);

create index if not exists idx_page_metrics_page_type
  on page_metrics(page_type, date desc);

-- ── search_console_metrics ───────────────────────────────────
-- Google Search Console performance data per query+page+date.
-- Populated by the GSC API export (see docs/scoring-model-training.md).
create table if not exists search_console_metrics (
  id              bigserial    primary key,

  -- GSC dimensions
  page_url        text         not null,
  query           text         not null,
  country         char(2)      not null default 'xx', -- ISO country from GSC

  -- GSC metrics
  impressions     int          not null default 0,
  clicks          int          not null default 0,
  ctr             numeric(8,6) not null default 0,   -- 0.0–1.0
  position        numeric(6,2) not null default 0,   -- avg SERP position

  -- Granularity
  date            date         not null default current_date,

  unique (page_url, query, country, date)
);

create index if not exists idx_gsc_page_url
  on search_console_metrics(page_url);

create index if not exists idx_gsc_query
  on search_console_metrics(query);

create index if not exists idx_gsc_date
  on search_console_metrics(date desc);

create index if not exists idx_gsc_impressions
  on search_console_metrics(impressions desc);

-- ── scoring_training_examples ────────────────────────────────
-- One row per app×country (×plan, optional) observation window.
-- Features are a snapshot of all relevant signals at the time
-- the example was created. Targets are future engagement metrics
-- collected after the observation window closes.
--
-- A batch of training examples is created by a weekly/monthly
-- job that joins inclusion_scores, app_scores, country_scores,
-- page_metrics, and search_console_metrics.
create table if not exists scoring_training_examples (
  id              bigserial    primary key,

  -- Key dimensions
  app_id          text         not null references apps(id)        on delete cascade,
  plan_id         text         references plans(id)                on delete set null,
  country_code    char(2)      not null references countries(code) on delete cascade,

  -- Feature snapshot (JSON for flexibility — schema evolves over time)
  -- Expected keys (see docs/scoring-model-training.md for full spec):
  --   inclusion_score, demand_score, savings_score, coverage_score,
  --   market_score, app_score, country_score,
  --   source_type, confidence_level,
  --   prev_views_7d, prev_clicks_7d, prev_impressions_30d,
  --   avg_position_30d, price_usd, price_delta_pct_30d
  features        jsonb        not null default '{}',

  -- Target variables (filled in after observation window closes)
  -- null = not yet collected
  target_clicks_7d        int,  -- page clicks in the 7 days after creation
  target_impressions_30d  int,  -- GSC impressions in the 30 days after creation

  -- Derived label (set when targets are populated)
  -- high = clicks_7d > 10 OR impressions_30d > 500
  -- medium = clicks_7d 3–10 OR impressions_30d 100–500
  -- low = below those thresholds
  label           text         check (label in ('high','medium','low')),

  -- Metadata
  observation_window_start  date not null,
  observation_window_end    date not null,
  targets_collected_at      timestamptz,

  created_at      timestamptz  not null default now(),

  unique (app_id, country_code, observation_window_start)
);

create index if not exists idx_training_app_id
  on scoring_training_examples(app_id);

create index if not exists idx_training_country_code
  on scoring_training_examples(country_code);

create index if not exists idx_training_label
  on scoring_training_examples(label) where label is not null;

create index if not exists idx_training_created_at
  on scoring_training_examples(created_at desc);

-- GIN index on features for JSON queries
create index if not exists idx_training_features
  on scoring_training_examples using gin(features);

-- ── RLS ──────────────────────────────────────────────────────
alter table page_metrics               enable row level security;
alter table search_console_metrics     enable row level security;
alter table scoring_training_examples  enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'public read page_metrics') then
    create policy "public read page_metrics"
      on page_metrics for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read search_console_metrics') then
    create policy "public read search_console_metrics"
      on search_console_metrics for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read scoring_training_examples') then
    create policy "public read scoring_training_examples"
      on scoring_training_examples for select to anon using (true);
  end if;
end;
$$;

comment on table  page_metrics                        is 'Daily page-level engagement metrics (views, clicks, engagement rate).';
comment on table  search_console_metrics              is 'Google Search Console data: query, impressions, clicks, CTR, position.';
comment on table  scoring_training_examples           is 'ML training dataset for the priority scoring model. Features + future targets.';
comment on column scoring_training_examples.features  is 'JSON snapshot of all scoring signals at observation time. See docs/scoring-model-training.md.';
comment on column scoring_training_examples.label     is 'Derived class label set once targets are collected. Used for classification training.';
