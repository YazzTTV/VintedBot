import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizeUrl, slugify, fuzzyMatch, extractProductId } from '@/lib/utils'

export async function GET() {
  try {
    // Retrieve items with their upstream purchase context
    const articles = await prisma.article.findMany({
      orderBy: { dateAjoutStock: 'desc' },
      include: {
        commande: {
          select: {
            numero: true,
            fournisseur: true,
            dateCommande: true,
            dateArriveeEstimee: true,
            statut: true,
            lienProduit: true
          }
        },
        vente: true
      }
    })

    // Récupérer TOUS les produits de sourcing pour le matching
    const allSourcings = await prisma.sourcingProduct.findMany({
      select: { url: true, title: true, imageUrl: true }
    })

    const sourcingPhotosMapByUrl: Record<string, string> = {}
    const sourcingPhotosMapById: Record<string, string> = {}
    
    allSourcings.forEach(s => {
      if (s.imageUrl) {
        sourcingPhotosMapByUrl[normalizeUrl(s.url)] = s.imageUrl
        const id = extractProductId(s.url)
        if (id) sourcingPhotosMapById[id] = s.imageUrl
      }
    })

    const articlesWithEnrichment = articles.map(art => {
      const url = art.lienProduit || art.commande?.lienProduit
      let photoUrl = null
      
      if (url) {
        const norm = normalizeUrl(url)
        photoUrl = sourcingPhotosMapByUrl[norm] || null
        
        if (!photoUrl) {
          const id = extractProductId(url)
          if (id) photoUrl = sourcingPhotosMapById[id] || null
        }
      }

      // Fallback par Titre fuzzy si URL ne matche pas
      if (!photoUrl && art.nom) {
        const match = allSourcings.find(s => fuzzyMatch(art.nom || "", s.title))
        if (match && match.imageUrl) photoUrl = match.imageUrl
      }

      return {
        ...art,
        photoUrl,
        aliases: []
      }
    })

    return NextResponse.json({ success: true, data: articlesWithEnrichment })

    return NextResponse.json({ success: true, data: articlesWithEnrichment })

  } catch (error: any) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Impossible de récupérer le stock' },
      { status: 500 }
    )
  }
}
