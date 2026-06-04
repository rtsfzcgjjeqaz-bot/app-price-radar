import type { Metadata } from 'next';
import PrivacyClient from './PrivacyClient';

export const metadata: Metadata = {
  title: 'Privacy Policy — App Price Radar',
  description: 'Privacy Policy for App Price Radar.',
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
