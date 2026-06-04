-- ============================================================
-- App Price Radar V2 — Separate App & Country Scoring Tables
-- Migration 005: Adds app_scores and country_scores tables.
-- Does not modify any existing table.
-- ============================================================

-- ── app_scores ───────────────────────────────────────────────
-- One row per tracked app. Scores the app itself for pipeline
-- priority independent of which country is being checked.
create table if not exists app_scores (
  app_id              text         primary key references apps(id) on delete cascade,

  -- Composite app score (0–100)
  score               numeric(5,2) not null default 0 check (score between 0 and 100),

  -- Component scores
  popularity_score    numeric(5,2) not null default 0, -- global search/download demand
  category_score      numeric(5,2) not null default 0, -- strategic category value
  price_range_score   numeric(5,2) not null default 0, -- subscription price level (higher = more savings potential)
  coverage_score      numeric(5,2) not null default 0, -- completeness of price data across countries

  -- Tier
  tier                text         not null default 'low'
                                   check (tier in ('critical','high','medium','low')),
  notes               text         not null default '',
  computed_at         timestamptz  not null default now()
);

create index if not exists idx_app_scores_score on app_scores(score desc);
create index if not exists idx_app_scores_tier  on app_scores(tier);

alter table app_scores enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'public read app_scores' and tablename = 'app_scores'
  ) then
    create policy "public read app_scores" on app_scores for select to anon using (true);
  end if;
end;
$$;

-- ── country_scores ───────────────────────────────────────────
-- One row per tracked country. Scores the country itself for
-- pipeline priority independent of which app is being checked.
create table if not exists country_scores (
  country_code        char(2)      primary key references countries(code) on delete cascade,

  -- Composite country score (0–100)
  score               numeric(5,2) not null default 0 check (score between 0 and 100),

  -- Component scores
  savings_potential   numeric(5,2) not null default 0, -- avg savings vs US baseline
  market_size         numeric(5,2) not null default 0, -- App Store user volume weight
  data_quality        numeric(5,2) not null default 0, -- how reliable prices are (currency stability)
  user_demand         numeric(5,2) not null default 0, -- inferred query volume for this country

  -- Tier
  tier                text         not null default 'low'
                                   check (tier in ('critical','high','medium','low')),
  notes               text         not null default '',
  computed_at         timestamptz  not null default now()
);

create index if not exists idx_country_scores_score on country_scores(score desc);
create index if not exists idx_country_scores_tier  on country_scores(tier);

alter table country_scores enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'public read country_scores' and tablename = 'country_scores'
  ) then
    create policy "public read country_scores" on country_scores for select to anon using (true);
  end if;
end;
$$;

comment on table  app_scores                      is 'Per-app priority score for pipeline refresh scheduling.';
comment on column app_scores.popularity_score     is 'Global demand: search volume, download rank proxy.';
comment on column app_scores.category_score       is 'How strategically important the app category is to tracked users.';
comment on column app_scores.price_range_score    is 'Higher subscription price = larger absolute savings possible.';
comment on column app_scores.coverage_score       is 'How complete the price data is across all 20 tracked countries.';

comment on table  country_scores                  is 'Per-country priority score for pipeline refresh scheduling.';
comment on column country_scores.savings_potential is 'How much cheaper this country is vs US on average.';
comment on column country_scores.market_size       is 'App Store market size / user base weight.';
comment on column country_scores.data_quality      is 'Currency stability and price data reliability.';
comment on column country_scores.user_demand       is 'Inferred user query volume for this country on App Price Radar.';
