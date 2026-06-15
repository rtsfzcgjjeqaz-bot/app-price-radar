# LightGBM Scoring Framework

## Overview

App Price Radar uses four complementary scoring models to decide which data to collect, how urgently to refresh it, and how confidently to accept crawled prices. This document describes how each model works, the default weights, and how the system is structured to accept LightGBM-learned weights in Phase 3 without schema changes.

---

## The Four Models

### 1. AIS — App Inclusion Score (`app_scores`, model_type = `ais`)

**Question answered:** "How important is this app to keep updated?"

```
app_score = w_popularity  × popularity_score    (default 0.40)
          + w_category    × category_score      (default 0.25)
          + w_price_range × price_range_score   (default 0.20)
          + w_coverage    × coverage_score      (default 0.15)
```

**Components:**

| Feature | Description | Range |
|---|---|---|
| `popularity_score` | Global demand proxy: App Store download rank and search volume tier, assigned manually | 20–90 |
| `category_score` | Strategic importance of the app's category to App Price Radar users | 30–80 |
| `price_range_score` | `min(100, round(base_price_usd / 30 × 100))` — higher subscription price means larger absolute savings | 0–100 |
| `coverage_score` | `round(available_countries / 20 × 100)` — completeness of price data across 20 tracked countries | 0–100 |

**Default weights** (`scoring_config` version `ais/static-v1`):
```json
{ "w_popularity": 0.40, "w_category": 0.25, "w_price_range": 0.20, "w_coverage": 0.15 }
```

**Rationale:** Popularity dominates (40%) because user interest is the primary driver of value. Price range (20%) rewards apps where finding a cheaper country saves real money. Coverage (15%) penalises incomplete data rather than rewarding completeness.

---

### 2. CIS — Country Inclusion Score (`country_scores`, model_type = `cis`)

**Question answered:** "How valuable is this country's pricing data?"

```
country_score = w_savings_potential × savings_potential   (default 0.35)
              + w_market_size       × market_size         (default 0.30)
              + w_data_quality      × data_quality        (default 0.20)
              + w_user_demand       × user_demand         (default 0.15)
```

**Components:**

| Feature | Description | Range |
|---|---|---|
| `savings_potential` | `min(100, max(0, (1 − country_multiplier) × 100) × (100/88))`. Argentina (12% of US price) normalises to 100 | 0–100 |
| `market_size` | App Store user base and revenue weight. US=95, JP=80, IN=78 | 0–100 |
| `data_quality` | Currency stability. USD/EUR/GBP = 90–95. TRY = 40. ARS = 25 | 0–100 |
| `user_demand` | Inferred query volume for this country on App Price Radar | 0–100 |

**Default weights** (`scoring_config` version `cis/static-v1`):
```json
{ "w_savings_potential": 0.35, "w_market_size": 0.30, "w_data_quality": 0.20, "w_user_demand": 0.15 }
```

**Rationale:** Savings potential leads (35%) because this is the core user value proposition. Market size (30%) ensures high-traffic countries like the US and Japan get fresh data even when savings are zero. Data quality (20%) discounts volatile currencies (Turkey, Argentina) whose converted prices are less reliable.

---

### 3. CPS — Combined Pair Score (`inclusion_scores`, model_type = `cps`)

**Question answered:** "How urgently should we refresh this specific app×country combination?"

```
pair_score = w_demand   × demand_score    (default 0.35)
           + w_savings  × savings_score   (default 0.30)
           + w_coverage × coverage_score  (default 0.20)
           + w_market   × market_score    (default 0.15)
```

**Components:**

| Feature | Description | Source |
|---|---|---|
| `demand_score` | App-level popularity (≈ `app_scores.popularity_score`) | `inclusion_scores.demand_score` |
| `savings_score` | Country savings potential vs US (≈ `country_scores.savings_potential`) | `inclusion_scores.savings_score` |
| `coverage_score` | Data freshness + source quality for this specific pair | `inclusion_scores.coverage_score` |
| `market_score` | Country market size (≈ `country_scores.market_size`) | `inclusion_scores.market_score` |

