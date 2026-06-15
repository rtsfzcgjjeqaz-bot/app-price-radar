# App Price Radar — New Session Prompt

> Copy everything below this line into a new Claude Code session.

---

## Project context

You are continuing development of **App Price Radar** — a Next.js 16 App Router site that compares App Store subscription prices across 85 apps and 20 countries. The database is Supabase (PostgreSQL). All pages fall back to mock data when env vars are absent.

**Read these files first, in order:**
```
docs/CURRENT_SPRINT.md              — what was done last session + next sprint
docs/lightgbm-scoring-framework.md  — AIS/CIS/CPS/VP scoring models and weights
docs/feature-layer-baseline.md      — Phase 1.5 feature tables (app_features etc.)
lib/db/prices.ts                    — all price query functions
lib/db/client.ts                    — canonical Supabase singleton
```

---

## Current state (2026-06-05)

**Build:** ✓ clean — `npm run build` passes, 0 TypeScript errors, 208 pages.

**Env vars:**
```
SUPABASE_URL              ✓ set
SUPABASE_ANON_KEY         ✓ set
SUPABASE_SERVICE_ROLE_KEY ✓ set
ANTHROPIC_API_KEY         ✗ MISSING — AI chat endpoint broken until added
```

---

## Architecture summary

**Tech stack:**
- Next.js 16.2.7 App Router — server components + `'use client'` wrappers
- React 19, Tailwind CSS v4, lucide-react
- Supabase (PostgreSQL + RLS) — anon key for frontend reads, service role for scripts
- Anthropic SDK — `claude-opus-4-8`, adaptive thinking, `/api/chat` endpoint
- TypeScript scripts via `tsx` + `dotenv`, Node 20
- GitHub Actions CI — daily 02:00 UTC + weekly Monday 03:00 UTC

**Data flow:**
```
iTunes Lookup API → price_observations → promote_verified_observations() → current_prices
Frankfurter API   → exchange_rates
Manual SQL seeds  → current_prices (subscription prices, never overwritten by crawls)
daily CI          → price_history (snapshot) → app_features / country_features / crawl_features
```

**Request path:**
```
Browser → Next.js server component
  ├── lib/db/*.ts   (if SUPABASE_URL set)
  └── mock/*.ts     (fallback — site works without Supabase)
       ↓
  'use client' component → useLocale() for i18n
```

**Canonical Supabase import:**
```typescript
import { supabase, isSupabaseAvailable } from '@/lib/db/client';
// NEVER import from @/lib/supabase/client — that file was deleted
```

**Supabase fallback pattern (every lib/db function):**
```typescript
if (!supabase) return mockData;
```

---

## Database schema — 16 tables

| Table | Migration | Purpose |
|---|---|---|
| `apps` | 001 | 85 tracked apps |
| `countries` | 001 | 20 countries |
| `exchange_rates` | 001 | 19 currencies → USD + CNY |
| `current_prices` | 001+003+006+009 | Live price per app×country×plan |
| `price_history` | 001+003+006+009 | Daily snapshots. Has `snapshot_date date` column |
| `plans` | 006 | Subscription tiers per app |
| `inclusion_scores` | 004 | CPS priority score per app×country pair (0–100) |
| `app_scores` | 005 | AIS per-app priority score |
| `country_scores` | 005 | CIS per-country priority score |
| `crawl_jobs` | 007 | Job queue for iTunes crawl pipeline |
| `price_observations` | 007 | Staging area for raw crawled prices |
| `page_metrics` | 008 | Daily on-site views/clicks (empty — not yet wired) |
| `search_console_metrics` | 008 | GSC impressions/clicks (empty — not yet wired) |
| `scoring_training_examples` | 008+010 | ML training dataset (empty — collecting) |
| `scoring_config` | 010 | Versioned weight vectors for AIS/CIS/CPS/VP |
| `scoring_model_registry` | 010 | Points to active config per model type |
| `app_features` | 012 | Per-app baseline feature vector (needs backfill) |
| `country_features` | 012 | Per-country baseline feature vector (needs backfill) |
| `crawl_features` | 012 | Per app×country crawl quality signals (needs backfill) |
| `feature_history` | 012 | Append-only daily JSONB snapshots of above three |

**`current_prices` uniqueness (post-migration 009):**
```sql
UNIQUE (app_id, country_code) WHERE plan_id IS NULL      -- uq_current_prices_no_plan
UNIQUE (app_id, country_code, plan_id) WHERE plan_id IS NOT NULL  -- uq_current_prices_with_plan
```

**`price_history` uniqueness (post-migration 009):**
```sql
UNIQUE (app_id, country_code, snapshot_date) WHERE plan_id IS NULL
UNIQUE (app_id, country_code, plan_id, snapshot_date) WHERE plan_id IS NOT NULL
```

---

## Migration status

**Run in Supabase SQL Editor in this exact order — migrations 009–012 are on disk but NOT yet applied:**

| Migration | Status |
|---|---|
| 001–008 | ✓ Applied |
| `009_fix_current_prices_unique_constraint.sql` | ⚠ **MUST RUN** |
| `010_scoring_framework.sql` | ⚠ **MUST RUN** |
| `011_training_snapshot_functions.sql` | ⚠ **MUST RUN** |
| `012_feature_layer_baseline.sql` | ⚠ **MUST RUN** |

After running all four, execute the one-time backfill:
```bash
npm run features:refresh    # populates app_features, country_features, crawl_features
npm run training:backfill   # seeds scoring_training_examples from price_history
```

---

## Scoring models

