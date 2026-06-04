/**
 * crawl-itunes.ts
 * Processes pending crawl_jobs with source='itunes_lookup'.
 * Writes raw results into price_observations.
 * Does NOT update current_prices directly — that is done by crawl-run.ts
 * after verification.
 *
 * Run: npx tsx scripts/crawl-itunes.ts [--limit=N]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// App Store IDs for one-time paid apps
const STORE_IDS: Record<string, string> = {
  'procreate':       '364519085',
  'minecraft':       '479516143',
  'monument-valley': '728293409',
  'alto-odyssey':    '1182456409',
  'bloons-td6':      '1118115766',
};

const CURRENCY: Record<string, string> = {
  US:'USD', CN:'CNY', JP:'JPY', GB:'GBP', DE:'EUR', FR:'EUR',
  IN:'INR', TR:'TRY', BR:'BRL', MX:'MXN', RU:'RUB', AU:'AUD',
  CA:'CAD', KR:'KRW', SG:'SGD', HK:'HKD', TW:'TWD', PL:'PLN',
  AR:'ARS', EG:'EGP',
};

// Max price delta % before observation is flagged as outlier and rejected
const MAX_DELTA_PCT = 50;

async function fetchItunesPrice(
  appId: string, country: string,
): Promise<{ price: number; currency: string; raw: object } | null> {
  const storeId = STORE_IDS[appId];
  if (!storeId) return null;

  const url = `https://itunes.apple.com/lookup?id=${storeId}&country=${country}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const raw = await res.json() as { resultCount: number; results: Array<{ price: number; currency: string }> };
    if (!raw.resultCount || !raw.results[0]) return null;
    const { price, currency } = raw.results[0];
    if (typeof price !== 'number' || price <= 0) return null;
    return { price, currency: currency ?? CURRENCY[country] ?? 'USD', raw };
  } catch {
    return null;
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Claim pending jobs (mark as running)
  const { data: jobs, error } = await supabase
    .from('crawl_jobs')
    .select('id, app_id, country_code, plan_id')
    .eq('status', 'pending')
    .eq('source', 'itunes_lookup')
    .order('priority', { ascending: true })
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) { console.error('Job fetch error:', error.message); process.exit(1); }
  if (!jobs?.length) { console.log('No pending iTunes jobs.'); return; }

  console.log(`Processing ${jobs.length} iTunes crawl jobs...`);

  // Mark all as running
  await supabase
    .from('crawl_jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .in('id', jobs.map((j) => j.id));

  // Fetch current prices to detect outliers
  const { data: currentPrices } = await supabase
    .from('current_prices')
    .select('app_id, country_code, price, source_type')
    .in('app_id', [...new Set(jobs.map((j) => j.app_id))]);

  const currentMap = new Map(
    (currentPrices ?? []).map((r) => [`${r.app_id}:${r.country_code}`, r]),
  );

  let done = 0, failed = 0, skipped = 0;

  for (const job of jobs) {
    const result = await fetchItunesPrice(job.app_id, job.country_code);

    if (!result) {
      await supabase.from('crawl_jobs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'iTunes API returned no price',
        retry_count: 1,
      }).eq('id', job.id);
      failed++;
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }

    // Determine verification status
    const current = currentMap.get(`${job.app_id}:${job.country_code}`);
    let observation_status = 'pending';
    let confidence_level = 'high';
    let rejection_reason: string | null = null;
    let price_delta_pct: number | null = null;

    if (current) {
      const delta = current.price > 0
        ? ((result.price - Number(current.price)) / Number(current.price)) * 100
        : 0;
      price_delta_pct = Math.round(delta * 100) / 100;

      if (Math.abs(delta) > MAX_DELTA_PCT) {
        // Large delta — needs manual review
        observation_status = 'pending';
        confidence_level = 'low';
      } else {
        // Small delta or same price — auto-verify
        observation_status = 'verified';
      }

      // Never auto-promote over manual seed prices
      if (current.source_type === 'manual_seed') {
        observation_status = 'rejected';
        confidence_level = 'medium';
        rejection_reason = 'Blocked: existing price is manually curated (manual_seed). Use manual update.';
        skipped++;
      }
    } else {
      // No existing price → auto-verify new observation
      observation_status = 'verified';
    }

    // Insert observation
    await supabase.from('price_observations').insert({
      crawl_job_id: job.id,
      app_id: job.app_id,
      country_code: job.country_code,
      plan_id: job.plan_id,
      price: result.price,
      currency: result.currency,
      source_type: 'itunes_lookup',
      source_url: `https://itunes.apple.com/lookup?id=${STORE_IDS[job.app_id]}&country=${job.country_code}`,
      raw_response: result.raw,
      observation_status,
      confidence_level,
      rejection_reason,
      prev_price: current?.price ?? null,
      price_delta_pct,
      manual_lock: current?.source_type === 'manual_seed',
      observed_at: new Date().toISOString(),
      verified_at: observation_status === 'verified' ? new Date().toISOString() : null,
    });

    await supabase.from('crawl_jobs').update({
      status: 'done',
      completed_at: new Date().toISOString(),
    }).eq('id', job.id);

    done++;
    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`✓ Done: ${done} | Failed: ${failed} | Skipped (manual lock): ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