**Default weights** (`scoring_config` version `cps/static-v1`):
```json
{ "w_demand": 0.35, "w_savings": 0.30, "w_coverage": 0.20, "w_market": 0.15 }
```

**Crawl priority mapping:** `crawl_jobs.priority = max(1, round(100 − pair_score))`. Score 80 → priority 20 (runs first). Score 20 → priority 80 (runs last).

**Tier thresholds** (all three models share this default):
```
critical ≥ 80  →  crawl daily, manual review within 24h
high     ≥ 60  →  crawl every 2–3 days
medium   ≥ 40  →  crawl weekly
low      < 40  →  crawl monthly or on-demand
```

---

### 4. VP — Verification Priority (`price_observations`, model_type = `vp`)

**Question answered:** "Should this crawled price be auto-verified or held for manual review?"

This model does not compute a score — it applies delta thresholds to decide the fate of each `price_observations` row.

**Logic** (implemented in `scripts/crawl-itunes.ts`):

```
IF existing price is manual_seed:
    → observation_status = 'rejected'   (manual_lock = true)
    → Never auto-promoted (subscription prices are protected)

ELSE IF no existing price:
    → observation_status = 'verified', confidence_level = 'high'
    → Auto-promoted by promote_verified_observations()

ELSE:
    delta = abs((new_price − old_price) / old_price × 100)

    IF delta <= max_auto_verify_delta_pct (default 50%):
        → observation_status = 'verified', confidence_level = 'high'
    ELSE:
        → observation_status = 'pending', confidence_level = 'low'
        → Held for manual review in price_observations
```

**Default thresholds** (`scoring_config` version `vp/static-v1`):
```json
{
  "max_auto_verify_delta_pct": 50,
  "confidence_high_max_delta_pct": 50
}
```

**Rationale:** A 50% price change is the boundary for automatic trust. Beyond that, the observation sits in `price_observations` with `confidence_level = 'low'` until a human reviews it. This prevents a bad iTunes API response from corrupting live prices.

---

## Database Schema (Migration 010)

Two new tables implement the framework:

### `scoring_config`

Stores named versioned weight+threshold vectors.

| Column | Type | Description |
|---|---|---|
| `id` | bigserial PK | Auto-assigned |
| `model_type` | text | `ais` \| `cis` \| `cps` \| `vp` |
| `version_label` | text | e.g. `static-v1`, `lgbm-2026-07-01` |
| `source` | text | `static` \| `lightgbm` \| `xgboost` \| `manual` |
| `weights` | jsonb | Model-specific weight vector |
| `thresholds` | jsonb | Tier cutoff values |
| `trained_at` | timestamptz | null for static; set when ML model was trained |
| `training_rows` | int | Number of labelled examples used (ML only) |
| `eval_accuracy` | numeric | Held-out accuracy (ML only) |

### `scoring_model_registry`

One row per model. Points to the active config.

| Column | Type | Description |
|---|---|---|
| `model_type` | text PK | `ais` \| `cis` \| `cps` \| `vp` |
| `active_config_id` | bigint FK | Points to `scoring_config.id` |
| `activated_at` | timestamptz | When this config was activated |
| `activated_by` | text | Who activated it (`migration`, user email, `lgbm-trainer`) |
| `change_notes` | text | What changed |

---

## Activating New Weights (Phase 3 Deployment Pattern)

When a LightGBM model is trained and validated, deploying it requires two SQL statements:

```sql
-- 1. Insert the new config
INSERT INTO scoring_config (model_type, version_label, source, weights, thresholds,
                            trained_at, training_rows, eval_accuracy, notes, created_by)
VALUES (
  'cps',
  'lgbm-2026-09-01',
  'lightgbm',
  '{"w_demand": 0.41, "w_savings": 0.28, "w_coverage": 0.19, "w_market": 0.12}',
  '{"critical": 80, "high": 60, "medium": 40}',
  now(), 1700, 0.847,
  'First LightGBM run. 8 weeks data. Val accuracy 84.7%.',
  'lgbm-trainer-v1'
);

-- 2. Point the registry to the new config
UPDATE scoring_model_registry
SET active_config_id = (SELECT id FROM scoring_config WHERE model_type='cps' AND version_label='lgbm-2026-09-01'),
    activated_at = now(),
    activated_by = 'lgbm-trainer-v1',
    change_notes = 'Promoting first LightGBM CPS model. Replaced static-v1.'
WHERE model_type = 'cps';
```