Four models. All weights stored in `scoring_config` (seeded by migration 010). Active config tracked by `scoring_model_registry`. To deploy new weights: INSERT a new `scoring_config` row, UPDATE the registry FK — no code changes.

**AIS** (app_scores):
`score = 0.40×popularity + 0.25×category + 0.20×price_range + 0.15×coverage`

**CIS** (country_scores):
`score = 0.35×savings_potential + 0.30×market_size + 0.20×data_quality + 0.15×user_demand`

**CPS** (inclusion_scores):
`score = 0.35×demand + 0.30×savings + 0.20×coverage + 0.15×market`

**VP** (verification priority):
`if |delta| <= 50%: auto-verify; else: hold for manual review`
`manual_seed prices: always rejected (never auto-promoted)`

Tier thresholds: critical ≥ 80, high ≥ 60, medium ≥ 40, low < 40.

---

## Feature layer (Phase 1.5)

Three tables created in migration 012. All derived from pre-launch operational data — no page_metrics, no search_console_metrics.

- **`app_features`** — plan count, price coverage %, USD range, source type mix, staleness, crawl success rate, observation rejection rate
- **`country_features`** — savings vs US %, price volatility (avg_delta_pct_30d), app coverage %, exchange rates
- **`crawl_features`** — per app×country: last crawl status/age, success rate, pending observation count, days since verification
- **`feature_history`** — append-only daily JSONB snapshots of all three (one row per entity per day)

Refreshed daily by CI step 4 (`scripts/backfill-scoring-features.ts`).

---

## CI workflows

**`daily-update.yml`** (02:00 UTC):
1. `update-fx.ts` — exchange rates
2. `crawl-run.ts` — iTunes crawl → price_observations → current_prices
3. `update-history.ts` — current_prices → price_history
4. `backfill-scoring-features.ts` — refresh feature tables

**`weekly-training-snapshot.yml`** (03:00 UTC Mondays):
- `create-training-examples.ts` — creates scoring_training_examples snapshot + labels closed windows

Required CI secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

---

## npm scripts

```bash
npm run dev                  # dev server
npm run build                # production build (must pass before any PR)
npm run check:env            # validate all 4 env vars
npm run update:fx            # fetch exchange rates
npm run crawl:run            # full crawl pipeline
npm run update:history       # snapshot current_prices → price_history
npm run features:refresh     # recompute app_features / country_features / crawl_features
npm run training:snapshot    # create this week's scoring_training_examples + label closed windows
npm run training:backfill    # one-shot historical backfill of scoring_training_examples
```

---

## Pages and data sources (current)

| Page | Data source | Notes |
|---|---|---|
| `/` | `lib/db` via server component → `HomeClient.tsx` | Switched this session |
| `/app-ranking` | `lib/db` | ✓ |
| `/apps/[id]` | `lib/db` | ✓ — plan selector works for default plan only |
| `/country-ranking` | `lib/db` | ✓ |
| `/countries/[code]` | `lib/db` | ✓ — N+1 fixed this session |
| `/cheapest/[appId]` | `lib/db` | Switched this session |
| `/compare/[appId]` | `lib/db` | Switched this session |
| `/search` | `/api/search` → `lib/db` | Switched this session |
| `/ai` | `/api/chat` → Claude Opus 4.8 | Broken until ANTHROPIC_API_KEY added |

---

## Next sprint tasks (Sprint 2)

**Do first — unblocks everything:**
1. Run migrations 009–012 in Supabase SQL Editor
2. `npm run features:refresh`
3. `npm run training:backfill`
4. Add `ANTHROPIC_API_KEY` to `.env.local` and Vercel

**Analytics ingestion (unblocks training data):**
5. Choose analytics provider — Plausible recommended
6. Write `scripts/update-plausible.ts` — nightly: Plausible API → `page_metrics`
7. Add as step 5 in `daily-update.yml`

**GSC export:**
8. Write `scripts/update-gsc.ts` — daily: Google Search Console API → `search_console_metrics`
9. Add `GSC_KEY_JSON` env var + GitHub secret

**Data completeness:**
10. Backfill non-default plan prices in `supabase/seeds/002_prices.sql` — Netflix Premium, Spotify Family, YouTube Family (top 10 non-default plans). Plan selector currently shows "No prices available" for these.

**Technical debt:**
11. Migration 013: Fix `crawl_jobs` unique constraint — remove `status` from key (allows duplicate pending/done jobs)

---

## Known gaps (non-blocking at launch)

| Gap | Fix |
|---|---|
| `ANTHROPIC_API_KEY` missing | Add to `.env.local` and Vercel |
| Non-default plan prices empty | Manual seed data in `002_prices.sql` |
| `page_metrics` empty | Analytics ingestion script |
| `search_console_metrics` empty | GSC export script |
| `crawl_jobs` unique includes `status` | Migration 013 |
| In-memory rate limiter | Switch to `@vercel/kv` at scale (low priority) |

---

## Important rules

- **Never modify `current_prices` directly** — always go through the crawl pipeline (`price_observations` → `promote_verified_observations()`)
- **Never overwrite `manual_seed` prices with automated crawls** — protected by both `crawl-itunes.ts` and `promote_verified_observations()`
- **Always import Supabase from `lib/db/client.ts`** — the old `lib/supabase/client.ts` was deleted
- **`npm run build` must pass before reporting any task complete**
- **Read `node_modules/next/dist/docs/` before writing Next.js code** — this is Next.js 16 with breaking API changes from training data
- **Never add features, refactor, or introduce abstractions beyond what the task requires**
