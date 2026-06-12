import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { trackingService } from '@/lib/tracking/tracking-service'
import { whatsappService } from '@/lib/whatsapp'
import { normalizeUrl, slugify } from '@/lib/utils'

// Ce CRON peut être appelé périodiquement (ex: toutes les heures)
// Il vérifie l'état des colis Sourcing pour les ventes prêtes à être expédiées
export async function GET() {
  try {
    // 1. Récupérer toutes les ventes A_EXPEDIER qui ont un parcel
    const sales = await prisma.vente.findMany({
      where: { 
        statut: 'A_EXPEDIER',
        parcelId: { not: null }
      },
      include: {
        parcel: true,
        expedition: true,
        botAccount: { select: { name: true } },
        whatsappLogs: true, // Pour vérifier si on a déjà envoyé le dispatch
        article: {
          include: {
            vintedOrderSynced: true
          }
        }
      }
    })

    const results = []

    for (const sale of sales) {
      if (!sale.parcel) continue

      // Vérifier si le message WhatsApp a déjà été envoyé pour cette vente
      const hasBeenDispatched = sale.whatsappLogs.some(log => log.direction === 'OUTBOUND' && log.status === 'SENT')
      if (hasBeenDispatched) {
        results.push({ id: sale.id, status: 'already_dispatched' })
        continue
      }

      // 2. Mettre à jour le statut du tracking via l'API 17TRACK
      const trackingResult = await trackingService.track(sale.parcel.trackingNumber, sale.parcel.carrier || 'Unknown')
      
      let isDelivered = sale.parcel.status === 'LIVRE'

      // Si l'API renvoie de nouvelles infos, on met à jour la base de données
      if (trackingResult.success) {
        isDelivered = trackingResult.status === 'Delivered' || trackingResult.status === 'LIVRÉ' || trackingResult.statusCode === 'delivered'
        
        await prisma.parcelTracking.update({
          where: { id: sale.parcel.id },
          data: {
            status: isDelivered ? 'LIVRE' : sale.parcel.status,
            statusRaw: trackingResult.status || undefined,
            lastEventDescription: trackingResult.events?.[0]?.description || sale.parcel.lastEventDescription,
            lastUpdate: new Date(),
          }
        })
      }

      // 3. Si le colis est livré, on déclenche l'envoi WhatsApp
      if (isDelivered && sale.expedition?.bordereauUrl) {
        const dateStr = new Date(sale.dateVente).toLocaleDateString('fr-FR')
        // Récupérer la photo du produit
        let itemPhoto = sale.article?.vintedOrderSynced?.photoUrl || ""
        if (!itemPhoto && sale.article?.lienProduit) {
          const norm = normalizeUrl(sale.article.lienProduit)
          const sourcing = await prisma.sourcingProduct.findFirst({
            where: { url: norm },
            select: { imageUrl: true }
          })
          if (sourcing?.imageUrl) {
            itemPhoto = sourcing.imageUrl
          } else {
            const match = await prisma.sourcingProduct.findFirst({
              where: { title: { contains: sale.article.nom || "", mode: 'insensitive' } },
              select: { imageUrl: true }
            })
            if (match?.imageUrl) itemPhoto = match.imageUrl
          }
        }

        let sent = true;

        // 1. Envoyer la photo si on la trouve
        if (itemPhoto) {
          sent = await whatsappService.sendFileFromUrl(
            itemPhoto,
            `photo_${sale.pseudoAcheteur.replace(/\s+/g, '_')}.jpg`,
            ''
          )
          // 2. Attendre 3 secondes
          await new Promise(r => setTimeout(r, 3000))
        }

        // 3. Envoyer le bordereau PDF seul
        const pdfSent = await whatsappService.sendFileFromUrl(
          sale.expedition.bordereauUrl,
          `bordereau_${sale.pseudoAcheteur.replace(/\s+/g, '_')}.pdf`,
          ''
        )

        if (pdfSent) {
          // Journaliser l'envoi pour ne pas le refaire
          await prisma.whatsappLog.create({
            data: {
              venteId: sale.id,
              message: itemPhoto ? "Image + PDF envoyés" : "PDF envoyé (sans image)",
              direction: 'OUTBOUND',
              status: 'SENT'
            }
          })
          results.push({ id: sale.id, status: 'dispatched' })
        } else {
          results.push({ id: sale.id, status: 'whatsapp_failed' })
        }
      } else {
        results.push({ id: sale.id, status: 'pending_delivery_or_label' })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error("Auto-Dispatch CRON Error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
