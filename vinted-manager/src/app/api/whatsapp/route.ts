import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// L'URL où tourne ton instance locale OpenWA (par défaut port 8000 ou 3000 selon config)
const OPENWA_URL = process.env.OPENWA_URL || 'http://localhost:8000'
const LOGISTICIAN_NUMBER = process.env.LOGISTICIAN_NUMBER || '33783642205@c.us'

// POST /api/whatsapp (Webhook OpenWA pour la réception de messages)
// C'est ici qu'OpenWA envoie les messages reçus sur ton numéro pro
export async function POST(request: Request) {
  try {
    const payload = await request.json()
    
    // OpenWA structure: payload.body contient le texte, payload.from contient l'expéditeur
    const message = payload.body?.trim().toUpperCase()
    const sender = payload.from
    
    if (!message || !sender) {
      return NextResponse.json({ success: false })
    }

    // On logge tous les messages reçus
    await prisma.whatsappLog.create({
      data: {
        message: payload.body,
        direction: 'INBOUND',
        status: 'RECEIVED'
      }
    })

    // Si le message vient du logisticien et contient le mot-clé de validation
    if (sender === LOGISTICIAN_NUMBER && (message === 'FAIT' || message === 'OK' || message.includes('FAIT'))) {
      
      // Trouver la dernière vente en statut "A_EXPEDIER"
      const venteExpediable = await prisma.vente.findFirst({
        where: { statut: 'A_EXPEDIER' },
        orderBy: { dateVente: 'asc' }
      })

      if (venteExpediable) {
        // Valider l'expédition dans la base de données
        await prisma.vente.update({
          where: { id: venteExpediable.id },
          data: { statut: 'EXPEDIEE' }
        })

        // TODO: Appeler notre Vinted Extension pour cliquer sur "Marquer comme expédié" sur Vinted
        // On pourrait placer un flag "needsVintedSync" ou déclencher une socket

        // Confirmer au logisticien
        await sendOpenWAMessage(LOGISTICIAN_NUMBER, "✅ Expédition validée sur Vinted ! Merci.")
      } else {
        await sendOpenWAMessage(LOGISTICIAN_NUMBER, "❌ Je n'ai aucune commande en attente d'expédition dans le système.")
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// Fonction utilitaire pour envoyer un texte via OpenWA
async function sendOpenWAMessage(to: string, text: string) {
  await fetch(`${OPENWA_URL}/sendText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      args: { to, content: text }
    })
  })
}

// Fonction utilitaire pour envoyer un PDF + Image via OpenWA
export async function dispatchToLogistician(venteId: string, imageUrl: string, pdfUrl: string) {
  try {
    // 1. Envoyer la photo du produit (avec caption)
    await fetch(`${OPENWA_URL}/sendFileFromUrl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        args: {
          to: LOGISTICIAN_NUMBER,
          url: imageUrl,
          filename: 'produit.jpg',
          caption: `📦 NOUVELLE COMMANDE À PRÉPARER\n\nArticle: ${venteId}\nRéponds "FAIT" une fois le colis expédié !`
        }
      })
    })

    // 2. Envoyer le bordereau PDF
    await fetch(`${OPENWA_URL}/sendFileFromUrl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        args: {
          to: LOGISTICIAN_NUMBER,
          url: pdfUrl,
          filename: `Bordereau_${venteId}.pdf`,
          caption: "📄 Voici le bordereau Vinted"
        }
      })
    })

    // Loguer la sortie
    await prisma.whatsappLog.create({
      data: {
        venteId,
        message: "Envoi Bordereau + Image",
        direction: "OUTBOUND",
        status: "SENT"
      }
    })

    return true
  } catch (err) {
    console.error("OpenWA Error: ", err)
    return false
  }
}
