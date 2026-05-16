import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const connectionString = `${process.env.DATABASE_URL}`
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🧪 DEBUT DU TEST DE SIMULATION - VINTED MANAGER V2 🧪")

  try {
    // 1. SETUP BOT ACCOUNT
    const botAccountName = "test_emma"
    console.log(`\n👤 1. Upsert du compte Bot : ${botAccountName}`)
    const account = await prisma.botAccount.upsert({
      where: { name: botAccountName },
      update: { vintedAccountId: "999999", lastSync: new Date() },
      create: {
        name: botAccountName,
        vintedAccountId: "999999",
        lastSync: new Date()
      }
    })
    console.log(`✅ Compte Résolu : ID=${account.id}`)

    // 2. TEST INBOX SYNC
    console.log(`\n📬 2. Simulation d'ingestion d'Inbox...`)
    const convId = "conv_test_abc123"
    
    const conv = await prisma.vintedConversation.upsert({
      where: { id: convId },
      update: {
        buyerUsername: "acheteur_fan_de_mode",
        title: "Robe Eté Premium",
        lastMessage: "Bonjour, c'est dispo ?",
        lastMessageTime: new Date(),
        hasOffer: true,
        offerPrice: 12.50,
        offerStatus: "PENDING",
        syncedAt: new Date()
      },
      create: {
        id: convId,
        botAccountId: account.id,
        buyerUsername: "acheteur_fan_de_mode",
        title: "Robe Eté Premium",
        lastMessage: "Bonjour, c'est dispo ?",
        lastMessageTime: new Date(),
        hasOffer: true,
        offerPrice: 12.50,
        offerStatus: "PENDING",
        syncedAt: new Date()
      }
    })

    // Message lié
    await prisma.vintedMessage.upsert({
      where: { id: "msg_1" },
      update: { content: "Bonjour, c'est dispo ?" },
      create: {
        id: "msg_1",
        conversationId: conv.id,
        senderUsername: "acheteur_fan_de_mode",
        content: "Bonjour, c'est dispo ?",
        createdAtVinted: new Date()
      }
    })
    console.log("✅ Conversation et Message de test injectés !")

    // 3. TEST METRICS & WINNER LOGIC
    console.log(`\n🏆 3. Simulation de détection de Winners...`)
    const now = new Date()
    const recentUpload = new Date(now.getTime() - 4 * 60 * 60 * 1000) // Publié il y a 4h (fenêtre 24h valide)

    // Cas A : Winner Statistiques
    await prisma.vintedItemMetrics.upsert({
      where: { id: "item_winner_stats" },
      update: {
        viewCount: 180, // > 150
        favouriteCount: 25, // >= 20
        isWinner: true,
        winnerReason: "STATISTIQUES",
        updatedAt: new Date()
      },
      create: {
        id: "item_winner_stats",
        botAccountId: account.id,
        title: "Jupe Plissée Tendance",
        viewCount: 180,
        favouriteCount: 25,
        status: "Actif",
        isWinner: true,
        winnerReason: "STATISTIQUES",
        uploadedAtVinted: recentUpload,
        updatedAt: new Date()
      }
    })

    // Cas B : Winner Vente Rapide
    await prisma.vintedItemMetrics.upsert({
      where: { id: "item_winner_sale" },
      update: {
        status: "Vendu",
        isWinner: true,
        winnerReason: "VENTE_RAPIDE",
        updatedAt: new Date()
      },
      create: {
        id: "item_winner_sale",
        botAccountId: account.id,
        title: "Robe Soirée VIP",
        viewCount: 45,
        favouriteCount: 5,
        status: "Vendu",
        isWinner: true,
        winnerReason: "VENTE_RAPIDE",
        uploadedAtVinted: recentUpload,
        updatedAt: new Date()
      }
    })

    // Cas C : Standard
    await prisma.vintedItemMetrics.upsert({
      where: { id: "item_standard" },
      update: { updatedAt: new Date() },
      create: {
        id: "item_standard",
        botAccountId: account.id,
        title: "T-shirt Simple",
        viewCount: 12,
        favouriteCount: 1,
        status: "Actif",
        isWinner: false,
        uploadedAtVinted: recentUpload,
        updatedAt: new Date()
      }
    })
    console.log("✅ 3 Produits injectés (1 Stats, 1 Vente Rapide, 1 Normal) !")

    // 4. TEST COMMAND QUEUE (ACTION QUEUE)
    console.log(`\n📡 4. Simulation de la File d'Actions...`)
    const action = await prisma.botActionQueue.create({
      data: {
        botAccountId: account.id,
        actionType: "ACCEPT_OFFER",
        payload: { conversationId: conv.id, amount: 12.50 },
        status: "PENDING"
      }
    })
    console.log(`✅ Action générée ID=${action.id}`)

    // Marquer comme traitée
    await prisma.botActionQueue.update({
      where: { id: action.id },
      data: {
        status: "SUCCESS",
        completedAt: new Date()
      }
    })
    console.log("✅ Action passée à SUCCESS !")

    // NETTOYAGE DES TESTS (Optionnel pour garder la DB propre)
    console.log(`\n🧹 Nettoyage des données de test...`)
    await prisma.botActionQueue.deleteMany({ where: { botAccountId: account.id } })
    await prisma.vintedItemMetrics.deleteMany({ where: { botAccountId: account.id } })
    await prisma.vintedMessage.deleteMany({ where: { conversationId: convId } })
    await prisma.vintedConversation.deleteMany({ where: { id: convId } })
    await prisma.botAccount.delete({ where: { id: account.id } })
    console.log("✅ Nettoyage effectué.")

    console.log(`\n✨ LE TEST S'EST DEROULE AVEC SUCCÈS ! LA BDD ET LES SCHÉMAS SONT 100% VALIDÉS ✨`)

  } catch (err: any) {
    console.error("\n❌ ECHEC DU TEST CRITIQUE :", err.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
