import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Retrieve all recorded physical shipments coupled with full transaction logs for reference
    const archives = await prisma.expedition.findMany({
      include: {
        vente: {
          include: {
            article: {
              include: {
                commande: true
              }
            }
          }
        }
      },
      orderBy: { dateExpedition: 'desc' } // Recent shipments first
    })
    return NextResponse.json({ success: true, data: archives })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
