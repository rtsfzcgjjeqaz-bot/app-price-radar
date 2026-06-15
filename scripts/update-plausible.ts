/**
 * update-plausible.ts
 * Fetches yesterday's page-level stats from Plausible Analytics and upserts
 * them into the page_metrics table.
 *
 * Required env vars:
 *   PLAUSIBLE_API_KEY  — bearer token from plausible.io/settings
 *   PLAUSIBLE_SITE_ID  — your site's domain, e.g. "apppriceradar.com"
 *
 * Optional:
 *   PLAUSIBLE_DATE     — override date (YYYY-MM-DD); defaults to yesterday UTC
 *
 * If PLAUSIBLE_API_KEY or PLAUSIBLE_SITE_ID are absent the script exits 0 so
 * CI doesn't fail before the provider is configured.
 *
 * Run: npx tsx scripts/update-plausible.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL             = process.env.SUPABASE_URL             ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PLAUSIBLE_API_KEY        = process.env.PLAUSIBLE_API_KEY         ?? '';
const PLAUSIBLE_SITE_ID        = process.env.PLAUSIBLE_SITE_ID         ?? '';
const PLAUSIBLE_BASE_URL       = 'https://plausible.io';

// ── Page URL → metadata ──────────────────────────────────────────────────────

type PageType = 'app_detail' | 'country_detail' | 'app_ranking' | 'country_ranking'
              | 'search' | 'homepage' | 'cheapest' | 'compare' | 'other' | 'unknown';

interface PageMeta {
  pageType: PageType;
  appId: string | null;
  countryCode: string | null;
}

function classifyUrl(url: string): PageMeta {
  const path = url.split('?')[0].replace(/\/$/, '') || '/';

  if (path === '/')               return { pageType: 'homepage',         appId: null, countryCode: null };
  if (path === '/app-ranking')    return { pageType: 'app_ranking',      appId: null, countryCode: null };
  if (path === '/country-ranking') return { pageType: 'country_ranking', appId: null, countryCode: null };
  if (path === '/search')         return { pageType: 'search',           appId: null, countryCode: null };

  let m: RegExpMatchArray | null;

  m = path.match(/^\/apps\/([^/]+)$/);
  if (m) return { pageType: 'app_detail', appId: m[1], countryCode: null };

  m = path.match(/^\/countries\/([A-Z]{2})$/i);
  if (m) return { pageType: 'country_detail', appId: null, countryCode: m[1].toUpperCase() };

  m = path.match(/^\/cheapest\/([^/]+)$/);
  if (m) return { pageType: 'cheapest', appId: m[1], countryCode: null };

  m = path.match(/^\/compare\/([^/]+)$/);
  if (m) return { pageType: 'compare', appId: m[1], countryCode: null };

  return { pageType: 'other', appId: null, countryCode: null };
}

// ── Plausible API ────────────────────────────────────────────────────────────

interface PlausibleResult {
  page: string;
  visitors: number;
  pageviews: number;
  bounce_rate: number;
}

interface PlausibleResponse {
  results: PlausibleResult[];
  meta?: { pagination?: { has_more: boolean } };
}

async function fetchPlausiblePage(date: string, page = 1): Promise<PlausibleResponse> {
  const params = new URLSearchParams({
    site_id:  PLAUSIBLE_SITE_ID,
    period:   'day',
    date,
    property: 'event:page',
    metrics:  'visitors,pageviews,bounce_rate',
    limit:    '1000',
    page:     String(page),
  });

  const res = await fetch(`${PLAUSIBLE_BASE_URL}/api/v1/stats/breakdown?${params}`, {
    headers: { Authorization: `Bearer ${PLAUSIBLE_API_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Plausible API ${res.status}: ${text}`);
  }

  return res.json() as Promise<PlausibleResponse>;
}

async function fetchAllPages(date: string): Promise<PlausibleResult[]> {
  const all: PlausibleResult[] = [];
  let page = 1;

  while (true) {
    const data = await fetchPlausiblePage(date, page);
    all.push(...data.results);

    if (!data.meta?.pagination?.has_more) break;
    page++;
  }

  return all;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!PLAUSIBLE_API_KEY || !PLAUSIBLE_SITE_ID) {
    console.log('PLAUSIBLE_API_KEY or PLAUSIBLE_SITE_ID not set — skipping analytics ingestion.');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const date = process.env.PLAUSIBLE_DATE
    ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10); // yesterday UTC

  console.log(`Fetching Plausible stats for ${date}...`);

  const results = await fetchAllPages(date);
  console.log(`  Got ${results.length} page entries from Plausible`);

  if (results.length === 0) {
    console.log('No data returned — nothing to upsert.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Verify FK refs exist (app_ids and country_codes)
  const [{ data: appsData }, { data: countriesData }] = await Promise.all([
    supabase.from('apps').select('id'),
    supabase.from('countries').select('code'),
  ]);

  const validAppIds     = new Set((appsData     ?? []).map((a) => a.id));
  const validCountries  = new Set((countriesData ?? []).map((c) => c.code));

  const rows = results.map((r) => {
    const meta = classifyUrl(r.page);
    return {
      page_url:        r.page,
      page_type:       meta.pageType,
      app_id:          meta.appId && validAppIds.has(meta.appId)           ? meta.appId          : null,
      country_code:    meta.countryCode && validCountries.has(meta.countryCode) ? meta.countryCode : null,
      plan_id:         null,
      views:           r.pageviews,
      clicks:          0,  // Plausible doesn't expose outbound click counts here
      engagement_rate: Math.max(0, Math.min(1, (100 - (r.bounce_rate ?? 0)) / 100)),
      date,
    };
  });

  const BATCH = 200;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);

    const { error } = await supabase
      .from('page_metrics')
      .upsert(batch, { onConflict: 'page_url,date' });

    if (error) {
      console.error(`Upsert error (batch ${i / BATCH + 1}):`, error.message);
      process.exit(1);
    }

    upserted += batch.length;
  }

  console.log(`✓ Upserted ${upserted} rows into page_metrics for ${date}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
