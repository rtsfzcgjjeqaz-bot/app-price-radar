# App Price Radar — Project Handoff Summary

> **Single source of truth.** This document replaces `docs/handoff-notes.md` and covers everything a new developer — or a new Claude Code session — needs to continue development immediately.

---

## Quick Start For New Claude Code Session

**What this project is:** A Next.js 16 App Router site that compares App Store subscription prices across 85 apps and 20 countries. Supabase (PostgreSQL) is the database; mock data is the fallback when env vars are absent.

**State as of 2026-06-05:**
- Build: ✓ clean (`npm run build` passes, 0 TypeScript errors, 207 pages)
- All pages with Supabase reads have mock fallbacks — the app runs without env vars
- `lib/db/client.ts` is the **single** Supabase singleton (the old `lib/supabase/client.ts` was deleted)
- AI chat uses Claude Opus 4.8 via `@anthropic-ai/sdk` (rate-limited: 20 req/60s, 1000-char cap)
- Migration 009 exists on disk but **must still be run in Supabase SQL Editor**

**Key files to read first:**
```
lib/db/prices.ts          — all price query functions
lib/db/client.ts          — Supabase singleton (canonical import)
app/api/chat/route.ts     — rate limiter implementation
supabase/migrations/      — 001–009, run in order
```

**Env vars needed (all four):**
```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
```

**Highest-impact next tasks (in order):**
1. Run migration 009 in Supabase SQL Editor
2. Backfill `plan_id` on non-default plan prices (plan selector shows "No prices" for Premium/Family tiers)
3. Switch `/search`, `/cheapest`, `/compare` pages from mock to `lib/db`
4. Add analytics ingestion (Plausible → `page_metrics`)
5. Fix `getCountryAppPriceTable` N+1 query (~21 Supabase calls per country page)

---

## 1. Project Overview

**Purpose:** App Price Radar helps users find the cheapest country to subscribe to apps like ChatGPT, Spotify, Netflix, and 82 others. Prices vary dramatically across App Store storefronts — India is typically 70–80% cheaper than the US for subscription apps.

**Tech stack:**

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16.2.7 (App Router) | Server components + client wrappers pattern |
| UI | React 19, Tailwind CSS v4, lucide-react | |
| Database | Supabase (PostgreSQL + RLS) | Anon key for frontend, service role for scripts |
| AI | Anthropic SDK, Claude Opus 4.8 | `/api/chat` endpoint |
| i18n | Custom React context | `locales/en.ts` + `locales/zh.ts` |
| Scripts | tsx + dotenv | Node 20, `.env.local` |
| CI | GitHub Actions | Daily at 02:00 UTC |

**Scale:** 85 apps × 20 countries = 1,700 app×country pairs. ~1,625 price rows currently seeded.

---

## 2. Current Architecture

### Data flow

```
iTunes Lookup API ──► price_observations ──► promote_verified_observations() ──► current_prices
                            (staging)              (DB function)                     (live)
                                                         │
Frankfurter API ──────────────────────────────► exchange_rates                       │
                                                                                      ▼
Manual seed SQL ──────────────────────────────────────────────────────────► price_history
(subscription prices)                                                        (daily snapshots)
```

### Request path

```
Browser → Next.js server component
              │
              ├── lib/db/*.ts (if SUPABASE_URL set)
              │       └── Supabase PostgreSQL
              │
              └── mock/*.ts (fallback when no env vars)
              │
              ▼
         Client component ('use client')
              └── useLocale() for i18n
```

### Supabase fallback pattern

Every `lib/db/*.ts` function starts with:
```typescript
if (!supabase) return mockData;
```
This means the entire site works offline or in preview environments without database access.

### Single Supabase client

`lib/db/client.ts` is the **only** place the client is instantiated. All imports must come from here — the old `lib/supabase/client.ts` has been deleted.

```typescript
// Correct
import { supabase, isSupabaseAvailable } from '@/lib/db/client';

// Wrong — file no longer exists
import { supabase } from '@/lib/supabase/client';
```

---

## 3. Database Schema

### Tables (13 total)

