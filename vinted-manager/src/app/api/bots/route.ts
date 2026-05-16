import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const bots = await prisma.botAccount.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        vintedUsername: true
      }
    })
    return NextResponse.json({ success: true, data: bots })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
