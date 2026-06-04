import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.spyCategory.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error: any) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoryId, name } = body

    if (categoryId === undefined || !name) {
      return NextResponse.json(
        { success: false, error: 'categoryId and name required' },
        { status: 400 }
      )
    }

    const category = await prisma.spyCategory.upsert({
      where: { categoryId },
      update: { name, active: true },
      create: { categoryId, name, active: true },
    })

    return NextResponse.json(category)
  } catch (error: any) {
    console.error('Create/update category error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'categoryId query param required' },
        { status: 400 }
      )
    }

    await prisma.spyCategory.update({
      where: { categoryId: parseInt(categoryId, 10) },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
