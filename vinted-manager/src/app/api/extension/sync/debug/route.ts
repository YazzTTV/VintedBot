import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * 🔧 DEBUG Endpoint — Reçoit un payload brut de l'extension et le stocke tel quel
 * pour inspection. Permet de voir exactement ce que l'extension envoie.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Stocker le payload brut dans une table temporaire ou simplement le loguer
    console.log('🔧 [DEBUG SYNC] Payload brut reçu:', JSON.stringify(body, null, 2))

    const { botAccountName, vintedAccountId, conversations, items, debugInfo } = body

    return NextResponse.json({
      success: true,
      received: {
        botAccountName,
        vintedAccountId,
        conversationCount: Array.isArray(conversations) ? conversations.length : 'NOT_ARRAY',
        itemCount: Array.isArray(items) ? items.length : 'NOT_ARRAY',
        debugInfo,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Retourne un résumé de l'état actuel de la base
    const accounts = await prisma.botAccount.findMany({
      select: {
        name: true,
        vintedUsername: true,
        vintedAccountId: true,
        lastSync: true,
        _count: {
          select: {
            conversations: true,
            metrics: true,
            orders: true
          }
        }
      }
    })

    const totalConvs = await prisma.vintedConversation.count()
    const totalMetrics = await prisma.vintedItemMetrics.count()
    const totalOrders = await prisma.vintedOrderSynced.count()

    return NextResponse.json({
      success: true,
      database: {
        accounts,
        totals: {
          conversations: totalConvs,
          metrics: totalMetrics,
          orders: totalOrders
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
