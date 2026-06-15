-- ============================================================
-- App Price Radar — Migration 013
-- Fix unique constraint on crawl_jobs to prevent re-queuing
-- completed work.
--
-- Problem: UNIQUE (app_id, country_code, plan_id, status) allows
-- the same app×country×plan to appear as both 'pending' and 'done',
-- so crawl-create-jobs.ts re-queues completed work each run.
--
-- Fix: Replace with two partial unique indexes that only prevent
-- duplicate active (pending/running) jobs.  Multiple historical
-- 'done'/'failed' rows per pair are fine.
--
-- Safe to re-run: DROP/CREATE use IF EXISTS / IF NOT EXISTS.
-- ============================================================

-- Drop the original 4-column unique constraint.
-- Found by shape rather than name (Supabase may auto-name it).
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'crawl_jobs'::regclass
    and contype  = 'u'
    and array_length(conkey, 1) = 4
  limit 1;

  if v_conname is not null then
    execute format('alter table crawl_jobs drop constraint %I', v_conname);
    raise notice 'Dropped crawl_jobs constraint: %', v_conname;
  else
    raise notice 'No 4-column unique constraint on crawl_jobs (already removed or never existed).';
  end if;
end;
$$;

-- Two partial unique indexes: only active jobs (pending/running) are
-- constrained unique.  Follows the same two-branch pattern used in
-- migration 009 for current_prices.

create unique index if not exists uq_crawl_jobs_active_no_plan
  on crawl_jobs (app_id, country_code)
  where plan_id is null
    and status in ('pending', 'running');

create unique index if not exists uq_crawl_jobs_active_with_plan
  on crawl_jobs (app_id, country_code, plan_id)
  where plan_id is not null
    and status in ('pending', 'running');

comment on table crawl_jobs is
  'Job queue for the price crawl pipeline. '
  'At most one active (pending/running) job per app×country×plan. '
  'Multiple historical done/failed rows are allowed.';
