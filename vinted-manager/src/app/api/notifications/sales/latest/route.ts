import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const latestOrder = await prisma.vintedOrderSynced.findFirst({
      orderBy: { createdAtVinted: 'desc' },
      select: {
        id: true,
        title: true,
        price: true,
        createdAtVinted: true,
        botAccount: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json({ order: latestOrder });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch latest order' }, { status: 500 });
  }
}
