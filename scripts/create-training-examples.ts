/**
 * create-training-examples.ts
 *
 * Weekly job that:
 *   1. Creates a scoring_training_examples snapshot for today using
 *      create_training_snapshot() — all features drawn from data
 *      available at or before today.
 *   2. Closes observation windows that have passed by calling
 *      backfill_target_labels() — fills in target_clicks_7d,
 *      target_impressions_30d, and label for any row whose
 *      observation_window_end is in the past.
 *
 * Run: npx tsx scripts/create-training-examples.ts
 * Scheduled: weekly in .github/workflows/daily-update.yml
 *            (run on Mondays — gives the prior week's page_metrics
 *            time to be ingested before creating new snapshots)
 *
 * Prerequisites (must already be populated):
 *   - inclusion_scores       (seed 003)
 *   - app_scores             (seed 004)
 *   - country_scores         (seed 005)
 *   - current_prices         (seed 002 + crawl pipeline)
 *   - price_history          (populated by crawl-run.ts daily)
 *
 * Optional (features fall back to 0 if absent):
 *   - page_metrics           (Plausible ingestion script)
 *   - search_console_metrics (GSC export script)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().slice(0, 10);

  // ── Step 1: create snapshot for today ──────────────────────
  console.log(`\n[1/2] Creating training snapshot for ${today}...`);

  const { data: snapResult, error: snapError } = await supabase
    .rpc('create_training_snapshot', { p_snapshot_date: today });

  if (snapError) {
    console.error('create_training_snapshot failed:', snapError.message);
    process.exit(1);
  }

  console.log(`  ✓ Inserted ${snapResult ?? 0} new training example rows`);

  // ── Step 2: close observation windows and assign labels ────
  console.log('\n[2/2] Back-filling target labels for closed windows...');

  const { data: labelResult, error: labelError } = await supabase
    .rpc('backfill_target_labels');

  if (labelError) {
    console.error('backfill_target_labels failed:', labelError.message);
    process.exit(1);
  }

  console.log(`  ✓ Labelled ${labelResult ?? 0} rows`);

  // ── Summary ────────────────────────────────────────────────
  const { count: totalRows } = await supabase
    .from('scoring_training_examples')
    .select('*', { count: 'exact', head: true });

  const { count: labelledRows } = await supabase
    .from('scoring_training_examples')
    .select('*', { count: 'exact', head: true })
    .not('label', 'is', null);

  console.log(`\n✓ Training examples: ${totalRows ?? 0} total, ${labelledRows ?? 0} labelled`);

  if ((labelledRows ?? 0) >= 500) {
    console.log('  → 500+ labelled rows — minimum threshold for first LightGBM training run reached');
  } else {
    console.log(`  → ${500 - (labelledRows ?? 0)} more labelled rows needed before first training run`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
