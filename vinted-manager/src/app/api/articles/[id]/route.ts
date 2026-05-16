import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nom, prixAchatUnitaire, fraisPortUnitaires, lienProduit } = body

    const existingArticle = await prisma.article.findUnique({
      where: { id },
      include: { vente: true }
    })

    if (!existingArticle) {
      return NextResponse.json({ success: false, error: "Article introuvable" }, { status: 404 })
    }

    const updateData: any = {}
    if (nom !== undefined) updateData.nom = nom
    if (lienProduit !== undefined) updateData.lienProduit = lienProduit
    
    let newBuyP = existingArticle.prixAchatUnitaire
    let newShipP = existingArticle.fraisPortUnitaires

    if (prixAchatUnitaire !== undefined) {
      updateData.prixAchatUnitaire = parseFloat(prixAchatUnitaire)
      newBuyP = updateData.prixAchatUnitaire
    }
    if (fraisPortUnitaires !== undefined) {
      updateData.fraisPortUnitaires = parseFloat(fraisPortUnitaires)
      newShipP = updateData.fraisPortUnitaires
    }

    // Mise à jour au sein d'une transaction pour la cohérence financière
    const updatedArticle = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour l'article physique
      const art = await tx.article.update({
        where: { id },
        data: updateData
      })

      // 2. Si l'article est déjà VENDU et qu'on a changé les coûts, on recalcule la rentabilité de la vente !
      if (existingArticle.vente && (prixAchatUnitaire !== undefined || fraisPortUnitaires !== undefined)) {
        const vente = existingArticle.vente
        const saleP = Number(vente.prixVente)
        const fixedFees = Number(vente.fraisVinted) || 0.70
        const buyCost = Number(newBuyP)
        const shipCost = Number(newShipP)
        const prestatairesFees = 1.50 // Prestataire envoi colis par article
        const totalCosts = buyCost + shipCost + fixedFees + prestatairesFees
        const beneficeNet = saleP - totalCosts
        const margePct = saleP > 0 ? (beneficeNet / saleP) * 100 : 0

        await tx.vente.update({
          where: { id: vente.id },
          data: {
            beneficeNet: beneficeNet,
            margePct: margePct
          }
        })
      }

      return art
    })

    return NextResponse.json({ success: true, data: updatedArticle })

  } catch (error: any) {
    console.error('Error updating article:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingArticle = await prisma.article.findUnique({
      where: { id },
      include: { vente: true }
    })

    if (!existingArticle) {
      return NextResponse.json({ success: false, error: "Article introuvable" }, { status: 404 })
    }

    // Cascade de nettoyage transactionnelle sécurisée pour contourner les clés étrangères Postgres
    await prisma.$transaction(async (tx) => {
      if (existingArticle.vente) {
        // 1. Supprimer d'abord l'expédition s'il y en a une
        await tx.expedition.deleteMany({
          where: { venteId: existingArticle.vente.id }
        })
        // 2. Supprimer la ligne de registre des ventes liée
        await tx.vente.delete({
          where: { id: existingArticle.vente.id }
        })
      }

      // 3. Supprimer l'article définitivement
      await tx.article.delete({
        where: { id }
      })
    })

    return NextResponse.json({ success: true, message: "Article et données liées supprimés du stock." })

  } catch (error: any) {
    console.error('Error deleting article:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
