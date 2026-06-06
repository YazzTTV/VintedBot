import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: venteId } = await params

    const vente = await prisma.vente.findUnique({
      where: { id: venteId },
      include: {
        article: { include: { commande: true } }
      }
    })

    if (!vente) {
      return NextResponse.json({ success: false, error: "Vente introuvable" }, { status: 404 })
    }

    if (!vente.botAccountId) {
      return NextResponse.json({ success: false, error: "Pas de compte bot associé à cette vente." }, { status: 400 })
    }

    const lienProduit = vente.article?.lienProduit || vente.article?.commande?.lienProduit;
    if (!lienProduit || !lienProduit.includes('shein')) {
      return NextResponse.json({ success: false, error: "Lien produit Shein introuvable." }, { status: 400 })
    }

    // Ajouter l'action ADD_TO_CART_SHEIN dans la file d'attente
    await prisma.botActionQueue.create({
      data: {
        botAccountId: vente.botAccountId,
        actionType: 'ADD_TO_CART_SHEIN',
        status: 'PENDING',
        payload: {
          venteId: vente.id,
          url: lienProduit,
          taille: vente.article?.taille || null
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Auto-source failed:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
