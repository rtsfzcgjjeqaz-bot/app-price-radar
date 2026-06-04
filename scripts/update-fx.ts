/**
 * update-fx.ts
 * Fetches current exchange rates from Frankfurter API and upserts into Supabase.
 * Run: npx tsx scripts/update-fx.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?from=USD';

// Currencies tracked by App Price Radar
const TRACKED: Record<string, number> = {
  USD: 1, CNY: 0, JPY: 0, GBP: 0, EUR: 0, INR: 0,
  TRY: 0, BRL: 0, MXN: 0, RUB: 0, AUD: 0, CAD: 0,
  KRW: 0, SGD: 0, HKD: 0, TWD: 0, PLN: 0, ARS: 0, EGP: 0,
};

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('Fetching exchange rates from Frankfurter...');
  const res = await fetch(FRANKFURTER_URL);
  if (!res.ok) throw new Error(`Frankfurter fetch failed: ${res.status}`);
  const data = await res.json() as { rates: Record<string, number>; date: string };

  // Build rows — Frankfurter returns rates relative to USD base
  const rows = Object.entries(TRACKED).map(([currency]) => {
    const rateToUSD = currency === 'USD' ? 1 : 1 / (data.rates[currency] ?? 1);
    const rateToCNY = currency === 'CNY' ? 1 : (data.rates['CNY'] ?? 7.25) / (data.rates[currency] ?? 1);
    return {
      currency,
      rate_to_usd: Math.round(rateToUSD * 1e8) / 1e8,
      rate_to_cny: Math.round(rateToCNY * 1e8) / 1e8,
      fetched_at: new Date().toISOString(),
    };
  });

  console.log(`Upserting ${rows.length} exchange rates (date: ${data.date})...`);
  const { error } = await supabase
    .from('exchange_rates')
    .upsert(rows, { onConflict: 'currency' });

  if (error) {
    console.error('Supabase upsert failed:', error.message);
    process.exit(1);
  }

  console.log(`✓ Exchange rates updated (${data.date})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
