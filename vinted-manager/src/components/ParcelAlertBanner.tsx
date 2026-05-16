"use client"

/**
 * ParcelAlertBanner
 *
 * Fetch /api/parcels/alerts au montage et affiche un bandeau rouge si des colis
 * ont des ventes en retard. Chaque alerte-parcel peut contenir plusieurs ventes en retard.
 *
 * Usage : <ParcelAlertBanner /> dans src/app/page.tsx
 */

import React from "react"
import Link from "next/link"
import { AlertTriangle, Package, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Parcel } from "./TrackingCell"

type AlertParcel = Parcel & {
  alertType: "OVERDUE" | "ESTIMATED_LATE"
  isOverdue: boolean
  isEstimatedLate: boolean
  ventesEnRetard: Array<{
    id: string
    pseudoAcheteur: string
    prixVente: string | number
    dateLimiteExpedition: string | null
    statut: string
  }>
}

export default function ParcelAlertBanner() {
  const [alerts, setAlerts] = React.useState<AlertParcel[]>([])
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/parcels/alerts")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAlerts(d.data)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded || alerts.length === 0) return null

  // Compte total des ventes en retard (toutes alertes confondues)
  const totalVentesEnRetard = alerts.reduce(
    (sum, p) => sum + (p.ventesEnRetard?.length ?? 0),
    0
  )

  return (
    <div className="w-full bg-rose-500/10 border border-rose-500/25 rounded-2xl px-5 py-4 flex items-start gap-4 shadow-lg shadow-rose-950/20 backdrop-blur-sm">
      {/* Icon */}
      <div className="p-2 bg-rose-500/15 border border-rose-500/25 rounded-xl shrink-0 mt-0.5">
        <AlertTriangle className="w-5 h-5 text-rose-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-rose-300">
          {alerts.length} colis avec{" "}
          {totalVentesEnRetard > 0
            ? `${totalVentesEnRetard} vente${totalVentesEnRetard > 1 ? "s" : ""} en retard`
            : "alertes de livraison"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {alerts.slice(0, 5).map((p) => {
            const pseudos =
              p.ventesEnRetard && p.ventesEnRetard.length > 0
                ? p.ventesEnRetard.map((v) => `@${v.pseudoAcheteur}`).join(", ")
                : null
            return (
              <span
                key={p.id}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border",
                  "bg-rose-950/40 text-rose-300 border-rose-500/20"
                )}
              >
                <Package className="w-3 h-3 shrink-0" />
                <span className="font-mono">{p.trackingNumber}</span>
                {pseudos && (
                  <span className="text-rose-400/80 font-medium">
                    {" "}
                    {pseudos}
                  </span>
                )}
              </span>
            )
          })}
          {alerts.length > 5 && (
            <span className="text-[10px] text-rose-400 font-bold self-center">
              +{alerts.length - 5} autres
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <Link
        href="/parcels"
        className="shrink-0 flex items-center gap-1.5 text-xs font-extrabold text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-400/40 px-3 py-2 rounded-xl transition-all duration-200 bg-rose-500/10 hover:bg-rose-500/20"
      >
        Voir tous
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
