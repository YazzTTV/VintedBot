import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { fuzzyMatch } from '@/lib/utils'
import { sendPush } from '@/lib/notifications/push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { vintedAccountId, vintedUsername, orders = [] } = body

    if (!vintedAccountId || !vintedUsername) {
      return NextResponse.json(
        { success: false, error: "Identifiants Vinted de boutique manquants" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Authentification basique éventuelle
    const authToken = request.headers.get('x-api-key') || body.apiKey
    if (authToken && authToken !== process.env.APP_PASSWORD) {
      return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403, headers: corsHeaders })
    }

    console.log(`📡 Synchro Commandes : ${orders.length} ventes reçues pour "${vintedUsername}" (${vintedAccountId})`)

    // 1. Résoudre ou Créer le BotAccount correspondant
    const baseName = vintedUsername.toLowerCase().split(/[._]/)[0]
    const existingWithName = await prisma.botAccount.findUnique({ where: { name: baseName } })
    const guessName = (existingWithName && existingWithName.vintedAccountId !== String(vintedAccountId))
      ? `${baseName}_${String(vintedAccountId).slice(-4)}`
      : baseName

    const account = await prisma.botAccount.upsert({
      where: { vintedAccountId: String(vintedAccountId) },
      update: {
        vintedUsername: vintedUsername,
        lastSync: new Date()
      },
      create: {
        vintedAccountId: String(vintedAccountId),
        vintedUsername: vintedUsername,
        name: guessName,
        lastSync: new Date()
      }
    })

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucune commande reçue (0 ventes). Compte mis à jour.",
        updatedCount: 0
      }, { headers: corsHeaders })
    }

    // 2. Upsert parallèle de chaque commande reçue
    let updatedCount = 0
    for (const order of orders) {
      try {
        const orderId = String(order.id)
        
        // Parsing et validation de la date Vinted
        let nativeDate = new Date()
        if (order.createdAtVinted) {
          const parsed = new Date(order.createdAtVinted)
          if (!isNaN(parsed.getTime())) {
            nativeDate = parsed
          }
        }

        let finalBuyerLogin = order.buyerLogin;
        
        // --- NOUVEAU: Fallback heuristique pour deviner l'acheteur via l'inbox ---
        if (!finalBuyerLogin || finalBuyerLogin === "Acheteur Inconnu") {
          let conversations: any[] = [];
          
          if (order.itemId) {
            conversations = await prisma.vintedConversation.findMany({
              where: { itemId: String(order.itemId), botAccountId: account.id },
              orderBy: { lastMessageTime: 'desc' }
            });
          }
          
          if (conversations.length === 0 && order.title) {
            let baseTitle = order.title.trim();
            if (baseTitle.endsWith('...')) baseTitle = baseTitle.slice(0, -3).trim();
            const baseTitleLower = baseTitle.toLowerCase();
            
            const allConvs = await prisma.vintedConversation.findMany({
              where: { botAccountId: account.id },
              orderBy: { lastMessageTime: 'desc' }
            });
            
            const matched = allConvs.filter(c => {
               if (!c.title) return false;
               const cTitleLower = c.title.toLowerCase();
               return cTitleLower.includes(baseTitleLower) || baseTitleLower.includes(cTitleLower);
            });
            
            if (matched.length > 0) conversations = matched;
          }

          if (conversations.length > 0) {
            finalBuyerLogin = conversations[0].buyerUsername;
            console.log(`💡 [HEURISTIQUE] Acheteur trouvé via inbox pour l'article ${order.title}: ${finalBuyerLogin}`);
          }
        }
        // --------------------------------------------------------------------------

        const syncedOrder = await prisma.vintedOrderSynced.upsert({
          where: { id: orderId },
          update: {
            title: order.title || "Article Vinted",
            price: Number(order.price || 0),
            itemId: order.itemId ? String(order.itemId) : null,
            buyerLogin: finalBuyerLogin || null,
            buyerPhoto: order.buyerPhoto || null,
            photoUrl: order.photoUrl || null,
            status: order.status || "unknown",
            shippingStatus: order.shippingStatus || null,
            trackingCode: order.trackingCode || null,
            // Ne pas changer le lien articleId s'il a déjà été réconcilié manuellement !
          },
          create: {
            id: orderId,
            botAccountId: account.id,
            title: order.title || "Article Vinted",
            price: Number(order.price || 0),
            itemId: order.itemId ? String(order.itemId) : null,
            buyerLogin: finalBuyerLogin || null,
            buyerPhoto: order.buyerPhoto || null,
            photoUrl: order.photoUrl || null,
            status: order.status || "unknown",
            shippingStatus: order.shippingStatus || null,
            trackingCode: order.trackingCode || null,
            createdAtVinted: nativeDate
          }
        })

        // ==========================================
        // DÉTECTION AUTO DES ANNULATIONS VINTED
        // ==========================================
        const CANCELLED_STATUSES = ['cancelled', 'canceled', 'annulé', 'annulée', 'returned', 'dispute', 'refund']
        if (CANCELLED_STATUSES.some(s => syncedOrder.status.toLowerCase().includes(s))) {
          if (syncedOrder.articleId) {
            const linkedVente = await prisma.vente.findUnique({
              where: { articleId: syncedOrder.articleId }
            })
            if (linkedVente && linkedVente.statut !== 'ANNULEE') {
              await prisma.vente.update({
                where: { id: linkedVente.id },
                data: { statut: 'ANNULEE' }
              })
              console.log(`🚫 [AUTO-ANNULATION] Vente ${linkedVente.id} marquée ANNULEE (${syncedOrder.title})`)
              await sendPush({
                title: '🚫 Commande annulée',
                body: `${syncedOrder.title} — ${syncedOrder.buyerLogin || 'Inconnu'}`,
                url: '/ventes',
                tag: 'cancellation'
              })
            }
          }
        }

        // ==========================================
        // AUTO-RÉCONCILIATION & CRÉATION DE VENTE (Priorités en cascade)
        // ==========================================
        if (!syncedOrder.articleId && !["cancelled", "Supprimé", "canceled"].includes(syncedOrder.status.toLowerCase())) {
          
          let finalArticleId = null
          let matchedArticle = null
          let isUrgence = false
          let sourcingUrlForUrgence = ""

          // PRIORITÉ 1 : Chercher un article en STOCK (Nom exact ou fuzzy)
          const stockArticles = await prisma.article.findMany({ where: { statut: "STOCK" } })
          matchedArticle = stockArticles.find(a => fuzzyMatch(syncedOrder.title, a.nom || "")) ||
                           stockArticles.find(a => (a.nom || "").toLowerCase().includes(syncedOrder.title.toLowerCase()))
          
          // PRIORITÉ 2 : Chercher un article EN_TRANSIT si pas de STOCK
          if (!matchedArticle) {
            const transitArticles = await prisma.article.findMany({ where: { statut: "EN_TRANSIT" } })
            matchedArticle = transitArticles.find(a => fuzzyMatch(syncedOrder.title, a.nom || "")) ||
                             transitArticles.find(a => (a.nom || "").toLowerCase().includes(syncedOrder.title.toLowerCase()))
          }

          // PRIORITÉ 3 : Chercher dans le SOURCING et créer une commande d'urgence
          if (!matchedArticle) {
             let resolvedSourcingUrl = null;
             let resolvedTitle = syncedOrder.title;

             // A) Matching EXACT via l'ID Vinted (infaillible)
             if (syncedOrder.itemId) {
                 const metrics = await prisma.vintedItemMetrics.findUnique({
                     where: { id: String(syncedOrder.itemId) }
                 });
                 if (metrics && metrics.sourcingUrl) {
                     resolvedSourcingUrl = metrics.sourcingUrl;
                     resolvedTitle = metrics.title || syncedOrder.title;
                     
                     // 🚀 FIX: Forcer la récupération du titre originel depuis le Sourcing
                     const trueSourcing = await prisma.sourcingProduct.findFirst({ where: { url: resolvedSourcingUrl } });
                     if (trueSourcing && trueSourcing.title) {
                         resolvedTitle = trueSourcing.title;
                     }
                 }
             }
             
             // B) Fallback: Matching Flou sur le Sourcing (Risque d'erreur sur les noms génériques)
             if (!resolvedSourcingUrl) {
                 const allSourcings = await prisma.sourcingProduct.findMany()
                 const matchedSourcing = allSourcings.find(s => fuzzyMatch(syncedOrder.title, s.title)) ||
                                         allSourcings.find(s => s.title.toLowerCase().includes(syncedOrder.title.toLowerCase()))
                 if (matchedSourcing) {
                     resolvedSourcingUrl = matchedSourcing.url;
                     resolvedTitle = matchedSourcing.title;
                 }
             }

             if (resolvedSourcingUrl) {
                isUrgence = true
                sourcingUrlForUrgence = resolvedSourcingUrl
                
                const detectionFournisseur = resolvedSourcingUrl.toLowerCase().includes('shein') ? 'SHEIN' : 'TEMU'
                const DEFAULT_USER_ID = '4700b998-a7e6-4c52-ac08-0e9893dba2ef'
                
                // Recherche d'un panier en cours pour ce fournisseur
                let panier = await prisma.commandeFournisseur.findFirst({
                  where: {
                    fournisseur: detectionFournisseur as any,
                    statut: 'PANIER'
                  }
                });
                
                if (!panier) {
                    const dateStr = new Date().toISOString().split('T')[0];
                    panier = await prisma.commandeFournisseur.create({
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
                await prisma.commandeFournisseur.update({
                    where: { id: panier.id },
                    data: { nbArticles: { increment: 1 } }
                });

                matchedArticle = await prisma.article.create({
                  data: {
                    commandeId: panier.id,
                    nom: resolvedTitle,
                    lienProduit: resolvedSourcingUrl,
                    prixAchatUnitaire: 0,
                    fraisPortUnitaires: 0,
                    statut: 'VENDU',
                    notes: `Article dropshippé d'urgence pour @${syncedOrder.buyerLogin} (Vente: ${syncedOrder.title})`
                  }
                })
             } else {
                isUrgence = true
                sourcingUrlForUrgence = ""
                const DEFAULT_USER_ID = '4700b998-a7e6-4c52-ac08-0e9893dba2ef'
                
                let panier = await prisma.commandeFournisseur.findFirst({
                  where: {
                    numero: 'URGENCE_INCONNU_DROPSHIPPING',
                    statut: 'PANIER'
                  }
                });
                
                if (!panier) {
                    panier = await prisma.commandeFournisseur.create({
                      data: {
                        userId: DEFAULT_USER_ID,
                        numero: 'URGENCE_INCONNU_DROPSHIPPING',
                        fournisseur: 'AUTRE',
                        dateCommande: new Date(),
                        prixTotal: 0,
                        fraisPort: 0,
                        nbArticles: 0,
                        statut: 'PANIER',
                        notes: `Panier automatique pour les articles dropshippés non identifiés.`
                      }
                    });
                }
                
                await prisma.commandeFournisseur.update({
                    where: { id: panier.id },
                    data: { nbArticles: { increment: 1 } }
                });

                matchedArticle = await prisma.article.create({
                  data: {
                    commandeId: panier.id,
                    nom: resolvedTitle,
                    lienProduit: '',
                    prixAchatUnitaire: 0,
                    fraisPortUnitaires: 0,
                    statut: 'VENDU',
                    notes: `Article dropshippé d'urgence pour @${syncedOrder.buyerLogin} (Vente: ${syncedOrder.title}). L'URL source n'a pas pu être trouvée automatiquement.`
                  }
                })
             }
          }

          if (matchedArticle) {
            finalArticleId = matchedArticle.id

            // Lier l'article à la commande Vinted
            await prisma.vintedOrderSynced.update({
              where: { id: syncedOrder.id },
              data: { articleId: finalArticleId }
            })

            // Calculs financiers
            const prixVente = Number(syncedOrder.price)
            const fraisVinted = 0.70
            const prixAchat = Number(matchedArticle.prixAchatUnitaire || 0)
            const fraisPortAchat = Number(matchedArticle.fraisPortUnitaires || 0)
            // Si Urgence, le coût achat est 0 pour l'instant
            const coutTotalAchat = prixAchat + fraisPortAchat
            const beneficeNet = prixVente - coutTotalAchat - fraisVinted
            const margePct = prixVente > 0 ? (beneficeNet / prixVente) * 100 : 0

            // 1. Créer la Vente
            const newVente = await prisma.vente.create({
              data: {
                articleId: finalArticleId,
                pseudoAcheteur: finalBuyerLogin || "Inconnu",
                prixVente: prixVente,
                fraisVinted: fraisVinted,
                beneficeNet: beneficeNet,
                margePct: margePct,
                dateVente: syncedOrder.createdAtVinted,
                statut: "A_EXPEDIER",
                botAccountId: account.id,
                purchasePriceSnapshot: prixAchat,
                lienVente: syncedOrder.itemId ? `https://vinted.fr/items/${syncedOrder.itemId}` : null
              }
            })

            // 🚀 FIX: Création Automatique de l'action ADD_TO_CART_SHEIN
            if (isUrgence && sourcingUrlForUrgence && account.id && sourcingUrlForUrgence.toLowerCase().includes('shein')) {
              await prisma.botActionQueue.create({
                data: {
                  botAccountId: account.id,
                  actionType: 'ADD_TO_CART_SHEIN',
                  status: 'PENDING',
                  payload: {
                    venteId: newVente.id,
                    url: sourcingUrlForUrgence,
                    taille: 'S' // Valeur par défaut pour l'auto-panier
                  }
                }
              })
            }

            // Notification push : nouvelle vente
            await sendPush({
              title: 'Nouvelle vente',
              body: `${syncedOrder.title} - ${prixVente} EUR (${syncedOrder.buyerLogin || 'Inconnu'})`,
              url: '/ventes',
              tag: 'sale'
            })

            // 2. Mettre à jour le statut de l'Article (seulement si ce n'est pas déjà fait par l'Urgence)
            if (!isUrgence) {
              await prisma.article.update({
                where: { id: finalArticleId },
                data: { statut: "VENDU" }
              })
            }

            // 3. Créer le Tracking de Colis initial (Départ)
            let parcel = null
            if (syncedOrder.trackingCode) {
              parcel = await prisma.parcelTracking.create({
                data: {
                  trackingNumber: syncedOrder.trackingCode,
                  carrier: "Inconnu",
                  status: "EN_ATTENTE"
                }
              })
              await prisma.vente.update({
                where: { id: newVente.id },
                data: { parcelId: parcel.id }
              })
            }

            // 4. Créer l'Expedition
            await prisma.expedition.create({
              data: {
                venteId: newVente.id,
                numeroBordereau: syncedOrder.trackingCode || null,
                transporteur: "Inconnu"
              }
            })

            console.log(`✅ [AUTO-RECONCILIATION] Vente créée pour l'article: ${matchedArticle.nom} (Urgence: ${isUrgence})`)
          } else {
             console.log(`⚠️ [AUTO-RECONCILIATION] ÉCHEC TOTAL: Aucun article STOCK, TRANSIT ou SOURCING trouvé pour: "${syncedOrder.title}"`)
          }
        } else if (syncedOrder.articleId && finalBuyerLogin && finalBuyerLogin !== "Acheteur Inconnu") {
          // Mise à jour rétroactive d'une vente existante si l'acheteur était Inconnu
          const existingVente = await prisma.vente.findUnique({ where: { articleId: syncedOrder.articleId } });
          if (existingVente && (existingVente.pseudoAcheteur === "Inconnu" || existingVente.pseudoAcheteur === "Acheteur Inconnu" || existingVente.pseudoAcheteur === null)) {
              await prisma.vente.update({
                  where: { id: existingVente.id },
                  data: { pseudoAcheteur: finalBuyerLogin }
              });
              console.log(`✅ [UPDATE VENTE] Acheteur mis à jour rétroactivement pour vente ${existingVente.id} -> ${finalBuyerLogin}`);
          }
        }
        
        updatedCount++
      } catch (err: any) {
        console.error(`❌ Échec de l'upsert pour la commande Vinted #${order.id}:`, err.message)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updatedCount}/${orders.length} commandes synchronisées pour ${account.name} !`,
      data: {
        botAccount: account.name,
        totalSynced: updatedCount
      }
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error("❌ Erreur lors de la synchronisation des commandes :", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
