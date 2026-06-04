import type { Metadata } from 'next';
import TermsClient from './TermsClient';

export const metadata: Metadata = {
  title: 'Terms of Service — App Price Radar',
  description: 'Terms of Service for App Price Radar.',
};

export default function TermsPage() {
  return <TermsClient />;
}
