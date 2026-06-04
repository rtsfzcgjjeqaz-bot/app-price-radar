'use client';

import { useLocale } from '@/lib/useLocale';

export default function TermsClient() {
  const { t } = useLocale();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-gray max-w-none">
      <h1>{t('terms_title')}</h1>
      <p className="text-gray-400 text-sm">Last updated: June 1, 2026</p>
      <h2>1. Acceptance of Terms</h2>
      <p>By using App Price Radar, you agree to these terms. If you do not agree, please do not use this service.</p>
      <h2>2. Use of Service</h2>
      <p>App Price Radar provides pricing information for reference purposes only. You may not use this service to facilitate or encourage violations of Apple's App Store terms of service.</p>
      <h2>3. Accuracy of Information</h2>
      <p>We strive for accuracy but cannot guarantee that all prices are current or correct. Always verify prices directly in the App Store before making purchasing decisions.</p>
      <h2>4. Intellectual Property</h2>
      <p>App names, icons, and trademarks are property of their respective owners. App Price Radar is an independent price comparison service and is not affiliated with Apple Inc.</p>
      <h2>5. Limitation of Liability</h2>
      <p>App Price Radar is provided "as is". We are not liable for any losses arising from use of this service or reliance on price information displayed.</p>
      <h2>6. Changes to Terms</h2>
      <p>We may update these terms at any time. Continued use of the service constitutes acceptance of updated terms.</p>
      <h2>7. Contact</h2>
      <p>Questions? Email us at <a href="mailto:hello@apppriceradar.com">hello@apppriceradar.com</a>.</p>
    </div>
  );
}
