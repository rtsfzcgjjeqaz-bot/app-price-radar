# Feature Layer Baseline (Phase 1.5)

## Purpose

These tables store derived feature values computed from pre-launch operational data — prices, crawl activity, observation quality — before any user behaviour signals exist. They serve two roles:

1. **Immediate:** expose structured, queryable signals about data completeness, freshness, and pipeline health that the AIS / CIS / CPS scoring formulas depend on.
2. **Future:** provide the non-behaviour portion of the feature vector for the post-launch LightGBM model. When `page_metrics` and `search_console_metrics` start flowing, these pre-launch features are already in place and cleanly separated from the engagement signals.

---

## Tables

### `app_features` — per app (migration 012)

One row per tracked app. All values derived from: `apps`, `plans`, `current_prices`, `price_history`, `price_observations`, `crawl_jobs`.

| Column | Type | Description |
|---|---|---|
| `app_id` | text PK | FK → apps.id |
| `plan_count` | int | Total plans in `plans` for this app |
| `has_default_plan` | bool | At least one plan has `is_default = true` |
| `default_billing_period` | text | Billing period of the default plan (`monthly` / `annual` / `one_time` / `free` / `unknown`) |
| `countries_with_price` | int | Distinct countries with a `current_prices` row (plan_id IS NULL) |
| `price_coverage_pct` | numeric | `countries_with_price / 20 × 100` |
| `countries_with_plan_price` | int | Distinct countries with a plan-level price row (plan_id IS NOT NULL) |
| `price_usd_us` | numeric | USD price in the US store; null if absent |
| `price_usd_min` | numeric | Cheapest USD price across all countries |
| `price_usd_max` | numeric | Most expensive USD price |
| `price_usd_range` | numeric | `max − min` — absolute savings spread |
| `source_type_mix` | jsonb | `{"manual_seed": N, "itunes_lookup": N, …}` |
| `manual_seed_pct` | numeric | % of price rows that are manually curated |
| `avg_confidence` | numeric | Mean confidence mapped to 0–100 (high=100, medium=50, low=0) |
| `days_since_any_verification` | numeric | Days since most recent `last_verified_at` across all price rows; 9999 = never |
| `history_row_count` | int | Total `price_history` rows for this app |
| `price_changed_30d` | bool | Any country had a price change in the last 30 days |
| `max_delta_pct_30d` | numeric | Largest absolute price change % across any country in 30 days |
| `crawl_jobs_total` | int | Total crawl jobs for this app |
| `crawl_jobs_done` | int | Jobs with status = `done` |
| `crawl_jobs_failed` | int | Jobs with status = `failed` |
| `crawl_success_rate` | numeric | `done / total × 100`; 0 if no jobs |
| `observations_total` | int | Total `price_observations` rows |
| `observations_verified` | int | Observations that passed quality checks |
| `observations_rejected` | int | Observations rejected (manual_seed block, outlier, price=0) |
| `observation_rejection_rate` | numeric | `rejected / total × 100` |
| `computed_at` | timestamptz | When this row was last refreshed |

---

### `country_features` — per country (migration 012)

One row per tracked country. All values derived from: `countries`, `current_prices`, `price_history`, `exchange_rates`, `price_observations`.

| Column | Type | Description |
|---|---|---|
| `country_code` | char(2) PK | FK → countries.code |
| `apps_with_price` | int | Distinct apps with a price row in this country |
| `price_coverage_pct` | numeric | `apps_with_price / 85 × 100` |
| `avg_price_usd` | numeric | Mean USD price across all apps with a price here |
| `us_avg_price_usd` | numeric | US mean USD price across the same apps (reference baseline) |
| `savings_vs_us_pct` | numeric | `(us_avg − country_avg) / us_avg × 100`. Positive = cheaper than US |
| `apps_cheaper_than_us` | int | Count of apps priced below US price in this country |
| `apps_cheaper_pct` | numeric | `apps_cheaper_than_us / apps_with_price × 100` |
| `source_type_mix` | jsonb | Source type distribution |
| `manual_seed_pct` | numeric | % manual_seed rows |
| `avg_confidence` | numeric | Mean confidence 0–100 |
| `days_since_any_verification` | numeric | Days since most recent verification |
| `history_row_count` | int | Total price_history rows for this country |
| `price_changes_30d` | int | Apps with a price change in the last 30 days |
| `avg_delta_pct_30d` | numeric | Mean absolute price change % across apps in 30 days (volatility proxy) |
| `currency` | char(3) | ISO 4217 currency code |
| `rate_to_usd` | numeric | Exchange rate from `exchange_rates` |
| `rate_to_cny` | numeric | Exchange rate from `exchange_rates` |

---

### `crawl_features` — per app×country (migration 012)

One row per app×country pair. All values derived from: `crawl_jobs`, `price_observations`, `current_prices`.

