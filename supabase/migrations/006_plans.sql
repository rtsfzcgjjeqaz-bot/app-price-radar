-- ============================================================
-- App Price Radar V2 — Subscription Plans
-- Migration 006: plans table + plan_id column on current_prices
-- Does not drop app_id. current_prices.app_id remains intact.
-- ============================================================

-- ── plans ────────────────────────────────────────────────────
create table if not exists plans (
  id               text         primary key,     -- e.g. 'chatgpt-plus', 'spotify-individual'
  app_id           text         not null references apps(id) on delete cascade,
  name             text         not null,         -- display name, e.g. 'ChatGPT Plus'
  billing_period   text         not null default 'monthly'
                                check (billing_period in ('monthly','annual','one_time','free')),
  base_price_usd   numeric(10,4) not null default 0,
  is_default       boolean      not null default false, -- true = the plan shown in summary stats
  description      text         not null default '',
  features         text[]       not null default '{}',
  created_at       timestamptz  not null default now(),
  updated_at       timestamptz  not null default now()
);

create index if not exists idx_plans_app_id      on plans(app_id);
create index if not exists idx_plans_is_default  on plans(app_id, is_default) where is_default = true;

create or replace trigger plans_updated_at
  before update on plans
  for each row execute function set_updated_at();

alter table plans enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'public read plans' and tablename = 'plans'
  ) then
    create policy "public read plans" on plans for select to anon using (true);
  end if;
end;
$$;

-- ── current_prices: add plan_id (nullable, preserves existing rows) ──
alter table current_prices
  add column if not exists plan_id text references plans(id) on delete set null;

create index if not exists idx_current_prices_plan_id
  on current_prices(plan_id) where plan_id is not null;

-- ── price_history: add plan_id ────────────────────────────────
alter table price_history
  add column if not exists plan_id text references plans(id) on delete set null;

comment on table  plans                  is 'Subscription tiers and purchase options per app.';
comment on column plans.id               is 'Slug: {app_id}-{tier}, e.g. chatgpt-plus, spotify-individual';
comment on column plans.billing_period   is 'monthly | annual | one_time | free';
comment on column plans.is_default       is 'The primary plan shown in price comparison tables.';
comment on column current_prices.plan_id is 'NULL = legacy app-level price. Set = plan-level price.';
