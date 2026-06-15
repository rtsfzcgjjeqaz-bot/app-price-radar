import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/chat';
import { getChatContext } from '@/lib/db/chat-context';
import { answerFromLocalData } from '@/lib/db/fallback';

const MAX_MESSAGE_LENGTH = 1000;

// In-memory rate limiter: max 20 requests per IP per 60 seconds
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters).` },
      { status: 400 },
    );
  }

  const locale = body.locale === 'zh' ? 'zh' : 'en';

  try {
    const context = await getChatContext();
    const reply = await processMessage(body.message, context, locale);
    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error from AI provider.';
    // Surface the real error in dev; in production fall back to local data
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: message }, { status: 502 });
    }
    const reply = answerFromLocalData(body.message, locale);
    return NextResponse.json({ reply });
  }
}