No application code changes. No schema changes. Rollback = point `active_config_id` back to the previous config ID.

---

## Default Weight Summary

| Model | Feature | Default Weight |
|---|---|---|
| **AIS** | popularity_score | **0.40** |
| | category_score | 0.25 |
| | price_range_score | 0.20 |
| | coverage_score | 0.15 |
| **CIS** | savings_potential | **0.35** |
| | market_size | 0.30 |
| | data_quality | 0.20 |
| | user_demand | 0.15 |
| **CPS** | demand_score | **0.35** |
| | savings_score | 0.30 |
| | coverage_score | 0.20 |
| | market_score | 0.15 |
| **VP** | max_auto_verify_delta_pct | 50% |

All weights sum to 1.0 per model. Tier thresholds: critical ≥ 80, high ≥ 60, medium ≥ 40, low < 40.

---

## Feature Definitions

### AIS Features

| Feature | Type | Derivation |
|---|---|---|
| `popularity_score` | float 0–100 | Manual tier assignment by app. Streaming/AI flagship: 88–90; mainstream: 70–79; niche: 20–54 |
| `category_score` | float 0–100 | Per-category lookup: Productivity=80, Entertainment=78, Music=72, …, Navigation=30 |
| `price_range_score` | float 0–100 | `min(100, round(base_price_usd / 30 × 100))` — normalised to Procreate ($29.99=100) |
| `coverage_score` | float 0–100 | `round(available_countries / 20 × 100)` — apps blocked in CN or RU lose points |

### CIS Features

| Feature | Type | Derivation |
|---|---|---|
| `savings_potential` | float 0–100 | `min(100, max(0, (1-multiplier)×100) × (100/88))`. Argentina (0.12) → 100 |
| `market_size` | float 0–100 | Static lookup: US=95, JP=80, IN=78, GB=80, CA=75, DE=75, …, EG=42 |
| `data_quality` | float 0–100 | Currency stability: USD/EUR=90–95, JPY=85, INR=72, TRY=40, ARS=25 |
| `user_demand` | float 0–100 | Inferred query volume: US=95, CN=80, IN=78, GB=78, … |

### CPS Features

| Feature | Type | Source |
|---|---|---|
| `demand_score` | float 0–100 | `inclusion_scores.demand_score` (≈ AIS popularity_score for the app) |
| `savings_score` | float 0–100 | `inclusion_scores.savings_score` (≈ CIS savings_potential for the country) |
| `coverage_score` | float 0–100 | `inclusion_scores.coverage_score` (data freshness + source quality for this pair) |
| `market_score` | float 0–100 | `inclusion_scores.market_score` (≈ CIS market_size for the country) |

### VP Features

| Feature | Type | Description |
|---|---|---|
| `prev_price` | numeric | Existing `current_prices.price` for this app×country×plan |
| `new_price` | numeric | Price returned by iTunes Lookup API |
| `price_delta_pct` | float | `(new − old) / old × 100` |
| `source_type` | text | `manual_seed` → always rejected; `itunes_lookup` → delta logic applies |

### ML Training Features (Phase 3 input to LightGBM)

Stored in `scoring_training_examples.features` JSONB:

