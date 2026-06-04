-- ============================================================
-- App Price Radar V2 — Schema Fix / Patch Migration
-- Safe to run on any database state (all operations are
-- guarded with IF NOT EXISTS or conditional logic).
-- ============================================================

-- ── countries: add flag column if missing ───────────────────
alter table countries
  add column if not exists flag text not null default '';

-- ── apps: add updated_at if missing (needed by trigger) ─────
alter table apps
  add column if not exists updated_at timestamptz not null default now();

alter table apps
  add column if not exists created_at timestamptz not null default now();

-- ── apps: ensure app_store_id unique constraint exists ──────
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'apps_app_store_id_key'
      and conrelid = 'apps'::regclass
  ) then
    alter table apps add constraint apps_app_store_id_key unique (app_store_id);
  end if;
end;
$$;

-- ── current_prices: add updated_at if missing ───────────────
alter table current_prices
  add column if not exists updated_at timestamptz not null default now();

-- ── ensure updated_at trigger function exists ────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── re-attach triggers idempotently ─────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'apps_updated_at'
      and tgrelid = 'apps'::regclass
  ) then
    create trigger apps_updated_at
      before update on apps
      for each row execute function set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'current_prices_updated_at'
      and tgrelid = 'current_prices'::regclass
  ) then
    create trigger current_prices_updated_at
      before update on current_prices
      for each row execute function set_updated_at();
  end if;
end;
$$;

-- ── RLS: enable if not already enabled ──────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['apps','countries','exchange_rates','current_prices','price_history']
  loop
    if not exists (
      select 1 from pg_class
      where relname = t and relrowsecurity = true
    ) then
      execute 'alter table ' || t || ' enable row level security';
    end if;
  end loop;
end;
$$;

-- ── RLS policies: create only if missing ────────────────────
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'public read apps' and tablename = 'apps') then
    create policy "public read apps" on apps for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read countries' and tablename = 'countries') then
    create policy "public read countries" on countries for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read exchange_rates' and tablename = 'exchange_rates') then
    create policy "public read exchange_rates" on exchange_rates for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read current_prices' and tablename = 'current_prices') then
    create policy "public read current_prices" on current_prices for select to anon using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'public read price_history' and tablename = 'price_history') then
    create policy "public read price_history" on price_history for select to anon using (true);
  end if;
end;
$$;
