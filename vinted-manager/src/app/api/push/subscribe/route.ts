import { NextResponse, NextRequest } from 'next/server'
import prisma from '@/lib/prisma'

const DEFAULT_USER_ID = '4700b998-a7e6-4c52-ac08-0e9893dba2ef'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { success: false, error: 'endpoint, keys.p256dh and keys.auth are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: DEFAULT_USER_ID,
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: DEFAULT_USER_ID,
      },
    })

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Push subscribe POST error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'endpoint is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'subscription not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    await prisma.pushSubscription.delete({ where: { endpoint } })

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error: any) {
    console.error('Push subscribe DELETE error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
}
