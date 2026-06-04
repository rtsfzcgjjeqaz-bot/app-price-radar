/**
 * update-history.ts
 * Copies all rows from current_prices into price_history as a daily snapshot.
 * Run after update-itunes and update-fx have completed.
 *
 * Run: npx tsx scripts/update-history.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const BATCH_SIZE = 200;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().slice(0, 10);

  // Skip if we already have history rows for today (idempotent)
  const { count: existing } = await supabase
    .from('price_history')
    .select('*', { count: 'exact', head: true })
    .gte('recorded_at', `${today}T00:00:00Z`);

  if ((existing ?? 0) > 0) {
    console.log(`History already recorded for ${today} (${existing} rows). Skipping.`);
    return;
  }

  // Fetch all current prices in pages
  let offset = 0;
  let totalInserted = 0;

  while (true) {
    const { data, error } = await supabase
      .from('current_prices')
      .select('app_id, country_code, price, currency, source_type, source_name, source_url, confidence_level')
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) { console.error('Fetch error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;

    const historyRows = data.map((row) => ({
      app_id: row.app_id,
      country_code: row.country_code,
      price: row.price,
      currency: row.currency,
      recorded_at: new Date().toISOString(),
      source_type: row.source_type ?? 'manual_seed',
      source_name: row.source_name ?? 'App Price Radar seed',
      source_url: row.source_url ?? '',
      confidence_level: row.confidence_level ?? 'medium',
      last_verified_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('price_history')
      .insert(historyRows);

    if (insertError) { console.error('Insert error:', insertError.message); process.exit(1); }

    totalInserted += historyRows.length;
    offset += BATCH_SIZE;

    if (data.length < BATCH_SIZE) break;
  }

  console.log(`✓ Inserted ${totalInserted} rows into price_history for ${today}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
