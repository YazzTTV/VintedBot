import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { botAccountName, categories, priceMin, maxItemsPerCategory } = body

    if (!botAccountName) {
      return NextResponse.json(
        { success: false, error: 'botAccountName required' },
        { status: 400 }
      )
    }

    const account = await prisma.botAccount.findUnique({
      where: { name: botAccountName },
    })

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'BotAccount not found' },
        { status: 404 }
      )
    }

    const action = await prisma.botActionQueue.create({
      data: {
        botAccountId: account.id,
        actionType: 'MARKET_SPY_LIKE',
        payload: {
          categories,
          priceMin,
          maxItemsPerCategory,
        },
        status: 'PENDING',
      },
    })

    return NextResponse.json({ actionId: action.id })
  } catch (error: any) {
    console.error('Market spy trigger error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
