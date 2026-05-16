import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { normalizeUrl, slugify, fuzzyMatch, extractProductId } from '@/lib/utils'

const NOAH_WHATSAPP_NUMBER = '33783642205' // Numéro fourni par le client (+337...)

// 1. GET: Liste toutes les Ventes en attente d'expédition (statut EN_ATTENTE)
export async function GET() {
  try {
    const pendingSales = await prisma.vente.findMany({
      where: { statut: 'EN_ATTENTE' },
      include: {
        botAccount: { select: { name: true } },
        article: {
          include: {
            commande: true,
            vintedOrderSynced: true
          }
        }
      },
      orderBy: { dateVente: 'asc' }
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

    const enrichedSales = pendingSales.map(sale => {
      let photoUrl = sale.article?.vintedOrderSynced?.photoUrl || null
      const url = sale.article?.lienProduit || sale.article?.commande?.lienProduit
      
      if (!photoUrl && url) {
        const norm = normalizeUrl(url)
        photoUrl = sourcingPhotosMapByUrl[norm] || null
        
        if (!photoUrl) {
          const id = extractProductId(url)
          if (id) photoUrl = sourcingPhotosMapById[id] || null
        }
      }

      if (!photoUrl) {
        let searchTitle = sale.article?.nom || ""
        if (!searchTitle && sale.article?.commande?.notes) {
          const match = sale.article.commande.notes.match(/produit : (.*) \(Fiche:/)
          if (match) searchTitle = match[1]
        }

        if (searchTitle) {
          const match = allSourcings.find(s => fuzzyMatch(searchTitle, s.title))
          if (match && match.imageUrl) photoUrl = match.imageUrl
        }
      }

      return {
        ...sale,
        photoUrl
      }
    })

    return NextResponse.json({ success: true, data: enrichedSales })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

// 2. POST: Uploade le PDF, passe au statut A_EXPEDIER et génère le lien WhatsApp Dispatch
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const venteId = formData.get('venteId') as string
    const transporteur = formData.get('transporteur') as string || 'Mondial Relay'
    const numeroBordereau = formData.get('numeroBordereau') as string || ''
    const file = formData.get('file') as Blob | null

    if (!venteId) throw new Error("ID de vente manquant")
    if (!file) throw new Error("Bordereau PDF manquant")

    const sale = await prisma.vente.findUnique({
      where: { id: venteId },
      include: {
        article: {
          include: {
            commande: true,
            vintedOrderSynced: true
          }
        }
      }
    })

    if (!sale) throw new Error("Vente introuvable")

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = `labels/${venteId}_bordereau.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('vinted-labels')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw new Error(`Échec du téléversement du PDF : ${uploadError.message}`)

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from('vinted-labels')
      .createSignedUrl(fileName, 2592000)

    if (signedError || !signedData?.signedUrl) throw new Error("Impossible de générer l'URL signée")

    const bordereauUrl = signedData.signedUrl

    const result = await prisma.$transaction(async (tx) => {
      await tx.vente.update({
        where: { id: venteId },
        data: { statut: 'A_EXPEDIER' }
      })
      return await tx.expedition.upsert({
        where: { venteId },
        update: { transporteur, bordereauUrl, numeroBordereau: numeroBordereau || null, dateExpedition: new Date() },
        create: { venteId, transporteur, bordereauUrl, numeroBordereau: numeroBordereau || null, dateExpedition: new Date() }
      })
    })

    const dateStr = new Date(sale.dateVente).toLocaleDateString('fr-FR')
    
    // Fallback photo intelligente identique au GET
    let itemPhoto = sale.article?.vintedOrderSynced?.photoUrl || ""
    if (!itemPhoto && sale.article?.lienProduit) {
      const norm = normalizeUrl(sale.article.lienProduit)
      const sourcing = await prisma.sourcingProduct.findFirst({
        where: { url: norm },
        select: { imageUrl: true }
      })
      if (sourcing?.imageUrl) {
        itemPhoto = sourcing.imageUrl
      } else {
        // Fallback titre
        const titleSlug = slugify(sale.article.nom || "")
        const match = await prisma.sourcingProduct.findFirst({
          where: { title: { contains: sale.article.nom || "", mode: 'insensitive' } },
          select: { imageUrl: true }
        })
        if (match?.imageUrl) itemPhoto = match.imageUrl
      }
    }
    
    const message = `Salut Noah ! 📦
Nouveau colis à préparer !

👤 *Acheteur :* ${sale.pseudoAcheteur}
🤖 *Compte :* ${(sale as any).botAccount?.name?.toUpperCase() || 'N/A'}
🚚 *Transporteur :* ${transporteur}
${numeroBordereau ? `🔢 *N° Bordereau :* ${numeroBordereau}\n` : ''}📅 *Vendu le :* ${dateStr}

📄 *Bordereau à imprimer :*
${bordereauUrl}

${itemPhoto ? `🖼️ *Photo du produit :*\n${itemPhoto}\n` : ''}
Merci ! 💪`

    const whatsappUrl = `https://wa.me/${NOAH_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

    return NextResponse.json({ success: true, data: { expedition: result, whatsappUrl, bordereauUrl } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
