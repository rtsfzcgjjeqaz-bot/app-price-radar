# Feature Collection & Training Data Infrastructure

## Overview

This document covers the data collection pipeline that accumulates feature snapshots and engagement signals required for post-launch scoring model improvement. No ML is implemented yet — this infrastructure collects and labels the data so that a LightGBM model can be trained when sufficient history exists.

---

## Tables (all created in migrations 008–011)

| Table | Purpose | Populated by |
|---|---|---|
| `page_metrics` | Daily on-site views and clicks per page | Analytics ingestion script (Plausible / PostHog) |
| `search_console_metrics` | Daily GSC impressions, clicks, CTR, position per query+page | `scripts/update-gsc.ts` (not yet written) |
| `scoring_training_examples` | Weekly feature snapshots + future engagement targets | `scripts/create-training-examples.ts` |
| `scoring_config` | Versioned weight vectors for AIS / CIS / CPS / VP models | Migration 010 seeds; future ML deployments |
| `scoring_model_registry` | Points to the active config per model type | Migration 010 seeds |

---

## Feature Definitions

Every row in `scoring_training_examples` carries a `features` JSONB snapshot of 18 signals recorded at `observation_window_start`.

| Feature key | Type | Source | Notes |
|---|---|---|---|
| `inclusion_score` | float 0–100 | `inclusion_scores.score` | CPS composite score |
| `demand_score` | float 0–100 | `inclusion_scores.demand_score` | App popularity component |
| `savings_score` | float 0–100 | `inclusion_scores.savings_score` | Country savings vs US |
| `coverage_score` | float 0–100 | `inclusion_scores.coverage_score` | Data freshness / source quality |
| `market_score` | float 0–100 | `inclusion_scores.market_score` | Country market size |
| `app_score` | float 0–100 | `app_scores.score` | AIS composite |
| `country_score` | float 0–100 | `country_scores.score` | CIS composite |
| `price_usd` | float | `price_history` closest to snapshot date | Falls back to `current_prices` |
| `price_delta_pct_30d` | float | `(price_on_date − price_30d_ago) / price_30d_ago × 100` | 0 if no prior history row |
| `source_type_encoded` | int | `current_prices.source_type` | itunes_lookup=2, manual_seed=1, community=0 |
| `confidence_level_encoded` | int | `current_prices.confidence_level` | high=2, medium=1, low=0 |
| `prev_views_7d` | int | `page_metrics` sum in [date−7, date) | 0 before analytics ingestion starts |
| `prev_clicks_7d` | int | `page_metrics` sum in [date−7, date) | 0 before analytics ingestion starts |
| `prev_impressions_30d` | int | `search_console_metrics` sum in [date−30, date) | 0 before GSC export starts |
| `avg_position_30d` | float | `search_console_metrics` avg position in [date−30, date) | 0 before GSC export starts |
| `is_default_plan` | int | 1 for null-plan rows; from `plans.is_default` | 1 = shown in main price table |
| `billing_period_encoded` | int | `plans.billing_period` | monthly=3, annual=2, one_time=1, free=0 |

---

## Observation Window Rules

Each training example covers a 7-day observation window:

```
window_start = snapshot Monday
window_end   = snapshot Monday + 7 days
```

**No look-ahead.** All features in the snapshot are values that existed at or before `window_start`. This prevents data leakage into the training set.

**Target collection.** After `window_end` passes, `backfill_target_labels()` aggregates:
- `target_clicks_7d` — sum of `page_metrics.clicks` in `[window_start, window_end)`
- `target_impressions_30d` — sum of `search_console_metrics.impressions` in `[window_start, window_start + 30)`

**Label derivation:**

| Condition | Label |
|---|---|
| `clicks_7d >= 10` OR `impressions_30d >= 500` | `high` |
| `clicks_7d < 3` AND `impressions_30d < 100` | `low` |
| Everything else | `medium` |

**Pre-analytics rows.** Windows created before `page_metrics` and `search_console_metrics` ingestion started will have `target=0` and `label='low'`. This is expected — the model will learn that these rows have zero engagement. They are still useful training signal once analytics is running, because they represent the feature state at a known historical point.

---

## SQL Functions (migration 011)

### `create_training_snapshot(p_snapshot_date date) → int`

