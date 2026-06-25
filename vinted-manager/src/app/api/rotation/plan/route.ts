import { NextResponse } from 'next/server'
import { computeRotationPlan } from '@/lib/rotation/scheduler'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * GET /api/rotation/plan?account=emma[&dryRun=false][&persist=false]
 * Calcule (et par défaut journalise) le plan de rotation winner d'un compte.
 * Phase 1 : dryRun=true par défaut -> ne mute pas WinnerQueue.
 * Le salve Python interrogera cette route pour savoir quoi publier (decisions
 * PUBLISH_FRESH / FILL_SLOT).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const account = searchParams.get('account')
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Paramètre account requis' },
        { status: 400, headers: corsHeaders }
      )
    }
    const dryRun = searchParams.get('dryRun') !== 'false'
    const persist = searchParams.get('persist') !== 'false'

    const plan = await computeRotationPlan(account, { dryRun, persist })
    return NextResponse.json({ success: true, plan }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Rotation plan failure:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
