'use client';

import { useLocale } from '@/lib/useLocale';
import Link from 'next/link';

export default function AboutClient() {
  const { t } = useLocale();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <span className="text-6xl">📡</span>
        <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-3">{t('about_title')}</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">{t('about_mission')}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mb-12">
        {[
          { icon: '🌍', title: t('why_1_title'), desc: t('why_1_desc') },
          { icon: '🤖', title: t('why_2_title'), desc: t('why_2_desc') },
          { icon: '📊', title: t('why_3_title'), desc: t('why_3_desc') },
        ].map((item) => (
          <div key={item.title} className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
            <div className="text-3xl mb-3">{item.icon}</div>
            <div className="font-semibold text-gray-900 mb-2">{item.title}</div>
            <div className="text-sm text-gray-500 leading-relaxed">{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">{t('about_mission_title')}</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-4">{t('about_mission')}</p>
        <Link href="/data-sources" className="text-sm text-blue-600 hover:underline">
          {t('nav_data_sources')} →
        </Link>
      </div>
    </div>
  );
}