| Table | Migration | Purpose |
|---|---|---|
| `apps` | 001 | 85 tracked apps (id, name, developer, category, icon_url) |
| `countries` | 001 | 20 countries (ISO code, name, currency, flag) |
| `exchange_rates` | 001 | 19 currencies → USD and CNY rates |
| `current_prices` | 001+006 | Live price per app×country×plan. Source-typed. |
| `price_history` | 001+006 | Daily snapshots of current_prices |
| `plans` | 006 | Subscription tiers per app (Plus, Individual, Family, etc.) |
| `inclusion_scores` | 004 | Priority score per app×country pair (0–100) |
| `app_scores` | 005 | Priority score per app (0–100) |
| `country_scores` | 005 | Priority score per country (0–100) |
| `crawl_jobs` | 007 | Job queue for the crawl pipeline |
| `price_observations` | 007 | Staging area for raw crawled prices |
| `page_metrics` | 008 | Daily page engagement (views, clicks) |
| `search_console_metrics` | 008 | Google Search Console impressions/clicks/CTR |
| `scoring_training_examples` | 008 | ML training dataset (features + future targets) |

### Key design decisions

**`current_prices` unique constraint (post-migration 009):**
Two partial unique indexes handle nullable `plan_id` correctly:
```sql
-- App-level prices (plan_id IS NULL)
UNIQUE (app_id, country_code) WHERE plan_id IS NULL

-- Plan-level prices (plan_id IS NOT NULL)
UNIQUE (app_id, country_code, plan_id) WHERE plan_id IS NOT NULL
```

**`source_type` on `current_prices`:**
- `manual_seed` — subscription prices set manually; **never overwritten by automated crawls**
- `itunes_lookup` — fetched from iTunes Lookup API
- `community` — future user-contributed prices

**RLS:** All tables have RLS enabled. `anon` role has SELECT only. Write access requires `service_role` key (scripts only).

---

## 4. Migration History (001 → 009)

Run in Supabase SQL Editor in this exact order. Each is idempotent.

| Migration | What it does |
|---|---|
| `001_initial_schema.sql` | Core tables: apps, countries, exchange_rates, current_prices, price_history. RLS. |
| `002_schema_fix.sql` | Adds `flag` column to countries. Fixes triggers and RLS for existing DBs. |
| `003_price_source_tracking.sql` | Adds `source_type`, `source_name`, `source_url`, `confidence_level`, `last_verified_at` to current_prices and price_history. |
| `004_inclusion_scoring.sql` | New table: `inclusion_scores` — one row per app×country pair with composite priority score (0–100). |
| `005_app_country_scores.sql` | New tables: `app_scores` and `country_scores` — standalone per-app and per-country priority scores. |
| `006_plans.sql` | New table: `plans`. Adds nullable `plan_id` FK to current_prices and price_history. |
| `007_crawl_pipeline.sql` | New tables: `crawl_jobs` and `price_observations`. Creates `promote_verified_observations()` DB function. |
| `008_analytics_scoring.sql` | New tables: `page_metrics`, `search_console_metrics`, `scoring_training_examples`. No write RLS policies — add before ingestion. |
| **`009_fix_current_prices_unique_constraint.sql`** | **⚠ Must run.** Fixes the unique constraint on current_prices to include plan_id via two partial indexes. Replaces promote function with plan-aware version. |

**Seeds (run after all migrations):**
```
001_base_data.sql        — 85 apps, 20 countries, 19 exchange rates
002_prices.sql           — 1,625 current_prices rows (manual_seed tagged)
003_inclusion_scores.sql — 1,680 app×country inclusion_scores rows
004_app_scores.sql       — 84 app_scores rows
005_country_scores.sql   — 20 country_scores rows
005_plans.sql            — 145 plans + plan_id backfill on current_prices
```

---

## 5. Crawl Pipeline

### Purpose

Automates fetching of one-time paid app prices (Procreate, Minecraft, etc.) from the iTunes Lookup API. Subscription prices cannot be auto-fetched — iTunes returns `price: 0` for freemium/subscription apps.

### Pipeline steps

```
[0] Reset stuck jobs    — crawl-run.ts: resets 'running' jobs older than 2h to 'pending'
[1] Create jobs         -- crawl-create-jobs.ts (--create-jobs flag)
[2] Crawl iTunes        -- crawl-itunes.ts: fetches prices → price_observations
[3] Promote verified    -- promote_verified_observations() DB function
[4] Snapshot history    -- crawl-run.ts: current_prices → price_history (once/day)
```

### Scripts

