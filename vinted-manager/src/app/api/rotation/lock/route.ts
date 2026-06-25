import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

async function resolveAccount(name: string) {
  return prisma.botAccount.findUnique({ where: { name } })
}

/**
 * GET /api/rotation/lock?account=emma
 * Renvoie l'état du verrou (locked=true seulement si non expiré).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('account')
    if (!name) {
      return NextResponse.json({ success: false, error: 'Paramètre account requis' }, { status: 400, headers: corsHeaders })
    }
    const account = await resolveAccount(name)
    if (!account) {
      return NextResponse.json({ success: false, error: `Compte introuvable : ${name}` }, { status: 404, headers: corsHeaders })
    }
    const lock = await prisma.rotationLock.findUnique({ where: { botAccountId: account.id } })
    const locked = !!lock && lock.expiresAt > new Date()
    return NextResponse.json({ success: true, locked, lock: locked ? lock : null }, { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

/**
 * POST /api/rotation/lock  { account, holder?, reason?, ttlSeconds? }
 * Pose (ou prolonge) le verrou d'un compte. Le salve Python l'appelle AVANT de
 * publier sur l'onglet Brave du compte -> /api/extension/actions retiendra alors
 * les REPOST_ITEM/DUPLICATE_ITEM de ce compte (anti-collision). TTL par défaut 10 min.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { account, holder, reason, ttlSeconds } = body
    if (!account) {
      return NextResponse.json({ success: false, error: 'Champ account requis' }, { status: 400, headers: corsHeaders })
    }
    const acc = await resolveAccount(account)
    if (!acc) {
      return NextResponse.json({ success: false, error: `Compte introuvable : ${account}` }, { status: 404, headers: corsHeaders })
    }
    const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? Math.min(ttlSeconds, 3600) : 600
    const expiresAt = new Date(Date.now() + ttl * 1000)

    const lock = await prisma.rotationLock.upsert({
      where: { botAccountId: acc.id },
      create: { botAccountId: acc.id, holder: holder || 'UNKNOWN', reason: reason || null, expiresAt },
      update: { holder: holder || 'UNKNOWN', reason: reason || null, acquiredAt: new Date(), expiresAt },
    })
    return NextResponse.json({ success: true, lock }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Rotation lock failure:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}

/**
 * DELETE /api/rotation/lock  { account }
 * Libère le verrou (idempotent). Le salve l'appelle APRÈS publication.
 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = body.account
    if (!name) {
      return NextResponse.json({ success: false, error: 'Champ account requis' }, { status: 400, headers: corsHeaders })
    }
    const account = await resolveAccount(name)
    if (!account) {
      return NextResponse.json({ success: false, error: `Compte introuvable : ${name}` }, { status: 404, headers: corsHeaders })
    }
    await prisma.rotationLock.deleteMany({ where: { botAccountId: account.id } })
    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders })
  }
}
