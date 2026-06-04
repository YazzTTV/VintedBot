import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId, soldAt } = body

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'itemId required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const item = await prisma.spyLikedItem.findUnique({
      where: { itemId },
    })

    if (!item) {
      return NextResponse.json(
        { updated: false },
        { status: 404, headers: corsHeaders }
      )
    }

    const soldAtDate = soldAt ? new Date(soldAt) : new Date()
    const timeToSellHours =
      (soldAtDate.getTime() - item.likedAt.getTime()) / 3600000

    await prisma.spyLikedItem.update({
      where: { itemId },
      data: {
        status: 'SOLD',
        soldAt: soldAtDate,
        timeToSellHours,
      },
    })

    return NextResponse.json({ updated: true }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Spy sold items error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
