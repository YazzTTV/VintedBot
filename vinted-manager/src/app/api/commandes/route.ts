import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const DEFAULT_USER_ID = '4700b998-a7e6-4c52-ac08-0e9893dba2ef' // Temporary seed user

export async function POST(request: Request) {
  try {
    console.log('DEBUG API: Received POST request at /api/commandes');
    console.log('Content-Type:', request.headers.get('content-type'));
    
    const body = await request.json()
    console.log('Received Valid Payload:', JSON.stringify(body).substring(0, 50));
    
    const {
      numero,
      fournisseur,
      dateCommande,
      prixTotal,
      fraisPort,
      nbArticles,
      lienProduit,
      notes,
      dateArriveeEstimee,
      panier, // Tableau dynamique: Array<{ nom: string, lien?: string, url?: string, quantite: number, notes?: string }>
      trackingNumber,
      carrier
    } = body

    // Détermination du nombre final d'articles par somme du panier ou paramètre direct
    let articlesCount = 0
    if (panier && Array.isArray(panier) && panier.length > 0) {
      articlesCount = panier.reduce((sum, item) => sum + (Number(item.quantite) || 1), 0)
    } else {
      articlesCount = parseInt(nbArticles) || 1
    }

    const totalP = parseFloat(prixTotal) || 0
    const shippingP = parseFloat(fraisPort) || 0
    
    const prixAchatUnitaire = articlesCount > 0 ? (totalP / articlesCount) : 0
    const fraisPortUnitaires = articlesCount > 0 ? (shippingP / articlesCount) : 0

    // Transaction atomique de création de commande et d'articles associés
    const newCommande = await prisma.$transaction(async (tx) => {
      const commande = await tx.commandeFournisseur.create({
        data: {
          userId: DEFAULT_USER_ID,
          numero,
          fournisseur,
          dateCommande: new Date(dateCommande),
          prixTotal: totalP,
          fraisPort: shippingP,
          nbArticles: articlesCount,
          lienProduit: lienProduit || (panier && panier[0]?.lien) || null, // Remplissage fallback du lien racine
          notes,
          dateArriveeEstimee: dateArriveeEstimee ? new Date(dateArriveeEstimee) : null,
          statut: 'COMMANDEE'
        }
      })

      const articlesToInsert: any[] = []

      if (panier && Array.isArray(panier) && panier.length > 0) {
        // Parcourir et dupliquer les articles individuels pour chaque ligne du panier
        for (const item of panier) {
          const itemQty = Number(item.quantite) || 1
          // Récupérer le prix unitaire spécifique ou fallback sur la moyenne flat
          const currentItemPrice = item.prixUnitaire ? parseFloat(item.prixUnitaire) : prixAchatUnitaire
          
          for (let i = 0; i < itemQty; i++) {
            articlesToInsert.push({
              commandeId: commande.id,
              nom: item.nom || "Modèle non spécifié",
              lienProduit: item.lien || item.url || null,
              prixAchatUnitaire: currentItemPrice,
              fraisPortUnitaires: fraisPortUnitaires, // Les frais de port restent divisés équitablement
              statut: 'EN_TRANSIT' as const,
              notes: item.notes || `Issu du panier - Commande ${numero}`
            })
          }
        }
      } else {
        // Rétrocompatibilité avec l'ancienne saisie mono-produit
        for (let i = 0; i < articlesCount; i++) {
          articlesToInsert.push({
            commandeId: commande.id,
            nom: `Article standard #${i + 1}`,
            lienProduit: lienProduit || null,
            prixAchatUnitaire: prixAchatUnitaire,
            fraisPortUnitaires: fraisPortUnitaires,
            statut: 'EN_TRANSIT' as const,
            notes: notes || `Part of order ${numero}`
          })
        }
      }

      // Création en masse sécurisée
      await tx.article.createMany({
        data: articlesToInsert
      })

      return commande
    })

    let parcelCreated = false
    if (trackingNumber) {
      await prisma.parcelTracking.create({
        data: {
          trackingNumber,
          carrier: carrier || null,
          commandeId: newCommande.id,
        }
      })
      parcelCreated = true
    }

    return NextResponse.json({ success: true, data: newCommande, parcelCreated }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating command:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const commandes = await prisma.commandeFournisseur.findMany({
      orderBy: { dateCommande: 'desc' },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    })
    return NextResponse.json({ success: true, data: commandes })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
