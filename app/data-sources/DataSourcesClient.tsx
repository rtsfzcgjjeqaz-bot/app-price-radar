'use client';

import { useLocale } from '@/lib/useLocale';
import { apps } from '@/mock/apps';
import { countries } from '@/mock/countries';
import { exchangeRates } from '@/mock/exchangeRates';
import { Database, RefreshCw, Users, AlertCircle } from 'lucide-react';

export default function DataSourcesClient() {
  const { t } = useLocale();

  const faqs = [
    { q: t('ds_faq_1_q'), a: t('ds_faq_1_a') },
    { q: t('ds_faq_2_q'), a: t('ds_faq_2_a') },
    { q: t('ds_faq_3_q'), a: t('ds_faq_3_a') },
    { q: t('ds_faq_4_q'), a: t('ds_faq_4_a') },
  ];

  const sourceTypes = [
    {
      icon: RefreshCw,
      label: 'itunes_lookup',
      labelColor: 'bg-blue-50 text-blue-700 border-blue-200',
      dotColor: 'bg-blue-500',
      title: 'iTunes Lookup API',
      confidence: 'High',
      confidenceColor: 'text-green-600',
      description:
        'One-time paid app prices (e.g. Procreate, Minecraft) are fetched directly from the Apple iTunes Lookup API. The API returns the current download price in the local currency of each App Store region. These prices can be refreshed automatically on a daily schedule.',
      endpoint: 'https://itunes.apple.com/lookup?id={appStoreId}&country={CC}',
      apps: 'Procreate, Minecraft, Monument Valley, Alto\'s Odyssey, Bloons TD 6',
    },
    {
      icon: Database,
      label: 'manual_seed',
      labelColor: 'bg-amber-50 text-amber-700 border-amber-200',
      dotColor: 'bg-amber-400',
      title: 'Curated / Manual Seed',
      confidence: 'Medium',
      confidenceColor: 'text-amber-600',
      description:
        'Subscription-based app prices (e.g. Spotify, ChatGPT, Netflix) are manually seeded. Apple does not expose in-app subscription prices through any public API — the iTunes Lookup API only returns the download price, which is $0.00 for freemium apps. Subscription prices are researched from App Store pages and updated when Apple announces regional price adjustments.',
      endpoint: null,
      apps: 'Spotify, ChatGPT, Netflix, Notion, 1Password, and most subscription apps',
    },
    {
      icon: Users,
      label: 'community',
      labelColor: 'bg-violet-50 text-violet-700 border-violet-200',
      dotColor: 'bg-violet-400',
      title: 'Community Sourced',
      confidence: 'Medium',
      confidenceColor: 'text-amber-600',
      description:
        'Future roadmap: users can submit prices they see on their local App Store. Community submissions are reviewed and cross-referenced before being published. This is the only scalable path to covering subscription prices across 175 countries.',
      endpoint: null,
      apps: 'Coming soon',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('ds_title')}</h1>
      <p className="text-gray-400 mb-10">Transparent about how we collect and display pricing data.</p>

      <div className="space-y-8">
        {/* Price Sources — new section */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Price Data Sources</h2>
          <p className="text-sm text-gray-400 mb-4">
            Each price record in our database carries a <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">source_type</code>, <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">confidence_level</code>, and <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">last_verified_at</code> timestamp so you always know how fresh and reliable a price is.
          </p>
          <div className="space-y-4">
            {sourceTypes.map(({ icon: Icon, label, labelColor, dotColor, title, confidence, confidenceColor, description, endpoint, apps: appList }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{title}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full border ${labelColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        {label}
                      </span>
                      <span className="text-xs text-gray-400">
                        Confidence: <span className={`font-medium ${confidenceColor}`}>{confidence}</span>
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{description}</p>
                    <div className="text-xs text-gray-400">
                      <span className="font-medium text-gray-500">Covers: </span>{appList}
                    </div>
                    {endpoint && (
                      <div className="mt-3 bg-gray-50 rounded-xl p-2.5 font-mono text-xs text-gray-500 break-all">
                        {endpoint}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Subscription price notice */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 leading-relaxed">
            <span className="font-semibold">Why can't subscription prices be auto-fetched?</span>
            <br />
            Apple's public iTunes Lookup API only returns the <em>app download price</em> — it returns $0.00 for all freemium and subscription apps. In-app subscription prices are only accessible via StoreKit on a real device in each country's App Store, or via the App Store Connect API (which requires developer access and only works for your own apps). There is currently no public API for subscription prices of third-party apps.
          </div>
        </section>

        {/* Exchange Rates */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">{t('ds_rates_title')}</h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm font-mono text-gray-700 mb-3">
            {t('ds_rates_source')}
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
          <ul className="mt-3 space-y-1.5 text-sm text-gray-500">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
              One-time paid app prices: refreshed daily via iTunes Lookup API
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              Subscription prices: updated manually when Apple announces storefront price changes
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
              Exchange rates: refreshed daily via Frankfurter API
            </li>
          </ul>
        </section>

        {/* Coverage */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('ds_coverage_title')}</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-[#1a6bff]">{apps.length}+</div>
              <div className="text-xs text-gray-400 mt-1">Apps</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#1a6bff]">{countries.length}</div>
              <div className="text-xs text-gray-400 mt-1">Countries</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#1a6bff]">{exchangeRates.length}</div>
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
