import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const disputes = await prisma.vintedOrderSynced.findMany({
      where: {
        // Fetch statuses that resemble an issue or dispute. Adjust as necessary.
        status: { in: ['issue', 'returned', 'suspended', 'cancelled', 'incident'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        botAccount: {
          select: { name: true }
        }
      }
    })
    return NextResponse.json({ disputes })
  } catch (error) {
    console.error('API /api/disputes Error:', error)
    return NextResponse.json({ error: 'Failed to fetch disputes' }, { status: 500 })
  }
}
