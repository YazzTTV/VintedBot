import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// 📊 GET : suivi en temps réel de l'avancement d'un lot de reposts (lecture seule)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json(
        { success: false, error: "Paramètre ids requis (liste séparée par des virgules)" },
        { status: 400, headers: corsHeaders }
      )
    }

    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)

    const actions = await prisma.botActionQueue.findMany({
      where: { id: { in: ids }, actionType: 'REPOST_ITEM' },
      select: { id: true, status: true, completedAt: true, errorMessage: true, payload: true }
    })

    // Préserver l'ordre demandé par le client
    const byId = new Map(actions.map(a => [a.id, a]))
    const result = ids.map(id => {
      const a = byId.get(id)
      if (!a) return { id, status: 'UNKNOWN', completedAt: null, errorMessage: null, itemId: null, delayBeforeMs: 0 }
      const payload = (a.payload || {}) as Record<string, any>
      return {
        id: a.id,
        status: a.status,
        completedAt: a.completedAt,
        errorMessage: a.errorMessage,
        itemId: payload.itemId ?? null,
        delayBeforeMs: payload.delayBeforeMs ?? 0
      }
    })

    return NextResponse.json({ success: true, actions: result }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Repost status fetch failure:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { botAccountName, items, timing } = body

    // Validation des champs requis
    if (!botAccountName || !Array.isArray(items) || !timing) {
      return NextResponse.json(
        { success: false, error: "Champs botAccountName, items[] et timing requis" },
        { status: 400, headers: corsHeaders }
      )
    }

    if (typeof timing.minDelaySec !== 'number' || typeof timing.maxDelaySec !== 'number') {
      return NextResponse.json(
        { success: false, error: "timing.minDelaySec et timing.maxDelaySec doivent être des nombres" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Trouver le compte
    const account = await prisma.botAccount.findUnique({
      where: { name: botAccountName }
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: `Compte bot introuvable : ${botAccountName}` },
        { status: 400, headers: corsHeaders }
      )
    }

    // Créer les actions REPOST_ITEM
    const actionIds: string[] = []
    let created = 0

    for (let index = 0; index < items.length; index++) {
      const item = items[index]

      // Validation item
      if (!item.itemId) {
        return NextResponse.json(
          { success: false, error: `Item à l'index ${index} manque le champ itemId` },
          { status: 400, headers: corsHeaders }
        )
      }

      // Calcul du délai
      let delayBeforeMs = 0
      if (index > 0) {
        const minMs = timing.minDelaySec * 1000
        const maxMs = timing.maxDelaySec * 1000
        delayBeforeMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
      }

      // Construction du payload
      const payload = {
        itemId: item.itemId,
        cropPercent: item.cropPercent ?? 0,
        newTitle: item.newTitle ?? null,
        newDescription: item.newDescription ?? null,
        newPrice: item.newPrice ?? null,
        photoOrder: item.photoOrder ?? null,
        delayBeforeMs
      }

      // Créer l'action
      const action = await prisma.botActionQueue.create({
        data: {
          botAccountId: account.id,
          actionType: 'REPOST_ITEM',
          status: 'PENDING',
          payload
        }
      })

      actionIds.push(action.id)
      created++
    }

    return NextResponse.json(
      { success: true, created, actionIds },
      { headers: corsHeaders }
    )

  } catch (error: any) {
    console.error('Repost action creation failure:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
