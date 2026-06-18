import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const bots = await prisma.botAccount.findMany({
      where: { accountType: 'VENTE' },
      select: { id: true, name: true, vintedUsername: true },
      orderBy: { name: 'asc' },
    });

    const items = await prisma.winnerQueue.findMany({
      where: {
        botAccount: {
          accountType: 'VENTE',
        },
      },
      include: {
        botAccount: {
          select: { id: true, name: true, vintedUsername: true },
        },
      },
      orderBy: [
        { botAccount: { name: 'asc' } },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ bots, items });
  } catch (error) {
    console.error('Error fetching winner queue:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération de la file d\'attente' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { itemId, targetBotId } = await request.json();

    if (!itemId || !targetBotId) {
      return NextResponse.json({ error: 'itemId et targetBotId sont requis' }, { status: 400 });
    }

    const sourceItem = await prisma.winnerQueue.findUnique({
      where: { id: itemId },
    });

    if (!sourceItem) {
      return NextResponse.json({ error: 'Item source introuvable' }, { status: 404 });
    }
    
    const newItem = await prisma.winnerQueue.create({
      data: {
        botAccountId: targetBotId,
        title: sourceItem.title,
        sourcingUrl: sourceItem.sourcingUrl,
        originalPhotoUrl: sourceItem.originalPhotoUrl,
        status: 'QUEUED',
      },
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Error duplicating winner queue item:', error);
    return NextResponse.json({ error: 'Erreur lors de la duplication' }, { status: 500 });
  }
}
