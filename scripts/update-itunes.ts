/**
 * update-itunes.ts
 * Fetches current prices for one-time paid apps from the iTunes Lookup API
 * and upserts into current_prices in Supabase.
 *
 * Subscription apps are skipped — their prices are manually curated
 * (iTunes Lookup only returns the download price, which is $0 for freemium apps).
 *
 * Run: npx tsx scripts/update-itunes.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Only one-time paid apps return meaningful prices from iTunes Lookup
const ONE_TIME_PAID: Array<{ id: string; storeId: string }> = [
  { id: 'procreate',       storeId: '364519085'  },
  { id: 'minecraft',       storeId: '479516143'  },
  { id: 'monument-valley', storeId: '728293409'  },
  { id: 'alto-odyssey',    storeId: '1182456409' },
  { id: 'bloons-td6',      storeId: '1118115766' },
];

const COUNTRIES = [
  'US','CN','JP','GB','DE','FR','IN','TR','BR','MX',
  'RU','AU','CA','KR','SG','HK','TW','PL','AR','EG',
];

// Country → ISO 4217 currency
const CURRENCY: Record<string, string> = {
  US:'USD', CN:'CNY', JP:'JPY', GB:'GBP', DE:'EUR', FR:'EUR',
  IN:'INR', TR:'TRY', BR:'BRL', MX:'MXN', RU:'RUB', AU:'AUD',
  CA:'CAD', KR:'KRW', SG:'SGD', HK:'HKD', TW:'TWD', PL:'PLN',
  AR:'ARS', EG:'EGP',
};

async function fetchPrice(storeId: string, country: string): Promise<number | null> {
  const url = `https://itunes.apple.com/lookup?id=${storeId}&country=${country}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json() as { resultCount: number; results: Array<{ price: number }> };
    if (!data.resultCount || !data.results[0]) return null;
    const price = data.results[0].price;
    return typeof price === 'number' && price > 0 ? price : null;
  } catch {
    return null;
  }
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().slice(0, 10);
  const rows: Array<{
    app_id: string; country_code: string; price: number; currency: string;
    updated_at: string; source_type: string; source_name: string;
    source_url: string; confidence_level: string; last_verified_at: string;
  }> = [];

  let fetched = 0;
  let skipped = 0;

  for (const app of ONE_TIME_PAID) {
    console.log(`Fetching ${app.id} (${COUNTRIES.length} countries)...`);
    // Stagger requests to avoid rate limiting
    for (const cc of COUNTRIES) {
      const price = await fetchPrice(app.storeId, cc);
      if (price !== null) {
        rows.push({
          app_id: app.id,
          country_code: cc,
          price,
          currency: CURRENCY[cc] ?? 'USD',
          updated_at: today,
          source_type: 'itunes_lookup',
          source_name: 'iTunes Lookup API',
          source_url: `https://itunes.apple.com/lookup?id=${app.storeId}&country=${cc}`,
          confidence_level: 'high',
          last_verified_at: new Date().toISOString(),
        });
        fetched++;
      } else {
        skipped++;
      }
      // ~100ms between requests to stay well within rate limits
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`Fetched ${fetched} prices, skipped ${skipped}. Upserting...`);

  if (rows.length === 0) {
    console.log('No prices to upsert.');
    return;
  }

  const { error } = await supabase
    .from('current_prices')
    .upsert(rows, { onConflict: 'app_id,country_code' });

  if (error) {
    console.error('Supabase upsert failed:', error.message);
    process.exit(1);
  }

  console.log(`✓ Upserted ${rows.length} price rows (${today})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
