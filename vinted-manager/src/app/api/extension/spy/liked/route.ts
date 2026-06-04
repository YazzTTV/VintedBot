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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items } = body

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'items array required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const upsertPromises = items.map((item) =>
      prisma.spyLikedItem.upsert({
        where: { itemId: item.itemId },
        update: {},
        create: {
          itemId: item.itemId,
          title: item.title,
          price: item.price,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          photoUrl: item.photoUrl,
          url: item.url,
          brand: item.brand,
        },
      })
    )

    await Promise.all(upsertPromises)

    return NextResponse.json({ saved: items.length }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Spy liked items error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
