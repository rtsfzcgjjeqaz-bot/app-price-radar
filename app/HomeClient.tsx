'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, ArrowRight, Globe, Bot, RefreshCw, ChevronRight } from 'lucide-react';
import AppCard from '@/components/AppCard';
import AppIcon from '@/components/AppIcon';
import { useLocale } from '@/lib/useLocale';
import { search } from '@/lib/search';
import type { App } from '@/types';

export interface AppWithLowest {
  app: App;
  lowest: { priceUSD: number; country: { flag: string; name: string } } | undefined;
}

interface Props {
  appCount: number;
  hotApps: AppWithLowest[];
  lowPriceApps: AppWithLowest[];
  recentApps: AppWithLowest[];
}

const POPULAR_SEARCHES = ['ChatGPT', 'Spotify', 'Canva', 'Netflix', 'Claude', 'YouTube Premium'];

const AI_TRIGGERS = ['?', 'cheapest', 'compare', 'where', 'which', 'how much', '哪', '便宜', '价格', '对比'];
function looksLikeAI(q: string) {
  const l = q.toLowerCase();
  return AI_TRIGGERS.some((t) => l.includes(t)) && q.trim().split(' ').length >= 2;
}

const WHY_ITEMS = [
  { Icon: Globe,     titleKey: 'why_1_title' as const, descKey: 'why_1_desc' as const },
  { Icon: Bot,       titleKey: 'why_2_title' as const, descKey: 'why_2_desc' as const },
  { Icon: RefreshCw, titleKey: 'why_3_title' as const, descKey: 'why_3_desc' as const },
];

export default function HomeClient({ appCount, hotApps, lowPriceApps, recentApps }: Props) {
  const { t } = useLocale();
  const router = useRouter();
  const [heroQuery, setHeroQuery] = useState('');

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
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[80vh] bg-[#0a0a0a] text-white overflow-hidden px-4">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[700px] h-[500px] rounded-full bg-[#1a6bff]/10 blur-[120px]" />
        </div>

        <div className="relative z-10 w-full max-w-3xl flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-white/60 font-medium mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a6bff]" />
            {t('hero_badge')}
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.07] mb-5">
            Compare App Store
            <br />
            <span className="text-[#1a6bff]">Prices Worldwide</span>
          </h1>

          <p className="text-base sm:text-lg text-white/50 max-w-lg mb-10 leading-relaxed">
            {t('hero_subheadline')}
          </p>

          <form onSubmit={handleHeroSubmit} className="w-full max-w-2xl mb-6">
            <div className="flex items-center gap-2 bg-white/8 border border-white/12 rounded-2xl p-2 focus-within:border-[#1a6bff]/50 transition-colors">
              <Search size={16} className="ml-2 text-white/30 shrink-0" />
              <input
                type="text"
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder={t('hero_search_placeholder')}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 px-2 py-2 focus:outline-none"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-[#1a6bff] hover:bg-[#3580ff] text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors shrink-0"
              >
                {t('search_btn')}
                <ArrowRight size={14} />
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-white/30">{t('popular_searches')}</span>
            {POPULAR_SEARCHES.map((name) => (
              <button
                key={name}
                onClick={() => handlePopular(name)}
                className="text-xs px-3 py-1 rounded-full border border-white/10 text-white/50 hover:border-[#1a6bff]/60 hover:text-white/80 transition-colors"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 w-full max-w-3xl mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px border-t border-white/8 pt-8">
          {[
            { value: `${appCount}+`, label: t('stat_apps') },
            { value: '20+', label: t('stat_countries') },
            { value: `${appCount * 18}+`, label: t('stat_prices') },
            { value: '19', label: t('stat_currencies') },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-0.5 py-2">
              <span className="text-2xl font-bold text-white">{s.value}</span>
              <span className="text-xs text-white/35">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        <section>
          <SectionHeader title={t('section_popular_title')} action={{ label: t('section_view_all'), href: '/search' }} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotApps.map(({ app, lowest }) => (
              <AppCard key={app.id} app={app} lowestPrice={lowest?.priceUSD} lowestCurrency="USD" lowestCountryFlag={lowest?.country.flag} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            title={t('section_best_value_title')}
            sub={t('section_best_value_sub')}
            action={{ label: t('section_view_all'), href: '/app-ranking' }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {lowPriceApps.map(({ app, lowest }) => (
              <AppCard key={app.id} app={app} lowestPrice={lowest?.priceUSD} lowestCurrency="USD" lowestCountryFlag={lowest?.country.flag} />
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title={t('why_title')} centered />
          <div className="grid sm:grid-cols-3 gap-4">
            {WHY_ITEMS.map(({ Icon, titleKey, descKey }) => (
              <div key={titleKey} className="rounded-2xl border border-gray-100 bg-white p-7 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-gray-700" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{t(titleKey)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title={t('section_recent_title')} />
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {recentApps.map(({ app, lowest }, i) => (
              <Link
                key={app.id}
                href={`/apps/${app.id}`}
                className={`group flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}
              >
                <span className="text-xs text-gray-300 w-4 shrink-0 font-mono text-right">{i + 1}</span>
                <AppIcon src={app.iconUrl} alt={app.name} size={44} className="w-11 h-11 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate group-hover:text-[#1a6bff] transition-colors">{app.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{app.developer} · {app.category}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-gray-900">
                    from ${lowest?.priceUSD.toFixed(2) ?? '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {lowest?.country.flag} {lowest?.country.name}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-200 group-hover:text-[#1a6bff] transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-[#0a0a0a] text-white px-8 py-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-[#1a6bff]/15 flex items-center justify-center shrink-0">
            <Bot size={22} className="text-[#1a6bff]" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg font-semibold mb-1">{t('why_2_title')}</h2>
            <p className="text-sm text-white/50 max-w-lg leading-relaxed">{t('why_2_desc')}</p>
          </div>
          <Link
            href="/ai"
            className="shrink-0 flex items-center gap-1.5 bg-[#1a6bff] hover:bg-[#3580ff] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            {t('nav_ai')}
            <ArrowRight size={14} />
          </Link>
        </section>

      </div>
    </div>
  );
}

function SectionHeader({
  title,
  sub,
  action,
  centered,
}: {
  title: string;
  sub?: string;
  action?: { label: string; href: string };
  centered?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between mb-6 ${centered ? 'flex-col text-center gap-1' : ''}`}>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-1 text-sm text-[#1a6bff] hover:text-[#3580ff] font-medium transition-colors"
        >
          {action.label}
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}