| Column | Type | Description |
|---|---|---|
| `app_id` | text | FK → apps.id |
| `country_code` | char(2) | FK → countries.code |
| `last_crawl_status` | text | Status of most recent `crawl_jobs` row for this pair (`never` / `done` / `failed` / …) |
| `last_crawl_at` | timestamptz | `completed_at` of most recent crawl job |
| `days_since_last_crawl` | numeric | 9999 = never crawled |
| `total_crawl_attempts` | int | All crawl jobs for this pair |
| `successful_crawls` | int | Jobs with `status = 'done'` |
| `failed_crawls` | int | Jobs with `status = 'failed'` |
| `crawl_success_rate` | numeric | `done / total × 100` |
| `max_retry_count` | int | Highest `retry_count` across all jobs (signals chronically failing pairs) |
| `last_observation_status` | text | `observation_status` of the most recent `price_observations` row |
| `last_observation_at` | timestamptz | `observed_at` of most recent observation |
| `last_confidence_level` | text | `confidence_level` of most recent observation |
| `last_price_delta_pct` | numeric | `price_delta_pct` from most recent observation |
| `total_observations` | int | All observations for this pair |
| `verified_observations` | int | Observations that passed quality checks |
| `rejected_observations` | int | Observations rejected |
| `pending_observations` | int | Observations flagged for manual review (confidence=low) |
| `observation_reject_rate` | numeric | `rejected / total × 100` |
| `has_current_price` | bool | Whether `current_prices` has a row for this pair |
| `current_source_type` | text | `source_type` of the current price row |
| `current_confidence` | text | `confidence_level` of the current price row |
| `current_last_verified_at` | timestamptz | `last_verified_at` of the current price row |
| `days_since_verification` | numeric | Days since current price was last verified; 9999 = never |

---

### `feature_history` — append-only daily snapshots (migration 012)

One row per entity per day. Stores the full feature row as JSONB so the schema can evolve without backfilling historical rows.

| Column | Type | Description |
|---|---|---|
| `entity_type` | text | `app` / `country` / `crawl_pair` |
| `entity_id` | text | `apps.id` for app; `countries.code` for country; `{app_id}:{country_code}` for crawl_pair |
| `snapshot_date` | date | UTC date of the snapshot |
| `features` | jsonb | Full feature row at snapshot time |

Unique constraint: `(entity_type, entity_id, snapshot_date)` — idempotent re-runs safe.

---

## Refresh Script: `scripts/backfill-scoring-features.ts`

Computes all three feature tables from scratch and writes a `feature_history` snapshot.

```bash
npm run features:refresh            # compute + write
npx tsx scripts/backfill-scoring-features.ts --dry-run  # show counts without writing
```

**Data flow:**
1. Loads all reference tables in parallel (one round-trip per table)
2. Computes `app_features` in memory — one row per app
3. Computes `country_features` in memory — one row per country
4. Computes `crawl_features` in memory — one row per (app×country) pair from `current_prices` ∪ `crawl_jobs`
5. Batch-upserts all three tables in 100-row pages (`ON CONFLICT DO UPDATE`)
6. Writes `feature_history` snapshot rows for today (`ON CONFLICT IGNORE` — idempotent)

**Runtime estimate:** ~5–10 seconds for 85 apps × 20 countries with Supabase in same region.

---

## CI Integration

`feature_history` is refreshed daily after the price history snapshot step:

```yaml
# .github/workflows/daily-update.yml
1. update:fx       — exchange rates
2. crawl:run       — prices → current_prices
3. update:history  — current_prices → price_history
4. features:refresh — feature tables + feature_history snapshot   ← NEW
```

Weekly training snapshot (Mondays) in `weekly-training-snapshot.yml` runs separately and reads these feature tables as inputs.

---

## How These Features Feed the Scoring Models

| Feature | Used by | How |
|---|---|---|
| `price_coverage_pct` | AIS (`coverage_score`) | Low coverage → lower score → lower crawl priority |
| `days_since_any_verification` | AIS, CPS | Stale data → lower `coverage_score` |
| `manual_seed_pct` | AIS, CPS | High manual % → flags need for automated coverage |
| `price_usd_range` | AIS (`price_range_score`) | Larger range → more savings potential |
| `savings_vs_us_pct` | CIS (`savings_potential`) | Direct input to country savings component |
| `avg_delta_pct_30d` | CIS (`data_quality`) | High volatility → lower data quality score |
| `rate_to_usd` | CPS (price comparisons) | Used when computing pair-level USD prices |
| `days_since_last_crawl` | crawl scheduling | Stalest pairs get highest crawl priority |
| `pending_observations` | verification queue | Non-zero → requires manual review before promotion |
| `crawl_success_rate` | crawl scheduling | Chronically failing pairs deprioritised |
| `observation_reject_rate` | VP model | High rejection rate → tighten delta threshold |

---

## What These Tables Are Not

- They do not store user behaviour (no `page_metrics`, no `search_console_metrics`)
- They do not store ML targets or labels
- They do not modify `current_prices`, `inclusion_scores`, `app_scores`, or `country_scores`
- They do not trigger any crawl actions

The scoring tables (`app_scores`, `country_scores`, `inclusion_scores`) remain the authoritative computed scores. These feature tables expose the raw signals those scores are derived from, making the scoring pipeline inspectable and enabling future model training without changing the scoring tables themselves.
