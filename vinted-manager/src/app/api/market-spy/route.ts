import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (categoryId) {
      where.categoryId = parseInt(categoryId, 10)
    }

    const items = await prisma.spyLikedItem.findMany({
      where,
      orderBy: { likedAt: 'desc' },
    })

    const allItems = await prisma.spyLikedItem.findMany()

    const total = allItems.length
    const available = allItems.filter((i) => i.status === 'AVAILABLE').length
    const sold = allItems.filter((i) => i.status === 'SOLD').length

    const soldItems = allItems.filter(
      (i) => i.status === 'SOLD' && i.timeToSellHours != null
    )
    const timeToSellValues = soldItems
      .map((i) => i.timeToSellHours!)
      .sort((a, b) => a - b)

    const avgTimeToSellHours =
      timeToSellValues.length > 0
        ? timeToSellValues.reduce((a, b) => a + b, 0) /
          timeToSellValues.length
        : null

    let winnerThresholdHours: number | null = null
    if (timeToSellValues.length > 0) {
      const index = Math.floor(timeToSellValues.length * 0.25)
      winnerThresholdHours = timeToSellValues[index]
    }

    const stats = {
      total,
      available,
      sold,
      avgTimeToSellHours,
      winnerThresholdHours,
    }

    return NextResponse.json({ items, stats })
  } catch (error: any) {
    console.error('Market spy error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
