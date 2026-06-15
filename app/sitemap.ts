import { MetadataRoute } from 'next';
import { supabase } from '@/lib/db/client';
import { apps as mockApps } from '@/mock/apps';
import { countries as mockCountries } from '@/mock/countries';

const BASE = 'https://apppriceradar.com';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch live IDs from Supabase; fall back to mock if unavailable
  let appIds: string[];
  let countryCodes: string[];

  if (supabase) {
    const [appsRes, countriesRes] = await Promise.all([
      supabase.from('apps').select('id'),
      supabase.from('countries').select('code'),
    ]);
    appIds = appsRes.data?.map((a) => a.id) ?? mockApps.map((a) => a.id);
    countryCodes = countriesRes.data?.map((c) => c.code) ?? mockCountries.map((c) => c.code);
  } else {
    appIds = mockApps.map((a) => a.id);
    countryCodes = mockCountries.map((c) => c.code);
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/ai`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/app-ranking`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/country-ranking`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE}/data-sources`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/disclaimer`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  const appRoutes: MetadataRoute.Sitemap = appIds.map((id) => ({
    url: `${BASE}/apps/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const countryRoutes: MetadataRoute.Sitemap = countryCodes.map((code) => ({
    url: `${BASE}/countries/${code}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  const cheapestRoutes: MetadataRoute.Sitemap = appIds.map((id) => ({
    url: `${BASE}/cheapest/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const compareRoutes: MetadataRoute.Sitemap = appIds.map((id) => ({
    url: `${BASE}/compare/${id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const subscribeRoutes: MetadataRoute.Sitemap = countryCodes.map((code) => ({
    url: `${BASE}/subscribe/${code}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...appRoutes, ...countryRoutes, ...cheapestRoutes, ...compareRoutes, ...subscribeRoutes];
}
