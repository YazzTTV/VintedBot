import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const orders = await prisma.vintedOrderSynced.findMany({ take: 5, orderBy: { syncedAt: 'desc' } });
  const convs = await prisma.vintedConversation.findMany({ take: 5, orderBy: { syncedAt: 'desc' } });
  return NextResponse.json({ orders, convs });
}