| Script | Command | Description |
|---|---|---|
| `crawl-create-jobs.ts` | `npm run crawl:create-jobs` | Enqueues one job per app×country, ordered by inclusion_score priority |
| `crawl-itunes.ts` | `npm run crawl:itunes` | Claims pending jobs, fetches iTunes prices, writes to price_observations |
| `crawl-run.ts` | `npm run crawl:run` | Full orchestration: reset stuck → [create jobs] → crawl → promote → snapshot |

### Quality thresholds (in crawl-itunes.ts)

| Condition | observation_status | confidence_level |
|---|---|---|
| No existing price | `verified` | `high` |
| Price delta ≤ 50% | `verified` | `high` |
| Price delta > 50% | `pending` | `low` (needs manual review) |
| Existing is manual_seed | `rejected` | `medium` |

### GitHub Actions

Runs daily at 02:00 UTC:
```yaml
1. update:fx       — exchange rates (Frankfurter API → exchange_rates)
2. crawl:run       — full crawl pipeline (price_observations → current_prices)
3. update:history  — snapshot (current_prices → price_history)
```

**Required CI secrets:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 6. Price Verification Flow

### The staged pipeline (critical for data integrity)

Raw prices never touch `current_prices` directly. They land in `price_observations` first and are only promoted after passing quality checks.

```
iTunes API response
        │
        ▼
price_observations (observation_status = 'pending')
        │
   [crawl-itunes.ts quality checks]
        │
        ├── manual_seed exists → rejected (manual_lock = true)
        ├── delta > 50% → pending, confidence = low (queue for human review)
        └── otherwise → verified, confidence = high
        │
        ▼
promote_verified_observations() [DB function]
        │
        ├── skips: manual_lock = true
        ├── skips: current_prices.source_type = 'manual_seed'
        └── upserts: everything else
        │
        ▼
current_prices (live data)
```

### Manual seed protection (non-negotiable rule)

Subscription prices (`source_type = 'manual_seed'`) are **never overwritten by automated crawls**. This is enforced in two places:
1. `crawl-itunes.ts`: sets `manual_lock = true` on the observation
2. `promote_verified_observations()`: SQL `WHERE current_prices.source_type != 'manual_seed'`

Subscription prices must be updated manually (edit `supabase/seeds/002_prices.sql` and re-seed, or use an admin SQL update).

### Monitoring stuck observations

```sql
-- Low-confidence observations needing manual review
SELECT app_id, country_code, price, prev_price, price_delta_pct
FROM price_observations
WHERE observation_status = 'pending' AND confidence_level = 'low'
ORDER BY abs(price_delta_pct) DESC;
```

---

## 7. AIS / CIS / CPS Scoring System

Three complementary scoring tables drive pipeline priority and editorial focus.

### AIS — App Inclusion Score (`app_scores`)

**Answers:** "How important is this app to keep updated?"

```
app_score = 0.40 × popularity_score   (global demand proxy)
          + 0.25 × category_score     (strategic category value)
          + 0.20 × price_range_score  (higher price → more savings potential)
          + 0.15 × coverage_score     (completeness across 20 countries)
```

Top apps: ChatGPT (84.4, critical), Netflix (80.2, critical), YouTube Premium (78.4, high).

### CIS — Country Inclusion Score (`country_scores`)

**Answers:** "How valuable is this country's pricing data?"

```
country_score = 0.35 × savings_potential  (% cheaper than US)
              + 0.30 × market_size        (App Store user base weight)
              + 0.20 × data_quality       (currency stability)
              + 0.15 × user_demand        (inferred query volume)
```

Top countries: India (78.2, high), Turkey (64.4, high), Argentina (62.2, high), USA (61.8, high, high market size despite 0 savings).

### CPS — Combined Pair Score (`inclusion_scores`)

**Answers:** "How urgently should we refresh this specific app×country combination?"

```
pair_score = 0.35 × demand_score   (≈ app popularity)
           + 0.30 × savings_score  (country savings potential vs US)
           + 0.20 × coverage_score (source quality + data freshness)
           + 0.15 × market_score   (country market size)
```

Tiers: `critical` ≥ 80 · `high` ≥ 60 · `medium` ≥ 40 · `low` < 40

### Regenerating scores

```bash
node scripts/gen-scores.js   # rewrites seeds/004_app_scores.sql + seeds/005_country_scores.sql
```

Then re-run those seeds in Supabase SQL Editor.

