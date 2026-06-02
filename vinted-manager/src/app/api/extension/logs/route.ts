import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// 📡 POST : Enregistre un nouveau log envoyé par l'extension Chrome
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { botAccountName, message, type } = body

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Le champ 'message' est requis." },
        { status: 400, headers: corsHeaders }
      )
    }

    // Résoudre le nom simplifié du compte de bot (ex: "lena.shop" -> "lena")
    const botName = botAccountName ? botAccountName.toLowerCase().split(/[._]/)[0] : 'system'

    let botAccountId = null
    if (botName && botName !== 'system') {
      const botAccount = await prisma.botAccount.findUnique({
        where: { name: botName }
      })
      if (botAccount) {
        botAccountId = botAccount.id
      }
    }

    // Déterminer le type de log de manière intelligente si non spécifié
    let logType = type || 'INFO'
    if (!type) {
      const msgLower = message.toLowerCase()
      if (msgLower.includes('erreur') || msgLower.includes('échoué') || msgLower.includes('échec') || msgLower.includes('hs')) {
        logType = 'ERROR'
      } else if (msgLower.includes('warning') || msgLower.includes('attention') || msgLower.includes('cooldown') || msgLower.includes('skip')) {
        logType = 'WARNING'
      } else if (msgLower.includes('succès') || msgLower.includes('réussi') || msgLower.includes('synchro') || msgLower.includes('envoyé') || msgLower.includes('like')) {
        logType = 'SUCCESS'
      }
    }

    const log = await prisma.extensionLog.create({
      data: {
        botAccountId,
        botName,
        message,
        type: logType,
      }
    })

    return NextResponse.json({ success: true, log }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Error creating extension log:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

// 📡 GET : Récupère les 100 derniers logs avec filtres optionnels
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const botName = searchParams.get('botName')
    const type = searchParams.get('type')

    const whereClause: any = {}
    if (botName && botName !== 'all') {
      whereClause.botName = botName.toLowerCase()
    }
    if (type && type !== 'all') {
      whereClause.type = type
    }

    const logs = await prisma.extensionLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        botAccount: {
          select: {
            vintedUsername: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, logs }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Error fetching extension logs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

// 🗑️ DELETE : Vide les logs de l'extension
export async function DELETE() {
  try {
    await prisma.extensionLog.deleteMany({})
    return NextResponse.json({ success: true, message: "Tous les logs ont été supprimés." }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Error deleting extension logs:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
