import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db/client';
import { getChatContext } from '@/lib/db/chat-context';

export async function GET() {
  const openaiKeyPresent = !!process.env.OPENAI_API_KEY;
  const model = 'gpt-4o-mini';

  let appCount: number | null = null;
  let countryCount: number | null = null;
  let contextLoaded = false;

  if (supabase) {
    const [appsRes, countriesRes, context] = await Promise.all([
      supabase.from('apps').select('*', { count: 'exact', head: true }),
      supabase.from('countries').select('*', { count: 'exact', head: true }),
      getChatContext(),
    ]);
    appCount = appsRes.count;
    countryCount = countriesRes.count;
    contextLoaded = context.length > 0;
  }

  return NextResponse.json({
    openai_key_present: openaiKeyPresent,
    model,
    context_loaded: contextLoaded,
    app_count: appCount,
    country_count: countryCount,
  });
}
