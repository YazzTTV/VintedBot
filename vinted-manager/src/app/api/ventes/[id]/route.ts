import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { addWorkingDays } from '@/lib/utils'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { pseudoAcheteur, prixVente, lienVente, statut, dateLimiteExpedition, extensionStatut } = body

    // Rechercher la vente et récupérer l'article lié pour recalculer les marges si le prix change
    const existingVente = await prisma.vente.findUnique({
      where: { id },
      include: { article: true }
    })

    if (!existingVente) {
      return NextResponse.json({ success: false, error: "Vente introuvable" }, { status: 404 })
    }

    const updateData: any = {}

    if (pseudoAcheteur !== undefined) updateData.pseudoAcheteur = pseudoAcheteur
    if (lienVente !== undefined) updateData.lienVente = lienVente
    if (statut !== undefined) updateData.statut = statut

    if (dateLimiteExpedition !== undefined) {
      updateData.dateLimiteExpedition = dateLimiteExpedition ? new Date(dateLimiteExpedition) : null
    }

    if (extensionStatut !== undefined) {
      updateData.extensionStatut = extensionStatut

      // Intelligence Métier : Si accepté, on décale de +5 jours ouvrés supplémentaires
      if (extensionStatut === 'ACCEPTEE' && existingVente.extensionStatut !== 'ACCEPTEE') {
        const baseLimit = existingVente.dateLimiteExpedition 
          ? new Date(existingVente.dateLimiteExpedition) 
          : addWorkingDays(new Date(existingVente.dateVente), 5)

        updateData.dateLimiteExpedition = addWorkingDays(baseLimit, 5)
      }
    }

    // Recalcul comptable dynamique si le prix de revente est édité
    if (prixVente !== undefined) {
      const saleP = parseFloat(prixVente)
      const fixedFees = Number(existingVente.fraisVinted) || 0.70
      const buyP = Number(existingVente.article?.prixAchatUnitaire) || 0
      const shipP = Number(existingVente.article?.fraisPortUnitaires) || 0
      const prestatairesFees = 1.50 // Prestataire envoi colis par article
      
      const totalCosts = buyP + shipP + fixedFees + prestatairesFees
      const beneficeNet = saleP - totalCosts
      const margePct = saleP > 0 ? (beneficeNet / saleP) * 100 : 0

      updateData.prixVente = saleP
      updateData.beneficeNet = beneficeNet
      updateData.margePct = margePct
    }

    const updatedVente = await prisma.vente.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ success: true, data: updatedVente })

  } catch (error: any) {
    console.error('Error updating transaction:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingVente = await prisma.vente.findUnique({
      where: { id }
    })

    if (!existingVente) {
      return NextResponse.json({ success: false, error: "Vente introuvable" }, { status: 404 })
    }

    // Transaction atomique : on supprime la vente ET on remet l'article en stock dispo
    await prisma.$transaction(async (tx) => {
      // 0. Nettoyer d'abord les expéditions reliées à cette vente (contrainte d'intégrité)
      await tx.expedition.deleteMany({
        where: { venteId: id }
      })

      // 1. Remettre l'article au statut STOCK
      await tx.article.update({
        where: { id: existingVente.articleId },
        data: { statut: 'STOCK' }
      })

      // 2. Supprimer la ligne du registre des ventes
      await tx.vente.delete({
        where: { id }
      })
    })

    return NextResponse.json({ success: true, message: "Vente supprimée et article réintégré au stock." })

  } catch (error: any) {
    console.error('Error deleting transaction:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
