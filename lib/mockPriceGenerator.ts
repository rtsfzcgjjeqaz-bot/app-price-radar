import { apps } from '@/mock/apps';
import { countries } from '@/mock/countries';
import { exchangeRates } from '@/mock/exchangeRates';
import { appBasePrices } from '@/mock/appPriceConfig';
import { countryPriceMultipliers, unavailableApps } from '@/mock/countryConfig';
import type { AppPrice } from '@/types';

/** Deterministic hash of two strings → 0..1 float, stable across runs. */
function stableNoise(appId: string, countryCode: string): number {
  const str = `${appId}::${countryCode}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  // Normalize to ±5% variance band
  return ((h % 1000) / 1000) * 0.10 - 0.05;
}

/** Round to the nearest App Store tier: 0.99, 1.99, 2.99 … */
function toStoreTier(rawUSD: number, targetCurrency: string, rateToUSD: number): number {
  if (rawUSD === 0) return 0;
  const rawLocal = rawUSD / rateToUSD;

  // Japanese Yen and Korean Won have no decimal places
  if (targetCurrency === 'JPY' || targetCurrency === 'KRW') {
    const step = targetCurrency === 'JPY' ? 100 : 500;
    return Math.round(rawLocal / step) * step;
  }

  // Most currencies: round to nearest X.99
  const rounded = Math.ceil(rawLocal) - 0.01;
  return Math.max(rounded, 0.99);
}

export function generateMockPrices(): AppPrice[] {
  const prices: AppPrice[] = [];
  const updatedAt = '2026-06-01';

  for (const app of apps) {
    const baseUSD = appBasePrices[app.id] ?? 4.99;

    // Free apps: skip price entries entirely
    if (baseUSD === 0) continue;

    for (const country of countries) {
      // Check availability
      if (unavailableApps[country.code]?.includes(app.id)) continue;

      const multiplier = countryPriceMultipliers[country.code] ?? 1.0;
      const noise = stableNoise(app.id, country.code);
      const adjustedUSD = baseUSD * multiplier * (1 + noise);

      const rate = exchangeRates.find((r) => r.currency === country.currency);
      if (!rate) continue;

      const localPrice = toStoreTier(adjustedUSD, country.currency, rate.rateToUSD);

      prices.push({
        appId: app.id,
        countryCode: country.code,
        price: localPrice,
        currency: country.currency,
        updatedAt,
      });
    }
  }

  return prices;
}
