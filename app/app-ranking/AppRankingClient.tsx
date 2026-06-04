'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/useLocale';
import AppIcon from '@/components/AppIcon';
import type { App } from '@/types';

export interface AppRankRow {
  app: App;
  lowestUSD: number;
  highestUSD: number;
  savings: number;
  regionCount: number;
  cheapestFlag: string;
  cheapestCountry: string;
}

interface Props {
  rows: AppRankRow[];
  usingSupabase: boolean;
}

export default function AppRankingClient({ rows, usingSupabase }: Props) {
  const { t } = useLocale();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('ranking_app_title')}</h1>
        <p className="text-gray-400 text-sm">{t('ranking_app_sub')}</p>
      </div>

      <div className="mb-4 flex items-center gap-2 text-xs">
        <span className="text-gray-400">{t('source_label')}</span>
        {usingSupabase ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t('source_supabase')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            {t('source_mock')}
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4">{t('ranking_col_app')}</div>
          <div className="col-span-2 text-right">{t('ranking_col_lowest')}</div>
          <div className="col-span-2 text-right">{t('ranking_col_highest')}</div>
          <div className="col-span-2 text-center">{t('ranking_col_savings')}</div>
          <div className="col-span-1 text-center">{t('ranking_col_regions')}</div>
        </div>
        {rows.map((row, i) => (
          <Link
            key={row.app.id}
            href={`/apps/${row.app.id}`}
            className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-blue-50/40 transition-colors border-b border-gray-50 last:border-0"
          >
            <div className="col-span-1 text-center">
              {i === 0 ? (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                  1
                </span>
              ) : (
                <span className="text-sm text-gray-400">{i + 1}</span>
              )}
            </div>
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              <AppIcon src={row.app.iconUrl} alt={row.app.name} size={40} className="w-10 h-10 rounded-xl shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">{row.app.name}</div>
                <div className="text-xs text-gray-400 truncate">{row.app.developer}</div>
              </div>
            </div>
            <div className="col-span-2 text-right">
              <div className="text-sm font-semibold text-green-600">${row.lowestUSD.toFixed(2)}</div>
              <div className="text-xs text-gray-400">{row.cheapestFlag} {row.cheapestCountry}</div>
            </div>
            <div className="col-span-2 text-right">
              <div className="text-sm text-gray-500">${row.highestUSD.toFixed(2)}</div>
            </div>
            <div className="col-span-2 text-center">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                row.savings >= 70 ? 'bg-green-100 text-green-700'
                  : row.savings >= 40 ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                -{row.savings}%
              </span>
            </div>
            <div className="col-span-1 text-center text-sm text-gray-400">{row.regionCount}</div>
          </Link>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-400 text-center">{t('ranking_footer_app')}</p>
    </div>
  );
}
