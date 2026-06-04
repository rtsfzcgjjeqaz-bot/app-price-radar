/**
 * Per-country price multiplier relative to US prices.
 * < 1.0 = cheaper than US, > 1.0 = more expensive.
 * Also sets which apps are unavailable (multiplier 0 means skip).
 *
 * Multipliers are based on real App Store regional pricing patterns:
 * - Developing markets (IN, TR, AR, EG, BR, MX) are significantly cheaper
 * - Western Europe (GB, DE, FR) is roughly at parity or slightly above
 * - Australia, Canada slightly above US
 * - Japan at parity with slight variance
 */
export const countryPriceMultipliers: Record<string, number> = {
  US: 1.00,
  GB: 1.05,
  DE: 1.08,
  FR: 1.08,
  AU: 1.12,
  CA: 1.10,
  JP: 0.98,
  SG: 1.05,
  HK: 0.97,
  TW: 0.80,
  KR: 0.90,
  CN: 0.88,
  IN: 0.28,
  TR: 0.22,
  BR: 0.55,
  MX: 0.48,
  AR: 0.12,
  PL: 0.62,
  RU: 0.30,
  EG: 0.20,
};

/**
 * Apps unavailable in specific countries.
 * Key: countryCode, Value: set of appIds not available there.
 */
export const unavailableApps: Record<string, string[]> = {
  CN: ['spotify', 'netflix', 'youtube-premium', 'discord', 'robinhood', 'coinbase', 'nordvpn', 'expressvpn', 'roblox', 'ivory'],
  RU: ['spotify', 'apple-tv', 'paypal'],
  TR: ['robinhood', 'coinbase'],
  IN: ['hbo-max'],
};
