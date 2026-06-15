# Current Sprint — App Price Radar

> Last updated: 2026-06-05
> Build: ✓ clean — 0 TypeScript errors, 208 pages
> Branch: main

---

## What was completed this session

### Infrastructure (done)
- **Migration 009** — Fixed `current_prices` unique constraint via two partial indexes (NULL/NOT NULL plan_id). Added `snapshot_date` column to `price_history` with backfill. Rewrote `promote_verified_observations()` with plan-aware ON CONFLICT branches. Scripts `update-history.ts` and `crawl-run.ts` updated to populate `snapshot_date`.
- **N+1 fix** — `getCountryAppPriceTable` in `lib/db/prices.ts` replaced per-app inner query loop with a single batched `.in('app_id', appIds)` query. Country pages now use 3 Supabase calls total instead of ~21.
- **Pages switched to `lib/db`** — `app/page.tsx`, `app/cheapest/[appId]/page.tsx`, `app/compare/[appId]/page.tsx`, `app/search/page.tsx` all migrated from mock data. A new `/api/search` route was added to serve Supabase-backed search to the client component.
- **Migration 010** — Scoring framework: `scoring_config` + `scoring_model_registry` tables with seeded static weights for AIS/CIS/CPS/VP. INSERT RLS policies added to `page_metrics`, `search_console_metrics`, `scoring_training_examples`. Fixed `scoring_training_examples` unique constraint for plan_id.
- **Migration 011** — UPDATE RLS for analytics tables. `create_training_snapshot(date)` SQL function. `backfill_target_labels()` SQL function. Weekly CI workflow (`weekly-training-snapshot.yml`, Mondays 03:00 UTC).
- **Migration 012** — Phase 1.5 feature layer: `app_features`, `country_features`, `crawl_features`, `feature_history` tables. All sourced from pre-launch data only (no page_metrics, no search_console_metrics).
- **Scripts added** — `create-training-examples.ts`, `backfill-training-examples.ts`, `backfill-scoring-features.ts`
- **CI updated** — `daily-update.yml` now runs `backfill-scoring-features.ts` as step 4 after every price history snapshot.

---

## Migration status

| Migration | Status | Where to run |
|---|---|---|
| 001–008 | ✓ Applied | Already in Supabase |
| **009** | ⚠ On disk only | **Run in Supabase SQL Editor** |
| **010** | ⚠ On disk only | **Run in Supabase SQL Editor** |
| **011** | ⚠ On disk only | **Run in Supabase SQL Editor** |
| **012** | ⚠ On disk only | **Run in Supabase SQL Editor** |

Migrations 009–012 must be run in order. Each is idempotent.

---

## Feature layer table counts (after backfill)

| Table | Expected rows | Source |
|---|---|---|
| `app_features` | 85 | one per tracked app |
| `country_features` | 20 | one per tracked country |
| `crawl_features` | ~1,700 | one per app×country pair in `current_prices` ∪ `crawl_jobs` |
| `feature_history` | ~1,805/day | daily snapshots of all three |

Run `npm run features:refresh` once after migration 012 to seed these tables.

---

## Next sprint — Sprint 2

### Priority 1: Deploy migrations and seed feature layer (1 day)

1. Run migrations 009, 010, 011, 012 in Supabase SQL Editor in order
2. Run `npm run features:refresh` to populate `app_features`, `country_features`, `crawl_features`
3. Run `npm run training:backfill` to seed `scoring_training_examples` from historical `price_history`
4. Add `ANTHROPIC_API_KEY` to `.env.local` and Vercel environment — the AI chat endpoint is the only thing currently broken

### Priority 2: Analytics ingestion (1–2 days)

Wire `page_metrics` collection — choose one provider:
- **Plausible** (recommended): nightly script calls `GET /api/v1/stats/breakdown?property=event:page` → upsert into `page_metrics`
- **PostHog**: equivalent query API
- **Vercel Analytics**: `GET /v1/web/projects/{id}/analytics` if deployed on Vercel

Script location: `scripts/update-plausible.ts` (or equivalent)
Add as step 5 in `daily-update.yml`.

### Priority 3: GSC export (1 day)

Create `scripts/update-gsc.ts`:
- Use `googleapis` npm package
- Fetch last 7 days from `searchanalytics.query` endpoint
- Upsert into `search_console_metrics`
- Requires Google service account + `GSC_KEY_JSON` env var + GitHub secret

### Priority 4: Non-default plan prices (1–2 days)

The plan selector currently shows "No prices available" for non-default plans (Netflix Premium, Spotify Family, YouTube Premium Family, etc.). Fix by manually adding `plan_id`-tagged rows to `supabase/seeds/002_prices.sql` for the top 10 most user-visible non-default plans.

### Priority 5: crawl_jobs constraint fix (2 hours)

Migration 013: Change `UNIQUE (app_id, country_code, plan_id, status)` to `UNIQUE (app_id, country_code, plan_id)` on `crawl_jobs`. Add `WHERE status IN ('pending','running')` guard in `crawl-create-jobs.ts` to prevent re-queuing completed work.

---

## Known gaps (non-blocking at launch)

| Gap | Impact | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` missing from `.env.local` | AI chat broken | Add to env — no code change needed |
| Non-default plan prices empty | Plan selector shows "No prices" | Manual seed data needed |
| `crawl_jobs` unique includes `status` | Completed jobs re-queued | Migration 013 fix |
| In-memory rate limiter | Multi-instance Vercel drift | Switch to `@vercel/kv` at scale |
| `page_metrics` empty | No engagement targets | Blocked on analytics provider choice |
| `search_console_metrics` empty | No GSC features | Blocked on GSC service account |

---

## File map (as of 2026-06-05)

```
app/
  page.tsx                      → server component; reads lib/db
  HomeClient.tsx                → 'use client'; receives data as props
  cheapest/[appId]/page.tsx     → server; lib/db (switched this session)
  compare/[appId]/page.tsx      → server; lib/db (switched this session)
  search/page.tsx               → 'use client'; calls /api/search
  api/
    chat/route.ts               → rate-limited; Claude Opus 4.8
    search/route.ts             → NEW: Supabase-backed search
    plans/[planId]/route.ts     → plan-level price table
    db-health/route.ts          → table counts

lib/db/
  client.ts                     → CANONICAL Supabase singleton
  apps.ts / countries.ts / plans.ts / prices.ts / index.ts

scripts/
  backfill-scoring-features.ts  → NEW: populates feature layer tables
  create-training-examples.ts   → NEW: weekly training snapshot
  backfill-training-examples.ts → NEW: one-shot historical backfill
  crawl-run.ts                  → daily orchestrator (now includes feature refresh)
  [others unchanged]

supabase/migrations/
  009 — current_prices + price_history uniqueness + promote function
  010 — scoring_config + scoring_model_registry + RLS fixes
  011 — training snapshot SQL functions + UPDATE RLS
  012 — app_features + country_features + crawl_features + feature_history

.github/workflows/
  daily-update.yml              → 4 steps: fx → crawl → history → features
  weekly-training-snapshot.yml  → NEW: Mondays 03:00 UTC

docs/
  PROJECT_HANDOFF_SUMMARY.md   → original architecture reference (pre-session)
  CURRENT_SPRINT.md             → THIS FILE — current state
  lightgbm-scoring-framework.md → scoring model weights and deployment pattern
  feature-collection-infrastructure.md → training data collection plan
  feature-layer-baseline.md     → Phase 1.5 feature tables reference
```
