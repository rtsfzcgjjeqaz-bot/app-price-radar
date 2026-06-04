'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/useLocale';

export default function Footer() {
  const { t } = useLocale();
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="font-semibold text-gray-900 mb-3 text-sm">{t('footer_product')}</div>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/app-ranking" className="hover:text-blue-600 transition-colors">{t('nav_app_ranking')}</Link></li>
              <li><Link href="/country-ranking" className="hover:text-blue-600 transition-colors">{t('nav_country_ranking')}</Link></li>
              <li><Link href="/ai" className="hover:text-blue-600 transition-colors">{t('footer_ai_search')}</Link></li>
              <li><Link href="/search" className="hover:text-blue-600 transition-colors">{t('nav_search')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-3 text-sm">{t('footer_resources')}</div>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/data-sources" className="hover:text-blue-600 transition-colors">{t('footer_data_sources')}</Link></li>
              <li><span className="text-gray-300">{t('footer_blog')}</span></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-3 text-sm">{t('footer_company')}</div>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/about" className="hover:text-blue-600 transition-colors">{t('footer_about')}</Link></li>
              <li><Link href="/contact" className="hover:text-blue-600 transition-colors">{t('footer_contact')}</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-3 text-sm">{t('footer_legal')}</div>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><Link href="/privacy" className="hover:text-blue-600 transition-colors">{t('footer_privacy')}</Link></li>
              <li><Link href="/terms" className="hover:text-blue-600 transition-colors">{t('footer_terms')}</Link></li>
              <li><Link href="/disclaimer" className="hover:text-blue-600 transition-colors">{t('footer_disclaimer')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-700">
            <span className="text-xl">📡</span>
            <span>App Price Radar</span>
          </Link>
          <p className="text-xs text-gray-400">{t('footer_copy')}</p>
        </div>
      </div>
    </footer>
  );
}
