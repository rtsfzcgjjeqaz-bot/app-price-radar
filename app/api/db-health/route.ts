import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  if (!supabase) {
    return NextResponse.json(
      {
        status: 'unavailable',
        message: 'SUPABASE_URL and SUPABASE_ANON_KEY are not set',
        apps_count: null,
        countries_count: null,
        current_prices_count: null,
      },
      { status: 503 },
    );
  }

  const [appsRes, countriesRes, pricesRes] = await Promise.all([
    supabase.from('apps').select('*', { count: 'exact', head: true }),
    supabase.from('countries').select('*', { count: 'exact', head: true }),
    supabase.from('current_prices').select('*', { count: 'exact', head: true }),
  ]);

  const errors = [appsRes.error, countriesRes.error, pricesRes.error].filter(Boolean);

  if (errors.length > 0) {
    return NextResponse.json(
      {
        status: 'error',
        errors: errors.map((e) => e?.message),
        apps_count: null,
        countries_count: null,
        current_prices_count: null,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    status: 'ok',
    apps_count: appsRes.count,
    countries_count: countriesRes.count,
    current_prices_count: pricesRes.count,
  });
}
