export interface App {
  id: string;
  appStoreId: string;
  name: string;
  developer: string;
  category: string;
  iconUrl: string;
  description: string;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
  flag: string;
}

export interface AppPrice {
  appId: string;
  countryCode: string;
  price: number;
  currency: string;
  updatedAt: string;
}

export interface ExchangeRate {
  currency: string;
  rateToUSD: number;
  rateToCNY: number;
}

export interface PriceRow {
  country: Country;
  price: number;
  currency: string;
  priceUSD: number;
  priceCNY: number;
  rank: number;
  total: number;
  isLowest: boolean;
  updatedAt: string;
}

export interface AppPriceRank {
  rank: number;
  total: number;
  isLowest: boolean;
}

export interface CountryAppRow {
  app: App;
  price: number;
  currency: string;
  priceUSD: number;
  priceCNY: number;
  rank: number;
  total: number;
  isLowest: boolean;
  updatedAt: string;
}

export interface SearchResult {
  type: 'app' | 'country';
  app?: App;
  country?: Country;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Plan {
  id: string;
  appId: string;
  name: string;
  billingPeriod: 'monthly' | 'annual' | 'one_time' | 'free';
  basePriceUsd: number;
  isDefault: boolean;
  description: string;
  features: string[];
}

export interface PlanPriceRow extends PriceRow {
  planId: string;
  planName: string;
  billingPeriod: string;
}
