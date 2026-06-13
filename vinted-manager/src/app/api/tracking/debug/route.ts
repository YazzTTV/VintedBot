import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const ventesPotentielles = await prisma.vente.findMany({
    where: {
      statut: { in: ['COMMANDE_A_FAIRE', 'EN_ATTENTE', 'A_EXPEDIER'] },
      parcelId: null
    },
    include: { article: true }
  })
  
  const sourcingProducts = await prisma.sourcingProduct.findMany()

  return NextResponse.json({
    ventes: ventesPotentielles.map(v => ({
      id: v.id,
      statut: v.statut,
      spvState: v.spvState,
      nom: v.article?.nom,
      lien: v.article?.lienProduit
    })),
    sourcingProducts: sourcingProducts.map(s => ({
      title: s.title,
      url: s.url
    }))
  })
}
