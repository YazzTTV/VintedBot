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

// 📸 POST : l'extension envoie un lot de snapshots d'articles actifs (upsert par id Vinted).
// Body: { account?: string, items: [{ itemId|vintedItemId: string, payload: object }] }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const account: string | undefined = body.account
    const items: any[] = Array.isArray(body.items) ? body.items : []

    if (!items.length) {
      return NextResponse.json({ success: false, error: 'items[] requis' }, { status: 400, headers: corsHeaders })
    }

    let saved = 0
    for (const it of items) {
      const id = String(it.vintedItemId ?? it.itemId ?? '').trim()
      if (!id || !it.payload) continue
      await prisma.itemSnapshot.upsert({
        where: { vintedItemId: id },
        update: { payload: it.payload, account: account ?? it.account ?? null },
        create: { vintedItemId: id, payload: it.payload, account: account ?? it.account ?? null },
      })
      saved++
    }

    return NextResponse.json({ success: true, saved }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Snapshot upsert failure:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

// 📸 GET : récupère un snapshot (?itemId=...) ou plusieurs (?ids=a,b,c) pour le repost.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const idsParam = searchParams.get('ids')

    if (itemId) {
      const snap = await prisma.itemSnapshot.findUnique({ where: { vintedItemId: itemId } })
      return NextResponse.json(
        { success: true, snapshot: snap ? snap.payload : null },
        { headers: corsHeaders }
      )
    }

    if (idsParam) {
      const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
      const snaps = await prisma.itemSnapshot.findMany({ where: { vintedItemId: { in: ids } } })
      const map: Record<string, any> = {}
      for (const s of snaps) map[s.vintedItemId] = s.payload
      return NextResponse.json({ success: true, snapshots: map }, { headers: corsHeaders })
    }

    return NextResponse.json({ success: false, error: 'itemId ou ids requis' }, { status: 400, headers: corsHeaders })
  } catch (error: any) {
    console.error('Snapshot fetch failure:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
