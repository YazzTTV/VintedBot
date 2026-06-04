import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
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
