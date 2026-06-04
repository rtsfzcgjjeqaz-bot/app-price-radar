import { exchangeRates } from '@/mock/exchangeRates';
import { appPrices } from '@/mock/prices';
import { countries } from '@/mock/countries';
import { apps } from '@/mock/apps';
import type { PriceRow, AppPriceRank, CountryAppRow } from '@/types';

export function convertPrice(
  price: number,
  fromCurrency: string,
  toCurrency: 'USD' | 'CNY'
): number {
  if (price === 0) return 0;
  const rate = exchangeRates.find((r) => r.currency === fromCurrency);
  if (!rate) return 0;
  const value = toCurrency === 'USD' ? price * rate.rateToUSD : price * rate.rateToCNY;
  return Math.round(value * 100) / 100;
}

export function getAppPriceTable(appId: string): PriceRow[] {
  const prices = appPrices.filter((p) => p.appId === appId && p.price > 0);
  const rows = prices.map((p) => {
    const country = countries.find((c) => c.code === p.countryCode);
    if (!country) return null;
    return {
      country,
      price: p.price,
      currency: p.currency,
      priceUSD: convertPrice(p.price, p.currency, 'USD'),
      priceCNY: convertPrice(p.price, p.currency, 'CNY'),
      rank: 0,
      total: prices.length,
      isLowest: false,
      updatedAt: p.updatedAt,
    };
  }).filter(Boolean) as PriceRow[];

  rows.sort((a, b) => a.priceUSD - b.priceUSD);

  rows.forEach((row, i) => {
    row.rank = i + 1;
    row.isLowest = i === 0;
  });

  return rows;
}

export function calculateAppPriceRank(appId: string, countryCode: string): AppPriceRank | null {
  const table = getAppPriceTable(appId);
  const row = table.find((r) => r.country.code === countryCode);
  if (!row) return null;
  return { rank: row.rank, total: row.total, isLowest: row.isLowest };
}

export interface CountryRankRow {
  country: import('@/types').Country;
  appCount: number;
  avgPriceUSD: number;
  totalPriceUSD: number;
  lowestPriceCount: number;
  rank: number;
}

export function getCountryRanking(): CountryRankRow[] {
  const rows: CountryRankRow[] = countries.map((country) => {
    const prices = appPrices.filter((p) => p.countryCode === country.code && p.price > 0);
    const usdPrices = prices.map((p) => convertPrice(p.price, p.currency, 'USD'));
    const totalPriceUSD = usdPrices.reduce((s, v) => s + v, 0);
    const avgPriceUSD = prices.length > 0 ? totalPriceUSD / prices.length : Infinity;
    const lowestPriceCount = prices.filter((p) => {
      const rank = calculateAppPriceRank(p.appId, country.code);
      return rank?.isLowest;
    }).length;
    return {
      country,
      appCount: prices.length,
      avgPriceUSD,
      totalPriceUSD,
      lowestPriceCount,
      rank: 0,
    };
  });

  rows.sort((a, b) => a.avgPriceUSD - b.avgPriceUSD);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

export function getCountryAppPriceTable(countryCode: string): CountryAppRow[] {
  const prices = appPrices.filter((p) => p.countryCode === countryCode && p.price > 0);
  return prices.map((p) => {
    const app = apps.find((a) => a.id === p.appId);
    if (!app) return null;
    const rank = calculateAppPriceRank(p.appId, countryCode);
    if (!rank) return null;
    const allPricesForApp = appPrices.filter((ap) => ap.appId === p.appId && ap.price > 0);
    return {
      app,
      price: p.price,
      currency: p.currency,
      priceUSD: convertPrice(p.price, p.currency, 'USD'),
      priceCNY: convertPrice(p.price, p.currency, 'CNY'),
      rank: rank.rank,
      total: allPricesForApp.length,
      isLowest: rank.isLowest,
      updatedAt: p.updatedAt,
    };
  }).filter(Boolean) as CountryAppRow[];
}
