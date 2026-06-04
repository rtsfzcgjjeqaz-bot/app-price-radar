'use client';

import Link from 'next/link';
import { useState } from 'react';
import SearchBar from './SearchBar';
import { useLocale } from '@/lib/useLocale';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, setLang, t } = useLocale();

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600 shrink-0">
            <span className="text-2xl">📡</span>
            <span className="hidden sm:inline">App Price Radar</span>
          </Link>

          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBar />
          </div>

          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-600 shrink-0">
            <Link href="/ai" className="hover:text-blue-600 transition-colors">{t('nav_ai')}</Link>
            <Link href="/app-ranking" className="hover:text-blue-600 transition-colors">{t('nav_app_ranking')}</Link>
            <Link href="/country-ranking" className="hover:text-blue-600 transition-colors">{t('nav_country_ranking')}</Link>
            <Link href="/data-sources" className="hover:text-blue-600 transition-colors">{t('nav_data_sources')}</Link>
            <div className="flex items-center gap-0.5 text-xs border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1.5 transition-colors ${lang === 'en' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                {t('nav_lang_en')}
              </button>
              <button
                onClick={() => setLang('zh')}
                className={`px-2.5 py-1.5 transition-colors ${lang === 'zh' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                {t('nav_lang_zh')}
              </button>
            </div>
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-5 h-0.5 bg-gray-600 mb-1" />
            <div className="w-5 h-0.5 bg-gray-600 mb-1" />
            <div className="w-5 h-0.5 bg-gray-600" />
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <SearchBar />
            <div className="flex flex-col gap-2 text-sm font-medium text-gray-600">
              <Link href="/ai" className="hover:text-blue-600" onClick={() => setMenuOpen(false)}>{t('nav_ai')}</Link>
              <Link href="/app-ranking" className="hover:text-blue-600" onClick={() => setMenuOpen(false)}>{t('nav_app_ranking')}</Link>
              <Link href="/country-ranking" className="hover:text-blue-600" onClick={() => setMenuOpen(false)}>{t('nav_country_ranking')}</Link>
              <Link href="/data-sources" className="hover:text-blue-600" onClick={() => setMenuOpen(false)}>{t('nav_data_sources')}</Link>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('zh')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${lang === 'zh' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                中文
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
