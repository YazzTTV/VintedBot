"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Heart,
  RefreshCw,
  Trash2,
  Clock,
  Bot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  MessageCircleHeart,
  Tag,
  Terminal,
  Radar,
  Timer,
} from "lucide-react"
import { cn } from "@/lib/utils"

type DmEvent = {
  id: number
  botName: string
  buyerUsername: string
  itemId: string
  originalPrice: number | null
  offerPrice: number | null
  status: string
  errorMessage: string | null
  createdAt: string
}

type LogEntry = {
  id: string
  botName: string
  message: string
  type: string
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  SENT: {
    label: "DM + Offre",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  OFFER_FAILED: {
    label: "DM seul",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  ERROR: {
    label: "Erreur",
    className: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    icon: <XCircle className="w-3 h-3" />,
  },
}

export default function DmFavorisPage() {
  const [events, setEvents] = useState<DmEvent[]>([])
  const [bots, setBots] = useState<{ id: string; name: string }[]>([])
  const [selectedBot, setSelectedBot] = useState("all")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [now, setNow] = useState(() => Date.now())

  const fetchEvents = useCallback(async (showIndicator = false) => {
    if (showIndicator) setRefreshing(true)
    try {
      const [eventsRes, botsRes, logsRes] = await Promise.all([
        fetch(`/api/dm-favoris?botName=${selectedBot}`),
        fetch("/api/extension/status"),
        fetch(`/api/extension/logs?botName=${selectedBot}`),
      ])
      const eventsData = await eventsRes.json()
      if (eventsData.success) setEvents(eventsData.events || [])

      const botsData = await botsRes.json()
      if (botsData.success) setBots(botsData.bots || [])

      const logsData = await logsRes.json()
      if (logsData.success) setLogs(logsData.logs || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedBot])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(() => fetchEvents(), 5000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  // Horloge 1s pour les comptes a rebours (rate limit)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Ne garder que les logs pertinents pour le DM favoris
  const dmLogs = logs.filter(l => /DM|favori|rate.?limit|pause|détect|detect|⭐|🛑|⏸️/i.test(l.message))

  // Calculer la cible de reprise du rate limit (timestamp ms) a partir des logs
  const rateLimitTarget: number | null = (() => {
    for (const l of logs) {
      // "⏸️ DMs en pause rate-limit (Xs restantes)" → target = createdAt + Xs
      const m1 = l.message.match(/pause rate-?limit\s*\((\d+)s/i)
      if (m1) {
        const target = new Date(l.createdAt).getTime() + parseInt(m1[1], 10) * 1000
        return target > now ? target : null
      }
      // "🛑 Rate limit — reprise auto à HH:MM(:SS)" → target = aujourd'hui a cette heure
      const m2 = l.message.match(/reprise auto à\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i)
      if (m2) {
        const d = new Date(l.createdAt)
        d.setHours(parseInt(m2[1], 10), parseInt(m2[2], 10), m2[3] ? parseInt(m2[3], 10) : 0, 0)
        const target = d.getTime()
        return target > now ? target : null
      }
    }
    return null
  })()
  const rateLimitSec = rateLimitTarget ? Math.max(0, Math.round((rateLimitTarget - now) / 1000)) : null

  const logColor = (type: string, message: string) => {
    if (type === 'ERROR' || /❌|🛑/.test(message)) return 'text-rose-400'
    if (type === 'WARNING' || /⏸️|⚠️/.test(message)) return 'text-amber-400'
    if (type === 'SUCCESS' || /✅|⭐/.test(message)) return 'text-emerald-400'
    return 'text-zinc-300'
  }

  const handleClear = async () => {
    if (!confirm("Vider tous les événements DM Favoris ?")) return
    await fetch("/api/dm-favoris", { method: "DELETE" })
    setEvents([])
  }

  const total = events.length
  const sent = events.filter((e) => e.status === "SENT").length
  const offerFailed = events.filter((e) => e.status === "OFFER_FAILED").length
  const errors = events.filter((e) => e.status === "ERROR").length

  return (
    <div className="flex flex-col gap-8 p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageCircleHeart className="w-7 h-7 text-pink-400" />
            <h1 className="text-3xl font-bold text-white tracking-tight">DM Favoris</h1>
          </div>
          <p className="text-zinc-400 mt-1 font-medium">
            Logs en direct des DMs envoyés automatiquement quand un acheteur met un article en favoris.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-800/80">
            <Clock className="w-3.5 h-3.5" />
            Mise à jour 5s
          </span>
          <button
            onClick={() => fetchEvents(true)}
            className="p-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 text-zinc-300 rounded-lg transition-colors hover:bg-zinc-900/30"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total DMs</span>
          </div>
          <p className="text-3xl font-extrabold text-white">{total}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">DM + Offre</span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-400">{sent}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">DM sans offre</span>
          </div>
          <p className="text-3xl font-extrabold text-amber-400">{offerFailed}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Erreurs</span>
          </div>
          <p className="text-3xl font-extrabold text-rose-400">{errors}</p>
        </div>
      </div>

      {/* Live activity panel */}
      <section className="bg-[#0a0a0a] border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-zinc-900 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white font-mono">ACTIVITÉ EN DIRECT</h2>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              live
            </span>
          </div>
          {rateLimitSec !== null ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg font-mono">
              <Timer className="w-3.5 h-3.5" />
              Rate limit · reprise dans {rateLimitSec}s
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              <Radar className="w-3.5 h-3.5" />
              En attente de détection
            </span>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto p-4 font-mono text-xs space-y-1.5">
          {dmLogs.length === 0 ? (
            <p className="text-zinc-600 py-6 text-center">Aucun événement récent. Le scan tourne en arrière-plan via l'extension…</p>
          ) : (
            dmLogs.map((l) => (
              <div key={l.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-zinc-600 flex-shrink-0">
                  {new Date(l.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-zinc-700 flex-shrink-0">›</span>
                <span className={cn("break-all", logColor(l.type, l.message))}>{l.message}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Table */}
      <section className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-pink-400" />
            <h2 className="text-lg font-bold text-white">Historique des contacts</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Bot selector */}
            <select
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-zinc-700 capitalize"
            >
              <option value="all">Tous les comptes</option>
              {bots.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
            <button
              onClick={handleClear}
              title="Vider l'historique"
              className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-12 bg-zinc-900/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-zinc-800/80 rounded-xl">
            <Heart className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-400">Aucun DM favoris enregistré pour le moment.</p>
            <p className="text-xs text-zinc-600 mt-1">Les événements apparaîtront dès qu'un acheteur mettra un article en favoris.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 pb-3 pr-4">Heure</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 pb-3 pr-4">Compte</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 pb-3 pr-4">Acheteur</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 pb-3 pr-4">Item</th>
                  <th className="text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 pb-3 pr-4">Prix original</th>
                  <th className="text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 pb-3 pr-4">Offre</th>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 pb-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {events.map((event) => {
                  const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.ERROR
                  return (
                    <tr key={event.id} className="hover:bg-zinc-900/30 transition-colors group">
                      {/* Date */}
                      <td className="py-3 pr-4 text-xs text-zinc-500 whitespace-nowrap">
                        <div>{new Date(event.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div>
                        <div className="text-zinc-600">{new Date(event.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      </td>
                      {/* Bot */}
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-1.5">
                          <Bot className="w-3 h-3 text-zinc-500" />
                          <span className="text-xs font-bold text-zinc-300 capitalize">{event.botName}</span>
                        </span>
                      </td>
                      {/* Buyer */}
                      <td className="py-3 pr-4">
                        <span className="text-xs font-semibold text-white">@{event.buyerUsername}</span>
                      </td>
                      {/* Item */}
                      <td className="py-3 pr-4">
                        <a
                          href={`https://www.vinted.fr/items/${event.itemId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
                        >
                          <Tag className="w-3 h-3" />
                          #{event.itemId}
                        </a>
                      </td>
                      {/* Original price */}
                      <td className="py-3 pr-4 text-right">
                        {event.originalPrice != null ? (
                          <span className="text-xs text-zinc-300">{event.originalPrice.toFixed(2)} €</span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                      {/* Offer price */}
                      <td className="py-3 pr-4 text-right">
                        {event.offerPrice != null ? (
                          <span className="text-xs font-bold text-emerald-400">{event.offerPrice.toFixed(2)} €</span>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="py-3">
                        <div>
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            cfg.className
                          )}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          {event.errorMessage && (
                            <p className="text-[10px] text-rose-400 mt-1 font-mono max-w-xs truncate" title={event.errorMessage}>
                              {event.errorMessage}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {events.length > 0 && (
          <p className="text-xs text-zinc-600 mt-4 text-right">{events.length} événement(s) affiché(s)</p>
        )}
      </section>
    </div>
  )
}
