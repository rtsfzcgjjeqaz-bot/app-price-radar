import { supabase } from './client';
import { getAppPriceTable as mockGetAppPriceTable, getCountryAppPriceTable as mockGetCountryAppPriceTable, getCountryRanking as mockGetCountryRanking, convertPrice } from '@/lib/price';
import { countries as mockCountries } from '@/mock/countries';
import { apps as mockApps } from '@/mock/apps';
import { exchangeRates as mockRates } from '@/mock/exchangeRates';
import type { PriceRow, CountryAppRow, ExchangeRate, PlanPriceRow } from '@/types';
import type { CountryRankRow } from '@/lib/price';

async function getExchangeRates(): Promise<ExchangeRate[]> {
  if (!supabase) return mockRates;

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('currency, rate_to_usd, rate_to_cny');

  if (error || !data?.length) return mockRates;

  return data.map((r) => ({
    currency: r.currency,
    rateToUSD: Number(r.rate_to_usd),
    rateToCNY: Number(r.rate_to_cny),
  }));
}

function calcUSD(price: number, currency: string, rates: ExchangeRate[]): number {
  if (price === 0) return 0;
  const rate = rates.find((r) => r.currency === currency);
  if (!rate) return 0;
  return Math.round(price * rate.rateToUSD * 100) / 100;
}

function calcCNY(price: number, currency: string, rates: ExchangeRate[]): number {
  if (price === 0) return 0;
  const rate = rates.find((r) => r.currency === currency);
  if (!rate) return 0;
  return Math.round(price * rate.rateToCNY * 100) / 100;
}

export async function getAppPriceTable(appId: string): Promise<PriceRow[]> {
  if (!supabase) return mockGetAppPriceTable(appId);

  const { data, error } = await supabase
    .from('current_prices')
    .select('country_code, price, currency, updated_at')
    .eq('app_id', appId)
    .gt('price', 0);

  if (error || !data?.length) return mockGetAppPriceTable(appId);

  const [rates, countries] = await Promise.all([
    getExchangeRates(),
    supabase.from('countries').select('code, name, currency, flag').then(
      ({ data: cd }) => cd ?? mockCountries,
    ),
  ]);

  const rows: PriceRow[] = data
    .map((p) => {
      const country = (countries as typeof mockCountries).find((c) => c.code === p.country_code);
      if (!country) return null;
      return {
        country,
        price: Number(p.price),
        currency: p.currency,
        priceUSD: calcUSD(Number(p.price), p.currency, rates),
        priceCNY: calcCNY(Number(p.price), p.currency, rates),
        rank: 0,
        total: data.length,
        isLowest: false,
        updatedAt: p.updated_at?.slice(0, 10) ?? '',
      };
    })
    .filter(Boolean) as PriceRow[];

  rows.sort((a, b) => a.priceUSD - b.priceUSD);
  rows.forEach((row, i) => {
    row.rank = i + 1;
    row.isLowest = i === 0;
  });

  return rows;
}

export async function getCountryAppPriceTable(countryCode: string): Promise<CountryAppRow[]> {
  if (!supabase) return mockGetCountryAppPriceTable(countryCode);

  // Fetch prices for this country
  const { data, error } = await supabase
    .from('current_prices')
    .select('app_id, price, currency, updated_at')
    .eq('country_code', countryCode)
    .gt('price', 0);

  if (error || !data?.length) return mockGetCountryAppPriceTable(countryCode);

  const appIds = data.map((p) => p.app_id);

  // Single batched query for all-country prices across the apps in this country.
  // Replaces the N inner queries (one per app) that existed before.
  const [rates, appsData, allPricesData] = await Promise.all([
    getExchangeRates(),
    supabase
      .from('apps')
      .select('id, app_store_id, name, developer, category, icon_url, description')
      .in('id', appIds)
      .then(({ data: ad }) =>
        ad?.map((r) => ({
          id: r.id, appStoreId: r.app_store_id, name: r.name,
          developer: r.developer, category: r.category,
          iconUrl: r.icon_url, description: r.description,
        })) ?? mockApps,
      ),
    supabase
      .from('current_prices')
      .select('app_id, price, currency')
      .in('app_id', appIds)
      .gt('price', 0)
      .then(({ data: pd }) => pd ?? []),
  ]);

  // Group all-country USD prices by app_id for rank computation
  const usdByApp = new Map<string, number[]>();
  for (const p of allPricesData) {
    const usd = calcUSD(Number(p.price), p.currency, rates);
    if (usd > 0) {
      const list = usdByApp.get(p.app_id) ?? [];
      list.push(usd);
      usdByApp.set(p.app_id, list);
    }
  }
  // Sort each app's price list once
  for (const list of usdByApp.values()) list.sort((a, b) => a - b);

  const rows: CountryAppRow[] = data
    .map((p) => {
      const app = (appsData as typeof mockApps).find((a) => a.id === p.app_id);
      if (!app) return null;

      const myUSD = calcUSD(Number(p.price), p.currency, rates);
      const usdPrices = usdByApp.get(p.app_id) ?? [];
      const rank = usdPrices.findIndex((v) => v >= myUSD) + 1;
      const total = usdPrices.length;

      return {
        app,
        price: Number(p.price),
        currency: p.currency,
        priceUSD: myUSD,
        priceCNY: calcCNY(Number(p.price), p.currency, rates),
        rank: rank || 1,
        total,
        isLowest: rank === 1,
        updatedAt: p.updated_at?.slice(0, 10) ?? '',
      };
    })
    .filter(Boolean) as CountryAppRow[];

  return rows;
}

