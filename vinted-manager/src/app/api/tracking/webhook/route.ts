import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dispatchToLogistician } from '@/app/api/whatsapp/route'

// POST /api/tracking/webhook
// À fournir à l'associé pour qu'il pousse les statuts
// Body attendu : { trackingNumber: "xxx", status: "LIVRE" }
export async function POST(request: Request) {
  try {
    const { trackingNumber, status } = await request.json()

    if (!trackingNumber || !status) {
      return NextResponse.json({ success: false, error: "Paramètres manquants" }, { status: 400 })
    }

    const parcel = await prisma.parcelTracking.findFirst({
      where: { trackingNumber }
    })

    if (!parcel) {
      return NextResponse.json({ success: false, error: "Colis introuvable" }, { status: 404 })
    }

    // Mettre à jour le statut du colis
    await prisma.parcelTracking.update({
      where: { id: parcel.id },
      data: { status } // "LIVRE"
    })

    // Ajouter l'événement dans la timeline
    await prisma.parcelEvent.create({
      data: {
        parcelId: parcel.id,
        date: new Date(),
        status,
        description: `Mise à jour via Webhook: ${status}`
      }
    })

    // En fonction du nouveau statut, on met à jour les ventes associées
    const ventes = await prisma.vente.findMany({
      where: { parcelId: parcel.id },
      include: { expedition: true, article: true }
    })

    for (const vente of ventes) {
      const isLivre = status.toUpperCase() === 'LIVRE' || status.toUpperCase() === 'DELIVERED';
      const isRetour = status.toUpperCase() === 'RETOUR';
      const isIncident = status.toUpperCase() === 'INCIDENT';

      if (isLivre) {
        // On passe en statut "A_EXPEDIER"
        await prisma.vente.update({
          where: { id: vente.id },
          data: { 
            statut: 'A_EXPEDIER',
            spvState: 'ARRIVE_LOGISTICIEN'
          }
        })

        if (vente.expedition?.bordereauUrl) {
          let imageUrl = 'https://via.placeholder.com/300?text=Image+Produit'
          if (vente.article?.lienProduit) {
            const sourcing = await prisma.sourcingProduct.findFirst({
              where: { url: vente.article.lienProduit }
            })
            if (sourcing?.imageUrl) {
              imageUrl = sourcing.imageUrl
            }
          }
          
          // Envoi via OpenWA
          console.log(`[Webhook] Colis ${trackingNumber} livré. Envoi WhatsApp pour la vente ${vente.id}...`)
          await dispatchToLogistician(vente.id, imageUrl, vente.expedition.bordereauUrl)
        }
      } else if (isRetour) {
        await prisma.vente.update({
          where: { id: vente.id },
          data: { spvState: 'RETOUR' }
        })
      } else if (isIncident) {
        await prisma.vente.update({
          where: { id: vente.id },
          data: { spvState: 'INCIDENT' }
        })
      }
    }

    return NextResponse.json({ success: true, message: "Statut mis à jour et dispatch WhatsApp effectué si nécessaire" })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
