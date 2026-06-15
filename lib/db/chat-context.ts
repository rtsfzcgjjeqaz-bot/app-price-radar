import { supabase } from './client';
import { getCountryRanking } from './prices';

// Priority order for context output — these apps appear first.
// All other apps with price data are appended after.
const PRIORITY_APP_IDS = [
  'chatgpt', 'spotify', 'netflix', 'youtube-premium', 'notion',
  'microsoft-365', 'claude-ai', 'perplexity', 'canva', 'grammarly',
  'dropbox', 'google-one', 'disney-plus', 'hbo-max', '1password',
];

function fmt(n: number): string {
  return n.toFixed(2);
}

function pct(a: number, b: number): string {
  if (b <= 0) return '0.0';
  return ((1 - a / b) * 100).toFixed(1);
}

function calcUSD(price: number, currency: string, rateMap: Map<string, number>): number {
  if (price <= 0) return 0;
  const r = rateMap.get(currency);
  return r ? Math.round(price * r * 100) / 100 : 0;
}

export async function getChatContext(): Promise<string> {
  if (!supabase) return '';

  try {
    const [rankingRows, appsRes, pricesRes, ratesRes, countriesRes] = await Promise.all([
      getCountryRanking(),
      supabase.from('apps').select('id, name'),
      supabase
        .from('current_prices')
        .select('app_id, country_code, price, currency, last_verified_at')
        .is('plan_id', null)
        .gt('price', 0),
      supabase.from('exchange_rates').select('currency, rate_to_usd'),
      supabase.from('countries').select('code, name'),
    ]);

    if (pricesRes.error || ratesRes.error) return '';

    const appNames = new Map((appsRes.data ?? []).map((a) => [a.id, a.name as string]));
    const countryNames = new Map((countriesRes.data ?? []).map((c) => [c.code, c.name as string]));
    const rateMap = new Map(
      (ratesRes.data ?? []).map((r) => [r.currency, Number(r.rate_to_usd)]),
    );

    // ── Per-app full price tables ─────────────────────────────
    interface PriceEntry { cc: string; name: string; usd: number; native: number; currency: string; verifiedAt: string | null }
    const pricesByApp = new Map<string, PriceEntry[]>();

    for (const p of pricesRes.data ?? []) {
      const usd = calcUSD(Number(p.price), p.currency, rateMap);
      if (usd <= 0) continue;
      const list = pricesByApp.get(p.app_id) ?? [];
      list.push({
        cc: p.country_code,
        name: countryNames.get(p.country_code) ?? p.country_code,
        usd,
        native: Number(p.price),
        currency: p.currency,
        verifiedAt: p.last_verified_at ?? null,
      });
      pricesByApp.set(p.app_id, list);
    }

    const today = new Date().toISOString().slice(0, 10);

    // ── Country ranking summary (brief) ───────────────────────
    const rankingLines = rankingRows
      .slice(0, 10)
      .map((r) => `  ${r.rank}. ${r.country.name} (${r.country.code}) avg $${fmt(r.avgPriceUSD)}/mo`)
      .join('\n');

    // ── Full per-app analysis blocks ──────────────────────────
    const allIds = [...pricesByApp.keys()];
    const sortedIds = [
      ...PRIORITY_APP_IDS.filter((id) => pricesByApp.has(id)),
      ...allIds.filter((id) => !PRIORITY_APP_IDS.includes(id)),
    ];

    const appBlocks = sortedIds
      .map((id) => {
        const rows = pricesByApp.get(id)!;
        rows.sort((a, b) => a.usd - b.usd);

        const cheapest = rows[0];
        const mostExpensive = rows[rows.length - 1];
        const top3 = rows.slice(0, 3);
        const us = rows.find((r) => r.cc === 'US');
        const coverage = rows.length;
        const gap = mostExpensive.usd - cheapest.usd;
        const savings = pct(cheapest.usd, mostExpensive.usd);
        const appName = appNames.get(id) ?? id;

        // Latest verified date across all countries
        const latestVerified = rows
          .map((r) => r.verifiedAt)
          .filter(Boolean)
          .sort()
          .pop() ?? today;
        const verifiedDate = latestVerified.slice(0, 10);

        const top3Lines = top3
          .map((r, i) => `    ${i + 1}. ${r.name} (${r.cc}): $${fmt(r.usd)} (${r.currency} ${r.native})`)
          .join('\n');

        const allLines = rows
          .map((r) => `    ${r.name} (${r.cc}): $${fmt(r.usd)} (${r.currency} ${r.native})`)
          .join('\n');

        return [
          `### ${appName}`,
          `  Coverage: ${coverage} countries`,
          `  Top 3 cheapest:`,
          top3Lines,
          `  Most expensive: ${mostExpensive.name} (${mostExpensive.cc}): $${fmt(mostExpensive.usd)}`,
          us ? `  US price: $${fmt(us.usd)}` : `  US price: not available`,
          `  Price gap: $${fmt(gap)}/mo`,
          `  Max savings vs most expensive: ${savings}%`,
          `  Last verified: ${verifiedDate}`,
          `  All countries (cheapest to most expensive):`,
          allLines,
        ].join('\n');
      })
      .join('\n\n');

    return [
      `## App Price Radar — Live Price Intelligence (${today})`,
      `Source: Verified App Store pricing database`,
      '',
      '### Overall cheapest countries (avg across all tracked apps)',
      rankingLines,
      '',
      '---',
      '',
      appBlocks,
      '',
      '_All prices converted to USD using live exchange rates. Native prices shown in local currency._',
    ].join('\n');
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[getChatContext]', err);
    }
    return '';
  }
}

