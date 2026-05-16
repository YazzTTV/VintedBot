import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { trackingService, mapStatusToEnum } from '@/lib/tracking/tracking-service'
import { ParcelStatus } from '@prisma/client'

// POST /api/parcels/[id]/sync — fetch 17TRACK et met a jour status/events
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const parcel = await prisma.parcelTracking.findUnique({ where: { id } })
    if (!parcel) {
      return NextResponse.json(
        { success: false, error: 'Parcel introuvable' },
        { status: 404 }
      )
    }

    // Appel au service de tracking
    const result = await trackingService.track(
      parcel.trackingNumber,
      parcel.carrier ?? null
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: String(result.error || 'Tracking failed') },
        { status: 502 }
      )
    }

    const statusEnum: ParcelStatus = result.statusEnum ?? ParcelStatus.INCONNU

    // Mise a jour du parcel + remplacement des events en transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Supprimer les anciens events
      await tx.parcelEvent.deleteMany({ where: { parcelId: id } })

      // Reconstruire les events
      const eventsData = (result.events || []).map((e) => ({
        parcelId: id,
        date: e.date ? new Date(e.date) : new Date(),
        location: e.location ?? null,
        description: e.description || '',
        status: e.status ?? mapStatusToEnum(e.stage || ''),
        stage: e.stage ?? null,
      }))

      if (eventsData.length > 0) {
        await tx.parcelEvent.createMany({ data: eventsData })
      }

      // Mettre a jour le parcel
      return tx.parcelTracking.update({
        where: { id },
        data: {
          status: statusEnum,
          statusRaw: result.statusCode ?? null,
          // Garde le carrier saisi par l'utilisateur (lisible), stocke l'ID 17TRACK dans carrierCode
          carrier: parcel.carrier ?? result.carrier ?? null,
          carrierCode: result.carrier ?? result.carrierCode ?? parcel.carrierCode ?? null,
          lastUpdate: result.lastUpdate ? new Date(result.lastUpdate) : null,
          estimatedDelivery: result.estimatedDelivery
            ? new Date(result.estimatedDelivery)
            : null,
          lastEventDescription: result.lastEventDescription ?? null,
          daysSinceOrder: result.daysSinceOrder ?? null,
          daysInTransit: result.daysInTransit ?? null,
        },
        include: {
          commande: {
            select: { id: true, numero: true, fournisseur: true, dateCommande: true },
          },
          ventes: {
            select: {
              id: true,
              pseudoAcheteur: true,
              prixVente: true,
              dateLimiteExpedition: true,
              statut: true,
            },
          },
          events: {
            orderBy: { date: 'desc' },
          },
        },
      })
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
