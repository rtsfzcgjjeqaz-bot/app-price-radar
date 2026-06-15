# App Price Radar — Handoff Notes

## Project

Next.js 16 + TypeScript + Tailwind CSS + Supabase — Global App Store price comparison site.

**Path:** `C:\Users\Administrator\app-price-radar`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.2.7 (App Router) |
| UI | React 19, Tailwind CSS v4, lucide-react |
| Database | Supabase (PostgreSQL + RLS) |
| AI Chat | Anthropic SDK (`@anthropic-ai/sdk`), Claude Opus 4.8 |
| Scripts | tsx + dotenv (.env.local) |
| i18n | Custom context (locales/en.ts + zh.ts) |
| Icons | 82 real App Store PNGs in public/app-icons/ |

---

## Environment Variables (.env.local)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...          # frontend read-only (RLS enforced)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # scripts only, bypasses RLS
ANTHROPIC_API_KEY=sk-ant-...      # server-side only, used by /api/chat
```

Copy `.env.example` → `.env.local` and fill in values.
Run `npm run check:env` to verify all four variables are set before deploying.

---

## Key Commands

```powershell
npm run check:env        # verify all four .env.local variables are set
npm run dev              # start dev server
npm run build            # production build (must pass before deploying)

npm run update:fx        # fetch exchange rates → Supabase
npm run update:itunes    # fetch one-time paid app prices → Supabase (manual_seed protected)
npm run update:history   # snapshot current_prices → price_history
npm run update:all       # all three in sequence

npm run crawl:create-jobs  # enqueue crawl jobs by inclusion_scores priority
npm run crawl:itunes       # fetch prices → price_observations staging table
npm run crawl:run          # full pipeline (reset stuck jobs + crawl + promote + snapshot)
npm run crawl:run -- --create-jobs   # first run: also creates jobs
npm run crawl:run -- --promote-only  # promote + snapshot only
```

---

## Database Schema (migration order)

Run in Supabase SQL Editor in this exact order:

```
supabase/migrations/001_initial_schema.sql         — apps, countries, exchange_rates, current_prices, price_history
supabase/migrations/002_schema_fix.sql             — add flag column, fix triggers/RLS (patch for existing DBs)
supabase/migrations/003_price_source_tracking.sql  — source_type, confidence_level on current_prices + price_history
supabase/migrations/004_inclusion_scoring.sql      — inclusion_scores table (app×country pair scoring)
supabase/migrations/005_app_country_scores.sql     — app_scores + country_scores standalone tables
supabase/migrations/006_plans.sql                  — plans table + plan_id nullable FK on current_prices/price_history
supabase/migrations/007_crawl_pipeline.sql         — crawl_jobs + price_observations + promote_verified_observations()
supabase/migrations/008_analytics_scoring.sql      — page_metrics + search_console_metrics + scoring_training_examples
supabase/migrations/009_fix_current_prices_unique_constraint.sql
                                                   — fixes unique index to include plan_id; replaces promote function

