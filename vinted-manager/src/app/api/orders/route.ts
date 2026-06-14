import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const orders = await prisma.vintedOrderSynced.findMany({
      orderBy: { createdAtVinted: 'desc' },
      take: 50,
      include: {
        botAccount: {
          select: { name: true }
        }
      }
    })
    return NextResponse.json({ orders })
  } catch (error) {
    console.error('API /api/orders Error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
