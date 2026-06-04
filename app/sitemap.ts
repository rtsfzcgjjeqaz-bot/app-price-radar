import { MetadataRoute } from 'next';
import { apps } from '@/mock/apps';
import { countries } from '@/mock/countries';

const BASE = 'https://apppriceradar.com';

export default function sitemap(): MetadataRoute.Sitemap {
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

  const appRoutes: MetadataRoute.Sitemap = apps.map((app) => ({
    url: `${BASE}/apps/${app.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const countryRoutes: MetadataRoute.Sitemap = countries.map((c) => ({
    url: `${BASE}/countries/${c.code}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const cheapestRoutes: MetadataRoute.Sitemap = apps.map((app) => ({
    url: `${BASE}/cheapest/${app.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const compareRoutes: MetadataRoute.Sitemap = apps.map((app) => ({
    url: `${BASE}/compare/${app.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  const subscribeRoutes: MetadataRoute.Sitemap = countries.map((c) => ({
    url: `${BASE}/subscribe/${c.code}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...appRoutes, ...countryRoutes, ...cheapestRoutes, ...compareRoutes, ...subscribeRoutes];
}
