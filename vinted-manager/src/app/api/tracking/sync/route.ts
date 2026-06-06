import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fuzzyMatch } from '@/lib/utils'

// POST /api/tracking/sync
// Reçoit les données du shein_order_scraper.py
// Body : { orders: [{ title: string, trackingNumber: string }] }
export async function POST(request: Request) {
  try {
    const { orders } = await request.json()

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json({ success: false, error: "Format invalide" }, { status: 400 })
    }

    let linkedCount = 0

    for (const order of orders) {
      // On cherche les ventes en statut COMMANDE_A_FAIRE ou EN_ATTENTE qui matchent le titre
      const ventesPotentielles = await prisma.vente.findMany({
        where: {
          statut: { in: ['COMMANDE_A_FAIRE', 'EN_ATTENTE'] },
          parcelId: null
        },
        include: { article: true }
      })

      // Simple fuzzy match sur le titre
      let matchedVente = null
      for (const vente of ventesPotentielles) {
        if (vente.article?.nom && fuzzyMatch(order.title, vente.article.nom)) {
          matchedVente = vente
          break
        }
      }

      if (matchedVente) {
        // Créer ou récupérer le ParcelTracking
        let parcel = await prisma.parcelTracking.findFirst({
          where: { trackingNumber: order.trackingNumber }
        })

        if (!parcel) {
          parcel = await prisma.parcelTracking.create({
            data: {
              trackingNumber: order.trackingNumber,
              carrier: 'SHEIN',
              status: 'EN_TRANSIT'
            }
          })
        }

        // Lier la vente au colis et passer le statut à EN_ATTENTE (si c'était à faire)
        await prisma.vente.update({
          where: { id: matchedVente.id },
          data: {
            parcelId: parcel.id,
            statut: 'EN_ATTENTE' // Prêt pour l'expédition finale
          }
        })
        
        linkedCount++
      }
    }

    return NextResponse.json({ success: true, linkedCount, totalReceived: orders.length })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
