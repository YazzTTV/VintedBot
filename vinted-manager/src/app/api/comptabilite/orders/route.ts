import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { vintedAccountId, vintedUsername, orders = [] } = body

    if (!vintedAccountId || !vintedUsername) {
      return NextResponse.json(
        { success: false, error: "Identifiants Vinted de boutique manquants" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Authentification basique éventuelle
    const authToken = request.headers.get('x-api-key') || body.apiKey
    if (authToken && authToken !== process.env.APP_PASSWORD) {
      return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403, headers: corsHeaders })
    }

    console.log(`📡 Synchro Commandes : ${orders.length} ventes reçues pour "${vintedUsername}" (${vintedAccountId})`)

    // 1. Résoudre ou Créer le BotAccount correspondant
    const baseName = vintedUsername.toLowerCase().split(/[._]/)[0]
    const existingWithName = await prisma.botAccount.findUnique({ where: { name: baseName } })
    const guessName = (existingWithName && existingWithName.vintedAccountId !== String(vintedAccountId))
      ? `${baseName}_${String(vintedAccountId).slice(-4)}`
      : baseName

    const account = await prisma.botAccount.upsert({
      where: { vintedAccountId: String(vintedAccountId) },
      update: {
        vintedUsername: vintedUsername,
        lastSync: new Date()
      },
      create: {
        vintedAccountId: String(vintedAccountId),
        vintedUsername: vintedUsername,
        name: guessName,
        lastSync: new Date()
      }
    })

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucune commande reçue (0 ventes). Compte mis à jour.",
        updatedCount: 0
      }, { headers: corsHeaders })
    }

    // 2. Upsert parallèle de chaque commande reçue
    let updatedCount = 0
    for (const order of orders) {
      try {
        const orderId = String(order.id)
        
        // Parsing et validation de la date Vinted
        let nativeDate = new Date()
        if (order.createdAtVinted) {
          const parsed = new Date(order.createdAtVinted)
          if (!isNaN(parsed.getTime())) {
            nativeDate = parsed
          }
        }

        await prisma.vintedOrderSynced.upsert({
          where: { id: orderId },
          update: {
            title: order.title || "Article Vinted",
            price: Number(order.price || 0),
            itemId: order.itemId ? String(order.itemId) : null,
            buyerLogin: order.buyerLogin || null,
            buyerPhoto: order.buyerPhoto || null,
            photoUrl: order.photoUrl || null,
            status: order.status || "unknown",
            shippingStatus: order.shippingStatus || null,
            trackingCode: order.trackingCode || null,
            // Ne pas changer le lien articleId s'il a déjà été réconcilié manuellement !
          },
          create: {
            id: orderId,
            botAccountId: account.id,
            title: order.title || "Article Vinted",
            price: Number(order.price || 0),
            itemId: order.itemId ? String(order.itemId) : null,
            buyerLogin: order.buyerLogin || null,
            buyerPhoto: order.buyerPhoto || null,
            photoUrl: order.photoUrl || null,
            status: order.status || "unknown",
            shippingStatus: order.shippingStatus || null,
            trackingCode: order.trackingCode || null,
            createdAtVinted: nativeDate
          }
        })
        updatedCount++
      } catch (err: any) {
        console.error(`❌ Échec de l'upsert pour la commande Vinted #${order.id}:`, err.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updatedCount}/${orders.length} commandes synchronisées pour ${account.name} !`,
      data: {
        botAccount: account.name,
        totalSynced: updatedCount
      }
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error("❌ Erreur lors de la synchronisation des commandes :", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
