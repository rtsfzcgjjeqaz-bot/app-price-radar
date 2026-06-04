/**
 * crawl-run.ts
 * Orchestrates the full crawl pipeline:
 *   1. Create jobs (if --create-jobs flag passed)
 *   2. Run iTunes crawler → writes to price_observations
 *   3. Promote verified observations → current_prices (via DB function)
 *   4. Snapshot current_prices → price_history
 *
 * Run: npx tsx scripts/crawl-run.ts [--create-jobs] [--limit=N] [--promote-only]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function promoteVerifiedObservations(supabase: any) {
  console.log('Promoting verified observations → current_prices...');

  const { data, error } = await supabase.rpc('promote_verified_observations');

  if (error) {
    console.error('Promotion RPC failed:', error.message);
    return;
  }

  const result = data?.[0] as { promoted: number; skipped_manual_lock: number; skipped_manual_seed: number } | undefined;
  console.log(`  Promoted:             ${result?.promoted ?? 0}`);
  console.log(`  Skipped (manual seed):${result?.skipped_manual_seed ?? 0}`);
  console.log(`  Skipped (manual lock):${result?.skipped_manual_lock ?? 0}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function snapshotHistory(supabase: any) {
  const today = new Date().toISOString().slice(0, 10);

  const { count: existing } = await supabase
    .from('price_history')
    .select('*', { count: 'exact', head: true })
    .gte('recorded_at', `${today}T00:00:00Z`);

  if ((existing ?? 0) > 0) {
    console.log(`History already recorded for ${today}. Skipping.`);
    return;
  }

  interface CpRow {
    app_id: string; country_code: string; price: number; currency: string;
    source_type: string; source_name: string; source_url: string; confidence_level: string;
  }
  const BATCH = 200;
  let offset = 0, total = 0;

  while (true) {
    const { data } = await supabase
      .from('current_prices')
      .select('app_id, country_code, price, currency, source_type, source_name, source_url, confidence_level')
      .range(offset, offset + BATCH - 1);

    if (!data?.length) break;

    const rows = (data as unknown as CpRow[]).map((r) => ({
      app_id: r.app_id, country_code: r.country_code,
      price: r.price, currency: r.currency,
      recorded_at: new Date().toISOString(),
      source_type: r.source_type ?? 'manual_seed',
      source_name: r.source_name ?? '',
      source_url: r.source_url ?? '',
      confidence_level: r.confidence_level ?? 'medium',
      last_verified_at: new Date().toISOString(),
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('price_history') as any).insert(rows);

    total += data.length;
    offset += BATCH;
    if (data.length < BATCH) break;
  }

  console.log(`✓ Snapshot: ${total} rows → price_history (${today})`);
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const createJobs = args.includes('--create-jobs');
  const promoteOnly = args.includes('--promote-only');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? `--limit=${limitArg.split('=')[1]}` : '';

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Step 1 — create jobs
  if (createJobs) {
    console.log('\n[1/4] Creating crawl jobs...');
    execSync('npx tsx scripts/crawl-create-jobs.ts', { stdio: 'inherit' });
  }

  if (!promoteOnly) {
    // Step 2 — crawl iTunes
    console.log('\n[2/4] Running iTunes crawl...');
    execSync(`npx tsx scripts/crawl-itunes.ts ${limit}`.trim(), { stdio: 'inherit' });
  }

  // Step 3 — promote verified observations
  console.log('\n[3/4] Promoting verified observations...');
  await promoteVerifiedObservations(supabase);

  // Step 4 — snapshot history
  console.log('\n[4/4] Snapshotting price history...');
  await snapshotHistory(supabase);

  console.log('\n✓ Crawl pipeline complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
