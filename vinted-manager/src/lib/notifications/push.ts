import webpush from 'web-push'
import prisma from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SendPushParams {
  title: string
  body: string
  url?: string
  tag?: string
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Best-effort push to all stored subscriptions.
 * Never throws to the caller — a failed push must not break a sync.
 */
export async function sendPush({ title, body, url, tag }: SendPushParams): Promise<void> {
  const subject = process.env.VAPID_SUBJECT
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY

  if (!subject || !publicKey || !privateKey) {
    console.warn('[push] VAPID env vars missing — skipping web push')
    return
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  let subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[]

  try {
    subscriptions = await prisma.pushSubscription.findMany()
  } catch (err) {
    console.error('[push] Failed to load subscriptions:', err)
    return
  }

  if (subscriptions.length === 0) return

  const payload = JSON.stringify({ title, body, url, tag })

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
      } catch (err: any) {
        const statusCode: number | undefined = err?.statusCode

        if (statusCode === 404 || statusCode === 410) {
          // Dead subscription — remove it silently
          try {
            await prisma.pushSubscription.delete({ where: { id: sub.id } })
            console.warn(`[push] Removed dead subscription: ${sub.endpoint}`)
          } catch (deleteErr) {
            console.error('[push] Failed to delete dead subscription:', deleteErr)
          }
        } else {
          console.error(`[push] sendNotification failed for ${sub.endpoint}:`, err)
        }
      }
    })
  )
}
