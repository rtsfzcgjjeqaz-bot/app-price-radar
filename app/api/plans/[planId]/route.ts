import { NextResponse } from 'next/server';
import { getAppPriceTableByPlan } from '@/lib/db/prices';

interface Props {
  params: Promise<{ planId: string }>;
}

export async function GET(req: Request, { params }: Props) {
  const { planId } = await params;
  const { searchParams } = new URL(req.url);
  const appId = searchParams.get('appId') ?? '';

  if (!planId || !appId) {
    return NextResponse.json({ rows: [] });
  }

  const rows = await getAppPriceTableByPlan(appId, planId);
  return NextResponse.json({ rows });
}
