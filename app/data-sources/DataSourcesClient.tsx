'use client';

import { useLocale } from '@/lib/useLocale';
import { apps } from '@/mock/apps';
import { countries } from '@/mock/countries';
import { exchangeRates } from '@/mock/exchangeRates';

export default function DataSourcesClient() {
  const { t } = useLocale();

  const faqs = [
    { q: t('ds_faq_1_q'), a: t('ds_faq_1_a') },
    { q: t('ds_faq_2_q'), a: t('ds_faq_2_a') },
    { q: t('ds_faq_3_q'), a: t('ds_faq_3_a') },
    { q: t('ds_faq_4_q'), a: t('ds_faq_4_a') },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('ds_title')}</h1>
      <p className="text-gray-400 mb-10">Transparent about how we collect and display pricing data.</p>

      <div className="space-y-8">
        {/* Price Data */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{t('ds_price_title')}</h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm font-mono text-gray-700 mb-3">
            🍎 {t('ds_price_source')}
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{t('ds_price_desc')}</p>
          <div className="mt-3 bg-gray-50 rounded-xl p-3 font-mono text-xs text-gray-500 break-all">
            https://itunes.apple.com/lookup?id=&#123;appStoreId&#125;&amp;country=&#123;CC&#125;&amp;entity=software
          </div>
        </section>

        {/* Exchange Rates */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{t('ds_rates_title')}</h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm font-mono text-gray-700 mb-3">
            💱 {t('ds_rates_source')}
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{t('ds_rates_desc')}</p>
          <div className="mt-3 bg-gray-50 rounded-xl p-3 font-mono text-xs text-gray-500 break-all">
            https://api.frankfurter.app/latest?from=USD
          </div>
        </section>

        {/* Update Frequency */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{t('ds_freq_title')}</h2>
          <p className="text-gray-600 text-sm">{t('ds_freq_desc')}</p>
        </section>

        {/* Coverage */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('ds_coverage_title')}</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{apps.length}+</div>
              <div className="text-xs text-gray-400 mt-1">Apps</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">{countries.length}</div>
              <div className="text-xs text-gray-400 mt-1">Countries</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">{exchangeRates.length}</div>
              <div className="text-xs text-gray-400 mt-1">Currencies</div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('ds_faq_title')}</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="font-medium text-gray-900 mb-2">{faq.q}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{faq.a}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
