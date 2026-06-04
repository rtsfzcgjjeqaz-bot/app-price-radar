'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { search } from '@/lib/search';
import type { SearchResult } from '@/types';
import AppIcon from './AppIcon';
import { useLocale } from '@/lib/useLocale';

const AI_TRIGGERS = ['?', 'cheapest', 'compare', 'where', 'which', 'how much', 'price of', 'cost', '哪', '便宜', '价格', '对比', '多少'];

function looksLikeAIQuery(q: string): boolean {
  const lower = q.toLowerCase();
  return AI_TRIGGERS.some((t) => lower.includes(t)) && q.trim().split(' ').length >= 2;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (q.trim()) {
      setResults(search(q));
      setOpen(true);
    } else {
      setResults([]);
      setOpen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    if (looksLikeAIQuery(q) && results.length === 0) {
      router.push(`/ai?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  function handleSelect(result: SearchResult) {
    if (result.type === 'app' && result.app) {
      router.push(`/apps/${result.app.id}`);
    } else if (result.type === 'country' && result.country) {
      router.push(`/countries/${result.country.code}`);
    }
    setQuery('');
    setOpen(false);
  }

  const appResults = results.filter((r) => r.type === 'app');
  const countryResults = results.filter((r) => r.type === 'country');
  const showAISuggestion = query.trim().length > 3 && results.length === 0 && looksLikeAIQuery(query);

  return (
    <div ref={ref} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder={t('hero_search_placeholder')}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </form>

      {open && (results.length > 0 || showAISuggestion) && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 z-50 max-h-80 overflow-y-auto">
          {appResults.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
                {t('search_apps_label')}
              </div>
              {appResults.slice(0, 5).map((r) => (
                <button
                  key={r.app!.id}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
                >
                  <AppIcon src={r.app!.iconUrl} alt={r.app!.name} size={32} className="w-8 h-8 rounded-lg" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.app!.name}</div>
                    <div className="text-xs text-gray-400">{r.app!.developer} · {r.app!.category}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {countryResults.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-50">
                {t('search_countries_label')}
              </div>
              {countryResults.slice(0, 3).map((r) => (
                <button
                  key={r.country!.code}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="text-2xl">{r.country!.flag}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.country!.name}</div>
                    <div className="text-xs text-gray-400">{r.country!.currency} · {r.country!.code}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showAISuggestion && (
            <button
              onClick={() => {
                setOpen(false);
                router.push(`/ai?q=${encodeURIComponent(query.trim())}`);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 hover:bg-purple-50 transition-colors text-left border-t border-gray-50"
            >
              <span className="text-xl">🤖</span>
              <div>
                <div className="text-sm font-medium text-gray-900">Ask AI: &ldquo;{query}&rdquo;</div>
                <div className="text-xs text-gray-400">{t('nav_ai')} → /ai</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
