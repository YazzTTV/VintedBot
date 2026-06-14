import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const commandesAFaireData = await prisma.vente.findMany({
      where: { statut: 'COMMANDE_A_FAIRE' },
      include: { article: true },
      orderBy: { dateVente: 'desc' }
    })

    const totalPurchase = commandesAFaireData.reduce((acc, v) => acc + Number(v.purchasePriceSnapshot || 0), 0)
    const globalShipping = totalPurchase > 39 ? 0 : 3.90
    const shippingPerItem = commandesAFaireData.length > 0 ? globalShipping / commandesAFaireData.length : 0

    const commandesAFaire = commandesAFaireData.map(v => {
       const purchasePrice = Number(v.purchasePriceSnapshot || 0)
       const shippingCost = shippingPerItem
       const estimatedProfit = Number(v.prixVente) - purchasePrice - shippingCost - Number(v.fraisVinted)
       return {
         id: v.id,
         title: v.article?.nom || `Article #${v.articleId.substring(0,5)}`,
         buyer: v.pseudoAcheteur,
         price: Number(v.prixVente).toFixed(2),
         purchasePrice: purchasePrice.toFixed(2),
         estimatedProfit: estimatedProfit.toFixed(2)
       }
    })

    return NextResponse.json({ success: true, data: commandesAFaire })
  } catch (error: any) {
    console.error('API /commandes/a-faire error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
