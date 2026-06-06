import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { addWorkingDays, normalizeUrl, slugify, fuzzyMatch, extractProductId } from '@/lib/utils'

const DEFAULT_USER_ID = '4700b998-a7e6-4c52-ac08-0e9893dba2ef' // Temporary seed user

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { articleId, pseudoAcheteur, prixVente, lienVente, sourcingItem, botAccountId, taille } = body

    if (!prixVente || (!articleId && !sourcingItem)) {
      throw new Error("Données de vente ou d'article manquantes")
    }

    const saleP = parseFloat(prixVente)
    const fixedFees = 0.70 // standard vinted fees
    let finalArticleId = articleId
    let buyP = 0
    let shipP = 0

    // 1. SI VENTE SUR STOCK OU TRANSIT EXISTANT
    if (articleId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId }
      })

      if (!article) throw new Error("Article introuvable")
      if (article.statut === 'VENDU') throw new Error("Cet article est déjà vendu")

      buyP = Number(article.prixAchatUnitaire)
      shipP = Number(article.fraisPortUnitaires)
    } 
    // 2. SI VENTE DIRECTE CATALOGUE (Génération Commande d'Urgence)
    else if (sourcingItem) {
      // Les coûts initiaux sont à 0 car on n'a pas encore passé physiquement la commande
      buyP = 0
      shipP = 0
    }

    const prestatairesFees = 1.50 // Prestataire envoi colis par article

    const totalCosts = buyP + shipP + fixedFees + prestatairesFees
    const beneficeNet = saleP - totalCosts
    const margePct = saleP > 0 ? (beneficeNet / saleP) * 100 : 0

    // TRANSACTION ATOMIQUE DE CRÉATION/MISE À JOUR
    const sale = await prisma.$transaction(async (tx) => {
      
      if (articleId) {
        // A. Mise à jour de l'article existant
        await tx.article.update({
          where: { id: articleId },
          data: { statut: 'VENDU' }
        })
        // B. Création ou ajout au Panier existant
        const detectionFournisseur = sourcingItem.url?.toLowerCase().includes('shein') ? 'SHEIN' : 'TEMU'
        
        // Recherche d'un panier en cours pour ce fournisseur
        let panier = await tx.commandeFournisseur.findFirst({
          where: {
            fournisseur: detectionFournisseur as any,
            statut: 'PANIER'
          }
        });
        
        if (!panier) {
            const dateStr = new Date().toISOString().split('T')[0];
            panier = await tx.commandeFournisseur.create({
              data: {
                userId: DEFAULT_USER_ID,
                numero: `PANIER_${detectionFournisseur}_${dateStr}`,
                fournisseur: detectionFournisseur as any,
                dateCommande: new Date(),
                prixTotal: 0,
                fraisPort: 0,
                nbArticles: 0,
                statut: 'PANIER',
                notes: `Panier automatique généré le ${dateStr}.`
              }
            });
        }
        
        // On met à jour le nombre d'articles
        await tx.commandeFournisseur.update({
            where: { id: panier.id },
            data: { nbArticles: { increment: 1 } }
        });

        const newArticle = await tx.article.create({
          data: {
            commandeId: panier.id,
            nom: sourcingItem.title, // 🚀 FIX: On enregistre le nom pour le matching visuel !
            taille: taille || null, // 🚀 NEW: Sauvegarde de la taille pour l'auto-sourcing Shein
            lienProduit: sourcingItem.url,
            prixAchatUnitaire: 0,
            fraisPortUnitaires: 0,
            statut: 'VENDU',
            notes: `Article dropshippé d'urgence pour @${pseudoAcheteur}`
          }
        })

        finalArticleId = newArticle.id
      }

      // C. Enregistrement de la Vente définitive
      const newVente = await tx.vente.create({
        data: {
          articleId: finalArticleId,
          pseudoAcheteur,
          prixVente: saleP,
          fraisVinted: fixedFees,
          beneficeNet: beneficeNet,
          margePct: margePct,
          lienVente,
          botAccountId: botAccountId || null, // 🚀 Nouveau champ !
          statut: 'EN_ATTENTE',
          dateLimiteExpedition: addWorkingDays(new Date(), 5)
        }
      })

      // D. Création Automatique de l'action ADD_TO_CART_SHEIN si c'est du Sourcing
      if (sourcingItem && botAccountId && sourcingItem.url?.toLowerCase().includes('shein')) {
        await tx.botActionQueue.create({
          data: {
            botAccountId,
            actionType: 'ADD_TO_CART_SHEIN',
            status: 'PENDING',
            payload: {
              venteId: newVente.id,
              url: sourcingItem.url,
              taille: taille || 'S'
            }
          }
        })
      }

      return newVente
    })

    return NextResponse.json({ success: true, data: sale })

  } catch (error: any) {
    console.error('Vente/Urgence creation failed:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
export async function GET() {
  try {
    const sales = await prisma.vente.findMany({
      orderBy: { dateVente: 'desc' },
      include: {
        botAccount: {
          select: { name: true, vintedUsername: true }
        },
        expedition: true,
        article: {
          include: {
            commande: {
              select: {
                numero: true,
                fournisseur: true,
                lienProduit: true,
                notes: true
              }
            },
            vintedOrderSynced: {
              select: { photoUrl: true }
            }
          }
        }
      }
    })

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

    const enrichedSales = sales.map(sale => {
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
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
