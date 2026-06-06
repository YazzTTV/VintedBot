import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const command = await prisma.commandeFournisseur.findUnique({
      where: { id },
      include: { articles: true }
    })
    return NextResponse.json({ success: true, data: command })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { numero, dateArriveeEstimee, dateCommande, notes, fournisseur, prixTotal, fraisPort, panier } = body

    // Transaction pour garantir l'intégrité
    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour les infos de base
      const cmd = await tx.commandeFournisseur.update({
        where: { id },
        data: {
          numero,
          fournisseur,
          notes,
          statut: 'COMMANDEE',
          dateCommande: dateCommande ? new Date(dateCommande) : undefined,
          prixTotal: prixTotal !== undefined ? parseFloat(prixTotal) : undefined,
          fraisPort: fraisPort !== undefined ? parseFloat(fraisPort) : undefined,
          dateArriveeEstimee: dateArriveeEstimee ? new Date(dateArriveeEstimee) : null
        },
        include: { articles: true }
      })

      // 2. Gestion du Panier (si fourni)
      if (panier && Array.isArray(panier)) {
        // Liste des IDs actuels pour savoir quoi supprimer
        const currentArticleIds = cmd.articles.map(a => a.id)
        const incomingArticleIds = panier.filter(item => item.id).map(item => item.id)
        const idsToDelete = currentArticleIds.filter(id => !incomingArticleIds.includes(id))

        // Vérification de sécurité avant suppression
        if (idsToDelete.length > 0) {
          const soldArticles = await tx.vente.findMany({
            where: { articleId: { in: idsToDelete } }
          })
          if (soldArticles.length > 0) {
            throw new Error("Impossible de retirer certains articles car ils sont déjà vendus.")
          }
          await tx.article.deleteMany({ where: { id: { in: idsToDelete } } })
        }

        // Calcul des prix unitaires moyens basés sur le nouveau total
        const finalTotal = parseFloat(prixTotal || cmd.prixTotal.toString())
        const finalShip = parseFloat(fraisPort || cmd.fraisPort.toString())
        const totalCount = panier.reduce((acc, item) => acc + (Number(item.quantite) || 1), 0)
        const unitPrice = totalCount > 0 ? (finalTotal / totalCount) : 0
        const unitShip = totalCount > 0 ? (finalShip / totalCount) : 0

        // Synchronisation des articles
        for (const item of panier) {
          const qty = Number(item.quantite) || 1
          if (item.id) {
            // Mise à jour article existant (on ne peut pas changer la quantité d'un article existant ici 
            // car 1 article en base = 1 unité physique. On met juste à jour ses métadonnées)
            await tx.article.update({
              where: { id: item.id },
              data: {
                nom: item.nom,
                lienProduit: item.lien || item.url,
                prixAchatUnitaire: unitPrice,
                fraisPortUnitaires: unitShip
              }
            })
          } else {
            // Création de nouveaux articles (dupliqués selon quantité)
            const newArticles = []
            for (let i = 0; i < qty; i++) {
              newArticles.push({
                commandeId: id,
                nom: item.nom || "Nouvel article",
                lienProduit: item.lien || item.url || null,
                prixAchatUnitaire: unitPrice,
                fraisPortUnitaires: unitShip,
                statut: 'EN_TRANSIT' as const
              })
            }
            await tx.article.createMany({ data: newArticles })
          }
        }
      }

      // Mettre à jour le nombre total d'articles dans la commande
      const finalCount = await tx.article.count({ where: { commandeId: id } })
      return await tx.commandeFournisseur.update({
        where: { id },
        data: { nbArticles: finalCount }
      })
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("Error updating command:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const command = await prisma.commandeFournisseur.findUnique({
      where: { id },
      include: {
        articles: {
          include: {
            vente: true
          }
        }
      }
    })

    if (!command) {
      return NextResponse.json({ success: false, error: "Commande introuvable" }, { status: 404 })
    }

    // Contrôle de sécurité : impossible de supprimer si des articles de cette commande sont déjà vendus
    const hasSoldArticles = command.articles.some(a => a.vente !== null)
    if (hasSoldArticles) {
      return NextResponse.json({ 
        success: false, 
        error: "Impossible de supprimer : certains articles ont déjà fait l'objet d'une vente." 
      }, { status: 400 })
    }

    // Transaction atomique pour tout nettoyer proprement
    await prisma.$transaction(async (tx) => {
      // 1. Supprimer les articles reliés
      await tx.article.deleteMany({
        where: { commandeId: id }
      })
      // 2. Supprimer la commande fournisseur
      await tx.commandeFournisseur.delete({
        where: { id }
      })
    })

    return NextResponse.json({ success: true, message: "Commande et articles supprimés avec succès." })
  } catch (error: any) {
    console.error("Error deleting command:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
