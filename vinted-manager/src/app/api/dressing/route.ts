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
    const { searchParams } = new URL(request.url)
    const botAccountName = searchParams.get('botAccountName')

    if (!botAccountName) {
      return NextResponse.json(
        { success: false, error: "Paramètre botAccountName requis" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Trouver le compte par name
    const account = await prisma.botAccount.findUnique({
      where: { name: botAccountName }
    })

    if (!account) {
      return NextResponse.json(
        { success: true, data: [] },
        { headers: corsHeaders }
      )
    }

    // Récupérer les métriques, triées par uploadedAtVinted (desc)
    const metrics = await prisma.vintedItemMetrics.findMany({
      where: { botAccountId: account.id },
      orderBy: { uploadedAtVinted: 'desc' },
      select: {
        id: true,
        title: true,
        price: true,
        photoUrl: true,
        viewCount: true,
        favouriteCount: true,
        status: true,
        url: true,
        uploadedAtVinted: true
      }
    })

    const data = metrics.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price ? Number(item.price) : null,
      photoUrl: item.photoUrl,
      viewCount: item.viewCount,
      favouriteCount: item.favouriteCount,
      status: item.status,
      url: item.url,
      uploadedAtVinted: item.uploadedAtVinted
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