export async function getPriceHistory(
  appId: string,
  countryCode: string,
  limit = 30,
): Promise<{ price: number; currency: string; recordedAt: string }[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('price_history')
    .select('price, currency, recorded_at')
    .eq('app_id', appId)
    .eq('country_code', countryCode)
    .order('recorded_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r) => ({
    price: Number(r.price),
    currency: r.currency,
    recordedAt: r.recorded_at,
  }));
}

/**
 * Returns price rows for a specific plan (plan-level prices).
 * Falls back to app-level prices if no plan rows exist in Supabase,
 * or if Supabase is unavailable.
 */
export async function getAppPriceTableByPlan(
  appId: string,
  planId: string,
): Promise<PlanPriceRow[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('current_prices')
    .select('country_code, price, currency, updated_at, plan_id')
    .eq('app_id', appId)
    .eq('plan_id', planId)
    .gt('price', 0);

  if (error || !data?.length) return [];

  // Fetch plan name
  const { data: planData } = await supabase
    .from('plans')
    .select('name, billing_period')
    .eq('id', planId)
    .single();

  const planName = planData?.name ?? planId;
  const billingPeriod = planData?.billing_period ?? 'monthly';

  const [rates, countries] = await Promise.all([
    getExchangeRates(),
    supabase.from('countries').select('code, name, currency, flag').then(
      ({ data: cd }) => cd ?? mockCountries,
    ),
  ]);

  const rows: PlanPriceRow[] = data
    .map((p) => {
      const country = (countries as typeof mockCountries).find((c) => c.code === p.country_code);
      if (!country) return null;
      return {
        country,
        price: Number(p.price),
        currency: p.currency,
        priceUSD: calcUSD(Number(p.price), p.currency, rates),
        priceCNY: calcCNY(Number(p.price), p.currency, rates),
        rank: 0,
        total: data.length,
        isLowest: false,
        updatedAt: p.updated_at?.slice(0, 10) ?? '',
        planId,
        planName,
        billingPeriod,
      };
    })
    .filter(Boolean) as PlanPriceRow[];

  rows.sort((a, b) => a.priceUSD - b.priceUSD);
  rows.forEach((row, i) => {
    row.rank = i + 1;
    row.isLowest = i === 0;
  });

  return rows;
}

export async function getCountryRanking(): Promise<CountryRankRow[]> {
  if (!supabase) return mockGetCountryRanking();

  const { data: priceData, error } = await supabase
    .from('current_prices')
    .select('country_code, app_id, price, currency')
    .gt('price', 0);

  if (error || !priceData?.length) return mockGetCountryRanking();

  const [rates, countriesData] = await Promise.all([
    getExchangeRates(),
    supabase.from('countries').select('code, name, currency, flag').then(
      ({ data: cd }) => cd ?? mockCountries,
    ),
  ]);

  const usdPrices = priceData
    .map((p) => ({
      countryCode: p.country_code,
      appId: p.app_id,
      priceUSD: calcUSD(Number(p.price), p.currency, rates),
    }))
    .filter((p) => p.priceUSD > 0);

  // For each app, find which country has its lowest USD price
  const appIds = [...new Set(usdPrices.map((p) => p.appId))];
  const lowestCountryByApp = new Map<string, string>();
  for (const appId of appIds) {
    const forApp = usdPrices.filter((p) => p.appId === appId);
    forApp.sort((a, b) => a.priceUSD - b.priceUSD);
    if (forApp.length > 0) lowestCountryByApp.set(appId, forApp[0].countryCode);
  }

  const rows: CountryRankRow[] = (countriesData as typeof mockCountries).map((country) => {
    const forCountry = usdPrices.filter((p) => p.countryCode === country.code);
    const appCount = forCountry.length;
    const totalPriceUSD = Math.round(forCountry.reduce((s, p) => s + p.priceUSD, 0) * 100) / 100;
    const avgPriceUSD = appCount > 0 ? Math.round((totalPriceUSD / appCount) * 100) / 100 : Infinity;
    const lowestPriceCount = [...lowestCountryByApp.values()].filter((c) => c === country.code).length;
    return { country, appCount, avgPriceUSD, totalPriceUSD, lowestPriceCount, rank: 0 };
  });

  rows.sort((a, b) => a.avgPriceUSD - b.avgPriceUSD);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
