import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { trackingService, mapStatusToEnum } from '@/lib/tracking/tracking-service'
import { sendParcelAlertsEmail } from '@/lib/notifications/email'
import { ParcelStatus } from '@prisma/client'
import { dispatchToLogistician } from '@/app/api/whatsapp/route'

/**
 * GET /api/cron/sync-parcels
 *
 * Endpoint securise pour sync auto + envoi d'alertes.
 * Auth : header `Authorization: Bearer ${CRON_SECRET}`
 *
 * 1. Sync tous les colis non livres
 * 2. Calcule les alertes (vente en retard / livraison estimee tardive)
 * 3. Si alertes + RESEND_API_KEY + NOTIFICATION_EMAIL : envoie email
 *
 * Retourne : { success, data: { synced, failed, alertsCount, emailSent } }
 */
export async function GET(request: Request) {
  // Auth
  const auth = request.headers.get('authorization') || ''
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET non configure' },
      { status: 500 }
    )
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Sync tous les colis non livres
    const parcels = await prisma.parcelTracking.findMany({
      where: { status: { notIn: [ParcelStatus.LIVRE, ParcelStatus.RETOUR] } },
    })

    let synced = 0
    let failed = 0

    for (const parcel of parcels) {
      try {
        const result = await trackingService.track(parcel.trackingNumber, parcel.carrier ?? null)
        if (!result.success) {
          failed++
          continue
        }

        const statusEnum: ParcelStatus = result.statusEnum ?? ParcelStatus.INCONNU

        await prisma.$transaction(async (tx) => {
          await tx.parcelEvent.deleteMany({ where: { parcelId: parcel.id } })

          const eventsData = (result.events || []).map((e) => ({
            parcelId: parcel.id,
            date: e.date ? new Date(e.date) : new Date(),
            location: e.location ?? null,
            description: e.description || '',
            status: e.status ?? mapStatusToEnum(e.stage || ''),
            stage: e.stage ?? null,
          }))

          if (eventsData.length > 0) {
            await tx.parcelEvent.createMany({ data: eventsData })
          }

          await tx.parcelTracking.update({
            where: { id: parcel.id },
            data: {
              status: statusEnum,
              statusRaw: result.statusCode ?? null,
              carrier: parcel.carrier ?? result.carrier ?? null,
              carrierCode: result.carrier ?? result.carrierCode ?? parcel.carrierCode ?? null,
              lastUpdate: result.lastUpdate ? new Date(result.lastUpdate) : null,
              estimatedDelivery: result.estimatedDelivery ? new Date(result.estimatedDelivery) : null,
              lastEventDescription: result.lastEventDescription ?? null,
              daysSinceOrder: result.daysSinceOrder ?? null,
              daysInTransit: result.daysInTransit ?? null,
            },
          })
        })

        // --- NOUVEAU: Envoi automatique WhatsApp si le colis passe à LIVRE ---
        if (statusEnum === ParcelStatus.LIVRE && parcel.status !== ParcelStatus.LIVRE) {
          const ventes = await prisma.vente.findMany({
            where: { parcelId: parcel.id },
            include: { expedition: true, article: true }
          })

          for (const vente of ventes) {
            if (vente.expedition?.bordereauUrl) {
              await prisma.vente.update({
                where: { id: vente.id },
                data: { statut: 'A_EXPEDIER' }
              })
              
              let imageUrl = 'https://via.placeholder.com/300?text=Image+Produit'
              if (vente.article?.lienProduit) {
                const sourcing = await prisma.sourcingProduct.findFirst({
                  where: { url: vente.article.lienProduit }
                })
                if (sourcing?.imageUrl) {
                  imageUrl = sourcing.imageUrl
                }
              }

              console.log(`[Cron Tracking] Colis ${parcel.trackingNumber} livré. Dispatch WhatsApp pour la vente ${vente.id}...`)
              await dispatchToLogistician(vente.id, imageUrl, vente.expedition.bordereauUrl)
            }
          }
        }
        // -------------------------------------------------------------------

        synced++
      } catch {
        failed++
      }
    }

    // 2. Calcule des alertes (memes regles que GET /api/parcels/alerts)
    const now = new Date()
    const allWithVentes = await prisma.parcelTracking.findMany({
      where: { ventes: { some: { dateLimiteExpedition: { not: null } } } },
      include: {
        ventes: {
          select: {
            id: true,
            pseudoAcheteur: true,
            dateLimiteExpedition: true,
            prixVente: true,
            statut: true,
          },
        },
      },
    })

    const alerts = allWithVentes
      .map((p) => {
        const isLivre = p.status === ParcelStatus.LIVRE
        const ventesEnRetard = p.ventes.filter((v) => {
          const deadline = v.dateLimiteExpedition
          if (!deadline) return false
          if (deadline < now && !isLivre) return true
          if (p.estimatedDelivery && p.estimatedDelivery > deadline) return true
          return false
        })
        if (ventesEnRetard.length === 0) return null
        const hasOverdue = ventesEnRetard.some(
          (v) => v.dateLimiteExpedition! < now && !isLivre
        )
        return {
          id: p.id,
          trackingNumber: p.trackingNumber,
          carrier: p.carrier,
          status: p.statusRaw || p.status,
          alertType: (hasOverdue ? 'OVERDUE' : 'ESTIMATED_LATE') as 'OVERDUE' | 'ESTIMATED_LATE',
          ventesEnRetard: ventesEnRetard.map((v) => ({
            id: v.id,
            pseudoAcheteur: v.pseudoAcheteur,
            dateLimiteExpedition: v.dateLimiteExpedition?.toISOString() ?? null,
            prixVente: v.prixVente ? Number(v.prixVente) : null,
            statut: v.statut,
          })),
        }
      })
      .filter((a): a is NonNullable<typeof a> => a != null)

    // 3. Envoi email si alertes + config OK
    let emailSent = false
    let emailError: string | undefined
    const notifEmail = process.env.NOTIFICATION_EMAIL
    if (alerts.length > 0 && notifEmail && process.env.RESEND_API_KEY) {
      const res = await sendParcelAlertsEmail({ to: notifEmail, alerts })
      emailSent = res.success
      emailError = res.error
    }

    return NextResponse.json({
      success: true,
      data: {
        synced,
        failed,
        total: parcels.length,
        alertsCount: alerts.length,
        emailSent,
        emailError,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
