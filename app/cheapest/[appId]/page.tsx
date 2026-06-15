import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAllApps, getAppById } from '@/lib/db/apps';
import { getAppPriceTable } from '@/lib/db/prices';
import AppIcon from '@/components/AppIcon';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ appId: string }>;
}

export async function generateStaticParams() {
  const apps = await getAllApps();
  return apps.map((app) => ({ appId: app.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { appId } = await params;
  const app = await getAppById(appId);
  if (!app) return { title: 'Not Found' };
  const table = await getAppPriceTable(app.id);
  const lowest = table[0];
  return {
    title: `${app.name} Cheapest Country — App Store Price Guide`,
    description: `Find the cheapest country to buy ${app.name}. ${lowest ? `Lowest price: $${lowest.priceUSD.toFixed(2)} in ${lowest.country.name}.` : ''} Compare ${table.length} regions worldwide.`,
    keywords: [
      `${app.name} cheapest country`,
      `${app.name} cheapest App Store`,
      `${app.name} price comparison`,
      `cheapest ${app.name} subscription`,
      `${app.name} price by country`,
    ],
  };
}

export default async function CheapestCountryPage({ params }: Props) {
  const { appId } = await params;
  const app = await getAppById(appId);
  if (!app) notFound();

  const table = await getAppPriceTable(app.id);
  if (table.length === 0) notFound();

  const lowest = table[0];
  const highest = table[table.length - 1];
  const savings = highest.priceUSD > 0
    ? Math.round(((highest.priceUSD - lowest.priceUSD) / highest.priceUSD) * 100)
    : 0;
  const top5 = table.slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav className="text-xs text-gray-400 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <Link href={`/apps/${app.id}`} className="hover:text-blue-600">{app.name}</Link>
        <span>/</span>
        <span className="text-gray-600">Cheapest Country</span>
      </nav>

      <div className="flex items-start gap-5 mb-10">
        <AppIcon src={app.iconUrl} alt={app.name} size={72} className="w-18 h-18 rounded-2xl shadow-sm shrink-0" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {app.name}: Cheapest Country Guide
          </h1>
          <p className="text-gray-500 leading-relaxed">
            The cheapest App Store region for <strong>{app.name}</strong> is{' '}
            <strong>{lowest.country.flag} {lowest.country.name}</strong> at{' '}
            <strong className="text-green-600">${lowest.priceUSD.toFixed(2)}/mo</strong> — up to{' '}
            <strong>{savings}%</strong> cheaper than the most expensive region.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-1">{lowest.country.flag}</div>
          <div className="text-lg font-bold text-green-700">${lowest.priceUSD.toFixed(2)}</div>
          <div className="text-xs text-green-600 mt-1">Cheapest Region</div>
          <div className="text-xs text-gray-500">{lowest.country.name}</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-1">{highest.country.flag}</div>
          <div className="text-lg font-bold text-red-500">${highest.priceUSD.toFixed(2)}</div>
          <div className="text-xs text-red-500 mt-1">Most Expensive</div>
          <div className="text-xs text-gray-500">{highest.country.name}</div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-1">💰</div>
          <div className="text-lg font-bold text-blue-700">{savings}%</div>
          <div className="text-xs text-blue-600 mt-1">Max Savings</div>
          <div className="text-xs text-gray-500">vs most expensive</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
          <div className="text-2xl mb-1">🌍</div>
          <div className="text-lg font-bold text-gray-700">{table.length}</div>
          <div className="text-xs text-gray-500 mt-1">Regions Tracked</div>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Top 5 Cheapest Regions for {app.name}
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {top5.map((row, i) => (
            <Link
              key={row.country.code}
              href={`/countries/${row.country.code}`}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-blue-50/40 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                i === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>{i + 1}</span>
              <span className="text-2xl">{row.country.flag}</span>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{row.country.name}</div>
                <div className="text-xs text-gray-400">{row.price} {row.currency}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-green-600">${row.priceUSD.toFixed(2)}</div>
                {i === 0 && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Cheapest</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-gray-900 mb-1">See full price table for {app.name}</div>
          <div className="text-sm text-gray-500">Compare all {table.length} regions with USD and CNY prices.</div>
        </div>
        <Link
          href={`/apps/${app.id}`}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          View Full Comparison
        </Link>
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        Prices for reference only. Exchange rates are approximate. Data updated: {lowest.updatedAt}
      </p>
    </div>
  );
}
