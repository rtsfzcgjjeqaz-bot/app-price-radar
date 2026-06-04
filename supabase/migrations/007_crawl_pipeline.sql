-- ============================================================
-- App Price Radar V2 — Crawl Queue & Price Observations
-- Migration 007: price_observations + crawl_jobs tables.
-- Does not modify current_prices or any existing table.
-- ============================================================

-- ── crawl_jobs ───────────────────────────────────────────────
-- Queue of work items for the price crawl pipeline.
-- One row per app×country×plan combination to be fetched.
create table if not exists crawl_jobs (
  id              bigserial    primary key,
  app_id          text         not null references apps(id)        on delete cascade,
  country_code    char(2)      not null references countries(code)  on delete cascade,
  plan_id         text         references plans(id)                 on delete set null,

  -- Job lifecycle
  status          text         not null default 'pending'
                               check (status in ('pending','running','done','failed','skipped')),
  priority        int          not null default 50,   -- 1 = highest, 100 = lowest
  source          text         not null default 'itunes_lookup'
                               check (source in ('itunes_lookup','manual','community')),

  -- Scheduling
  scheduled_at    timestamptz  not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz,

  -- Result / error
  error_message   text,
  retry_count     int          not null default 0,
  max_retries     int          not null default 3,

  created_at      timestamptz  not null default now(),

  -- Prevent duplicate pending jobs for the same target
  unique (app_id, country_code, plan_id, status)
);

create index if not exists idx_crawl_jobs_status_priority
  on crawl_jobs(status, priority, scheduled_at)
  where status = 'pending';

create index if not exists idx_crawl_jobs_app_id
  on crawl_jobs(app_id);

-- ── price_observations ───────────────────────────────────────
-- Staging area for all raw crawled prices.
-- Rows here are NOT trusted until observation_status = 'verified'.
-- Only verified observations can update current_prices.
create table if not exists price_observations (
  id              bigserial    primary key,
  crawl_job_id    bigint       references crawl_jobs(id) on delete set null,

  -- What was observed
  app_id          text         not null references apps(id)        on delete cascade,
  country_code    char(2)      not null references countries(code)  on delete cascade,
  plan_id         text         references plans(id)                 on delete set null,
  price           numeric(12,4) not null,
  currency        char(3)      not null,

  -- Provenance
  source_type     text         not null default 'itunes_lookup'
                               check (source_type in ('itunes_lookup','manual','community','scraped')),
  source_url      text         not null default '',
  raw_response    jsonb,                -- store raw API response for debugging

  -- Verification lifecycle
  -- pending   = just crawled, not yet checked
  -- verified  = passes quality checks → eligible to update current_prices
  -- rejected  = failed quality checks (price=0, currency mismatch, outlier, etc.)
  -- stale     = was verified but a newer observation exists
  observation_status  text     not null default 'pending'
                               check (observation_status in ('pending','verified','rejected','stale')),

  -- Quality signals (populated during verification step)
  confidence_level    text     not null default 'medium'
                               check (confidence_level in ('high','medium','low')),
  rejection_reason    text,    -- populated when observation_status = 'rejected'

  -- Delta vs current price (populated during verification)
  prev_price          numeric(12,4),
  price_delta_pct     numeric(8,4),    -- (new - old) / old * 100

  observed_at     timestamptz  not null default now(),
  verified_at     timestamptz,

  -- Protect manual_seed prices: never auto-promote over them
  -- This flag is set true when current_prices.source_type = 'manual_seed'
  -- for this app×country, preventing auto-promotion
  manual_lock     boolean      not null default false
);

create index if not exists idx_price_observations_status
  on price_observations(observation_status, observed_at desc);

create index if not exists idx_price_observations_app_country
  on price_observations(app_id, country_code);

create index if not exists idx_price_observations_crawl_job
  on price_observations(crawl_job_id);

-- ── Promotion function ────────────────────────────────────────
-- Promotes verified observations into current_prices.
-- Rules:
--   1. observation_status must be 'verified'
--   2. manual_lock must be false
--   3. source_type of existing current_prices row must NOT be 'manual_seed'
--      (manual subscription prices are protected from auto-overwrite)
--   4. If no existing row → insert
--   5. If existing row with source_type != 'manual_seed' → update
create or replace function promote_verified_observations()
returns table(promoted int, skipped_manual_lock int, skipped_manual_seed int)
language plpgsql as $$
declare
  v_promoted int := 0;
  v_skipped_lock int := 0;
  v_skipped_seed int := 0;
  obs price_observations%rowtype;
begin
  for obs in
    select * from price_observations
    where observation_status = 'verified'
      and manual_lock = false
    order by observed_at
  loop
    -- Check if current price is protected manual_seed
    if exists (
      select 1 from current_prices cp
      where cp.app_id = obs.app_id
        and cp.country_code = obs.country_code
        and coalesce(cp.plan_id, '') = coalesce(obs.plan_id::text, '')
        and cp.source_type = 'manual_seed'
    ) then
      v_skipped_seed := v_skipped_seed + 1;
      -- mark as stale so we don't keep processing
      update price_observations set observation_status = 'stale' where id = obs.id;
      continue;
    end if;

    -- Upsert into current_prices
    insert into current_prices
      (app_id, country_code, plan_id, price, currency, updated_at,
       source_type, source_name, source_url, confidence_level, last_verified_at)
    values
      (obs.app_id, obs.country_code, obs.plan_id, obs.price, obs.currency, now(),
       obs.source_type, obs.source_type, obs.source_url, obs.confidence_level, now())
    on conflict (app_id, country_code) do update set
      price              = excluded.price,
      currency           = excluded.currency,
      updated_at         = excluded.updated_at,
      source_type        = excluded.source_type,
      source_name        = excluded.source_name,
      source_url         = excluded.source_url,
      confidence_level   = excluded.confidence_level,
      last_verified_at   = excluded.last_verified_at
    where current_prices.source_type != 'manual_seed';

    -- Mark observation as stale (superseded)
    update price_observations set observation_status = 'stale' where id = obs.id;
    v_promoted := v_promoted + 1;
  end loop;

  return query select v_promoted, v_skipped_lock, v_skipped_seed;
end;
$$;

-- ── RLS ──────────────────────────────────────────────────────
alter table crawl_jobs          enable row level security;
alter table price_observations  enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'public read crawl_jobs' and tablename = 'crawl_jobs') then
    create policy "public read crawl_jobs" on crawl_jobs for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read price_observations' and tablename = 'price_observations') then
    create policy "public read price_observations" on price_observations for select to anon using (true);
  end if;
end;
$$;

comment on table  crawl_jobs                     is 'Job queue for the price crawl pipeline.';
comment on table  price_observations             is 'Staging area for crawled prices. Only verified rows promote to current_prices.';
comment on column price_observations.manual_lock is 'True = existing current_prices row is manual_seed; auto-promotion blocked.';
comment on function promote_verified_observations is 'Moves verified price_observations into current_prices. Protects manual_seed rows.';
