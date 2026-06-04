import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function GET(request: Request) {
  try {
    // Récupérer tous les comptes avec le count de métriques
    const accounts = await prisma.botAccount.findMany({
      include: {
        _count: {
          select: { metrics: true }
        }
      }
    })

    const data = accounts.map(account => ({
      name: account.name,
      vintedUsername: account.vintedUsername,
      itemCount: account._count.metrics
    }))

    return NextResponse.json(
      { success: true, data },
      { headers: corsHeaders }
    )

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
