import { getCountryRanking } from '@/lib/db/prices';
import CountryRankingClient from './CountryRankingClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Country Price Ranking — Cheapest App Store by Country',
  description:
    'Compare App Store prices across 20+ countries. See which countries have the lowest average subscription prices for apps like Spotify, Netflix, ChatGPT and more.',
};

export default async function CountryRankingPage() {
  const rows = (await getCountryRanking()).filter((r) => r.appCount > 0);
  const cheapest = rows[0];
  const mostExpensive = rows[rows.length - 1];
  const gapPct =
    cheapest && mostExpensive
      ? Math.round(
          ((mostExpensive.avgPriceUSD - cheapest.avgPriceUSD) / mostExpensive.avgPriceUSD) * 100,
        )
      : 0;

  return (
    <CountryRankingClient
      rows={rows}
      cheapest={cheapest}
      mostExpensive={mostExpensive}
      gapPct={gapPct}
    />
  );
}
