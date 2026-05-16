import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Atomic: Mark order as RECUE AND all its articles as STOCK
    const updatedCommande = await prisma.$transaction(async (tx) => {
      // 1. Verify Order exists
      const cmd = await tx.commandeFournisseur.findUnique({ where: { id } })
      if (!cmd) throw new Error('Commande introuvable')

      // 2. Update Order Status
      const c = await tx.commandeFournisseur.update({
        where: { id },
        data: { statut: 'RECUE' }
      })

      // 3. Update all attached Articles to STOCK
      await tx.article.updateMany({
        where: { commandeId: id, statut: 'EN_TRANSIT' },
        data: { statut: 'STOCK' }
      })

      return c
    })

    return NextResponse.json({ success: true, data: updatedCommande })
    
  } catch (error: any) {
    console.error('Erreur arrivée commande:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
