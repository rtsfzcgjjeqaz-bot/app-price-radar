import { NextRequest, NextResponse } from 'next/server';
import { processMessage } from '@/lib/chat';

export async function POST(request: NextRequest) {
  const { message } = await request.json();
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }
  const reply = processMessage(message);
  return NextResponse.json({ reply });
}
