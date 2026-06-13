import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fuzzyMatch, normalizeUrl, extractProductId } from '@/lib/utils'

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
    const sourcingProducts = await prisma.sourcingProduct.findMany()

    for (const order of orders) {
      // On cherche les ventes en statut COMMANDE_A_FAIRE, EN_ATTENTE ou A_EXPEDIER qui matchent
      const ventesPotentielles = await prisma.vente.findMany({
        where: {
          statut: { in: ['COMMANDE_A_FAIRE', 'EN_ATTENTE', 'A_EXPEDIER'] },
          parcelId: null
        },
        include: { article: true }
      })

      let matchedVente = null

      // 1. Chercher dans SourcingProduct pour avoir le lienProduit (c'est le titre original Shein)
      let matchedSourcingUrl = null
      for (const sp of sourcingProducts) {
        if (sp.title && fuzzyMatch(order.title, sp.title)) {
          matchedSourcingUrl = sp.url
          break
        }
      }

      if (matchedSourcingUrl) {
        const spId = extractProductId(matchedSourcingUrl)
        const venteViaUrl = ventesPotentielles.find(v => {
          if (!v.article?.lienProduit) return false
          const vId = extractProductId(v.article.lienProduit)
          if (vId && spId && vId === spId) return true
          return normalizeUrl(v.article.lienProduit) === normalizeUrl(matchedSourcingUrl)
        })
        if (venteViaUrl) {
          matchedVente = venteViaUrl
        }
      }

      // 2. Fallback : Si non trouvé via Sourcing, essayer de matcher le titre Vinted (au cas où)
      if (!matchedVente) {
        for (const vente of ventesPotentielles) {
          if (vente.article?.nom && fuzzyMatch(order.title, vente.article.nom)) {
            matchedVente = vente
            break
          }
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
            statut: 'EN_ATTENTE', // Prêt pour l'expédition finale
            spvState: 'SUIVI_EN_COURS' // NOUVEAU : Met à jour le suivi post-vente
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
