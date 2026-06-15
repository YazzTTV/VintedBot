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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const botName = searchParams.get('botName')

    const where: any = {}
    if (botName && botName !== 'all') {
      where.botName = botName.toLowerCase()
    }

    const events = await prisma.dmFavoriEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({ success: true, events }, { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { botName, buyerUsername, itemId, originalPrice, offerPrice, status, errorMessage } = body

    if (!buyerUsername || !itemId) {
      return NextResponse.json({ success: false, error: 'buyerUsername et itemId requis' }, { status: 400, headers: corsHeaders })
    }

    const resolvedBotName = botName ? botName.toLowerCase().split(/[._]/)[0] : 'system'

    const event = await prisma.dmFavoriEvent.create({
      data: {
        botName: resolvedBotName,
        buyerUsername,
        itemId: String(itemId),
        originalPrice: originalPrice != null ? parseFloat(originalPrice) : null,
        offerPrice: offerPrice != null ? parseFloat(offerPrice) : null,
        status: status || 'SENT',
        errorMessage: errorMessage || null,
      },
    })

    return NextResponse.json({ success: true, event }, { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

export async function DELETE() {
  try {
    await prisma.dmFavoriEvent.deleteMany({})
    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