| Key | Type | Description |
|---|---|---|
| `inclusion_score` | float | CPS score at time of snapshot |
| `demand_score` | float | CPS demand component |
| `savings_score` | float | CPS savings component |
| `coverage_score` | float | CPS coverage component |
| `market_score` | float | CPS market component |
| `app_score` | float | AIS score |
| `country_score` | float | CIS score |
| `price_usd` | float | Current price in USD |
| `price_delta_pct_30d` | float | 30-day price change % |
| `prev_views_7d` | int | Page views in prior 7 days (`page_metrics`) |
| `prev_clicks_7d` | int | CTA clicks in prior 7 days (`page_metrics`) |
| `prev_impressions_30d` | int | GSC impressions in prior 30 days |
| `avg_position_30d` | float | Average SERP position in prior 30 days |
| `source_type_encoded` | int | itunes_lookup=2, manual_seed=1, community=0 |
| `confidence_level_encoded` | int | high=2, medium=1, low=0 |
| `is_default_plan` | int | 1 if default plan, 0 otherwise |
| `billing_period_encoded` | int | monthly=3, annual=2, one_time=1, free=0 |

---

## What Remains for Phase 2 and Phase 3

### Phase 2 — Data collection (prerequisite for training)

All three analytics tables exist and are empty. Migration 010 adds the INSERT RLS policies needed to write to them. The remaining work:

1. **Choose analytics provider** — Plausible recommended (simple REST API, no JS bundle overhead). Alternatives: PostHog, Vercel Analytics.
2. **Write `scripts/update-plausible.ts`** — Nightly script: call Plausible stats API → aggregate views/clicks per page URL → upsert into `page_metrics`. Add as step 4 in `.github/workflows/daily-update.yml`.
3. **Write `scripts/update-gsc.ts`** — Daily GSC export using `googleapis` npm package. Fetches last 7 days of `searchanalytics.query` → upserts into `search_console_metrics`. Requires Google service account + `GSC_KEY_JSON` env var + GitHub secret.
4. **Write `scripts/create-training-examples.ts`** — Weekly batch: runs the SQL in `docs/scoring-model-training.md` to insert into `scoring_training_examples`. Can only start after 4+ weeks of `page_metrics` data.
5. **Backfill `scoring_training_examples.plan_id`** — The unique constraint fix in migration 010 Section 5 allows plan-level training rows. The batch script should join on `current_prices.plan_id` to create one row per app×country×plan (not just app×country).

**Minimum data before Phase 3 is possible:**
- 4 weeks `page_metrics` (weekly seasonality)
- 8 weeks `search_console_metrics` (GSC lag ~3 days; need diversity)
- 500+ labelled rows in `scoring_training_examples` (reachable in 1 week at 1,700 pairs/week)

### Phase 3 — Model training and weight deployment

Once sufficient labelled data exists:

1. **Export training data** from Supabase: `SELECT features, label FROM scoring_training_examples WHERE label IS NOT NULL`
2. **Train LightGBM** multi-class classifier (high/medium/low). Minimum recommended: `num_leaves=31`, `n_estimators=200`, `learning_rate=0.05`. See `docs/scoring-model-training.md` for the complete Python example.
3. **Evaluate** on held-out set. Target: >75% accuracy. Check class balance (high:medium:low should be roughly 20:50:30 at this site's traffic level).
4. **Extract feature importances** — compare learned weights against static defaults. If LightGBM weights differ substantially from defaults, this tells you which features the static model was mispricing.
5. **Deploy** via two SQL statements (see "Activating New Weights" section above). No code changes needed.
6. **Re-run `gen-scores.js`** equivalent with new weights to regenerate `app_scores`, `country_scores`, and `inclusion_scores`. Or add a DB function that reads weights from `scoring_config` and recomputes scores inline.
7. **Monitor** for 1 week: compare crawl job completion rates and page engagement before/after weight swap. Roll back if metrics regress (single SQL UPDATE).

### Phase 3 — Online retraining

Once 6+ months of data exists, switch from batch training to a rolling window:

- Retrain monthly with the last 6 months of `scoring_training_examples`
- Use a regression target (`target_clicks_7d` directly) instead of classification for finer-grained priority ordering
- Consider a separate model per model_type (AIS, CIS, CPS) rather than one combined model

The `scoring_model_registry` table already supports per-model activation, so each model can be on a different training cadence.
