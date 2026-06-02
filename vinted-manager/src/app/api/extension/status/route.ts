import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// 📡 GET : Récupère le statut des robots et de la file d'attente d'actions
export async function GET() {
  try {
    // 1. Récupérer les comptes de bots
    const bots = await prisma.botAccount.findMany({
      include: {
        _count: {
          select: {
            actions: {
              where: { status: 'PENDING' }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // 2. Récupérer les 30 actions les plus récentes de la file d'attente
    const actionQueue = await prisma.botActionQueue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        botAccount: {
          select: {
            name: true,
            vintedUsername: true
          }
        }
      }
    })

    // Formater les données pour le dashboard
    const formattedBots = bots.map(b => ({
      id: b.id,
      name: b.name,
      vintedUsername: b.vintedUsername,
      vintedAccountId: b.vintedAccountId,
      balancePending: Number(b.balancePending || 0),
      balanceAvailable: Number(b.balanceAvailable || 0),
      lastSync: b.lastSync,
      pendingActionsCount: b._count.actions
    }))

    return NextResponse.json({
      success: true,
      bots: formattedBots,
      actionQueue
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Error fetching extension status:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
