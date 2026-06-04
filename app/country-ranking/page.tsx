import Link from 'next/link';
import { getCountryRanking } from '@/lib/price';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Country Price Ranking — Cheapest App Store by Country',
  description:
    'Compare App Store prices across 20+ countries. See which countries have the lowest average subscription prices for apps like Spotify, Netflix, ChatGPT and more.',
};

export default function CountryRankingPage() {
  const rows = getCountryRanking().filter((r) => r.appCount > 0);
  const cheapest = rows[0];
  const mostExpensive = rows[rows.length - 1];
  const gapPct = cheapest && mostExpensive
    ? Math.round(((mostExpensive.avgPriceUSD - cheapest.avgPriceUSD) / mostExpensive.avgPriceUSD) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Country Price Ranking</h1>
        <p className="text-gray-400 text-sm">
          Ranked by average App Store price (USD) across all tracked apps. Lower is cheaper.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="text-3xl mb-1">{cheapest?.country.flag}</div>
          <div className="font-bold text-gray-900">{cheapest?.country.name}</div>
          <div className="text-xs text-gray-400 mt-1">Cheapest Overall</div>
          <div className="text-green-600 font-semibold mt-1">${cheapest?.avgPriceUSD.toFixed(2)} avg</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="text-3xl mb-1">{mostExpensive?.country.flag}</div>
          <div className="font-bold text-gray-900">{mostExpensive?.country.name}</div>
          <div className="text-xs text-gray-400 mt-1">Most Expensive</div>
          <div className="text-red-500 font-semibold mt-1">${mostExpensive?.avgPriceUSD.toFixed(2)} avg</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <div className="text-3xl mb-1">📊</div>
          <div className="font-bold text-gray-900">{rows.length} Regions</div>
          <div className="text-xs text-gray-400 mt-1">Tracked Countries</div>
          <div className="text-blue-600 font-semibold mt-1">{gapPct}% gap</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4">Country</div>
          <div className="col-span-2 text-right">Avg Price</div>
          <div className="col-span-2 text-right">Total</div>
          <div className="col-span-2 text-center">Best Prices</div>
          <div className="col-span-1 text-center">Apps</div>
        </div>
        {rows.map((row) => (
          <Link
            key={row.country.code}
            href={`/countries/${row.country.code}`}
            className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-blue-50/40 transition-colors border-b border-gray-50 last:border-0"
          >
            <div className="col-span-1 text-center">
              {row.rank <= 3 ? (
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  row.rank === 1 ? 'bg-green-100 text-green-700' : row.rank === 2 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'
                }`}>{row.rank}</span>
              ) : (
                <span className="text-sm text-gray-400">{row.rank}</span>
              )}
            </div>
            <div className="col-span-4 flex items-center gap-3">
              <span className="text-2xl">{row.country.flag}</span>
              <div>
                <div className="font-medium text-gray-900">{row.country.name}</div>
                <div className="text-xs text-gray-400">{row.country.currency} · {row.country.code}</div>
              </div>
            </div>
            <div className="col-span-2 text-right">
              <span className={`text-sm font-semibold ${row.rank <= 3 ? 'text-green-600' : 'text-gray-700'}`}>
                ${row.avgPriceUSD.toFixed(2)}
              </span>
            </div>
            <div className="col-span-2 text-right text-sm text-gray-400">${row.totalPriceUSD.toFixed(2)}</div>
            <div className="col-span-2 text-center">
              {row.lowestPriceCount > 0 ? (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {row.lowestPriceCount} best
                </span>
              ) : <span className="text-xs text-gray-300">—</span>}
            </div>
            <div className="col-span-1 text-center text-sm text-gray-400">{row.appCount}</div>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-400 text-center">
        Average price calculated from available apps in each region. Data updated: 2026-06-01
      </p>
    </div>
  );
}
