import { NextResponse } from 'next/server'
import { sendPush } from '@/lib/notifications/push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

// Envoie une notification de test a tous les abonnements enregistres.
// Sert a valider le flux push de bout en bout (SW + abonnement + VAPID).
export async function POST() {
  try {
    const result = await sendPush({
      title: 'Notification de test',
      body: 'Si tu vois ce message, les notifications push fonctionnent.',
      url: '/',
      tag: 'test',
    })

    return NextResponse.json({ success: true, ...result }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Push test POST error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
