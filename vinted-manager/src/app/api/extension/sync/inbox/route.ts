import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

      // Enregistrer ou mettre à jour la conversation
      await prisma.vintedConversation.upsert({
        where: { id: id },
        update: {
          buyerUsername,
          buyerPhoto,
          title,
          itemId,
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
          title,
          itemId,
          lastMessage,
          lastMessageTime: new Date(lastMessageTime),
          hasOffer: !!hasOffer,
          offerPrice: offerPrice ? Number(offerPrice) : null,
          offerStatus: offerStatus || null,
          syncedAt: new Date()
        }
      })
      conversationCount++

      // Injecter les messages associés
      if (Array.isArray(messages)) {
        for (const msg of messages) {
          await prisma.vintedMessage.upsert({
            where: { id: msg.id },
            update: {
              content: msg.content,
              senderUsername: msg.senderUsername,
              createdAtVinted: new Date(msg.createdAtVinted)
            },
            create: {
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

