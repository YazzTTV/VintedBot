"use client"

import React, { useState, useEffect } from "react"
import { Bell, BellOff, BellRing, Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

// Standard VAPID key conversion: base64url -> Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type ToastState = { message: string; type: 'success' | 'error' } | null

export default function PushToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Feature detect + check existing subscription on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      setLoading(false)
      return
    }
    setSupported(true)

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setSubscribed(sub !== null)
      })
      .catch((err) => {
        console.error('[PushToggle] Impossible de vérifier la souscription existante:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        showToast('Permission refusée. Activez les notifications dans les réglages du navigateur.', 'error')
        setLoading(false)
        return
      }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const sub = subscription.toJSON()
      const keys = sub.keys as { p256dh: string; auth: string }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        }),
      })

      if (!res.ok) {
        throw new Error(`Serveur: ${res.status}`)
      }

      setSubscribed(true)
      showToast('Notifications activées', 'success')
    } catch (err) {
      console.error('[PushToggle] Erreur lors de l\'activation:', err)
      showToast('Erreur lors de l\'activation des notifications', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()

        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }

      setSubscribed(false)
      showToast('Notifications désactivées', 'success')
    } catch (err) {
      console.error('[PushToggle] Erreur lors de la désactivation:', err)
      showToast('Erreur lors de la désactivation des notifications', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      if (!res.ok) {
        throw new Error(`Serveur: ${res.status}`)
      }
      showToast('Notification de test envoyée', 'success')
    } catch (err) {
      console.error('[PushToggle] Erreur lors du test:', err)
      showToast('Erreur lors de l\'envoi du test', 'error')
    } finally {
      setTesting(false)
    }
  }

  if (!supported) {
    return (
      <button
        disabled
        title="Les notifications push ne sont pas supportées sur ce navigateur"
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 bg-zinc-900/30 border border-zinc-800/50 cursor-not-allowed"
      >
        <BellOff className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Non supporté</span>
      </button>
    )
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-6 right-6 p-4 rounded-2xl border shadow-lg backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-200",
            toast.type === 'success'
              ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-200"
              : "bg-red-950/80 border-red-500/30 text-red-200"
          )}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

      <button
        onClick={subscribed ? handleUnsubscribe : handleSubscribe}
        disabled={loading}
        title={subscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 disabled:opacity-50",
          subscribed
            ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60"
            : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
        )}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : subscribed ? (
          <BellRing className="w-3.5 h-3.5" />
        ) : (
          <Bell className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">
          {loading
            ? '...'
            : subscribed
            ? 'Notifications activées'
            : 'Activer les notifications'}
        </span>
      </button>

      {subscribed && (
        <button
          onClick={handleTest}
          disabled={testing}
          title="Envoyer une notification de test"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 disabled:opacity-50",
            "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
          )}
        >
          {testing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {testing ? '...' : 'Tester'}
          </span>
        </button>
      )}
    </>
  )
}
