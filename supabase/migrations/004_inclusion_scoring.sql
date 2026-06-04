-- ============================================================
-- App Price Radar V2 — Inclusion Scoring System
-- Migration 004: New table, no changes to existing tables.
-- ============================================================

-- ── inclusion_scores ────────────────────────────────────────
-- Stores a computed priority score for each app×country pair.
-- Used by the update pipeline to decide which combinations to
-- refresh most aggressively, and by editorial tooling to
-- prioritise manual price verification.
create table if not exists inclusion_scores (
  id              bigserial    primary key,

  -- The app×country pair being scored
  app_id          text         not null references apps(id)        on delete cascade,
  country_code    char(2)      not null references countries(code) on delete cascade,

  -- Composite inclusion score (0–100). Higher = higher priority.
  score           numeric(5,2) not null default 0 check (score between 0 and 100),

  -- Breakdown of score components (each 0–100, weighted to produce score)
  demand_score    numeric(5,2) not null default 0, -- app popularity / search demand
  savings_score   numeric(5,2) not null default 0, -- price delta vs US baseline
  coverage_score  numeric(5,2) not null default 0, -- data freshness & source quality
  market_score    numeric(5,2) not null default 0, -- country market size & user base

  -- Human-readable tier derived from score
  -- 'critical' ≥ 80 | 'high' ≥ 60 | 'medium' ≥ 40 | 'low' < 40
  tier            text         not null default 'low'
                               check (tier in ('critical', 'high', 'medium', 'low')),

  -- Metadata
  notes           text         not null default '',
  computed_at     timestamptz  not null default now(),
  unique (app_id, country_code)
);

-- Indexes for common access patterns
create index if not exists idx_inclusion_scores_score
  on inclusion_scores(score desc);

create index if not exists idx_inclusion_scores_tier
  on inclusion_scores(tier);

create index if not exists idx_inclusion_scores_app_id
  on inclusion_scores(app_id);

create index if not exists idx_inclusion_scores_country_code
  on inclusion_scores(country_code);

-- RLS: public read
alter table inclusion_scores enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'public read inclusion_scores' and tablename = 'inclusion_scores'
  ) then
    create policy "public read inclusion_scores"
      on inclusion_scores for select to anon using (true);
  end if;
end;
$$;

comment on table  inclusion_scores               is 'Priority scores for app×country price tracking. Higher score = refresh more aggressively.';
comment on column inclusion_scores.score         is 'Composite score 0–100. Weighted sum of demand, savings, coverage, market components.';
comment on column inclusion_scores.demand_score  is 'How popular/searched this app is globally. Based on app category tier.';
comment on column inclusion_scores.savings_score is 'Price delta vs US baseline. Higher savings = more valuable to users.';
comment on column inclusion_scores.coverage_score is 'Data freshness and source quality. itunes_lookup=high, manual=medium, stale=low.';
comment on column inclusion_scores.market_score  is 'Country market size weight. Large English-speaking / high-traffic markets score higher.';
comment on column inclusion_scores.tier          is 'critical(≥80) high(≥60) medium(≥40) low(<40)';
