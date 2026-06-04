-- ============================================================
-- App Price Radar V2 — Price Source Tracking
-- Adds source provenance fields to current_prices and
-- price_history. Safe to run on any database state.
-- ============================================================

-- ── current_prices: source tracking columns ─────────────────
alter table current_prices
  add column if not exists source_type       text        not null default 'manual_seed',
  add column if not exists source_name       text        not null default 'App Price Radar seed',
  add column if not exists source_url        text        not null default '',
  add column if not exists confidence_level  text        not null default 'medium',
  add column if not exists last_verified_at  timestamptz not null default now();

-- ── price_history: same source tracking columns ─────────────
alter table price_history
  add column if not exists source_type       text        not null default 'manual_seed',
  add column if not exists source_name       text        not null default 'App Price Radar seed',
  add column if not exists source_url        text        not null default '',
  add column if not exists confidence_level  text        not null default 'medium',
  add column if not exists last_verified_at  timestamptz not null default now();

-- ── indexes for common query patterns ───────────────────────
create index if not exists idx_current_prices_source_type
  on current_prices(source_type);

create index if not exists idx_current_prices_last_verified_at
  on current_prices(last_verified_at desc);

create index if not exists idx_price_history_source_type
  on price_history(source_type);

-- ── update existing seed rows to correct source labels ──────
-- Rows for apps whose base price is truly 'one-time' in the
-- App Store (i.e. paid downloads) get itunes_lookup source.
-- All subscription / free-download apps get manual_seed.
-- We cannot automatically distinguish here without app metadata,
-- so we leave source_type as manual_seed for all existing rows.
-- The 002_prices_with_source.sql seed will set correct values
-- when data is next re-seeded.

comment on column current_prices.source_type is
  'itunes_lookup | manual_seed | community | scraped';
comment on column current_prices.confidence_level is
  'high | medium | low';
comment on column price_history.source_type is
  'itunes_lookup | manual_seed | community | scraped';
comment on column price_history.confidence_level is
  'high | medium | low';
