'use client';

import { useLocale } from '@/lib/useLocale';

export default function PrivacyClient() {
  const { t } = useLocale();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-gray max-w-none">
      <h1>{t('privacy_title')}</h1>
      <p className="text-gray-400 text-sm">Last updated: June 1, 2026</p>
      <h2>1. Information We Collect</h2>
      <p>App Price Radar does not collect personal information. We do not require account registration. Anonymous analytics (page views, search terms) may be collected via privacy-respecting tools.</p>
      <h2>2. Cookies</h2>
      <p>We use a single localStorage key (<code>lang</code>) to remember your language preference. No tracking cookies are used.</p>
      <h2>3. Third-Party Services</h2>
      <p>We query the Apple iTunes Lookup API and the Frankfurter exchange rate API. These are public, unauthenticated APIs. No user data is sent to these services.</p>
      <h2>4. Data Retention</h2>
      <p>We do not store user data. All price data is publicly sourced and cached for display purposes only.</p>
      <h2>5. Contact</h2>
      <p>Questions? Email us at <a href="mailto:hello@apppriceradar.com">hello@apppriceradar.com</a>.</p>
    </div>
  );
}
