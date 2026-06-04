'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Radar, Menu, X } from 'lucide-react';
import SearchBar from './SearchBar';
import { useLocale } from '@/lib/useLocale';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, setLang, t } = useLocale();

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-[#1a6bff] shrink-0">
            <Radar size={20} />
            <span className="hidden sm:inline text-sm tracking-tight">App Price Radar</span>
          </Link>

          {/* Desktop search */}
          <div className="hidden md:flex flex-1 max-w-md">
            <SearchBar />
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-500 shrink-0">
            <Link href="/ai" className="hover:text-gray-900 transition-colors">{t('nav_ai')}</Link>
            <Link href="/app-ranking" className="hover:text-gray-900 transition-colors">{t('nav_app_ranking')}</Link>
            <Link href="/country-ranking" className="hover:text-gray-900 transition-colors">{t('nav_country_ranking')}</Link>
            <Link href="/data-sources" className="hover:text-gray-900 transition-colors">{t('nav_data_sources')}</Link>
            {/* Language toggle */}
            <div className="flex items-center gap-px text-xs border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1.5 transition-colors ${lang === 'en' ? 'bg-[#1a6bff] text-white' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                {t('nav_lang_en')}
              </button>
              <button
                onClick={() => setLang('zh')}
                className={`px-2.5 py-1.5 transition-colors ${lang === 'zh' ? 'bg-[#1a6bff] text-white' : 'hover:bg-gray-50 text-gray-500'}`}
              >
                {t('nav_lang_zh')}
              </button>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-3 border-t border-gray-50 pt-3">
            <SearchBar />
            <div className="flex flex-col gap-2 text-sm font-medium text-gray-600">
              <Link href="/ai" className="hover:text-[#1a6bff]" onClick={() => setMenuOpen(false)}>{t('nav_ai')}</Link>
              <Link href="/app-ranking" className="hover:text-[#1a6bff]" onClick={() => setMenuOpen(false)}>{t('nav_app_ranking')}</Link>
              <Link href="/country-ranking" className="hover:text-[#1a6bff]" onClick={() => setMenuOpen(false)}>{t('nav_country_ranking')}</Link>
              <Link href="/data-sources" className="hover:text-[#1a6bff]" onClick={() => setMenuOpen(false)}>{t('nav_data_sources')}</Link>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${lang === 'en' ? 'bg-[#1a6bff] text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('zh')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${lang === 'zh' ? 'bg-[#1a6bff] text-white' : 'bg-gray-100 text-gray-500'}`}
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
