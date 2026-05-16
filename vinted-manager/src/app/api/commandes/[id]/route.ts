import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { numero, dateArriveeEstimee, notes, fournisseur } = body

    const updated = await prisma.commandeFournisseur.update({
      where: { id },
      data: {
        numero,
        fournisseur,
        notes,
        dateArriveeEstimee: dateArriveeEstimee ? new Date(dateArriveeEstimee) : null
      }
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
