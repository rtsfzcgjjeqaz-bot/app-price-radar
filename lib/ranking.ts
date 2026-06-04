import { apps } from '@/mock/apps';
import { appPrices } from '@/mock/prices';
import { countries } from '@/mock/countries';
import { convertPrice, getAppPriceTable } from './price';

export function findCheapestCountry(appName: string) {
  const app = apps.find((a) => a.name.toLowerCase().includes(appName.toLowerCase()));
  if (!app) return null;

  const table = getAppPriceTable(app.id);
  if (!table.length) return null;

  const cheapest = table[0];
  const mostExpensive = table[table.length - 1];
  const savings =
    mostExpensive.priceUSD > 0
      ? Math.round(((mostExpensive.priceUSD - cheapest.priceUSD) / mostExpensive.priceUSD) * 100)
      : 0;

  return { app, row: cheapest, savings };
}

export function getAppPricesByCountry(appName: string) {
  const app = apps.find((a) => a.name.toLowerCase().includes(appName.toLowerCase()));
  if (!app) return null;
  return { app, table: getAppPriceTable(app.id) };
}

export function getCountryAppPrices(countryCode: string) {
  const country = countries.find((c) => c.code.toUpperCase() === countryCode.toUpperCase());
  if (!country) return null;

  const prices = appPrices.filter((p) => p.countryCode === country.code && p.price > 0);
  return {
    country,
    items: prices.map((p) => {
      const app = apps.find((a) => a.id === p.appId);
      return {
        app,
        price: p.price,
        currency: p.currency,
        priceUSD: convertPrice(p.price, p.currency, 'USD'),
        priceCNY: convertPrice(p.price, p.currency, 'CNY'),
      };
    }),
  };
}

export function getAppRankInCountry(appName: string, countryCode: string) {
  const app = apps.find((a) => a.name.toLowerCase().includes(appName.toLowerCase()));
  if (!app) return null;

  const table = getAppPriceTable(app.id);
  const row = table.find((r) => r.country.code.toUpperCase() === countryCode.toUpperCase());
  if (!row) return null;

  return { app, row, rank: row.rank, total: row.total, isLowest: row.isLowest };
}

export function compareBundleAcrossCountries(appNames: string[]) {
  const matchedApps = appNames.map((name) =>
    apps.find((a) => a.name.toLowerCase().includes(name.toLowerCase()))
  );
  const notFound = appNames.filter((_, i) => !matchedApps[i]);
  const foundApps = matchedApps.filter(Boolean) as typeof apps;

  if (!foundApps.length) return null;

  const allCountryCodes = [
    ...new Set(
      appPrices
        .filter((p) => foundApps.some((a) => a.id === p.appId) && p.price > 0)
        .map((p) => p.countryCode)
    ),
  ];

  const totals = allCountryCodes.map((code) => {
    let total = 0;
    let complete = true;
    for (const app of foundApps) {
      const price = appPrices.find((p) => p.appId === app.id && p.countryCode === code);
      if (!price || price.price === 0) { complete = false; break; }
      total += convertPrice(price.price, price.currency, 'USD');
    }
    const country = countries.find((c) => c.code === code);
    return { country, totalUSD: complete ? Math.round(total * 100) / 100 : null };
  })
  .filter((t) => t.country && t.totalUSD !== null)
  .sort((a, b) => (a.totalUSD ?? 0) - (b.totalUSD ?? 0));

  return { foundApps, notFound, totals };
}