Creates one `scoring_training_examples` row per active `inclusion_scores` pair for the given date. Returns the number of rows inserted. Safe to re-run — `ON CONFLICT DO NOTHING`.

```sql
SELECT create_training_snapshot('2026-06-09');  -- creates rows for that Monday
```

### `backfill_target_labels() → int`

Closes all open observation windows where `window_end < current_date`. Fills in `target_clicks_7d`, `target_impressions_30d`, and `label`. Returns count of rows updated.

```sql
SELECT backfill_target_labels();
```

---

## Scripts

### `scripts/create-training-examples.ts`

**Runs weekly (Monday 03:00 UTC via `.github/workflows/weekly-training-snapshot.yml`)**

1. Calls `create_training_snapshot(today)` → creates feature snapshot for this week
2. Calls `backfill_target_labels()` → labels windows from prior weeks that have closed
3. Reports total and labelled row counts; prints notice when ≥500 labelled rows exist

```bash
npm run training:snapshot
```

### `scripts/backfill-training-examples.ts`

**One-shot historical backfill. Run once after migration 011.**

Iterates every Monday from the earliest `price_history.snapshot_date` to last Monday, calling `create_training_snapshot()` for each. Ends by calling `backfill_target_labels()`.

```bash
npm run training:backfill                  # all available history
npm run training:backfill -- --weeks=8    # last 8 weeks only
npm run training:backfill -- --dry-run    # show what would run, no writes
```

---

## CI Schedule

| Workflow | Schedule | Steps |
|---|---|---|
| `daily-update.yml` | 02:00 UTC daily | FX rates → crawl → price history snapshot |
| `weekly-training-snapshot.yml` | 03:00 UTC Mondays | `create-training-examples.ts` |

The weekly snapshot runs after Sunday's daily update so the prior week's `price_history` rows exist before the snapshot reads them.

---

## Historical Window Coverage

When `backfill-training-examples.ts` runs after migration 011 is applied:

- If `price_history` has been populated (by `crawl-run.ts` daily), snapshots back to the first available Monday will be created
- All windows whose `window_end` has passed will be labelled (most will be `low` because `page_metrics` is empty — this is correct)
- Once analytics ingestion starts, subsequent windows accumulate real engagement targets

**Expected label distribution at launch (no analytics yet):**
- `low`: ~100% (engagement data absent → targets = 0)
- This is fine — the model needs a mix of labels to be useful, which only comes after analytics runs for several weeks

**Expected label distribution after 8 weeks of analytics:**
- Top apps (ChatGPT, Spotify, Netflix) in savings countries → `high`
- Mid-tier apps in low-traffic countries → `low`
- Majority → `medium`

---

## What Remains for Post-Launch Learning

### Required before any training run

1. **Analytics ingestion** — wire `page_metrics`. Until this runs, `prev_views_7d` and `prev_clicks_7d` are always 0 and labels are always `low`. Minimum: 4 weeks of data.
2. **GSC export** — wire `search_console_metrics`. Provides `prev_impressions_30d` and `avg_position_30d`. Minimum: 8 weeks of data (GSC data is delayed ~3 days).
3. **500+ labelled rows** — reachable in 1 week at 1,700 pairs/batch once analytics is flowing. Recommended: 4–8 weeks for seasonal stability.

### Optional improvements to the snapshot function

- **Plan-level snapshots** — `create_training_snapshot()` currently creates one row per app×country (null plan_id). Once non-default plan prices are seeded, add a second pass for each plan.
- **Country-page metrics** — `page_metrics` currently only joined on `app_id`. Add a separate pass for `page_url = '/countries/' || country_code` to capture country-page engagement as additional features.

### Deploying improved weights (post-training)

The `scoring_config` and `scoring_model_registry` tables (migration 010) are designed for this. Deployment is two SQL statements — no code changes required. See `docs/lightgbm-scoring-framework.md` for the deployment pattern.

### Retraining cadence

| Phase | Trigger | Recommended model |
|---|---|---|
| First run | ≥500 labelled rows | LightGBM multi-class classifier (high/medium/low) |
| Ongoing | Monthly, rolling 6-month window | Same or regression on `target_clicks_7d` directly |
| Mature | Weekly, rolling 3-month window | Separate model per scoring dimension |
