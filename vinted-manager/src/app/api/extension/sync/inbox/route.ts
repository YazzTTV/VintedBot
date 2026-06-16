import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendPush } from '@/lib/notifications/push'

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
    const { botAccountName, vintedAccountId, conversations } = body

    if (!botAccountName || !vintedAccountId || !Array.isArray(conversations)) {
      return NextResponse.json(
        { success: false, error: "Paramètres requis manquants : botAccountName, vintedAccountId, conversations[]" },
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

    let conversationCount = 0
    let messageCount = 0

    // 2. Synchronisation des Conversations et Messages (Upserts en cascade)
    // On exécute cela séquentiellement pour éviter les verrous concurrents trop lourds sur Supabase
    for (const conv of conversations) {
      const {
        id,
        buyerUsername,
        buyerPhoto,
        title,
        itemId,
        lastMessage,
        lastMessageTime,
        hasOffer,
        offerPrice,
        offerStatus,
        messages
      } = conv

      // Anti-spam : charger l'état précédent de la conversation avant l'upsert
      const prevConv = await prisma.vintedConversation.findUnique({ where: { id } })

      // Clean the title if Vinted prepends "Intéressé(e) par :" or something similar
      let cleanTitle = title;
      if (title && title.includes('Intéressé(e) par :')) {
        cleanTitle = title.split('Intéressé(e) par :')[1].trim();
      } else if (title && title.includes(' a fait une offre de ')) {
        // If the title is an offer, we might not have the title. Keep it as is or handle it.
      } else if (title && title.includes(' a acheté ')) {
        cleanTitle = title.split(' a acheté ')[1].trim();
      }

      // Extraction du titre depuis les messages automatisés du bot (ex: favoris)
      if (cleanTitle) {
        const botMatch1 = cleanTitle.match(/aimais mon article (.*?)(?:\. Il est| \!|\. Je)/i);
        const botMatch2 = cleanTitle.match(/int[éè]r[êe]t pour mon article (.*?)(?:\. Il est| \!|\. Je)/i);
        
        if (botMatch1 && botMatch1[1]) {
            cleanTitle = botMatch1[1].trim();
        } else if (botMatch2 && botMatch2[1]) {
            cleanTitle = botMatch2[1].trim();
        }
      }

      let currentItemId = itemId;

      // Enregistrer ou mettre à jour la conversation
      await prisma.vintedConversation.upsert({
        where: { id: id },
        update: {
          buyerUsername,
          buyerPhoto,
          title: cleanTitle,
          itemId: currentItemId,
          lastMessage,
          lastMessageTime: new Date(lastMessageTime),
          hasOffer: !!hasOffer,
          offerPrice: offerPrice ? Number(offerPrice) : null,
          offerStatus: offerStatus || null,
          syncedAt: new Date()
        },
        create: {
          id: id,
          botAccountId: botAccount.id,
          buyerUsername,
          buyerPhoto,
          title: cleanTitle,
          itemId: currentItemId,
          lastMessage,
          lastMessageTime: new Date(lastMessageTime),
          hasOffer: !!hasOffer,
          offerPrice: offerPrice ? Number(offerPrice) : null,
          offerStatus: offerStatus || null,
          syncedAt: new Date()
        }
      })
      
      // --- NOUVEAU: Mettre à jour la Vente si elle était Inconnue ---
      try {
        let syncedOrders: any[] = [];
        if (currentItemId) {
            syncedOrders = await prisma.vintedOrderSynced.findMany({
                where: { itemId: String(currentItemId), botAccountId: botAccount.id }
            });
        }
        
        // Match par titre si itemId échoue (cherche d'abord dans les articles actifs, puis dans les commandes)
        if (!currentItemId && cleanTitle && cleanTitle !== "Discussion Vinted") {
            const cTitleLower = cleanTitle.toLowerCase();
            
            // 1. Chercher dans les articles actifs (VintedItemMetrics)
            const activeItems = await prisma.vintedItemMetrics.findMany({
                where: { botAccountId: botAccount.id }
            });
            const matchedItem = activeItems.find(i => {
                if (!i.title) return false;
                const baseTitleLower = i.title.trim().toLowerCase();
                return cTitleLower.includes(baseTitleLower) || baseTitleLower.includes(cTitleLower);
            });
            
            if (matchedItem) {
                await prisma.vintedConversation.update({
                    where: { id },
                    data: { itemId: matchedItem.id }
                });
                currentItemId = matchedItem.id;
            } else {
                // 2. Chercher dans les commandes (VintedOrderSynced) par titre
                const allOrders = await prisma.vintedOrderSynced.findMany({
                    where: { botAccountId: botAccount.id }
                });
                const matchedOrder = allOrders.find(o => {
                    if (!o.title) return false;
                    let baseTitle = o.title.trim();
                    if (baseTitle.endsWith('...')) baseTitle = baseTitle.slice(0, -3).trim();
                    const baseTitleLower = baseTitle.toLowerCase();
                    return cTitleLower.includes(baseTitleLower) || baseTitleLower.includes(cTitleLower);
                });
                
                if (matchedOrder && matchedOrder.itemId) {
                    await prisma.vintedConversation.update({
                        where: { id },
                        data: { itemId: matchedOrder.itemId }
                    });
                    currentItemId = matchedOrder.itemId;
                }
                
                // 3. Heuristique Forte par buyerLogin
                if (!currentItemId && buyerUsername && buyerUsername !== "Acheteur Inconnu") {
                    const matchedOrderBuyer = allOrders.find(o => o.buyerLogin === buyerUsername);
                    if (matchedOrderBuyer && matchedOrderBuyer.itemId) {
                        await prisma.vintedConversation.update({
                            where: { id },
                            data: { itemId: matchedOrderBuyer.itemId }
                        });
                        currentItemId = matchedOrderBuyer.itemId;
                        console.log(`✅ [HEURISTIQUE BUYER] Conversation liée via le pseudo de l'acheteur ${buyerUsername} !`);
                    }
                }
            }
        }
        
        // NOUVEAU: Si le titre est juste un prix (ex: "45,00 €" ou "45€"), chercher l'article par prix !
        if (!currentItemId && cleanTitle) {
            const priceMatch = cleanTitle.match(/^(\d+)[.,]?(\d*)\s*€$/);
            if (priceMatch) {
                const priceValue = parseFloat(`${priceMatch[1]}.${priceMatch[2] || '00'}`);
                // Chercher dans VintedItemMetrics un article avec ce prix
                const articlesWithPrice = await prisma.vintedItemMetrics.findMany({
                    where: { 
                        botAccountId: botAccount.id,
                        price: priceValue
                    }
                });
                
                // Si on trouve EXACTEMENT UN SEUL article avec ce prix, on l'associe !
                if (articlesWithPrice.length === 1) {
                    await prisma.vintedConversation.update({
                        where: { id },
                        data: { itemId: articlesWithPrice[0].id }
                    });
                    currentItemId = articlesWithPrice[0].id;
                    console.log(`✅ [HEURISTIQUE PRIX] Conversation ${id} liée à l'article ${articlesWithPrice[0].title} via le prix ${priceValue}€ !`);
                }
            }
        }

        if (buyerUsername) {
            for (const syncedOrder of syncedOrders) {
                if (syncedOrder.buyerLogin === "Acheteur Inconnu" || syncedOrder.buyerLogin === null || syncedOrder.buyerLogin === "Inconnu") {
                    await prisma.vintedOrderSynced.update({
                        where: { id: syncedOrder.id },
                        data: { buyerLogin: buyerUsername }
                    });
                }
                if (syncedOrder.articleId) {
                    const vente = await prisma.vente.findUnique({ where: { articleId: syncedOrder.articleId } });
                    if (vente && (vente.pseudoAcheteur === "Acheteur Inconnu" || vente.pseudoAcheteur === "Inconnu" || vente.pseudoAcheteur === null)) {
                        await prisma.vente.update({
                            where: { id: vente.id },
                            data: { pseudoAcheteur: buyerUsername }
                        });
                        console.log(`✅ [REVERSE HEURISTIQUE] Vente ${vente.id} mise à jour avec l'acheteur ${buyerUsername} via Inbox Sync (Titre: ${syncedOrder.title}) !`);
                    }
                }
            }
        }
      } catch (e) {
          console.error("Erreur lors de la reverse heuristique:", e);
      }

      // Notification push : nouvelle offre (transition false → true sur hasOffer)
      if (!!hasOffer && (prevConv === null || prevConv.hasOffer === false)) {
        await sendPush({
          title: 'Offre recue',
          body: `${buyerUsername} propose ${offerPrice} EUR sur ${cleanTitle}`,
          url: '/inbox',
          tag: `offer-${id}`
        })
      }

      conversationCount++

      // Injecter les messages associés
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          // Anti-spam : vérifier si le message est vraiment nouveau par ID
          let existingMsg = await prisma.vintedMessage.findUnique({ where: { id: msg.id } });

          // Deduplication heuristique : si c'est un message système comme "Vendu",
          // vérifier s'il n'y a pas déjà un message identique dans la conversation.
          if (!existingMsg && (msg.content?.toLowerCase() === 'vendu' || msg.content?.toLowerCase().includes('offre') || msg.content?.includes('€'))) {
            existingMsg = await prisma.vintedMessage.findFirst({
              where: {
                conversationId: id,
                content: msg.content
              }
            });
          }

          if (existingMsg) {
            // Si le message existe déjà (par ID ou par heuristique), on met juste à jour sa date si besoin (ou on ignore)
            await prisma.vintedMessage.update({
              where: { id: existingMsg.id },
              data: {
                createdAtVinted: new Date(msg.createdAtVinted)
              }
            });
            continue;
          }

          // Notification push : nouveau message de l'acheteur (pas du bot)
          if (msg.senderUsername === buyerUsername) {
            await sendPush({
              title: 'Nouveau message',
              body: `${msg.senderUsername}: ${String(msg.content).slice(0, 80)}`,
              url: '/inbox',
              tag: `msg-${id}`
            })
          }

          await prisma.vintedMessage.create({
            data: {
              id: msg.id,
              conversationId: id,
              senderUsername: msg.senderUsername,
              content: msg.content,
              createdAtVinted: new Date(msg.createdAtVinted)
            }
          })
          messageCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        botAccount: botAccount.name,
        syncedConversations: conversationCount,
        syncedMessages: messageCount
      }
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Inbox sync failure:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function GET() {
  try {
    const conversations = await prisma.vintedConversation.findMany({
      orderBy: { lastMessageTime: 'desc' },
      include: {
        botAccount: {
          select: {
            id: true,
            name: true,
            vintedUsername: true
          }
        },
        messages: {
          orderBy: { createdAtVinted: 'asc' }
        }
      }
    })
    return NextResponse.json({ success: true, data: conversations })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

