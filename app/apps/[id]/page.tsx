import { notFound } from 'next/navigation';
import { getAppById } from '@/lib/db/apps';
import { getAppPriceTable, getAppPriceTableByPlan } from '@/lib/db/prices';
import { getDefaultPlan, getPlansByApp } from '@/lib/db/plans';
import { isSupabaseAvailable } from '@/lib/supabase/client';
import AppDetailClient from './AppDetailClient';
import type { Metadata } from 'next';
import type { PriceRow } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const app = await getAppById(id);
  if (!app) return { title: 'App Not Found' };
  const table = await getAppPriceTable(app.id);
  const lowest = table[0];
  return {
    title: `${app.name} — Global App Store Prices`,
    description: `Compare ${app.name} prices across ${table.length} countries. Cheapest region: ${lowest ? `${lowest.country.name} at $${lowest.priceUSD.toFixed(2)}` : 'N/A'}.`,
    openGraph: {
      title: `${app.name} Global Price Comparison`,
      description: `Find the cheapest ${app.name} subscription worldwide. Prices in ${table.length} regions.`,
      images: [app.iconUrl],
    },
  };
}

export default async function AppDetailPage({ params }: Props) {
  const { id } = await params;

  const [app, defaultPlan, allPlans] = await Promise.all([
    getAppById(id),
    getDefaultPlan(id),
    getPlansByApp(id),
  ]);

  if (!app) notFound();

  // Try plan-level prices first; fall back to app-level prices
  let priceTable: PriceRow[] = defaultPlan
    ? await getAppPriceTableByPlan(id, defaultPlan.id)
    : [];

  if (!priceTable.length) {
    priceTable = await getAppPriceTable(id);
  }

  const lowest = priceTable[0];
  const highest = priceTable[priceTable.length - 1];
  const savings =
    highest && lowest
      ? Math.round(((highest.priceUSD - lowest.priceUSD) / highest.priceUSD) * 100)
      : 0;

  return (
    <AppDetailClient
      app={app}
      priceTable={priceTable}
      savings={savings}
      usingSupabase={isSupabaseAvailable()}
      activePlan={defaultPlan ?? null}
      allPlans={allPlans}
    />
  );
}
