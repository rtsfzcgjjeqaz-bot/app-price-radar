# Daily Update Pipeline

## Overview

App Price Radar runs a daily automated pipeline to keep price and exchange rate data fresh. The pipeline has three steps that run in sequence, orchestrated by a GitHub Actions workflow.

```
02:00 UTC daily
      │
      ▼
[1] update:fx       — fetch exchange rates from Frankfurter API → Supabase
      │
      ▼
[2] update:itunes   — fetch one-time paid app prices from iTunes Lookup API → Supabase
      │
      ▼
[3] update:history  — snapshot current_prices → price_history (idempotent)
```

---

## Scripts

All scripts live in `scripts/` and are TypeScript files run via `tsx`.

### `update-fx.ts` — Exchange Rates

- **Source:** [Frankfurter API](https://www.frankfurter.app/) (aggregates European Central Bank data)
- **Endpoint:** `https://api.frankfurter.app/latest?from=USD`
- **What it does:** Fetches current mid-market rates for all 19 tracked currencies and upserts them into the `exchange_rates` table
- **Auth required:** None (public API)
- **Run time:** ~2 seconds

### `update-itunes.ts` — One-Time Paid App Prices

- **Source:** [Apple iTunes Lookup API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html)
- **Endpoint:** `https://itunes.apple.com/lookup?id={storeId}&country={CC}`
- **What it does:** Fetches the current App Store download price for one-time paid apps (Procreate, Minecraft, Monument Valley, Alto's Odyssey, Bloons TD 6) across all 20 tracked countries
- **Auth required:** None (public API)
- **Limitation:** Only works for apps with a non-zero download price. Subscription apps (Spotify, ChatGPT, etc.) return `price: 0` — their prices are manually curated
- **Request volume:** 5 apps × 20 countries = 100 requests/day at ~100ms spacing = ~10 seconds
- **Run time:** ~15–20 seconds

### `update-history.ts` — Price History Snapshot

- **What it does:** Copies all rows from `current_prices` into `price_history` with `recorded_at = now()`, enabling price trend tracking over time
- **Idempotent:** Skips if a snapshot already exists for today
- **Run time:** ~5 seconds (1,625 rows in batches of 200)

---

## Running Locally

Copy `.env.example` to `.env.local` and add your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Run individual steps:

```bash
npm run update:fx        # exchange rates only
npm run update:itunes    # iTunes prices only
npm run update:history   # history snapshot only
npm run update:all       # all three in sequence
```

---

## GitHub Actions

The workflow file is at `.github/workflows/daily-update.yml`.

**Schedule:** `0 2 * * *` — 02:00 UTC daily (after ECB publishes the previous day's rates).

**Manual trigger:** Go to **Actions → Daily Price Update → Run workflow** in GitHub.

### Required GitHub Secrets

Add these under **Settings → Secrets and variables → Actions**:

| Secret name | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role key |

> **Never use the service role key in the frontend.** It bypasses RLS. The frontend uses `SUPABASE_ANON_KEY` only.

---

## Environment Variables Summary

| Variable | Used by | Required in |
|---|---|---|
| `SUPABASE_URL` | Next.js frontend + scripts | `.env.local` + GitHub Secret |
| `SUPABASE_ANON_KEY` | Next.js frontend (read-only, RLS enforced) | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Update scripts only (bypasses RLS for writes) | `.env.local` (local) + GitHub Secret |

---

## Data Flow

```
Frankfurter API ──────────────────────────────► exchange_rates table
iTunes Lookup API (one-time paid apps only) ──► current_prices table
                                                      │
                                                      ▼
                                                price_history table
                                                (daily snapshots)

Subscription app prices ──► manually curated ──► current_prices table
                             (updated when Apple announces storefront changes)
```

---

## Why Subscription Prices Are Not Auto-Fetched

The iTunes Lookup API returns `price: 0` for all freemium and subscription apps because the download is free — the subscription is an in-app purchase. There is currently no public API that returns IAP subscription prices for third-party apps. See `docs/data-sources-research.md` for the full investigation.

Subscription prices are maintained manually in `supabase/seeds/002_prices.sql` and updated when Apple announces global storefront pricing changes (typically a few times per year).

---

## Adding More Apps to iTunes Updates

To track a new one-time paid app, add it to the `ONE_TIME_PAID` array in `scripts/update-itunes.ts`:

```ts
{ id: 'your-app-id', storeId: '1234567890' },
```

The `id` must match the app's `id` in `mock/apps.ts` and the `apps` table in Supabase.
