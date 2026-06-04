'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { getCountryAppPriceTable, getCountryRanking } from '@/lib/price';
import { useLocale } from '@/lib/useLocale';
import CountryAppPriceTable from '@/components/CountryAppPriceTable';
import FilterBar from '@/components/FilterBar';
import SortSelect from '@/components/SortSelect';
import type { CountryAppRow, Country } from '@/types';

interface Props {
  country: Country;
  usingSupabase?: boolean;
}

export default function CountryDetailClient({ country, usingSupabase = false }: Props) {
  const { t } = useLocale();
  const allRows = getCountryAppPriceTable(country.code);
  const ranking = getCountryRanking();
  const myRank = ranking.find((r) => r.country.code === country.code);
  const cheapestCountry = ranking[0];
  const categories = [...new Set(allRows.map((r) => r.app.category))].sort();

  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('priceUSD');
  const [onlyLowest, setOnlyLowest] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    let rows: CountryAppRow[] = allRows;
    if (category !== 'All') rows = rows.filter((r) => r.app.category === category);
    if (onlyLowest) rows = rows.filter((r) => r.isLowest);
    if (searchQuery) rows = rows.filter((r) => r.app.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return [...rows].sort((a, b) => {
      if (sort === 'priceUSD') return a.priceUSD - b.priceUSD;
      if (sort === 'rank') return a.rank - b.rank;
      if (sort === 'name') return a.app.name.localeCompare(b.app.name);
      return 0;
    });
  }, [allRows, category, sort, onlyLowest, searchQuery]);

  const totalRanked = ranking.filter((r) => r.appCount > 0).length;
  const savingsVsCheapest =
    myRank && cheapestCountry && myRank.country.code !== cheapestCountry.country.code
      ? (myRank.avgPriceUSD - cheapestCountry.avgPriceUSD).toFixed(2)
      : null;
  const savingsPct =
    myRank && cheapestCountry && cheapestCountry.avgPriceUSD > 0 && myRank.avgPriceUSD > cheapestCountry.avgPriceUSD
      ? Math.round(((myRank.avgPriceUSD - cheapestCountry.avgPriceUSD) / myRank.avgPriceUSD) * 100)
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-5xl">{country.flag}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{country.name}</h1>
            <p className="text-gray-400 text-sm">
              {country.currency} · {country.code} · {t('country_apps_count', { n: String(allRows.length) })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs">
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{allRows.length}</div>
            <div className="text-xs text-gray-400">{t('country_apps_available')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {allRows.filter((r) => r.isLowest).length}
            </div>
            <div className="text-xs text-gray-400">{t('country_global_best')}</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${myRank && myRank.rank <= 3 ? 'text-green-600' : 'text-blue-600'}`}>
              {myRank ? `#${myRank.rank} / ${totalRanked}` : '—'}
            </div>
            <div className="text-xs text-gray-400">{t('country_global_rank')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{categories.length}</div>
            <div className="text-xs text-gray-400">{t('country_categories')}</div>
          </div>
        </div>

        {savingsVsCheapest && savingsPct !== null && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3">
            <span className="text-xl">{cheapestCountry.country.flag}</span>
            <div className="text-sm text-amber-800">
              <span className="font-medium">{cheapestCountry.country.name}</span>{' '}
              {t('country_cheaper_msg', {
                avg: cheapestCountry.avgPriceUSD.toFixed(2),
                diff: savingsVsCheapest,
                pct: String(savingsPct),
              })}
            </div>
            <Link
              href={`/countries/${cheapestCountry.country.code}`}
              className="ml-auto shrink-0 text-xs text-amber-700 hover:underline"
            >
              View →
            </Link>
          </div>
        )}

        {myRank?.rank === 1 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800 font-medium">
            {t('country_is_cheapest')}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder={t('country_search_apps')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
          <SortSelect
            label={t('country_sort')}
            value={sort}
            onChange={setSort}
            options={[
              { label: t('country_price_usd'), value: 'priceUSD' },
              { label: t('country_global_rank_sort'), value: 'rank' },
              { label: t('country_app_name'), value: 'name' },
            ]}
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyLowest}
              onChange={(e) => setOnlyLowest(e.target.checked)}
              className="rounded"
            />
            {t('country_best_only')}
          </label>
        </div>
        <FilterBar categories={categories} selected={category} onChange={setCategory} />
      </div>

      {filtered.length > 0 ? (
        <CountryAppPriceTable rows={filtered} currency={country.currency} />
      ) : (
        <div className="text-center py-12 text-gray-400">{t('country_no_match')}</div>
      )}
    </div>
  );
}