---

## 8. Dynamic Scoring Weights Framework

### Current state: static hand-tuned weights

All weights (e.g., `0.35 × demand_score`) are hardcoded in `scripts/gen-scores.js` and the SQL seeds. They were designed by domain reasoning, not learned from data.

### Future state: ML-learned weights

The infrastructure to learn better weights already exists in the database schema:

**Data collection pipeline:**
1. `page_metrics` — daily on-site views and clicks per page (not yet wired)
2. `search_console_metrics` — GSC impressions, clicks, CTR, position (not yet wired)
3. `scoring_training_examples` — weekly batch job joins all signals into feature snapshots, then back-fills future engagement targets after the observation window closes

**Training approach:**

```python
# Phase 1 — once 500+ labelled examples exist (~1 week after analytics wired)
from xgboost import XGBClassifier
df = pd.read_sql("SELECT features, label FROM scoring_training_examples WHERE label IS NOT NULL", conn)
X = pd.json_normalize(df['features'])
y = df['label'].map({'high': 2, 'medium': 1, 'low': 0})
model.fit(X_train, y_train)
```

**Feature vector (stored as JSONB in `scoring_training_examples.features`):**
- `inclusion_score`, `demand_score`, `savings_score`, `coverage_score`, `market_score`
- `app_score`, `country_score`
- `price_usd`, `price_delta_pct_30d`
- `prev_views_7d`, `prev_clicks_7d`, `prev_impressions_30d`, `avg_position_30d`
- `source_type_encoded`, `confidence_level_encoded`, `is_default_plan`, `billing_period_encoded`

**Timeline to first training run:**
- Week 1–4: collect analytics data
- Week 5–8: begin creating training examples
- Week 9+: first model training possible
- Month 6+: retrain monthly with rolling window

---

## 9. Plans Architecture

### What plans are

Each app can have multiple subscription tiers. Examples:
- ChatGPT: Plus, Team, Enterprise
- Spotify: Individual, Duo, Family, Student
- Netflix: Standard with Ads, Standard, Premium

Plans are stored in the `plans` table:
```sql
plans.id            -- slug: 'chatgpt-plus', 'spotify-family'
plans.app_id        -- FK to apps
plans.name          -- display name
plans.billing_period -- monthly | annual | one_time | free
plans.is_default    -- true = shown in summary stats (one per app)
```

### How plan prices work

`current_prices.plan_id` is nullable:
- `NULL` = legacy app-level price (one price per app×country)
- Set = plan-level price (one price per app×country×plan)

Migration 009 fixes the unique constraint to correctly handle both cases.

### Plan selector UI (`/apps/[id]`)

1. Server page fetches the app + all plans + default plan prices
2. Renders `AppDetailClient` with plan pills
3. User clicks a non-default plan → client fetches `/api/plans/[planId]?appId=`
4. `getAppPriceTableByPlan()` in `lib/db/prices.ts` returns plan-specific rows
5. Price table updates in place

### Known gap

Non-default plans (Netflix Premium, Spotify Family, etc.) have no `plan_id` in `current_prices` — only the default plan was backfilled by seed `005_plans.sql`. The plan selector shows "No prices available" when a non-default plan is selected.

**Fix:** Extend `scripts/crawl-itunes.ts` to fetch and write plan-specific prices with `plan_id` set. Subscription plan prices must still be manually seeded (iTunes API returns $0 for them).

---

## 10. Analytics & ML Roadmap

### Current state

Three analytics tables exist in the schema (migration 008) but are completely empty:
- `page_metrics` — no ingestion wired
- `search_console_metrics` — no GSC export job
- `scoring_training_examples` — no batch job creating examples

**Missing RLS policy:** `page_metrics` and `search_console_metrics` have no INSERT policy for the service role. Before writing to them, run:
```sql
CREATE POLICY "service role write page_metrics"
  ON page_metrics FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "service role write search_console_metrics"
  ON search_console_metrics FOR INSERT TO service_role WITH CHECK (true);
```

### Phase 1 — Wire analytics ingestion

**Option A — Plausible Analytics:**
Set up a nightly script that calls the Plausible API, aggregates views/clicks per page URL, and upserts into `page_metrics`.

**Option B — PostHog:**
Use PostHog's query API for the same nightly aggregation.

**Option C — Vercel Analytics:**
Use Vercel's data API if already deployed on Vercel.

