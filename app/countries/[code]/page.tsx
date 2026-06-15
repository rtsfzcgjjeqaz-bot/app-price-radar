import { notFound } from 'next/navigation';
import { getCountryByCode } from '@/lib/db/countries';
import { isSupabaseAvailable } from '@/lib/db/client';
import CountryDetailClient from './CountryDetailClient';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const country = await getCountryByCode(code.toUpperCase());
  if (!country) return { title: 'Country Not Found' };
  return {
    title: `${country.flag} ${country.name} App Store Prices — App Price Radar`,
    description: `Compare App Store prices in ${country.name} (${country.currency}). See global rankings, cheapest apps, and how prices compare worldwide.`,
  };
}

export default async function CountryDetailPage({ params }: Props) {
  const { code } = await params;
  const country = await getCountryByCode(code.toUpperCase());
  if (!country) notFound();
  return <CountryDetailClient country={country} usingSupabase={isSupabaseAvailable()} />;
}
