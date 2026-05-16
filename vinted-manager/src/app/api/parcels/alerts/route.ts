import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { ParcelStatus } from '@prisma/client'

// GET /api/parcels/alerts — parcels lies a au moins une vente en retard/en danger
//
// Deux cas :
//   1. estimatedDelivery > dateLimiteExpedition (livraison estimee depasse la deadline)
//   2. dateLimiteExpedition < NOW() AND status != LIVRE (deadline depassee et non livre)
export async function GET() {
  try {
    const now = new Date()

    // Recupere tous les parcels qui ont au moins une vente avec deadline
    const parcels = await prisma.parcelTracking.findMany({
      where: {
        ventes: { some: { dateLimiteExpedition: { not: null } } },
      },
      include: {
        commande: { select: { id: true, numero: true, fournisseur: true } },
        ventes: {
          select: {
            id: true,
            pseudoAcheteur: true,
            prixVente: true,
            dateLimiteExpedition: true,
            statut: true,
          },
        },
        events: { orderBy: { date: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    })

    // Filtre + enrichissement cote JS (Prisma ne sait pas comparer 2 colonnes)
    const enriched = parcels
      .map((p) => {
        const isLivre = p.status === ParcelStatus.LIVRE
        const ventesEnRetard = p.ventes.filter((v) => {
          const deadline = v.dateLimiteExpedition
          if (!deadline) return false
          if (deadline < now && !isLivre) return true // OVERDUE
          if (p.estimatedDelivery && p.estimatedDelivery > deadline) return true // ESTIMATED_LATE
          return false
        })
        if (ventesEnRetard.length === 0) return null

        // Type d'alerte : OVERDUE prioritaire sur ESTIMATED_LATE
        const hasOverdue = ventesEnRetard.some(
          (v) => v.dateLimiteExpedition! < now && !isLivre
        )
        return {
          ...p,
          alertType: hasOverdue ? 'OVERDUE' : 'ESTIMATED_LATE',
          isOverdue: hasOverdue,
          isEstimatedLate: !hasOverdue,
          ventesEnRetard,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ success: true, data: enriched })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
