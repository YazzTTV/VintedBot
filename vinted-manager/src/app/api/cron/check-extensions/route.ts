import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const ventesToCheck = await prisma.vente.findMany({
      where: {
        extensionStatut: 'DEMANDEE',
        statut: { in: ['EN_ATTENTE', 'COMMANDE_A_FAIRE'] },
        botAccountId: { not: null }
      },
      include: {
        article: { include: { vintedOrderSynced: true } }
      }
    })

    if (ventesToCheck.length === 0) {
      return NextResponse.json({ success: true, message: "Aucune extension en attente de vérification." })
    }

    let actionsCreated = 0

    for (const vente of ventesToCheck) {
      if (!vente.botAccountId || !vente.article?.vintedOrderSynced?.id) continue;

      // On vérifie s'il n'y a pas déjà une vérification en attente pour éviter les doublons
      const existingCheck = await prisma.botActionQueue.findFirst({
        where: {
          botAccountId: vente.botAccountId,
          actionType: 'CHECK_EXTENSION_STATUS',
          status: 'PENDING'
        }
      });

      if (!existingCheck) {
        await prisma.botActionQueue.create({
          data: {
            botAccountId: vente.botAccountId,
            actionType: 'CHECK_EXTENSION_STATUS',
            status: 'PENDING',
            payload: {
              venteId: vente.id,
              vintedTransactionId: vente.article.vintedOrderSynced.id
            }
          }
        })
        actionsCreated++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${actionsCreated} demande(s) de vérification de prolongement envoyée(s) à l'extension.` 
    })

  } catch (error: any) {
    console.error('CRON Check Extensions failed:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
