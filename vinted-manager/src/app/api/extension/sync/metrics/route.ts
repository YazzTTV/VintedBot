import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeUrl, slugify } from '@/lib/utils'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { botAccountName, vintedAccountId, items } = body

    if (!botAccountName || !vintedAccountId || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: "Paramètres requis manquants : botAccountName, vintedAccountId, items[]" },
        { status: 400, headers: corsHeaders }
      )
    }

    // 1. Résolution intelligente du BotAccount par vintedAccountId
    const baseName = botAccountName.toLowerCase().split(/[._]/)[0]
    const existingWithName = await prisma.botAccount.findUnique({ where: { name: baseName } })
    const guessName = (existingWithName && existingWithName.vintedAccountId !== String(vintedAccountId))
      ? `${baseName}_${String(vintedAccountId).slice(-4)}`
      : baseName

    const botAccount = await prisma.botAccount.upsert({
      where: { vintedAccountId: String(vintedAccountId) },
      update: { 
        vintedUsername: botAccountName,
        lastSync: new Date() 
      },
      create: {
        vintedAccountId: String(vintedAccountId),
        vintedUsername: botAccountName,
        name: guessName,
        lastSync: new Date()
      }
    })

    let updateCount = 0
    let winnerCount = 0

    // Fetch existing winners to prevent overwriting their status when they get older than 24h
    const existingWinners = await prisma.vintedItemMetrics.findMany({
      where: { botAccountId: botAccount.id, isWinner: true },
      select: { id: true, winnerReason: true }
    })
    const existingWinnerMap = new Map(existingWinners.map(w => [w.id, w.winnerReason]))

    // 2. Traitement de chaque annonce
    for (const item of items) {
      const {
        id, // itemId natif
        title,
        price,
        url,
        photoUrl,
        viewCount,
        favouriteCount,
        status,
        uploadedAtVinted // Date de création brute reçue de Vinted (ISO)
      } = item

      const views = Number(viewCount || 0)
      const likes = Number(favouriteCount || 0)
      const uploadDate = new Date(uploadedAtVinted)
      const now = new Date()
      
      // Calcul de la fenêtre de 24h (en millisecondes)
      const timeDiffMs = now.getTime() - uploadDate.getTime()
      const isWithin24h = timeDiffMs > 0 && timeDiffMs <= 24 * 60 * 60 * 1000

      let isWinner = existingWinnerMap.has(id) || false
      let winnerReason: string | null = existingWinnerMap.get(id) || null

      // LOGIQUE DES WINNERS (Evaluation uniquement si pas déjà winner et dans les premières 24h)
      if (!isWinner && isWithin24h) {
        // Condition A : Vente Rapide
        // Vinted API renvoie généralement "sold" ou un statut similaire. On teste plusieurs chaînes standard.
        const isSold = ['sold', 'vendu', 'verkocht', 'venduto'].some(s => 
          status?.toString().toLowerCase().includes(s)
        )

        if (isSold) {
          isWinner = true
          winnerReason = 'VENTE_RAPIDE'
        }
        // Condition B : Statistiques Explosives (>= 100 vues ET >= 20 favoris)
        else if (views >= 100 && likes >= 20) {
          isWinner = true
          winnerReason = 'STATISTIQUES'
        }
      }

      if (isWinner) winnerCount++

      // 🚀 INTELLIGENCE DE RÉCONCILIATION : Trouver le lien de Sourcing
      // On cherche si on a déjà ce produit dans SourcingProduct pour ce compte avec un titre similaire.
      let sourcingUrl: string | null = null
      
      // On prépare un terme de recherche plus robuste (les 3 premiers mots significatifs)
      const titleWords = title.split(' ').filter((w: string) => w.length > 2).slice(0, 3).join(' ')
      const accountBase = botAccountName.toLowerCase().split(/[._]/)[0]

      const matchedProduct = await prisma.sourcingProduct.findFirst({
        where: {
          account: {
            contains: accountBase,
            mode: 'insensitive'
          },
          title: {
            contains: titleWords || title.split(' ')[0],
            mode: 'insensitive'
          }
        }
      })

      if (matchedProduct) {
        sourcingUrl = matchedProduct.url
      }

      // Sauvegarde ou mise à jour
      await prisma.vintedItemMetrics.upsert({
        where: { id: id },
        update: {
          title,
          price: price != null ? Number(price) : undefined,
          url,
          photoUrl,
          viewCount: views,
          favouriteCount: likes,
          status: status?.toString() || 'Actif',
          isWinner,
          winnerReason,
          sourcingUrl: sourcingUrl || undefined, // Ne pas écraser par nul si déjà trouvé manuellement
          updatedAt: new Date()
        },
        create: {
          id: id,
          botAccountId: botAccount.id,
          title,
          price: price != null ? Number(price) : undefined,
          url,
          photoUrl,
          viewCount: views,
          favouriteCount: likes,
          status: status?.toString() || 'Actif',
          isWinner,
          winnerReason,
          sourcingUrl,
          uploadedAtVinted: uploadDate,
          updatedAt: new Date()
        }
      })
      
      updateCount++
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: updateCount,
        winnersDetected: winnerCount
      }
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Metrics sync failure:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function GET() {
  try {
    // 1. Récupérer toutes les métriques d'annonces
    const metrics = await prisma.vintedItemMetrics.findMany({
      orderBy: { viewCount: 'desc' },
      include: {
        botAccount: {
          select: { name: true, vintedUsername: true }
        }
      }
    })

    // 2. Récupérer l'état des stocks physiques disponibles
    const physicalStock = await prisma.article.findMany({
      where: { statut: 'STOCK' },
      select: { lienProduit: true, id: true }
    })

    const stockMap: Record<string, number> = {}
    physicalStock.forEach(art => {
      if (art.lienProduit) {
        const norm = normalizeUrl(art.lienProduit)
        stockMap[norm] = (stockMap[norm] || 0) + 1
      }
    })

    // 3. Récupérer TOUS les produits de sourcing pour le matching flou
    const allSourcings = await prisma.sourcingProduct.findMany({
      select: { url: true, title: true, imageUrl: true }
    })

    const sourcingPhotosMapByUrl: Record<string, string> = {}
    const sourcingPhotosMapByTitle: Record<string, string> = {}

    allSourcings.forEach(s => {
      if (s.imageUrl) {
        sourcingPhotosMapByUrl[s.url] = s.imageUrl
        sourcingPhotosMapByTitle[slugify(s.title)] = s.imageUrl
      }
    })

    // 4. Fusionner avec intelligence de réconciliation
    const augmentedMetrics = metrics.map(m => {
      let currentStock = 0
      let photoUrl = m.photoUrl

      const normSourcingUrl = m.sourcingUrl ? normalizeUrl(m.sourcingUrl) : null
      
      // A. Stock matching
      if (normSourcingUrl) {
        currentStock = stockMap[normSourcingUrl] || 0
      }

      // B. Photo matching (Fallback Cascade)
      if (!photoUrl) {
        // 1. Essayer par URL normalisée
        if (normSourcingUrl && sourcingPhotosMapByUrl[normSourcingUrl]) {
          photoUrl = sourcingPhotosMapByUrl[normSourcingUrl]
        } 
        // 2. Essayer par Titre (Slugified)
        else {
          const titleSlug = slugify(m.title)
          // On cherche si un titre de sourcing contient le slug ou l'inverse
          const match = allSourcings.find(s => {
            const sSlug = slugify(s.title)
            return sSlug.includes(titleSlug) || titleSlug.includes(sSlug)
          })
          if (match && match.imageUrl) photoUrl = match.imageUrl
        }
      }

      return {
        ...m,
        photoUrl,
        physicalStockCount: currentStock
      }
    })

    return NextResponse.json({ success: true, data: augmentedMetrics })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

