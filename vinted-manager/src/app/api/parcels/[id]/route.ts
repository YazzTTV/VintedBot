import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ParcelStatus } from '@prisma/client'

const PARCEL_INCLUDE = {
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
  events: { orderBy: { date: 'desc' as const } },
}

// GET /api/parcels/[id]
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const parcel = await prisma.parcelTracking.findUnique({
      where: { id },
      include: PARCEL_INCLUDE,
    })
    if (!parcel) {
      return NextResponse.json({ success: false, error: 'Parcel introuvable' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: parcel })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PATCH /api/parcels/[id]
// body peut contenir : trackingNumber, carrier, status..., commandeId, venteIds[]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      trackingNumber,
      carrier,
      carrierCode,
      status,
      statusRaw,
      lastUpdate,
      estimatedDelivery,
      lastEventDescription,
      daysSinceOrder,
      daysInTransit,
      commandeId,
      venteIds,
    } = body

    const existing = await prisma.parcelTracking.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Parcel introuvable' }, { status: 404 })
    }

    await prisma.parcelTracking.update({
      where: { id },
      data: {
        ...(trackingNumber !== undefined && { trackingNumber }),
        ...(carrier !== undefined && { carrier }),
        ...(carrierCode !== undefined && { carrierCode }),
        ...(status !== undefined && { status: status as ParcelStatus }),
        ...(statusRaw !== undefined && { statusRaw }),
        ...(lastUpdate !== undefined && { lastUpdate: lastUpdate ? new Date(lastUpdate) : null }),
        ...(estimatedDelivery !== undefined && {
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        }),
        ...(lastEventDescription !== undefined && { lastEventDescription }),
        ...(daysSinceOrder !== undefined && { daysSinceOrder }),
        ...(daysInTransit !== undefined && { daysInTransit }),
        ...(commandeId !== undefined && { commandeId }),
      },
    })

    // Reassigner les ventes liees si venteIds fourni
    if (Array.isArray(venteIds)) {
      // Detacher d'abord toutes les ventes actuelles
      await prisma.vente.updateMany({
        where: { parcelId: id },
        data: { parcelId: null },
      })
      // Puis attacher les nouvelles
      if (venteIds.length > 0) {
        await prisma.vente.updateMany({
          where: { id: { in: venteIds } },
          data: { parcelId: id },
        })
      }
    }

    const updated = await prisma.parcelTracking.findUnique({
      where: { id },
      include: PARCEL_INCLUDE,
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// DELETE /api/parcels/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.parcelTracking.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Parcel introuvable' }, { status: 404 })
    }

    // Detacher les ventes avant suppression
    await prisma.vente.updateMany({ where: { parcelId: id }, data: { parcelId: null } })
    await prisma.parcelTracking.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