supabase/seeds/001_base_data.sql       — 85 apps, 20 countries, 19 exchange rates
supabase/seeds/002_prices.sql          — 1,625 price rows (source_type tagged)
supabase/seeds/003_inclusion_scores.sql — 1,680 app×country priority scores
supabase/seeds/004_app_scores.sql      — 84 app scores
supabase/seeds/005_country_scores.sql  — 20 country scores
supabase/seeds/005_plans.sql           — 145 subscription plans + plan_id backfill on current_prices
```

---

## Architecture

### Data Flow

```
Mock data (mock/)
    └─► lib/db/* ◄─── Supabase (when .env.local is set)
            │
            ▼
    Next.js pages (server components fetch, pass to client components)
            │
            ▼
    Client components (useLocale for i18n, useState for interactivity)
```

### Supabase Fallback Pattern

Every `lib/db/*.ts` function checks `if (!supabase) return mockData` — all pages work without a Supabase connection.

**Single client singleton:** `lib/db/client.ts` — all pages and API routes import from here.

### Plan Selector Pattern (`/apps/[id]`)

Server page → fetches app + plans + default plan prices → passes to `AppDetailClient`
Client component → renders plan pills → on plan switch: `fetch /api/plans/[planId]?appId=` → updates table

### AI Chat Pattern (`/api/chat`)

Route handler validates input (1000-char cap, IP rate limit: 20 req/60s) → calls `lib/chat.ts` → Claude Opus 4.8 with adaptive thinking → returns reply as JSON.

### i18n Pattern

- `lib/useLocale.tsx` — React context, client-only
- Server components cannot use `useLocale()` — they pass data to `'use client'` wrapper components

---

## Pages and Data Sources

| Page | Data source | Notes |
|---|---|---|
| `/` (homepage) | mock only | Uses mock/apps.ts directly, no Supabase switch yet |
| `/app-ranking` | lib/db (Supabase + mock fallback) | AppRankingClient.tsx is the client wrapper |
| `/apps/[id]` | lib/db (Supabase + mock fallback) | AppDetailClient.tsx, plan selector UI |
| `/countries/[code]` | lib/db (Supabase + mock fallback) | CountryDetailClient.tsx |
| `/country-ranking` | lib/db (Supabase + mock fallback) | getCountryRanking() in lib/db/prices.ts |
| `/search` | lib/search (mock only) | Not switched to Supabase yet |
| `/cheapest/[appId]` | mock only | Not switched |
| `/compare/[appId]` | mock only | Not switched |
| `/ai` | Claude Opus 4.8 via Anthropic SDK | Real LLM; rate-limited; requires ANTHROPIC_API_KEY |
| `/sitemap.xml` | Supabase + mock fallback | Dynamic; reads live app/country IDs |

---

## Known Incomplete Items

| Item | Detail |
|---|---|
| **Plan selector empty state** | Non-default plans (Netflix Premium, Spotify Family, etc.) have no `plan_id` in `current_prices` — shows "No prices available" when selected |
| **update-itunes doesn't write plan_id** | Crawl scripts link prices to app, not to specific plan |
| **search/cheapest/compare use mock** | Not switched to lib/db |
| **page_metrics empty** | Table exists, no analytics ingestion wired; also missing RLS INSERT policy for writes |
| **search_console_metrics empty** | Table exists, needs GSC API export job |
| **scoring_training_examples empty** | Needs analytics data to accumulate first |
| **getCountryAppPriceTable N+1** | Issues one Supabase query per app per country page (~21 queries); acceptable at low traffic |
| **Rate limiter is in-memory** | Multi-instance deployments each have independent counters; consider Vercel KV if scaling |

---

## File Structure Reference

```
app/
  page.tsx                         — homepage (mock data, dark hero)
  not-found.tsx                    — custom 404 with search
  sitemap.ts                       — dynamic sitemap (Supabase + mock fallback)
  layout.tsx                       — root layout; metadataBase: https://apppriceradar.com
  app-ranking/
    page.tsx                       — server: fetches data
    AppRankingClient.tsx           — client: renders, i18n
  apps/[id]/
    page.tsx                       — server: fetches app + plans
    AppDetailClient.tsx            — client: plan selector, price table
  countries/[code]/
    page.tsx                       — server: fetches country
    CountryDetailClient.tsx        — client: filters, sort, i18n
  country-ranking/
    page.tsx                       — server: async, calls getCountryRanking()
    CountryRankingClient.tsx       — client: renders, i18n
  api/
    db-health/route.ts             — GET: returns table counts (no auth, internal use)
    plans/[planId]/route.ts        — GET: prices for a specific plan
    chat/route.ts                  — POST: Claude API chat (rate-limited, 1000-char cap)

components/
  Navbar.tsx, Footer.tsx           — lucide icons, lang toggle
  AppCard.tsx                      — i18n, centred icon
  PriceTable.tsx                   — 'use client', i18n headers
  CountryAppPriceTable.tsx         — 'use client', i18n headers

lib/
  chat.ts                          — Claude Opus 4.8 via Anthropic SDK
  db/
    client.ts                      — Supabase singleton (null if no env) — SINGLE SOURCE OF TRUTH
    apps.ts                        — getAllApps, getAppById, searchApps
    countries.ts                   — getAllCountries, getCountryByCode
    prices.ts                      — getAppPriceTable, getAppPriceTableByPlan, getCountryRanking
    plans.ts                       — getPlansByApp, getDefaultPlan
    index.ts                       — re-exports all (including getAppPriceTableByPlan)
  price.ts                         — mock-based price calculations (still used by cheapest/compare)
  useLocale.tsx                    — i18n context provider

mock/                              — fallback data (never deleted)
scripts/
  check-env.ts                     — verify .env.local (SUPABASE_* + ANTHROPIC_API_KEY)
  update-fx.ts                     — exchange rates → Supabase
  update-itunes.ts                 — iTunes prices → Supabase (skips manual_seed rows)
  update-history.ts                — snapshot history
  crawl-create-jobs.ts             — enqueue crawl jobs
  crawl-itunes.ts                  — crawl → price_observations
  crawl-run.ts                     — full pipeline (resets stuck jobs first)
  gen-plans.js                     — regenerate seeds/005_plans.sql
  gen-scores.js                    — regenerate seeds/004+005 score seeds

supabase/
  migrations/001–009               — see Database Schema section above
  seeds/001–005                    — see Database Schema section above

docs/
  daily-update-pipeline.md        — cron job and script docs
  inclusion-scoring-system.md     — scoring model docs (3 tables)
  crawling-and-data-quality.md    — crawl architecture, manual_seed protection
  scoring-model-training.md       — ML training data plan

locales/
  en.ts, zh.ts                    — all i18n strings (kept in sync)

.github/workflows/
  daily-update.yml                — runs update:fx + crawl-run.ts + update-history at 02:00 UTC
```

---

## Suggested Next Steps

1. **Backfill plan_id for non-default plans** — extend `scripts/crawl-itunes.ts` to write `plan_id` per plan so the plan selector shows real prices
2. **Switch search page to lib/db** — replace `lib/search.ts` with async Supabase full-text search
3. **Connect analytics** — add RLS INSERT policy on `page_metrics`; wire Plausible/PostHog events to populate it
4. **Connect GSC API** — export query data nightly to `search_console_metrics`
5. **Fix getCountryAppPriceTable N+1** — batch all app price queries into a single Supabase call with an `in` filter

---

## Build Status

Last run: 2026-06-05

```
▲ Next.js 16.2.7 (Turbopack)

✓ Compiled successfully in 2.6s
✓ TypeScript: no errors
✓ 207 pages generated (1572ms)

Route summary:
  ○ Static   — /, /ai, /app-ranking, /country-ranking, /search, /about, /contact, /privacy, /terms, /disclaimer, /data-sources, /robots.txt
  ● SSG      — /cheapest/[appId] (85 paths), /compare/[appId] (85 paths), /subscribe/[countryCode] (20 paths)
  ƒ Dynamic  — /api/chat, /api/db-health, /api/plans/[planId], /apps/[id], /countries/[code], /sitemap.xml
```
