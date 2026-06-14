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
    const { pseudoAcheteur, prixVente, lienVente, statut, dateLimiteExpedition, extensionStatut, spvState, prixAchatUnitaire } = body

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
    if (spvState !== undefined) updateData.spvState = spvState

    if (dateLimiteExpedition !== undefined) {
      updateData.dateLimiteExpedition = dateLimiteExpedition ? new Date(dateLimiteExpedition) : null
    }

    if (extensionStatut !== undefined) {
      updateData.extensionStatut = extensionStatut

      if (extensionStatut === 'ACCEPTEE' && existingVente.extensionStatut !== 'ACCEPTEE') {
        const baseLimit = existingVente.dateLimiteExpedition 
          ? new Date(existingVente.dateLimiteExpedition) 
          : addWorkingDays(new Date(existingVente.dateVente), 5)

        updateData.dateLimiteExpedition = addWorkingDays(baseLimit, 5)
      }
    }

    // 1. GESTION DU PRIX D'ACHAT (Envoyé par l'extension) ET RECALCUL GLOBAL DES FRAIS DE PORT DU JOUR
    if (prixAchatUnitaire !== undefined && existingVente.article) {
      const parsedPrixAchat = parseFloat(prixAchatUnitaire);
      
      await prisma.article.update({
        where: { id: existingVente.articleId },
        data: { prixAchatUnitaire: parsedPrixAchat }
      });

      // Recalcul des frais de port pour toute la journée !
      const startOfDay = new Date(existingVente.dateVente);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(existingVente.dateVente);
      endOfDay.setHours(23, 59, 59, 999);

      const ventesDuJour = await prisma.vente.findMany({
        where: {
          dateVente: { gte: startOfDay, lte: endOfDay },
          article: { commande: { fournisseur: 'SHEIN' } }
        },
        include: { article: true }
      });

      // Somme de tous les achats Shein de la journée
      const sommeAchatsShein = ventesDuJour.reduce((sum, v) => {
        if (v.id === id) return sum + parsedPrixAchat;
        return sum + Number(v.article?.prixAchatUnitaire || 0);
      }, 0);

      // Règle d'or : si total >= 39€, on a les frais de port gratuits (0€), sinon 3.90€
      const nouveauFraisPort = sommeAchatsShein >= 39 ? 0 : 3.90;

      // On met à jour toutes les autres ventes du jour (et celle-ci)
      for (const v of ventesDuJour) {
        const buyP = v.id === id ? parsedPrixAchat : Number(v.article?.prixAchatUnitaire || 0);
        const saleP = v.id === id && prixVente !== undefined ? parseFloat(prixVente) : Number(v.prixVente);
        const shipP = nouveauFraisPort;
        const fixedFees = Number(v.fraisVinted) || 0.70;
        const prestatairesFees = 1.50; // Prestataire envoi colis par article
        
        const totalCosts = buyP + shipP + fixedFees + prestatairesFees;
        const beneficeNet = saleP - totalCosts;
        const margePct = saleP > 0 ? (beneficeNet / saleP) * 100 : 0;

        await prisma.article.update({
          where: { id: v.articleId },
          data: { fraisPortUnitaires: shipP }
        });

        if (v.id !== id) {
          await prisma.vente.update({
            where: { id: v.id },
            data: { 
              beneficeNet, 
              margePct,
              purchasePriceSnapshot: buyP
            }
          });
        } else {
          // Pour la vente en cours d'édition, on assigne dans updateData pour la requête finale
          updateData.beneficeNet = beneficeNet;
          updateData.margePct = margePct;
          updateData.purchasePriceSnapshot = buyP;
        }
      }
    } else if (prixVente !== undefined) {
      // 2. RECALCUL CLASSIQUE SI SEUL LE PRIX DE VENTE EST ÉDITÉ
      const saleP = parseFloat(prixVente);
      const fixedFees = Number(existingVente.fraisVinted) || 0.70;
      const buyP = Number(existingVente.article?.prixAchatUnitaire) || 0;
      const shipP = Number(existingVente.article?.fraisPortUnitaires) || 0;
      const prestatairesFees = 1.50;
      
      const totalCosts = buyP + shipP + fixedFees + prestatairesFees;
      const beneficeNet = saleP - totalCosts;
      const margePct = saleP > 0 ? (beneficeNet / saleP) * 100 : 0;

      updateData.prixVente = saleP;
      updateData.beneficeNet = beneficeNet;
      updateData.margePct = margePct;
    } else if (prixVente === undefined && prixAchatUnitaire === undefined && Object.keys(updateData).length === 0) {
        // Pas de changement financier ni autre
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
