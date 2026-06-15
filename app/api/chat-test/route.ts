import { NextRequest, NextResponse } from 'next/server';
import { answerFromLocalData } from '@/lib/db/fallback';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  const locale = body.locale === 'zh' ? 'zh' : 'en';
  const reply = answerFromLocalData(body.message, locale);

  return NextResponse.json({ reply, _source: 'local_fallback' });
}
