-- ============================================================
-- App Price Radar V2 — Initial Schema
-- ============================================================

-- ── apps ────────────────────────────────────────────────────
create table if not exists apps (
  id            text        primary key,          -- e.g. 'chatgpt'
  app_store_id  text        not null unique,
  name          text        not null,
  developer     text        not null,
  category      text        not null,
  icon_url      text        not null default '/app-placeholder.svg',
  description   text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── countries ───────────────────────────────────────────────
create table if not exists countries (
  code       char(2)     primary key,              -- ISO 3166-1 alpha-2
  name       text        not null,
  currency   char(3)     not null,                 -- ISO 4217
  flag       text        not null default '',
  created_at timestamptz not null default now()
);

-- ── exchange_rates ──────────────────────────────────────────
create table if not exists exchange_rates (
  currency      char(3)     primary key,
  rate_to_usd   numeric(18,8) not null,
  rate_to_cny   numeric(18,8) not null,
  fetched_at    timestamptz not null default now()
);

-- ── current_prices ──────────────────────────────────────────
create table if not exists current_prices (
  id           bigserial   primary key,
  app_id       text        not null references apps(id)       on delete cascade,
  country_code char(2)     not null references countries(code) on delete cascade,
  price        numeric(12,4) not null,
  currency     char(3)     not null,
  updated_at   timestamptz not null default now(),
  unique (app_id, country_code)
);

-- ── price_history ───────────────────────────────────────────
create table if not exists price_history (
  id           bigserial   primary key,
  app_id       text        not null references apps(id)       on delete cascade,
  country_code char(2)     not null references countries(code) on delete cascade,
  price        numeric(12,4) not null,
  currency     char(3)     not null,
  recorded_at  timestamptz not null default now()
);

-- ── indexes ─────────────────────────────────────────────────
create index if not exists idx_current_prices_app_id
  on current_prices(app_id);

create index if not exists idx_current_prices_country_code
  on current_prices(country_code);

create index if not exists idx_current_prices_updated_at
  on current_prices(updated_at desc);

create index if not exists idx_price_history_app_id
  on price_history(app_id);

create index if not exists idx_price_history_app_country
  on price_history(app_id, country_code);

create index if not exists idx_price_history_recorded_at
  on price_history(recorded_at desc);

create index if not exists idx_apps_category
  on apps(category);

create index if not exists idx_apps_name
  on apps using gin(to_tsvector('english', name));

-- ── updated_at trigger ──────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger apps_updated_at
  before update on apps
  for each row execute function set_updated_at();

create or replace trigger current_prices_updated_at
  before update on current_prices
  for each row execute function set_updated_at();

-- ── row-level security (safe defaults) ──────────────────────
alter table apps            enable row level security;
alter table countries       enable row level security;
alter table exchange_rates  enable row level security;
alter table current_prices  enable row level security;
alter table price_history   enable row level security;

-- Public read access via anon key
create policy "public read apps"
  on apps for select to anon using (true);

create policy "public read countries"
  on countries for select to anon using (true);

create policy "public read exchange_rates"
  on exchange_rates for select to anon using (true);

create policy "public read current_prices"
  on current_prices for select to anon using (true);

create policy "public read price_history"
  on price_history for select to anon using (true);
