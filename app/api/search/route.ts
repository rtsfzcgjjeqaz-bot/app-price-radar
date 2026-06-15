import { NextRequest, NextResponse } from 'next/server';
import { searchApps } from '@/lib/db/apps';
import { searchCountries } from '@/lib/db/countries';
import type { SearchResult } from '@/types';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ results: [] });

  const [apps, countries] = await Promise.all([
    searchApps(q),
    searchCountries(q),
  ]);

  const results: SearchResult[] = [
    ...apps.map((app) => ({ type: 'app' as const, app })),
    ...countries.map((country) => ({ type: 'country' as const, country })),
  ];

  return NextResponse.json({ results });
}