### Phase 2 — GSC export

```typescript
// Daily cron: scripts/update-gsc.ts
// Uses googleapis npm package
// Fetches last 7 days of searchanalytics.query data
// Upserts into search_console_metrics
```

### Phase 3 — Training example creation

```sql
-- Weekly batch: creates scoring_training_examples rows
-- See full SQL in docs/scoring-model-training.md
INSERT INTO scoring_training_examples (app_id, country_code, features, ...)
SELECT ... FROM inclusion_scores i
LEFT JOIN app_scores a ON ...
LEFT JOIN current_prices cp ON ...
LEFT JOIN page_metrics pm ON ...
LEFT JOIN search_console_metrics gsc ON ...
```

### Phase 4 — Model training and deployment

Train XGBoost/LightGBM classifier on `scoring_training_examples`. Replace static `inclusion_scores` with model predictions. See `docs/scoring-model-training.md` for the complete feature spec and training example.

---

## 11. Environment Variables

| Variable | Where used | Required in |
|---|---|---|
| `SUPABASE_URL` | Frontend + all scripts | `.env.local` + GitHub Secret |
| `SUPABASE_ANON_KEY` | Frontend reads (RLS enforced) | `.env.local` only |
| `SUPABASE_SERVICE_ROLE_KEY` | Write scripts (bypasses RLS) | `.env.local` + GitHub Secret |
| `ANTHROPIC_API_KEY` | `/api/chat` route only | `.env.local` only |

**Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY` to the client.**

Run `npm run check:env` to verify all four are set before deploying.

---

## 12. Production Audit Results

Audit completed 2026-06-05. All critical issues resolved.

### Critical issues — RESOLVED

| Issue | Fix applied |
|---|---|
| `/api/chat` had no rate limiting or message length cap — unthrottled Claude API cost exposure | Added IP rate limiter (20 req/60s) + 1000-char cap in `app/api/chat/route.ts` |
| `promote_verified_observations()` ON CONFLICT excluded `plan_id` — multi-plan apps silently clobbered each other's prices | Migration 009 adds two partial unique indexes + rewrites the function with plan-aware upsert |
| Two separate Supabase client singletons (`lib/db/client.ts` vs `lib/supabase/client.ts`) — divergent null-guard logic | Deleted `lib/supabase/client.ts`; all imports now use `lib/db/client.ts` |

### High priority issues — RESOLVED

| Issue | Fix applied |
|---|---|
| `metadataBase` missing in layout.tsx — OG images could not resolve, social previews broken | Added `metadataBase: new URL('https://apppriceradar.com')` |
| Sitemap read from mock data — new Supabase apps/countries never appeared in sitemap | `app/sitemap.ts` is now async and queries Supabase with mock fallback |
| `update-itunes.ts` bypassed crawl pipeline's `manual_seed` protection | Added explicit `manual_seed` filter before upsert |
| `crawl-run.ts` had no stuck-job watchdog | Added `resetStuckJobs()` — resets `running` jobs older than 2h to `pending` |
| GitHub Actions used `update-itunes.ts` (bypasses pipeline) instead of `crawl-run.ts` | Updated workflow step 2 to `crawl-run.ts` |
| `ANTHROPIC_API_KEY` not checked by `check-env.ts` | Added to the VARS array |

### Remaining risks (medium, non-blocking)

| Risk | Severity | Notes |
|---|---|---|
| `getCountryAppPriceTable` N+1 query | Medium | ~21 Supabase calls per `/countries/[code]` page load |
| `crawl_jobs` unique constraint includes `status` | Medium | Completed jobs can be re-queued as new `pending` duplicates |
| `price_history` has no day-granularity unique constraint | Medium | Two crawl runs in one UTC day produce duplicate snapshot rows |
| `analytics` tables have no write path or INSERT RLS policy | Medium | Must add policy before wiring ingestion |
| Rate limiter is in-memory | Low | Independent counters per Vercel instance; use Vercel KV at scale |

---

## 13. Deployment Readiness

### Status: Ready to deploy ✓

All critical blockers have been resolved. **One manual step required before going live:**

> **Run migration 009 in Supabase SQL Editor:**
> `supabase/migrations/009_fix_current_prices_unique_constraint.sql`
>
> This fixes the unique constraint on `current_prices` to handle plan-level prices correctly. The app works without it (plan prices aren't widely used yet), but the `promote_verified_observations()` function will corrupt multi-plan data until it is run.

### Pre-launch checklist

- [ ] Run migration 009 in Supabase SQL Editor
- [ ] Add `ANTHROPIC_API_KEY` to `.env.local` and Vercel environment variables
- [ ] Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as GitHub Actions secrets
- [ ] Verify `npm run check:env` shows all four variables set
- [ ] Confirm `npm run build` passes (last result: ✓ 2026-06-05)
- [ ] Add INSERT RLS policies on `page_metrics` and `search_console_metrics` before wiring analytics

---

## 14. Remaining Technical Debt

### High impact (fix soon)

**Plan selector empty state** — Non-default plans (Netflix Premium, Spotify Family, etc.) show "No prices available" because `current_prices` has no `plan_id`-tagged rows for them. The plans table and schema are correct; the data gap is in the seeds and crawl script. Fix: manually add plan-level price rows to seed `002_prices.sql`, or extend `crawl-itunes.ts`.

**search/cheapest/compare pages use mock data** — `/search`, `/cheapest/[appId]`, and `/compare/[appId]` all import directly from `mock/` instead of `lib/db`. They work but never reflect Supabase data.

### Medium impact (fix before growth)

**N+1 in `getCountryAppPriceTable`** (`lib/db/prices.ts:106–138`) — For each app in a country's price list, a separate Supabase query fetches that app's all-country prices to determine rank. 20 apps = 21 total queries. Fix: batch with a single `IN (app_ids)` query, then group in memory.

**`crawl_jobs` unique constraint design** — `UNIQUE (app_id, country_code, plan_id, status)` means the same job can exist as both `pending` and `done`. After jobs complete, `create-jobs` will re-queue duplicates. Fix: change to `UNIQUE (app_id, country_code, plan_id)` and use a status filter instead.

**`price_history` duplicate snapshots** — No day-level unique constraint. If `crawl-run.ts` runs twice in one UTC day, duplicate history rows are written (the soft guard in `snapshotHistory()` has a race window). Fix: add `UNIQUE (app_id, country_code, plan_id, recorded_at::date)`.

### Low impact

**Homepage uses mock data** — `app/page.tsx` imports directly from `mock/apps.ts`. Straightforward to switch.

**In-memory rate limiter** — Works correctly for single-instance deploys. On Vercel's multi-instance edge, each instance has an independent counter. Switch to `@vercel/kv` if the rate limit becomes a real concern.

---

## 15. Recommended Phase 2 Roadmap

### P2.1 — Complete data coverage (1–2 weeks)

1. **Backfill plan-level prices** — Add price rows to seed `002_prices.sql` for the top non-default plans (Netflix Premium, Spotify Family, YouTube Premium, etc.) tagged with `plan_id`. These are the plans users actually care about.
2. **Switch search/cheapest/compare to `lib/db`** — Three page files, same pattern as `/country-ranking` migration (already done).
3. **Homepage Supabase switch** — `app/page.tsx` still uses mock. Low effort.

### P2.2 — Analytics foundation (2–4 weeks)

4. **Wire page_metrics ingestion** — Choose analytics provider (Plausible recommended for simplicity), write nightly aggregation script, add INSERT RLS policy, start collecting.
5. **GSC export script** — `scripts/update-gsc.ts` — daily export of Search Console data into `search_console_metrics`.
6. **Start scoring_training_examples batch** — Once analytics data has 4+ weeks of history, run weekly batch to create training examples.

### P2.3 — Performance and quality (2–3 weeks)

7. **Fix N+1 in `getCountryAppPriceTable`** — Batch the all-country price lookups into a single query.
8. **Fix crawl_jobs unique constraint** — Remove `status` from the unique key, add a `WHERE status IN ('pending','running')` filter in `crawl-create-jobs.ts`.
9. **Add price_history unique constraint** — Prevent duplicate daily snapshots.

### P2.4 — ML scoring (months 2–3, after data accumulates)

10. **First model training run** — Once 500+ labelled `scoring_training_examples` rows exist, train XGBoost classifier. Replace static `inclusion_scores` with model predictions.
11. **Crawl pipeline priority from model** — Use predicted labels to weight `crawl_jobs.priority` dynamically.
12. **A/B test scoring weights** — Compare static vs learned scores by tracking which drives more `/apps/[id]` page views.

### P2.5 — Monetisation hooks

13. **Affiliate deep links** — Replace current "Subscribe" buttons with tracked App Store affiliate URLs (Apple Search Ads Attribution API or a simple redirect + analytics event).
14. **Email price alerts** — User subscribes to a price; nightly job diffs `price_history` and sends email when price drops.
15. **Subscription plan price tracking** — The hardest data problem: scraping or community-sourcing IAP subscription prices to keep manual seeds fresh.

---

## File Structure Reference

```
app/
  page.tsx                    — homepage (mock data — not yet switched to Supabase)
  layout.tsx                  — root layout; metadataBase set; Geist font
  sitemap.ts                  — async; reads Supabase app/country IDs, mock fallback
  not-found.tsx               — custom 404 with search
  app-ranking/page.tsx        — server: getAllApps + getAppPriceTable
  apps/[id]/page.tsx          — server: getAppById + getPlansByApp + getAppPriceTable
  apps/[id]/AppDetailClient.tsx — client: plan pills, price table
  country-ranking/page.tsx    — server: getCountryRanking() (Supabase)
  countries/[code]/page.tsx   — server: getCountryByCode + getCountryAppPriceTable
  api/
    chat/route.ts             — POST; rate limit 20/60s; 1000-char cap; Claude Opus 4.8
    plans/[planId]/route.ts   — GET; getAppPriceTableByPlan
    db-health/route.ts        — GET; table counts (no auth — internal only)

