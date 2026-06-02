"use client"

import React, { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Package,
  Truck,
  AlertTriangle,
  RefreshCw,
  Plus,
  X,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import TrackingCell, { type Parcel } from "@/components/TrackingCell"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "a l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `il y a ${days}j`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  })
}

function isDeadlinePast(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// Retourne la dateLimiteExpedition la plus proche (la plus urgente) parmi les ventes
function getEarliestDeadline(ventes: Parcel["ventes"]): string | null {
  if (!ventes || ventes.length === 0) return null
  const dates = ventes
    .map((v) => v.dateLimiteExpedition)
    .filter((d): d is string => !!d)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  return dates[0] ?? null
}

// ---------------------------------------------------------------------------
// Alert types (from /api/parcels/alerts)
// ---------------------------------------------------------------------------

type AlertParcel = Parcel & {
  alertType: "OVERDUE" | "ESTIMATED_LATE"
  isOverdue: boolean
  isEstimatedLate: boolean
  ventesEnRetard: Parcel["ventes"]
}

// ---------------------------------------------------------------------------
// Sub-types pour les selects
// ---------------------------------------------------------------------------

type VenteOption = {
  id: string
  pseudoAcheteur: string
  statut: string
  dateLimiteExpedition: string | null
}

type CommandeOption = {
  id: string
  numero: string
  fournisseur: string
  dateCommande: string
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EventTimeline({ events }: { events: Parcel["events"] }) {
  if (!events || events.length === 0) {
    return (
      <p className="text-xs text-zinc-500 py-3 text-center">Aucun evenement enregistre.</p>
    )
  }
  return (
    <div className="relative pl-5 space-y-3">
      <div className="absolute left-1.5 top-1 bottom-1 w-px bg-zinc-800" />
      {events.map((ev) => (
        <div key={ev.id} className="relative flex flex-col gap-0.5">
          <div className="absolute -left-3.5 top-1 w-2.5 h-2.5 rounded-full bg-zinc-700 border border-zinc-600 z-10" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-400">
              {new Date(ev.date).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {ev.location && (
              <span className="inline-flex items-center gap-1 text-[9px] text-zinc-500 font-medium">
                <MapPin className="w-2.5 h-2.5" />
                {ev.location}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-300 font-medium">{ev.description}</p>
        </div>
      ))}
    </div>
  )
}

// Multi-select checkbox list for ventes
function VentesMultiSelect({
  ventes,
  selectedIds,
  onChange,
}: {
  ventes: VenteOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  if (ventes.length === 0) {
    return (
      <p className="text-xs text-zinc-500 italic py-2">Aucune vente disponible.</p>
    )
  }

  return (
    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
      {ventes.map((v) => {
        const checked = selectedIds.includes(v.id)
        return (
          <label
            key={v.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all",
              checked
                ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(v.id)}
              className="accent-blue-500 w-3.5 h-3.5 shrink-0"
            />
            <span className="text-xs font-semibold truncate">
              @{v.pseudoAcheteur}
            </span>
            {v.dateLimiteExpedition && (
              <span className="ml-auto text-[10px] text-zinc-500 shrink-0">
                {formatDate(v.dateLimiteExpedition)}
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ParcelsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [alerts, setAlerts] = useState<AlertParcel[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Modal state (shared for add + edit)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null) // null = mode ajout

  // Options pour les selects
  const [ventesOptions, setVentesOptions] = useState<VenteOption[]>([])
  const [commandesOptions, setCommandesOptions] = useState<CommandeOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  // Form
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    trackingNumber: "",
    carrier: "",
    commandeId: "",
    venteIds: [] as string[],
  })

  // ---------------------------------------------------------------------------
  // Loaders
  // ---------------------------------------------------------------------------

  const loadParcels = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/parcels")
      const d = await r.json()
      if (d.success) setParcels(d.data)
    } catch (_) {}
    setLoading(false)
  }, [])

  const loadAlerts = useCallback(async () => {
    try {
      const r = await fetch("/api/parcels/alerts")
      const d = await r.json()
      if (d.success) setAlerts(d.data)
    } catch (_) {}
  }, [])

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true)
    try {
      const [rv, rc] = await Promise.all([
        fetch("/api/ventes").then((r) => r.json()),
        fetch("/api/commandes").then((r) => r.json()),
      ])
      if (rv.success) setVentesOptions(rv.data)
      if (rc.success) setCommandesOptions(rc.data)
    } catch (_) {}
    setLoadingOptions(false)
  }, [])

  useEffect(() => {
    loadParcels()
    loadAlerts()
  }, [loadParcels, loadAlerts])

  // Auto-refresh toutes les 60 secondes
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      loadParcels()
      loadAlerts()
    }, 60_000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadParcels, loadAlerts])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleSyncAll = async () => {
    setSyncingAll(true)
    try {
      await fetch("/api/parcels/sync-all", { method: "POST" })
      await loadParcels()
      await loadAlerts()
    } catch (_) {}
    setSyncingAll(false)
  }

  const handleSyncOne = async (id: string) => {
    setSyncingId(id)
    try {
      await fetch(`/api/parcels/${id}/sync`, { method: "POST" })
      await loadParcels()
    } catch (_) {}
    setSyncingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce colis ?")) return
    setDeletingId(id)
    try {
      await fetch(`/api/parcels/${id}`, { method: "DELETE" })
      setParcels((prev) => prev.filter((p) => p.id !== id))
      setAlerts((prev) => prev.filter((p) => p.id !== id))
    } catch (_) {}
    setDeletingId(null)
  }

  // Ouvrir la modal en mode ajout
  const openAddModal = () => {
    loadOptions()
    setEditingParcel(null)
    setForm({ trackingNumber: "", carrier: "", commandeId: "", venteIds: [] })
    setIsModalOpen(true)
  }

  // Ouvrir la modal en mode édition
  const openEditModal = (parcel: Parcel) => {
    loadOptions()
    setEditingParcel(parcel)
    setForm({
      trackingNumber: parcel.trackingNumber,
      carrier: parcel.carrier ?? "",
      commandeId: parcel.commandeId ?? "",
      venteIds: parcel.ventes.map((v) => v.id),
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingParcel(null)
    setForm({ trackingNumber: "", carrier: "", commandeId: "", venteIds: [] })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.trackingNumber.trim()) return
    setIsSaving(true)
    try {
      const body: Record<string, unknown> = {
        trackingNumber: form.trackingNumber.trim(),
      }
      if (form.carrier) body.carrier = form.carrier
      if (form.commandeId) body.commandeId = form.commandeId
      if (form.venteIds.length > 0) body.venteIds = form.venteIds

      let r: Response
      if (editingParcel) {
        r = await fetch(`/api/parcels/${editingParcel.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        r = await fetch("/api/parcels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }

      const d = await r.json()
      if (d.success) {
        closeModal()
        await loadParcels()
      } else {
        alert(d.error || "Erreur lors de l'enregistrement")
      }
    } catch (_) {
      alert("Erreur de connexion")
    }
    setIsSaving(false)
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  // Compte total des ventes en retard dans les alertes
  const totalVentesEnRetard = alerts.reduce(
    (sum, p) => sum + (p.ventesEnRetard?.length ?? 0),
    0
  )

  return (
    <div className="flex flex-col gap-4 md:gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full min-h-full">
      {/* Ambient glow */}
      <div className="fixed top-0 right-0 w-[40%] h-[40%] bg-blue-500/5 blur-[150px] -z-10 rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Package className="text-blue-400 w-8 h-8" />
            Suivi Colis
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Suivi en temps reel de vos colis et expeditions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-colors">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 accent-emerald-500"
            />
            <span className="text-xs font-medium text-zinc-300">Auto-refresh 60s</span>
          </label>
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all duration-200",
              "bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", syncingAll && "animate-spin")} />
            Sync tout
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
          >
            <Plus className="w-4 h-4" />
            Ajouter un colis
          </button>
        </div>
      </div>

      {/* Alert banner (inline, pas le composant partagé) */}
      {alerts.length > 0 && (
        <div className="w-full bg-rose-500/10 border border-rose-500/25 rounded-2xl px-5 py-4 flex items-start gap-4 shadow-lg shadow-rose-950/20">
          <div className="p-2 bg-rose-500/15 border border-rose-500/25 rounded-xl shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-rose-300">
              {alerts.length} colis avec{" "}
              {totalVentesEnRetard > 0
                ? `${totalVentesEnRetard} vente${totalVentesEnRetard > 1 ? "s" : ""} en retard`
                : "alertes"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {alerts.map((p) => {
                const pseudos =
                  p.ventesEnRetard && p.ventesEnRetard.length > 0
                    ? p.ventesEnRetard.map((v) => `@${v.pseudoAcheteur}`).join(", ")
                    : null
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-rose-950/40 text-rose-300 border-rose-500/20"
                  >
                    <Package className="w-3 h-3" />
                    <span className="font-mono">{p.trackingNumber}</span>
                    {pseudos && (
                      <span className="text-rose-400/80 font-medium"> {pseudos}</span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl shadow-2xl backdrop-blur-md">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-center rounded-t-2xl">
          <span className="text-sm font-bold text-zinc-300">
            {parcels.length} colis
          </span>
        </div>

        <div className="hidden md:block overflow-x-auto w-full min-h-[280px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold text-zinc-500 tracking-wider uppercase border-b border-zinc-900">
                <th className="px-4 py-4 w-8"></th>
                <th className="px-4 py-4">Numero de suivi</th>
                <th className="px-4 py-4">Transporteur</th>
                <th className="px-4 py-4">Statut</th>
                <th className="px-4 py-4">Derniere maj</th>
                <th className="px-4 py-4">Commande</th>
                <th className="px-4 py-4">Ventes liees</th>
                <th className="px-4 py-4">Deadline Vinted</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
                    Chargement des colis...
                  </td>
                </tr>
              ) : parcels.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-zinc-500">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    Aucun colis enregistre.
                  </td>
                </tr>
              ) : (
                parcels.map((parcel) => {
                  const isExpanded = expandedId === parcel.id
                  const deadline = getEarliestDeadline(parcel.ventes)
                  const deadlinePast = isDeadlinePast(deadline)

                  return (
                    <React.Fragment key={parcel.id}>
                      <tr
                        className={cn(
                          "group transition-colors",
                          isExpanded ? "bg-zinc-900/60" : "hover:bg-zinc-900/30"
                        )}
                      >
                        {/* Expand toggle */}
                        <td className="px-4 py-4 w-8">
                          <button
                            onClick={() => toggleExpand(parcel.id)}
                            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Tracking number */}
                        <td className="px-4 py-4">
                          <button
                            onClick={() => toggleExpand(parcel.id)}
                            className="text-sm font-mono font-bold text-white hover:text-blue-400 transition-colors text-left"
                          >
                            {parcel.trackingNumber}
                          </button>
                        </td>

                        {/* Carrier */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-zinc-500" />
                            <span className="text-xs font-semibold text-zinc-300 capitalize">
                              {parcel.carrier ?? "—"}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <TrackingCell parcel={parcel} compact />
                        </td>

                        {/* Last update */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-zinc-600" />
                            <span className="text-xs text-zinc-400 font-medium">
                              {timeAgo(parcel.lastUpdate)}
                            </span>
                          </div>
                        </td>

                        {/* Commande */}
                        <td className="px-4 py-4">
                          {parcel.commande ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-bold text-zinc-200">
                                {parcel.commande.numero}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-medium">
                                {parcel.commande.fournisseur}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 font-medium">—</span>
                          )}
                        </td>

                        {/* Ventes liees (badges multiples) */}
                        <td className="px-4 py-4">
                          {parcel.ventes && parcel.ventes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {parcel.ventes.map((v) => (
                                <Link
                                  key={v.id}
                                  href="/ventes"
                                  className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                >
                                  @{v.pseudoAcheteur}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600 font-medium">Non lie</span>
                          )}
                        </td>

                        {/* Deadline la plus proche */}
                        <td className="px-4 py-4">
                          {deadline ? (
                            <div className="flex items-center gap-1.5">
                              {deadlinePast && (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              )}
                              <span
                                className={cn(
                                  "text-xs font-bold",
                                  deadlinePast ? "text-rose-400" : "text-zinc-300"
                                )}
                              >
                                {formatDate(deadline)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(parcel)}
                              title="Modifier ce colis"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSyncOne(parcel.id)}
                              disabled={syncingId === parcel.id}
                              title="Synchroniser ce colis"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all disabled:opacity-50"
                            >
                              <RefreshCw
                                className={cn(
                                  "w-3.5 h-3.5",
                                  syncingId === parcel.id && "animate-spin"
                                )}
                              />
                            </button>
                            <button
                              onClick={() => handleDelete(parcel.id)}
                              disabled={deletingId === parcel.id}
                              title="Supprimer ce colis"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all disabled:opacity-50"
                            >
                              {deletingId === parcel.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded event timeline */}
                      {isExpanded && (
                        <tr className="bg-zinc-900/40">
                          <td colSpan={9} className="px-8 py-5">
                            <div className="mb-3 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-blue-400" />
                              <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider">
                                Historique des evenements
                              </span>
                              {parcel.lastEventDescription && (
                                <span className="text-[10px] text-zinc-500 font-medium ml-2">
                                  — {parcel.lastEventDescription}
                                </span>
                              )}
                            </div>
                            <EventTimeline events={parcel.events} />
                            {parcel.estimatedDelivery && (
                              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-zinc-500">
                                <Clock className="w-3.5 h-3.5 text-blue-400" />
                                Livraison estimee :{" "}
                                <span className="font-bold text-blue-300">
                                  {formatDate(parcel.estimatedDelivery)}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Grille de cartes pour mobile */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {loading ? (
            <div className="py-16 text-center text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
              Chargement des colis...
            </div>
          ) : parcels.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
              Aucun colis enregistré.
            </div>
          ) : (
            parcels.map((parcel) => {
              const isExpanded = expandedId === parcel.id
              const deadline = getEarliestDeadline(parcel.ventes)
              const deadlinePast = isDeadlinePast(deadline)

              return (
                <div 
                  key={parcel.id}
                  className="p-4 rounded-2xl border border-zinc-850 bg-zinc-950/40 backdrop-blur-sm relative flex flex-col gap-4 shadow-md group"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(parcel.id)}
                      className="text-sm font-mono font-bold text-white hover:text-blue-400 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                      )}
                      {parcel.trackingNumber}
                    </button>
                    {parcel.carrier && (
                      <span className="text-[10px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded capitalize">
                        {parcel.carrier}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Statut</span>
                      <TrackingCell parcel={parcel} compact />
                    </div>
                    <div className="flex flex-col gap-1 border-l border-zinc-900 pl-3">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Dernière MàJ</span>
                      <span className="text-zinc-300 font-medium">{timeAgo(parcel.lastUpdate)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-zinc-900/60 pt-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Commande</span>
                      {parcel.commande ? (
                        <span className="text-zinc-300 font-bold">
                          {parcel.commande.numero} <span className="text-[10px] text-zinc-500 font-medium block">({parcel.commande.fournisseur})</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">—</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 border-l border-zinc-900 pl-3">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Deadline Vinted</span>
                      {deadline ? (
                        <span className={cn("font-bold flex items-center gap-1", deadlinePast ? "text-rose-400 animate-pulse" : "text-zinc-300")}>
                          {deadlinePast && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                          {formatDate(deadline)}
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </div>
                  </div>

                  {parcel.ventes && parcel.ventes.length > 0 && (
                    <div className="border-t border-zinc-900/60 pt-3 flex flex-col gap-1">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Ventes liées</span>
                      <div className="flex flex-wrap gap-1">
                        {parcel.ventes.map((v) => (
                          <Link
                            key={v.id}
                            href="/ventes"
                            className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                          >
                            @{v.pseudoAcheteur}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expanded event timeline inside card */}
                  {isExpanded && (
                    <div className="border-t border-zinc-900/60 pt-4 bg-zinc-900/10 -mx-4 px-4 pb-1">
                      <div className="mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider">
                          Historique des événements
                        </span>
                      </div>
                      <EventTimeline events={parcel.events} />
                      {parcel.estimatedDelivery && (
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-zinc-500">
                          <Clock className="w-3.5 h-3.5 text-blue-400" />
                          Livraison estimée :{" "}
                          <span className="font-bold text-blue-300">
                            {formatDate(parcel.estimatedDelivery)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="border-t border-zinc-900 pt-3 flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(parcel)}
                      className="p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/20 transition-all cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSyncOne(parcel.id)}
                      disabled={syncingId === parcel.id}
                      className="p-2 rounded-xl text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={cn("w-4 h-4", syncingId === parcel.id && "animate-spin")} />
                    </button>
                    <button
                      onClick={() => handleDelete(parcel.id)}
                      disabled={deletingId === parcel.id}
                      className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {deletingId === parcel.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* --- MODAL: Ajouter / Modifier un colis --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
            {/* Top gradient bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-400" />

            <button
              onClick={closeModal}
              className="absolute right-4 top-5 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {editingParcel ? "Modifier le colis" : "Ajouter un colis"}
                </h3>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mt-0.5">
                  Suivi de livraison
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tracking number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                  Numero de suivi <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 6A12345678901"
                  value={form.trackingNumber}
                  onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-mono text-white outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Carrier */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                  Transporteur
                </label>
                <select
                  value={form.carrier}
                  onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 cursor-pointer appearance-none"
                >
                  <option value="">Auto-detection</option>
                  <option value="colissimo">Colissimo</option>
                  <option value="chinapost">China Post</option>
                  <option value="4px">4PX</option>
                  <option value="yanwen">Yanwen</option>
                  <option value="cainiao">Cainiao</option>
                  <option value="yunexpress">YunExpress</option>
                </select>
              </div>

              {/* Commande (optionnel) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                  Commande fournisseur (optionnel)
                </label>
                {loadingOptions ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                    <span className="text-xs text-zinc-500">Chargement...</span>
                  </div>
                ) : (
                  <select
                    value={form.commandeId}
                    onChange={(e) => setForm({ ...form, commandeId: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 cursor-pointer appearance-none"
                  >
                    <option value="">Aucune commande liee</option>
                    {commandesOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numero} — {c.fournisseur}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Ventes liees (multi-select) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                  Ventes a lier (optionnel)
                </label>
                {loadingOptions ? (
                  <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                    <span className="text-xs text-zinc-500">Chargement...</span>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                    <VentesMultiSelect
                      ventes={ventesOptions}
                      selectedIds={form.venteIds}
                      onChange={(ids) => setForm({ ...form, venteIds: ids })}
                    />
                  </div>
                )}
                {form.venteIds.length > 0 && (
                  <p className="text-[10px] text-blue-400 font-medium">
                    {form.venteIds.length} vente{form.venteIds.length > 1 ? "s" : ""} selectionnee{form.venteIds.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              <div className="pt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-bold hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-extrabold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingParcel ? (
                    <>
                      <Pencil className="w-4 h-4" />
                      Enregistrer
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
