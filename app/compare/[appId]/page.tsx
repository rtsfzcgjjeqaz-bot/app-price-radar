import { notFound } from 'next/navigation';
import Link from 'next/link';
import { apps } from '@/mock/apps';
import { getAppPriceTable } from '@/lib/price';
import AppIcon from '@/components/AppIcon';
import PriceTable from '@/components/PriceTable';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ appId: string }>;
}

export async function generateStaticParams() {
  return apps.map((app) => ({ appId: app.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { appId } = await params;
  const app = apps.find((a) => a.id === appId);
  if (!app) return { title: 'Not Found' };
  const table = getAppPriceTable(app.id);
  const lowest = table[0];
  return {
    title: `${app.name} Price Comparison by Country — All Regions`,
    description: `Compare ${app.name} App Store prices across ${table.length} countries. Prices in USD, local currency, and CNY. ${lowest ? `Best price: $${lowest.priceUSD.toFixed(2)} in ${lowest.country.name}.` : ''}`,
    keywords: [
      `${app.name} price comparison`,
      `${app.name} price by country`,
      `${app.name} international price`,
      `${app.name} global pricing`,
      `how much is ${app.name}`,
    ],
  };
}

export default async function AppComparePage({ params }: Props) {
  const { appId } = await params;
  const app = apps.find((a) => a.id === appId);
  if (!app) notFound();

  const table = getAppPriceTable(app.id);
  if (table.length === 0) notFound();

  const lowest = table[0];
  const highest = table[table.length - 1];
  const savings = highest.priceUSD > 0
    ? Math.round(((highest.priceUSD - lowest.priceUSD) / highest.priceUSD) * 100)
    : 0;

  // Group by price tier for quick insight
  const cheap = table.filter((r) => r.priceUSD <= lowest.priceUSD * 1.3);
  const mid = table.filter((r) => r.priceUSD > lowest.priceUSD * 1.3 && r.priceUSD <= lowest.priceUSD * 2.0);
  const expensive = table.filter((r) => r.priceUSD > lowest.priceUSD * 2.0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <Link href={`/apps/${app.id}`} className="hover:text-blue-600">{app.name}</Link>
        <span>/</span>
        <span className="text-gray-600">Price Comparison</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <AppIcon src={app.iconUrl} alt={app.name} size={72} className="w-18 h-18 rounded-2xl shadow-sm shrink-0" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{app.name}</h1>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{app.category}</span>
          </div>
          <p className="text-gray-500 text-sm mb-1">{app.developer}</p>
          <p className="text-gray-600 text-sm leading-relaxed">{app.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-lg font-bold text-green-600">${lowest.priceUSD.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">Lowest Price</div>
          <div className="text-xs text-gray-500">{lowest.country.flag} {lowest.country.name}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-lg font-bold text-red-500">${highest.priceUSD.toFixed(2)}</div>
          <div className="text-xs text-gray-400 mt-1">Highest Price</div>
          <div className="text-xs text-gray-500">{highest.country.flag} {highest.country.name}</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-lg font-bold text-blue-600">{savings}%</div>
          <div className="text-xs text-gray-400 mt-1">Max Savings</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-lg font-bold text-gray-800">{table.length}</div>
          <div className="text-xs text-gray-400 mt-1">Regions</div>
        </div>
      </div>

      {/* Price tier breakdown */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Price Tier Breakdown</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
            <div className="text-sm font-semibold text-green-800 mb-2">Budget Regions ({cheap.length})</div>
            <div className="text-xs text-green-700 mb-3">Under ${(lowest.priceUSD * 1.3).toFixed(2)}</div>
            <div className="flex flex-wrap gap-1">
              {cheap.map((r) => (
                <Link key={r.country.code} href={`/countries/${r.country.code}`} className="text-xs bg-white border border-green-200 rounded-full px-2 py-0.5 hover:border-green-400 transition-colors">
                  {r.country.flag} {r.country.code}
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
            <div className="text-sm font-semibold text-yellow-800 mb-2">Mid-Range ({mid.length})</div>
            <div className="text-xs text-yellow-700 mb-3">${(lowest.priceUSD * 1.3).toFixed(2)} – ${(lowest.priceUSD * 2.0).toFixed(2)}</div>
            <div className="flex flex-wrap gap-1">
              {mid.map((r) => (
                <Link key={r.country.code} href={`/countries/${r.country.code}`} className="text-xs bg-white border border-yellow-200 rounded-full px-2 py-0.5 hover:border-yellow-400 transition-colors">
                  {r.country.flag} {r.country.code}
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
            <div className="text-sm font-semibold text-red-800 mb-2">Premium Regions ({expensive.length})</div>
            <div className="text-xs text-red-700 mb-3">Over ${(lowest.priceUSD * 2.0).toFixed(2)}</div>
            <div className="flex flex-wrap gap-1">
              {expensive.map((r) => (
                <Link key={r.country.code} href={`/countries/${r.country.code}`} className="text-xs bg-white border border-red-200 rounded-full px-2 py-0.5 hover:border-red-400 transition-colors">
                  {r.country.flag} {r.country.code}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Full table */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Full Price Table
          <span className="ml-2 text-sm font-normal text-gray-400">({table.length} regions)</span>
        </h2>
        <PriceTable rows={table} />
      </section>

      {/* Related links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/cheapest/${app.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          Cheapest country guide
        </Link>
        <Link
          href={`/apps/${app.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          App detail page
        </Link>
        <Link
          href="/app-ranking"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          All app rankings
        </Link>
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Prices are for reference only. Exchange rates are approximate. Data updated: {lowest.updatedAt}
      </p>
    </div>
  );
}
