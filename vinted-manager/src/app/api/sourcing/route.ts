import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeUrl } from '@/lib/utils'

// API Route: Recherche ultra-rapide via la base de données en ligne (Support Cloud & Vercel)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const accountFilter = searchParams.get('account') || ''

    // Construction dynamique des filtres Prisma
    const whereClause: any = {}

    if (accountFilter) {
      whereClause.account = { equals: accountFilter, mode: 'insensitive' }
    }

    if (query.trim().length > 0) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { fiche: { contains: query, mode: 'insensitive' } },
        { account: { contains: query, mode: 'insensitive' } }
      ]
    }

    // Paramètres de pagination optionnels
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '60')
    const skip = (page - 1) * pageSize

    // 1. Récupérer tous les comptes uniques présents en base pour les filtres du frontend
    const uniqueAccountsData = await prisma.sourcingProduct.findMany({
      select: { account: true },
      distinct: ['account']
    })
    const accountsList = uniqueAccountsData.map(a => a.account).sort()

    // 2. Compter le nombre total de produits correspondant aux filtres actuels
    const totalCount = await prisma.sourcingProduct.count({
      where: whereClause
    })

    // 3. Récupérer la page de produits correspondante
    const products = await prisma.sourcingProduct.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      skip: skip,
      take: pageSize
    })

    // 🚀 ENRICHISSEMENT : Récupérer les photos depuis VintedItemMetrics si disponibles
    const productUrls = products.map(p => p.url).filter(Boolean)
    const metrics = await prisma.vintedItemMetrics.findMany({
      where: { sourcingUrl: { in: productUrls } },
      select: { sourcingUrl: true, photoUrl: true }
    })
    const photosMap: Record<string, string> = {}
    metrics.forEach(m => {
      if (m.sourcingUrl && m.photoUrl) photosMap[m.sourcingUrl] = m.photoUrl
    })

    const enrichedProducts = products.map(p => ({
      ...p,
      photoUrl: photosMap[normalizeUrl(p.url)] || p.imageUrl || null
    }))

    return NextResponse.json({ 
      success: true, 
      data: enrichedProducts,
      accounts: accountsList,
      totalCount: totalCount,
      page: page,
      hasMore: skip + products.length < totalCount
    })

  } catch (error: any) {
    console.error("DB Sourcing Search failed:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
