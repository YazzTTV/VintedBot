import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

// GET /api/parcels — liste tous les parcels (avec commande + ventes liees)
export async function GET() {
  try {
    const parcels = await prisma.parcelTracking.findMany({
      orderBy: { createdAt: 'desc' },
      include: PARCEL_INCLUDE,
    })
    return NextResponse.json({ success: true, data: parcels })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/parcels — creer un nouveau parcel
// body: { trackingNumber: string, carrier?: string, commandeId?: string, venteIds?: string[] }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { trackingNumber, carrier, commandeId, venteIds } = body

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: 'trackingNumber est requis' },
        { status: 400 }
      )
    }

    // Verifier que la commande existe si commandeId fourni
    if (commandeId) {
      const commande = await prisma.commandeFournisseur.findUnique({ where: { id: commandeId } })
      if (!commande) {
        return NextResponse.json(
          { success: false, error: 'Commande introuvable' },
          { status: 404 }
        )
      }
    }

    const parcel = await prisma.parcelTracking.create({
      data: {
        trackingNumber,
        carrier: carrier ?? null,
        commandeId: commandeId ?? null,
      },
    })

    // Lier les ventes au parcel (via Vente.parcelId)
    if (Array.isArray(venteIds) && venteIds.length > 0) {
      await prisma.vente.updateMany({
        where: { id: { in: venteIds } },
        data: { parcelId: parcel.id },
      })
    }

    const created = await prisma.parcelTracking.findUnique({
      where: { id: parcel.id },
      include: PARCEL_INCLUDE,
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
