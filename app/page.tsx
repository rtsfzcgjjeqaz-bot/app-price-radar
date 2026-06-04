'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AppCard from '@/components/AppCard';
import AppIcon from '@/components/AppIcon';
import { apps } from '@/mock/apps';
import { getAppPriceTable } from '@/lib/price';
import { useLocale } from '@/lib/useLocale';
import { search } from '@/lib/search';

const POPULAR_SEARCHES = ['ChatGPT', 'Spotify', 'Canva', 'Netflix', 'Claude', 'YouTube Premium'];

const AI_TRIGGERS = ['?', 'cheapest', 'compare', 'where', 'which', 'how much', '哪', '便宜', '价格', '对比'];
function looksLikeAI(q: string) {
  const l = q.toLowerCase();
  return AI_TRIGGERS.some((t) => l.includes(t)) && q.trim().split(' ').length >= 2;
}

export default function Home() {
  const { t } = useLocale();
  const router = useRouter();
  const [heroQuery, setHeroQuery] = useState('');

  const appsWithPrices = apps.map((app) => {
    const table = getAppPriceTable(app.id);
    return { app, lowest: table[0] };
  });

  const hotApps = appsWithPrices.filter((a) => a.lowest).slice(0, 4);
  const lowPriceApps = [...appsWithPrices]
    .filter((a) => a.lowest)
    .sort((a, b) => (a.lowest?.priceUSD ?? 0) - (b.lowest?.priceUSD ?? 0))
    .slice(0, 4);

  function handleHeroSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = heroQuery.trim();
    if (!q) return;
    const results = search(q);
    if (results.length === 1 && results[0].type === 'app' && results[0].app) {
      router.push(`/apps/${results[0].app.id}`);
    } else if (results.length === 1 && results[0].type === 'country' && results[0].country) {
      router.push(`/countries/${results[0].country.code}`);
    } else if (looksLikeAI(q) && results.length === 0) {
      router.push(`/ai?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  function handlePopular(name: string) {
    const results = search(name);
    if (results[0]?.type === 'app' && results[0].app) {
      router.push(`/apps/${results[0].app.id}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(name)}`);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <section className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-sm font-medium mb-6">
          <span>📡</span> {t('hero_badge')}
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          {t('hero_headline').split('Worldwide').map((part, i) =>
            i === 0 ? (
              <span key={i}>
                {part}
                <span className="text-blue-600">Worldwide</span>
              </span>
            ) : part
          )}
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
          {t('hero_subheadline')}
        </p>

        {/* Hero Search */}
        <form onSubmit={handleHeroSubmit} className="max-w-xl mx-auto mb-4">
          <div className="flex gap-2 bg-white border border-gray-200 rounded-2xl p-2 shadow-md">
            <span className="pl-2 flex items-center text-gray-400">🔍</span>
            <input
              type="text"
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              placeholder={t('hero_search_placeholder')}
              className="flex-1 text-sm px-2 py-2 focus:outline-none bg-transparent"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {t('search_btn')}
            </button>
          </div>
        </form>

        {/* Popular Searches */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-gray-400">{t('popular_searches')}</span>
          {POPULAR_SEARCHES.map((name) => (
            <button
              key={name}
              onClick={() => handlePopular(name)}
              className="px-3 py-1 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
        {[
          { label: t('stat_apps'), value: `${apps.length}+`, icon: '📱' },
          { label: t('stat_countries'), value: '20+', icon: '🌍' },
          { label: t('stat_prices'), value: `${apps.length * 18}+`, icon: '💰' },
          { label: t('stat_currencies'), value: '19', icon: '💱' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Popular Apps */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('section_popular')}</h2>
          <Link href="/search" className="text-sm text-blue-600 hover:underline">{t('section_view_all')}</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {hotApps.map(({ app, lowest }) => (
            <AppCard key={app.id} app={app} lowestPrice={lowest?.priceUSD} lowestCurrency="USD" lowestCountryFlag={lowest?.country.flag} />
          ))}
        </div>
      </section>

      {/* Best Value */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('section_best_value')}</h2>
          <span className="text-sm text-gray-400">{t('section_best_value_sub')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {lowPriceApps.map(({ app, lowest }) => (
            <AppCard key={app.id} app={app} lowestPrice={lowest?.priceUSD} lowestCurrency="USD" lowestCountryFlag={lowest?.country.flag} />
          ))}
        </div>
      </section>

      {/* Why Use */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">{t('why_title')}</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: '🌍', title: t('why_1_title'), desc: t('why_1_desc') },
            { icon: '🤖', title: t('why_2_title'), desc: t('why_2_desc') },
            { icon: '📊', title: t('why_3_title'), desc: t('why_3_desc') },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <div className="text-4xl mb-3">{item.icon}</div>
              <div className="font-semibold text-gray-900 mb-2">{item.title}</div>
              <div className="text-sm text-gray-500 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recently Updated */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('section_recent')}</h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {appsWithPrices.slice(0, 5).map(({ app, lowest }, i) => (
            <Link
              key={app.id}
              href={`/apps/${app.id}`}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-blue-50/40 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}
            >
              <AppIcon src={app.iconUrl} alt={app.name} size={40} className="w-10 h-10 rounded-xl" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{app.name}</div>
                <div className="text-xs text-gray-400">{app.developer} · {app.category}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">
                  from ${lowest?.priceUSD.toFixed(2) ?? '—'}
                </div>
                <div className="text-xs text-gray-400">{lowest?.updatedAt ?? '—'}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