lib/
  chat.ts                     — Anthropic SDK wrapper; system prompt; processMessage()
  db/
    client.ts                 — Supabase singleton (CANONICAL — import only from here)
    apps.ts                   — getAllApps, getAppById, searchApps
    countries.ts              — getAllCountries, getCountryByCode, searchCountries
    prices.ts                 — getAppPriceTable, getAppPriceTableByPlan, getCountryRanking
                                 getCountryAppPriceTable, getPriceHistory
    plans.ts                  — getPlansByApp, getDefaultPlan, getAllPlans
    index.ts                  — re-exports all functions and supabase/isSupabaseAvailable
  price.ts                    — mock-only price utils (used by /cheapest, /compare, /search)
  useLocale.tsx               — i18n context (client-only)
  ranking.ts                  — mock-only ranking utils (used by /cheapest, /compare)

scripts/
  check-env.ts               — validates all 4 env vars
  update-fx.ts               — Frankfurter API → exchange_rates
  update-itunes.ts           — iTunes Lookup → current_prices (manual_seed protected)
  update-history.ts          — current_prices → price_history (idempotent)
  crawl-create-jobs.ts       — enqueue crawl_jobs from inclusion_scores
  crawl-itunes.ts            — claim jobs → fetch iTunes → price_observations
  crawl-run.ts               — orchestrator: reset stuck → crawl → promote → snapshot
  gen-scores.js              — regenerate seeds/004+005 from scoring formulas

supabase/
  migrations/001–009         — see Migration History section
  seeds/001–005              — base data, prices, scores, plans

.github/workflows/
  daily-update.yml           — 02:00 UTC: update:fx → crawl:run → update:history

docs/
  PROJECT_HANDOFF_SUMMARY.md     — THIS FILE — single source of truth
  handoff-notes.md               — SUPERSEDED by this document
  daily-update-pipeline.md       — script-level docs for update:fx/itunes/history
  crawling-and-data-quality.md   — crawl pipeline architecture and quality thresholds
  inclusion-scoring-system.md    — AIS/CIS/CPS scoring formulas and all scores
  scoring-model-training.md      — ML training plan, feature spec, SQL batch query
```

---

## Build Status

Last run: 2026-06-05

```
▲ Next.js 16.2.7 (Turbopack)

✓ Compiled successfully in 2.6s
✓ TypeScript: no errors
✓ 207 pages generated (1572ms)

Route summary:
  ○ Static   — /, /ai, /app-ranking, /country-ranking, /search, /about,
               /contact, /privacy, /terms, /disclaimer, /data-sources, /robots.txt
  ● SSG      — /cheapest/[appId] (85), /compare/[appId] (85), /subscribe/[cc] (20)
  ƒ Dynamic  — /api/chat, /api/db-health, /api/plans/[planId],
               /apps/[id], /countries/[code], /sitemap.xml
```
