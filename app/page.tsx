import { getAllApps } from '@/lib/db/apps';
import { getAppPriceTable } from '@/lib/db/prices';
import HomeClient, { type AppWithLowest } from './HomeClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    absolute: 'App Price Radar — Compare App Store Prices Worldwide',
  },
  description:
    'Compare App Store prices across 20+ countries and 100+ apps. Find the cheapest region for ChatGPT, Spotify, Netflix, Canva, and more.',
};

export default async function HomePage() {
  const apps = await getAllApps();

  const appsWithPrices: AppWithLowest[] = (
    await Promise.all(
      apps.map(async (app) => {
        const table = await getAppPriceTable(app.id);
        const lowest = table[0];
        return { app, lowest };
      }),
    )
  );

  const hotApps = appsWithPrices.filter((a) => a.lowest).slice(0, 4);
  const lowPriceApps = [...appsWithPrices]
    .filter((a) => a.lowest)
    .sort((a, b) => (a.lowest?.priceUSD ?? 0) - (b.lowest?.priceUSD ?? 0))
    .slice(0, 4);
  const recentApps = appsWithPrices.filter((a) => a.lowest).slice(0, 6);

  return (
    <HomeClient
      appCount={apps.length}
      hotApps={hotApps}
      lowPriceApps={lowPriceApps}
      recentApps={recentApps}
    />
  );
}
