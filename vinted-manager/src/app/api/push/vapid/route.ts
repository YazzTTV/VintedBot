import { NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Expose la clé VAPID PUBLIQUE pour permettre au service worker (fichier statique,
// sans accès à process.env) de se ré-abonner tout seul sur l'événement
// `pushsubscriptionchange` (iOS invalide les abonnements régulièrement).
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID_PUBLIC_KEY missing' },
      { status: 500, headers: corsHeaders }
    )
  }
  return NextResponse.json({ publicKey }, { headers: corsHeaders })
}
