/**
 * backfill-training-examples.ts
 *
 * One-shot historical backfill. Calls create_training_snapshot()
 * for each Monday in the backfill window, then runs
 * backfill_target_labels() to label any window that has already closed.
 *
 * Use this once after migration 011 is applied to seed the
 * scoring_training_examples table with historical data based on
 * price_history snapshots that already exist.
 *
 * Historical window rules:
 *   - Start: the Monday on or after the earliest price_history row
 *   - End:   the most recent Monday (not today — we want complete
 *            observation windows where possible)
 *   - Cadence: weekly (every Monday)
 *   - Skip dates where price_history has no rows (sparse weeks are OK;
 *     the snapshot function falls back to current_prices for features)
 *
 * Observation window:
 *   window_start = snapshot Monday
 *   window_end   = snapshot Monday + 7 days
 *   A window is labellable once window_end < today AND the required
 *   page_metrics / search_console_metrics data exists for that period.
 *   Windows created before analytics ingestion started will have
 *   target=0 / label='low' — this is expected and fine for training
 *   (the model will learn that pre-analytics rows have zero engagement).
 *
 * Run: npx tsx scripts/backfill-training-examples.ts [--weeks=N] [--dry-run]
 *   --weeks=N   backfill the last N weeks only (default: all available)
 *   --dry-run   print what would be run without inserting
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function nextMonday(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, …
  const daysUntilMonday = day === 1 ? 0 : (8 - day) % 7;
  const result = new Date(d);
  result.setUTCDate(d.getUTCDate() + daysUntilMonday);
  return result;
}

function prevMonday(d: Date): Date {
  const day = d.getUTCDay();
  const daysBack = day === 1 ? 0 : (day === 0 ? 6 : day - 1);
  const result = new Date(d);
  result.setUTCDate(d.getUTCDate() - daysBack);
  return result;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addWeeks(d: Date, n: number): Date {
  const result = new Date(d);
  result.setUTCDate(d.getUTCDate() + n * 7);
  return result;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const weeksArg = args.find((a) => a.startsWith('--weeks='));
  const maxWeeks = weeksArg ? parseInt(weeksArg.split('=')[1], 10) : null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find earliest price_history row to determine backfill start
  const { data: earliest } = await supabase
    .from('price_history')
    .select('snapshot_date')
    .order('snapshot_date', { ascending: true })
    .limit(1);

  const earliestDate = earliest?.[0]?.snapshot_date
    ? new Date(earliest[0].snapshot_date)
    : new Date(Date.now() - 28 * 24 * 60 * 60 * 1000); // default: 4 weeks ago

  // Build list of Mondays from first-available-monday to last-completed-monday
  const startMonday = nextMonday(earliestDate);
  const endMonday = prevMonday(new Date()); // most recent Monday (window already closed)

  const allMondays: string[] = [];
  let cursor = new Date(startMonday);
  while (cursor <= endMonday) {
    allMondays.push(toDateStr(cursor));
    cursor = addWeeks(cursor, 1);
  }

  const mondays = maxWeeks ? allMondays.slice(-maxWeeks) : allMondays;

  console.log(`\nBackfill window: ${mondays[0] ?? 'none'} → ${mondays[mondays.length - 1] ?? 'none'}`);
  console.log(`Weeks to process: ${mondays.length}`);
  if (dryRun) console.log('DRY RUN — no data will be written\n');

  if (mondays.length === 0) {
    console.log('No Mondays in backfill range. Exiting.');
    return;
  }

  let totalInserted = 0;

  for (const monday of mondays) {
    if (dryRun) {
      console.log(`  [dry-run] would snapshot ${monday}`);
      continue;
    }

    const { data, error } = await supabase
      .rpc('create_training_snapshot', { p_snapshot_date: monday });

    if (error) {
      console.error(`  ✗ ${monday}: ${error.message}`);
      continue;
    }

    const inserted = data ?? 0;
    totalInserted += inserted;
    console.log(`  ✓ ${monday}: ${inserted} rows`);
  }

  if (!dryRun) {
    // Label any windows that have closed
    console.log('\nBack-filling target labels for closed windows...');
    const { data: labelled, error: labelErr } = await supabase
      .rpc('backfill_target_labels');

    if (labelErr) {
      console.error('backfill_target_labels failed:', labelErr.message);
    } else {
      console.log(`  ✓ Labelled ${labelled ?? 0} rows`);
    }

    // Final summary
    const { count: total } = await supabase
      .from('scoring_training_examples')
      .select('*', { count: 'exact', head: true });

    const { count: labCount } = await supabase
      .from('scoring_training_examples')
      .select('*', { count: 'exact', head: true })
      .not('label', 'is', null);

    console.log(`\n✓ Backfill complete`);
    console.log(`  Inserted:  ${totalInserted} rows`);
    console.log(`  Total:     ${total ?? 0} rows in scoring_training_examples`);
    console.log(`  Labelled:  ${labCount ?? 0} rows`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
