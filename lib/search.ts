import { apps } from '@/mock/apps';
import { countries } from '@/mock/countries';
import type { SearchResult } from '@/types';

export function search(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();

  const appResults: SearchResult[] = apps
    .filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.developer.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    )
    .map((app) => ({ type: 'app' as const, app }));

  const countryResults: SearchResult[] = countries
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q)
    )
    .map((country) => ({ type: 'country' as const, country }));

  return [...appResults, ...countryResults];
}
