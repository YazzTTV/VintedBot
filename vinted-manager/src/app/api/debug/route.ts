import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const convs = await prisma.vintedConversation.findMany({ take: 20, orderBy: { syncedAt: 'desc' } });
  const items = await prisma.vintedItemMetrics.findMany({ take: 20, orderBy: { updatedAt: 'desc' } });
  const messages = await prisma.vintedMessage.findMany({ take: 20, orderBy: { createdAtVinted: 'desc' } });
  
  return NextResponse.json({ convs, items, messages });
}
