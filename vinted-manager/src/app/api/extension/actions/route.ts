import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// 📡 GET : Permet à l'extension de récupérer la liste des tâches PENDING
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const botAccountName = searchParams.get('botAccountName')

    if (!botAccountName) {
      return NextResponse.json(
        { success: false, error: "Paramètre botAccountName requis" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Trouver le compte correspondant
    const account = await prisma.botAccount.findUnique({
      where: { name: botAccountName }
    })

    if (!account) {
      // Si le compte n'existe pas encore, il n'a logiquement pas d'actions
      return NextResponse.json({ success: true, actions: [] }, { headers: corsHeaders })
    }

    // Récupérer les actions PENDING
    const actions = await prisma.botActionQueue.findMany({
      where: {
        botAccountId: account.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'asc' }
    })

    // Mettre à jour le statut à RUNNING pour éviter la double exécution concurrente
    if (actions.length > 0) {
      await prisma.botActionQueue.updateMany({
        where: {
          id: { in: actions.map(a => a.id) }
        },
        data: { status: 'RUNNING' }
      })
    }

    return NextResponse.json({ success: true, actions }, { headers: corsHeaders })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

// 🛠️ POST : Permet au Dashboard Manager d'ajouter un ordre dans la file d'attente
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { botAccountName, actionType, payload } = body

    if (!botAccountName || !actionType || !payload) {
      return NextResponse.json(
        { success: false, error: "Champs botAccountName, actionType et payload requis" },
        { status: 400, headers: corsHeaders }
      )
    }

    const account = await prisma.botAccount.findUnique({
      where: { name: botAccountName }
    })

    if (!account) {
      throw new Error(`Compte bot introuvable pour le nom : ${botAccountName}`)
    }

    const newAction = await prisma.botActionQueue.create({
      data: {
        botAccountId: account.id,
        actionType,
        payload: payload, // Prisma gère le typage Json nativement
        status: 'PENDING'
      }
    })

    return NextResponse.json({ success: true, actionId: newAction.id }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Action creation failure:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

// 📝 PATCH : Permet à l'extension de marquer la tâche comme SUCCESS ou FAILED
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { actionId, status, errorMessage } = body

    if (!actionId || !status) {
      return NextResponse.json(
        { success: false, error: "Champs actionId et status requis" },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!['SUCCESS', 'FAILED'].includes(status)) {
      throw new Error("Statut de retour invalide. Doit être SUCCESS ou FAILED.")
    }

    const updatedAction = await prisma.botActionQueue.update({
      where: { id: actionId },
      data: {
        status,
        completedAt: new Date(),
        errorMessage: errorMessage || null
      }
    })

    return NextResponse.json({ success: true, action: updatedAction }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Action status update failure:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
