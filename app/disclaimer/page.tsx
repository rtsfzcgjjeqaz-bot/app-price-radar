import type { Metadata } from 'next';
import DisclaimerClient from './DisclaimerClient';

export const metadata: Metadata = {
  title: 'Disclaimer — App Price Radar',
  description: 'Prices shown on App Price Radar are for reference only.',
};

export default function DisclaimerPage() {
  return <DisclaimerClient />;
}
