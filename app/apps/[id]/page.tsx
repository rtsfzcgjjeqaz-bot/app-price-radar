import { notFound } from 'next/navigation';
import { getAppById } from '@/lib/db/apps';
import { getAppPriceTable } from '@/lib/db/prices';
import { isSupabaseAvailable } from '@/lib/supabase/client';
import PriceTable from '@/components/PriceTable';
import AppIcon from '@/components/AppIcon';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const app = await getAppById(id);
  if (!app) return { title: 'App Not Found' };
  const table = await getAppPriceTable(app.id);
  const lowest = table[0];
  return {
    title: `${app.name} — Global App Store Prices`,
    description: `Compare ${app.name} prices across ${table.length} countries. Cheapest region: ${lowest ? `${lowest.country.name} at $${lowest.priceUSD.toFixed(2)}` : 'N/A'}.`,
    openGraph: {
      title: `${app.name} Global Price Comparison`,
      description: `Find the cheapest ${app.name} subscription worldwide. Prices in ${table.length} regions.`,
      images: [app.iconUrl],
    },
  };
}

export default async function AppDetailPage({ params }: Props) {
  const { id } = await params;
  const [app, priceTable] = await Promise.all([
    getAppById(id),
    getAppPriceTable(id),
  ]);

  if (!app) notFound();

  const lowest = priceTable[0];
  const highest = priceTable[priceTable.length - 1];
  const savings =
    highest && lowest
      ? Math.round(((highest.priceUSD - lowest.priceUSD) / highest.priceUSD) * 100)
      : 0;

  const usingSupabase = isSupabaseAvailable();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* App Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
        <div className="flex items-start gap-5">
          <AppIcon src={app.iconUrl} alt={app.name} size={80} className="w-20 h-20 rounded-2xl shadow-sm shrink-0" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                {app.category}
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-3">{app.developer}</p>
            <p className="text-gray-600 text-sm leading-relaxed">{app.description}</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-50">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {lowest ? `$${lowest.priceUSD.toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-gray-400">Lowest (USD)</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {lowest ? `${lowest.country.flag} ${lowest.country.name}` : '—'}
            </div>
            <div className="text-xs text-gray-400">Cheapest Region</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">
              {highest ? `$${highest.priceUSD.toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-gray-400">Highest (USD)</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{savings}%</div>
            <div className="text-xs text-gray-400">Max Savings</div>
          </div>
        </div>
      </div>

      {/* Price Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Global Price Comparison
            <span className="ml-2 text-sm font-normal text-gray-400">({priceTable.length} regions)</span>
          </h2>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400">Data:</span>
            {usingSupabase ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Supabase
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Mock
              </span>
            )}
          </div>
        </div>
        {priceTable.length > 0 ? (
          <PriceTable rows={priceTable} />
        ) : (
          <div className="text-center py-12 text-gray-400">No price data available.</div>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Prices are for reference only. Exchange rates are approximate. Data updated: {lowest?.updatedAt ?? '—'}
      </p>
    </div>
  );
}
