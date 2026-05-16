import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// Configurer les headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Permet aux extensions Chrome d'appeler l'API
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { vintedAccountId, vintedUsername, balancePending, balanceAvailable } = body

    if (!vintedAccountId || !vintedUsername) {
      return NextResponse.json({ success: false, error: "Identifiants Vinted manquants" }, { status: 400, headers: corsHeaders })
    }

    // Vérification d'accès basique (facultatif mais recommandé)
    const authToken = request.headers.get('x-api-key') || body.apiKey
    if (authToken && authToken !== process.env.APP_PASSWORD) {
      return NextResponse.json({ success: false, error: "Accès refusé" }, { status: 403, headers: corsHeaders })
    }

    console.log(`📡 Réception du solde financier pour l'utilisateur "${vintedUsername}" (${vintedAccountId})`)

    // Extraire un nom unique — utilise le début du pseudo, avec fallback sur l'ID pour éviter les collisions
    const baseName = vintedUsername.toLowerCase().split(/[._]/)[0]
    // Vérifier si ce nom est déjà pris par un AUTRE compte
    const existingWithName = await prisma.botAccount.findUnique({ where: { name: baseName } })
    const guessName = (existingWithName && existingWithName.vintedAccountId !== String(vintedAccountId))
      ? `${baseName}_${String(vintedAccountId).slice(-4)}`
      : baseName

    // 2. Upsert intelligent dans la table BotAccount
    const updatedAccount = await prisma.botAccount.upsert({
      where: { vintedAccountId: String(vintedAccountId) },
      update: {
        vintedUsername: vintedUsername,
        balancePending: Number(balancePending),
        balanceAvailable: Number(balanceAvailable),
        lastSync: new Date()
      },
      create: {
        vintedAccountId: String(vintedAccountId),
        vintedUsername: vintedUsername,
        name: guessName,
        balancePending: Number(balancePending),
        balanceAvailable: Number(balanceAvailable),
        lastSync: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Compte ${updatedAccount.name} synchronisé avec succès !`,
      data: updatedAccount
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error("❌ Erreur lors de la synchronisation du Wallet :", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
