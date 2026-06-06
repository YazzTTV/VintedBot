import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Pour sécuriser le CRON sur Vercel
export const maxDuration = 60; // 1 minute max
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
      // Commented out for easier manual testing initially
    }

    // On cherche les ventes de plus de 24h
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    const ventesToExtend = await prisma.vente.findMany({
      where: {
        statut: 'EN_ATTENTE',
        extensionStatut: 'AUCUNE',
        dateVente: { lte: yesterday },
        botAccountId: { not: null }
      },
      include: {
        article: {
          include: {
            vintedOrderSynced: true
          }
        }
      }
    })

    if (ventesToExtend.length === 0) {
      return NextResponse.json({ success: true, message: "Aucune vente à prolonger." })
    }

    let actionsCreated = 0

    for (const vente of ventesToExtend) {
      if (!vente.botAccountId || !vente.article?.vintedOrderSynced?.id) {
        continue;
      }

      const transactionId = vente.article.vintedOrderSynced.id;

      await prisma.$transaction(async (tx) => {
        // Mettre en file d'attente l'action
        await tx.botActionQueue.create({
          data: {
            botAccountId: vente.botAccountId!,
            actionType: 'REQUEST_EXTENSION',
            status: 'PENDING',
            payload: {
              venteId: vente.id,
              vintedTransactionId: transactionId,
              message: "Bonjour, j'ai malheureusement un imprévu familial urgent, je suis désolée.\n\nSeriez-vous d'accord pour prolonger un peu le délai d'expédition ?\n\nMerci beaucoup pour votre compréhension 🙏"
            }
          }
        })

        // Mettre à jour le statut de l'extension de la vente
        await tx.vente.update({
          where: { id: vente.id },
          data: { extensionStatut: 'DEMANDEE' }
        })
      })

      actionsCreated++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `${actionsCreated} demande(s) de prolongement mise(s) en file d'attente.` 
    })

  } catch (error: any) {
    console.error('CRON Prolongement failed:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
