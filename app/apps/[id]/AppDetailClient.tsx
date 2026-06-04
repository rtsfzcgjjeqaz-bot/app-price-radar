'use client';

import { useLocale } from '@/lib/useLocale';
import AppIcon from '@/components/AppIcon';
import PriceTable from '@/components/PriceTable';
import type { App, PriceRow } from '@/types';

interface Props {
  app: App;
  priceTable: PriceRow[];
  savings: number;
  usingSupabase: boolean;
}

export default function AppDetailClient({ app, priceTable, savings, usingSupabase }: Props) {
  const { t } = useLocale();
  const lowest = priceTable[0];
  const highest = priceTable[priceTable.length - 1];

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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-50">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {lowest ? `$${lowest.priceUSD.toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-gray-400">{t('app_lowest_usd')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {lowest ? `${lowest.country.flag} ${lowest.country.name}` : '—'}
            </div>
            <div className="text-xs text-gray-400">{t('app_cheapest_region')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">
              {highest ? `$${highest.priceUSD.toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-gray-400">{t('app_highest_usd')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{savings}%</div>
            <div className="text-xs text-gray-400">{t('app_max_savings')}</div>
          </div>
        </div>
      </div>

      {/* Price Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {t('app_global_comparison')}
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({priceTable.length} {t('app_regions')})
            </span>
          </h2>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400">{t('source_label')}</span>
            {usingSupabase ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('source_supabase')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {t('source_mock')}
              </span>
            )}
          </div>
        </div>
        {priceTable.length > 0 ? (
          <PriceTable rows={priceTable} />
        ) : (
          <div className="text-center py-12 text-gray-400">{t('app_no_data')}</div>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        {t('app_disclaimer')} {t('app_data_updated')} {lowest?.updatedAt ?? '—'}
      </p>
    </div>
  );
}
