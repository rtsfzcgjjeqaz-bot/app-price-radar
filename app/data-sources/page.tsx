import type { Metadata } from 'next';
import DataSourcesClient from './DataSourcesClient';

export const metadata: Metadata = {
  title: 'Data Sources — App Price Radar',
  description: 'Learn how App Price Radar collects App Store pricing data via the Apple iTunes Lookup API and exchange rates via Frankfurter.',
};

export default function DataSourcesPage() {
  return <DataSourcesClient />;
}
