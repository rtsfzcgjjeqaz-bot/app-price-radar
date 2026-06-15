import { getAllApps } from '@/lib/db/apps';
import { getAppPriceTable } from '@/lib/db/prices';
import { isSupabaseAvailable } from '@/lib/db/client';
import AppRankingClient, { type AppRankRow } from './AppRankingClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'App Price Ranking — Cheapest Apps Worldwide',
  description:
    'See global price rankings for 100+ apps. Find the biggest savings and cheapest regions for ChatGPT, Spotify, Netflix, and more.',
};

export default async function AppRankingPage() {
  const apps = await getAllApps();

  const settled = await Promise.all(
    apps.map(async (app) => {
      const table = await getAppPriceTable(app.id);
      if (table.length === 0) return null;
      const lowest = table[0];
      const highest = table[table.length - 1];
      const savings =
        highest.priceUSD > 0
          ? Math.round(((highest.priceUSD - lowest.priceUSD) / highest.priceUSD) * 100)
          : 0;
      return {
        app,
        lowestUSD: lowest.priceUSD,
        highestUSD: highest.priceUSD,
        savings,
        regionCount: table.length,
        cheapestFlag: lowest.country.flag,
        cheapestCountry: lowest.country.name,
      } satisfies AppRankRow;
    }),
  );

  const rows = (settled.filter(Boolean) as AppRankRow[]).sort(
    (a, b) => a.lowestUSD - b.lowestUSD,
  );

  return <AppRankingClient rows={rows} usingSupabase={isSupabaseAvailable()} />;
}
