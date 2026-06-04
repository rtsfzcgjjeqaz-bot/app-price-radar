import { notFound } from 'next/navigation';
import Link from 'next/link';
import { countries } from '@/mock/countries';
import { getCountryAppPriceTable, getCountryRanking } from '@/lib/price';
import AppIcon from '@/components/AppIcon';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ countryCode: string }>;
}

export async function generateStaticParams() {
  return countries.map((c) => ({ countryCode: c.code }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { countryCode } = await params;
  const country = countries.find((c) => c.code === countryCode.toUpperCase());
  if (!country) return { title: 'Not Found' };
  return {
    title: `App Store ${country.name} Prices — Subscription Cost Index`,
    description: `Complete guide to App Store subscription prices in ${country.name}. Compare costs for Spotify, Netflix, ChatGPT, and 100+ apps in ${country.currency}.`,
    keywords: [
      `App Store ${country.name} prices`,
      `cheapest App Store ${country.name}`,
      `${country.name} app subscription cost`,
      `${country.currency} App Store prices`,
      `${country.name} app prices`,
    ],
  };
}

export default async function SubscribeCountryPage({ params }: Props) {
  const { countryCode } = await params;
  const country = countries.find((c) => c.code === countryCode.toUpperCase());
  if (!country) notFound();

  const rows = getCountryAppPriceTable(country.code);
  if (rows.length === 0) notFound();

  const ranking = getCountryRanking();
  const myRank = ranking.find((r) => r.country.code === country.code);
  const cheapestCountry = ranking.filter((r) => r.appCount > 0)[0];
  const totalRanked = ranking.filter((r) => r.appCount > 0).length;

  const sorted = [...rows].sort((a, b) => a.priceUSD - b.priceUSD);
  const cheapestApps = sorted.slice(0, 5);
  const bestPriceApps = rows.filter((r) => r.isLowest);

  // Category breakdown
  const byCategory: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!byCategory[row.app.category]) byCategory[row.app.category] = [];
    byCategory[row.app.category].push(row);
  }
  const categories = Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length);

  const avgUSD = rows.length > 0
    ? rows.reduce((s, r) => s + r.priceUSD, 0) / rows.length
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <Link href="/country-ranking" className="hover:text-blue-600">Country Ranking</Link>
        <span>/</span>
        <span className="text-gray-600">{country.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <span className="text-7xl">{country.flag}</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            App Store Prices in {country.name}
          </h1>
          <p className="text-gray-500 text-sm">
            Complete subscription cost index for {country.name} ({country.currency}).
            {myRank && ` Ranked #${myRank.rank} of ${totalRanked} globally.`}
          </p>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-lg font-bold text-gray-900">{rows.length}</div>
          <div className="text-xs text-gray-400 mt-1">Apps Available</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-lg font-bold text-blue-600">${avgUSD.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">Avg Price (USD)</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className={`text-lg font-bold ${myRank && myRank.rank <= 5 ? 'text-green-600' : 'text-gray-800'}`}>
            #{myRank?.rank ?? '—'}
          </div>
          <div className="text-xs text-gray-400 mt-1">Global Price Rank</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-lg font-bold text-green-600">{bestPriceApps.length}</div>
          <div className="text-xs text-gray-400 mt-1">Global Best Prices</div>
        </div>
      </div>

      {/* vs cheapest country */}
      {myRank && cheapestCountry && myRank.country.code !== cheapestCountry.country.code && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-10 flex items-start gap-3">
          <span className="text-2xl shrink-0">{cheapestCountry.country.flag}</span>
          <div className="flex-1 text-sm text-amber-900">
            <span className="font-semibold">{cheapestCountry.country.name}</span> has the lowest average App Store prices
            (${cheapestCountry.avgPriceUSD.toFixed(2)} avg vs ${myRank.avgPriceUSD.toFixed(2)} here).
            Switching stores could save you up to{' '}
            <span className="font-semibold">
              {Math.round(((myRank.avgPriceUSD - cheapestCountry.avgPriceUSD) / myRank.avgPriceUSD) * 100)}%
            </span>{' '}
            on average.
          </div>
          <Link href={`/subscribe/${cheapestCountry.country.code}`} className="shrink-0 text-xs text-amber-700 hover:underline">
            See {cheapestCountry.country.name} →
          </Link>
        </div>
      )}

      {/* Cheapest apps in this country */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Cheapest Apps in {country.name}
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {cheapestApps.map((row, i) => (
            <Link
              key={row.app.id}
              href={`/apps/${row.app.id}`}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-blue-50/40 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              <span className="text-sm text-gray-400 w-5 text-center shrink-0">{i + 1}</span>
              <AppIcon src={row.app.iconUrl} alt={row.app.name} size={40} className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{row.app.name}</div>
                <div className="text-xs text-gray-400">{row.app.category}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-green-600">${row.priceUSD.toFixed(2)}</div>
                <div className="text-xs text-gray-400">{row.price} {row.currency}</div>
              </div>
              {row.isLowest && (
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full shrink-0">Global Best</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Category breakdown */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Prices by Category</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {categories.map(([cat, catRows]) => {
            const catAvg = catRows.reduce((s, r) => s + r.priceUSD, 0) / catRows.length;
            const catLowest = catRows.reduce((min, r) => r.priceUSD < min.priceUSD ? r : min, catRows[0]);
            return (
              <div key={cat} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-900 text-sm">{cat}</span>
                  <span className="text-xs text-gray-400">{catRows.length} apps</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-400 text-xs">From </span>
                    <span className="font-semibold text-green-600">${catLowest.priceUSD.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Avg </span>
                    <span className="text-gray-700">${catAvg.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/countries/${country.code}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Full {country.name} App Price List
        </Link>
        <Link
          href="/country-ranking"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Compare All Countries
        </Link>
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Prices are for reference only. Data updated: 2026-06-01
      </p>
    </div>
  );
}
