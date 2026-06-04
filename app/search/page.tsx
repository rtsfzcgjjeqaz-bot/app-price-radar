'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { search } from '@/lib/search';
import AppCard from '@/components/AppCard';
import { getAppPriceTable } from '@/lib/price';
import Link from 'next/link';

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') ?? '';
  const [input, setInput] = useState(q);

  useEffect(() => { setInput(q); }, [q]);

  const results = q ? search(q) : [];
  const appResults = results.filter((r) => r.type === 'app');
  const countryResults = results.filter((r) => r.type === 'country');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) router.push(`/search?q=${encodeURIComponent(input.trim())}`);
  }

  return (
    <div className="space-y-8">
      {/* 搜索框 */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search apps or countries..."
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          type="submit"
          className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </form>

      {/* 空状态 */}
      {!q && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-4">🔍</div>
          <p>Enter a search term to find apps or countries.</p>
        </div>
      )}

      {/* 无结果 */}
      {q && !results.length && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-4">😕</div>
          <p>No results found for &ldquo;{q}&rdquo;</p>
        </div>
      )}

      {/* App 结果 */}
      {appResults.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Apps <span className="text-gray-400 font-normal text-base">({appResults.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {appResults.map((r) => {
              const table = getAppPriceTable(r.app!.id);
              const lowest = table[0];
              return (
                <AppCard
                  key={r.app!.id}
                  app={r.app!}
                  lowestPrice={lowest?.priceUSD}
                  lowestCurrency="USD"
                  lowestCountryFlag={lowest?.country.flag}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* 国家结果 */}
      {countryResults.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Countries <span className="text-gray-400 font-normal text-base">({countryResults.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {countryResults.map((r) => (
              <Link
                key={r.country!.code}
                href={`/countries/${r.country!.code}`}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-100 transition-all duration-200 flex items-center gap-3"
              >
                <span className="text-4xl">{r.country!.flag}</span>
                <div>
                  <div className="font-semibold text-gray-900">{r.country!.name}</div>
                  <div className="text-xs text-gray-400">{r.country!.currency} · {r.country!.code}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search</h1>
      <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading...</div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
