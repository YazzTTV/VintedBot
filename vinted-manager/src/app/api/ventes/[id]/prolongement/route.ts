import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { addWorkingDays } from '@/lib/utils'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venteId } = await params

    const vente = await prisma.vente.findUnique({
      where: { id: venteId },
      include: {
        article: { include: { vintedOrderSynced: true } }
      }
    })

    if (!vente) {
      return NextResponse.json({ success: false, error: "Vente introuvable" }, { status: 404 })
    }

    if (!vente.botAccountId || !vente.article?.vintedOrderSynced?.id) {
      return NextResponse.json({ success: false, error: "Impossible de générer le bordereau (manque botAccount ou transaction Vinted)" }, { status: 400 })
    }

    const transactionId = vente.article.vintedOrderSynced.id

    // 1. Ajouter 5 jours ouvrés à la date limite
    const nouvelleDateLimite = vente.dateLimiteExpedition 
      ? addWorkingDays(new Date(vente.dateLimiteExpedition), 5)
      : addWorkingDays(new Date(), 5)

    await prisma.$transaction(async (tx) => {
      // 2. Mettre à jour la Vente
      await tx.vente.update({
        where: { id: venteId },
        data: {
          extensionStatut: 'ACCEPTEE',
          dateLimiteExpedition: nouvelleDateLimite
        }
      })

      // 3. Ajouter l'action GENERATE_LABEL dans la file d'attente
      await tx.botActionQueue.create({
        data: {
          botAccountId: vente.botAccountId!,
          actionType: 'GENERATE_LABEL',
          status: 'PENDING',
          payload: {
            venteId: vente.id,
            vintedTransactionId: transactionId
          }
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Validation prolongement failed:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
