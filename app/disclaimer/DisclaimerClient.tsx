'use client';

import { useLocale } from '@/lib/useLocale';

export default function DisclaimerClient() {
  const { t } = useLocale();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('disclaimer_title')}</h1>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
        <p className="text-amber-900 leading-relaxed">{t('disclaimer_body')}</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 text-sm text-gray-600 leading-relaxed">
        <p>App Price Radar is an independent price comparison website. We are not affiliated with, endorsed by, or in any way officially connected with Apple Inc.</p>
        <p>All product names, logos, and brands are property of their respective owners. All company, product, and service names used in this website are for identification purposes only.</p>
        <p>Exchange rates are approximate and provided for informational purposes only. The actual price charged by the App Store may differ due to rounding, taxes, and real-time exchange rate fluctuations.</p>
        <p>We do not encourage users to switch App Store regions to purchase apps at lower prices if doing so would violate Apple's Terms of Service or local laws.</p>
      </div>
    </div>
  );
}
