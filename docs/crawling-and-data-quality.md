# Crawling and Data Quality

## Overview

App Price Radar uses a **staged data pipeline** to ensure price accuracy and protect manually curated subscription prices from being overwritten by automated crawls.

```
iTunes Lookup API
        │
        ▼
  [crawl_jobs]          ← job queue (app×country, priority, status)
        │
        ▼
[price_observations]    ← staging area: all raw crawled prices land here first
        │
   verification
   (quality checks)
        │
        ├── rejected  → logged, not promoted
        │
        └── verified  → promoted to current_prices
                              │
                              └── guarded: manual_seed rows are NEVER overwritten
```

---

## Tables

### `crawl_jobs`

Holds the queue of work items. One row per app×country combination to be fetched.

| Column | Description |
|---|---|
| `app_id`, `country_code` | Target pair |
| `plan_id` | Nullable — links to a specific subscription tier |
| `status` | `pending` → `running` → `done` / `failed` / `skipped` |
| `priority` | 1–100, lower runs first. Derived from `inclusion_scores` |
| `source` | `itunes_lookup` \| `manual` \| `community` |
| `retry_count` / `max_retries` | Automatic retry on failure |

### `price_observations`

Staging area. Every crawled price lands here before touching `current_prices`.

| Column | Description |
|---|---|
| `observation_status` | `pending` → `verified` / `rejected` / `stale` |
| `manual_lock` | `true` = existing `current_prices` row is `manual_seed`; auto-promotion blocked |
| `confidence_level` | `high` (iTunesAPI, small delta) / `medium` / `low` (large delta, needs review) |
| `rejection_reason` | Why it was rejected |
| `prev_price`, `price_delta_pct` | Delta vs current price — used to detect outliers |
| `raw_response` | Full API response stored as JSONB for debugging |

---

## Data Flow

### Step 1 — Create Jobs
```bash
npm run crawl:create-jobs
```
Reads `apps`, `inclusion_scores`, and checks `crawl_jobs` for existing pending items. Creates one job per app×country for one-time paid apps, skipping apps whose prices are `manual_seed` tagged. Priority is derived from `inclusion_scores` (higher score = lower priority number = runs first).

### Step 2 — Run iTunes Crawl
```bash
npm run crawl:itunes [-- --limit=50]
```
Claims pending `itunes_lookup` jobs, fetches prices from the iTunes Lookup API, and writes results to `price_observations`. For each observation:

- If no existing `current_prices` row → `observation_status = verified`
- If existing row is `manual_seed` → `observation_status = rejected`, `manual_lock = true`
- If price delta > 50% vs current → `observation_status = pending`, `confidence_level = low` (needs manual review)
- Otherwise → `observation_status = verified`, `confidence_level = high`

### Step 3 — Promote Verified Observations
```bash
npm run crawl:run [-- --promote-only]
```
Calls the `promote_verified_observations()` Postgres function, which:
1. Selects all `verified` observations with `manual_lock = false`
2. Upserts each into `current_prices`
3. **Skips rows where `current_prices.source_type = 'manual_seed'`** — manual subscription prices are never overwritten by automated crawls
4. Marks promoted observations as `stale`

### Step 4 — Snapshot History
Automatically runs after promotion. Copies `current_prices` → `price_history` (idempotent, once per day).

---

## Full Pipeline (all steps)
```bash
# First run — create jobs then crawl
npm run crawl:run -- --create-jobs

# Subsequent runs — skip job creation
npm run crawl:run

# Promote only (if crawl was run separately)
npm run crawl:run -- --promote-only
```

---

## Manual Seed Protection

**Rule: `manual_seed` prices are never overwritten by automated crawls.**

Subscription app prices (Spotify, ChatGPT, Netflix, etc.) are stored with `source_type = 'manual_seed'` in `current_prices`. The promotion function checks this before upserting:

```sql
where current_prices.source_type != 'manual_seed'
```

This means:
- Automated crawls can only update **one-time paid app prices** (Procreate, Minecraft, etc.)
- Subscription prices require a human to update them manually via the seed or admin tooling
- A future admin UI can set a price with `source_type = 'admin_override'` to explicitly replace a manual seed

---

## Quality Thresholds

| Condition | `observation_status` | `confidence_level` | Action |
|---|---|---|---|
| No existing price | `verified` | `high` | Auto-promote |
| Price delta ≤ 50% | `verified` | `high` | Auto-promote |
| Price delta > 50% | `pending` | `low` | Needs manual review |
| Existing is `manual_seed` | `rejected` | `medium` | Never promote |
| iTunes API returned 0 or error | — | — | Job marked `failed` |

---

## GitHub Actions Integration

The daily update workflow in `.github/workflows/daily-update.yml` can be extended to include the crawl pipeline:

```yaml
- name: Create crawl jobs
  run: npx tsx scripts/crawl-create-jobs.ts

- name: Run iTunes crawl
  run: npx tsx scripts/crawl-itunes.ts

- name: Promote and snapshot
  run: npx tsx scripts/crawl-run.ts --promote-only
```

---

## Monitoring

Query pending observations that need manual review:

```sql
select app_id, country_code, price, prev_price, price_delta_pct, rejection_reason
from price_observations
where observation_status = 'pending'
  and confidence_level = 'low'
order by abs(price_delta_pct) desc;
```

Query promotion stats:

```sql
select promote_verified_observations();
```

Query today's crawl job results:

```sql
select status, count(*) from crawl_jobs
where created_at >= current_date
group by status;
```

---

## Adding New Apps to the Crawl

1. Add the app to `scripts/crawl-create-jobs.ts` in the `ONE_TIME_PAID` array
2. Add the app's Store ID to `scripts/crawl-itunes.ts` in `STORE_IDS`
3. Run `npm run crawl:create-jobs` to enqueue new jobs

Note: subscription apps should NOT be added to the crawl — their prices must be maintained manually.
