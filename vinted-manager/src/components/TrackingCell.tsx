"use client"

import React from "react"
import { Package, Truck, Clock, CheckCircle2, AlertTriangle, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

type ParcelStatus =
  | "EN_ATTENTE"
  | "PRIS_EN_CHARGE"
  | "EN_TRANSIT"
  | "EN_LIVRAISON"
  | "LIVRE"
  | "RETOUR"
  | "INCIDENT"
  | "INCONNU"

type Parcel = {
  id: string
  trackingNumber: string
  carrier: string | null
  status: ParcelStatus
  statusRaw: string | null
  lastUpdate: string | null
  estimatedDelivery: string | null
  lastEventDescription: string | null
  daysSinceOrder: number | null
  daysInTransit: number | null
  commandeId: string | null
  commande: {
    id: string
    numero: string
    fournisseur: string
    dateCommande: string
  } | null
  ventes: Array<{
    id: string
    pseudoAcheteur: string
    prixVente: string | number
    dateLimiteExpedition: string | null
    statut: string
  }>
  events: Array<{
    id: string
    date: string
    location: string | null
    description: string
    status: string
    stage: string | null
  }>
  createdAt: string
  updatedAt: string
}

type TrackingCellProps = {
  parcel: Parcel | null
  compact?: boolean
}

const STATUS_CONFIG: Record<
  ParcelStatus,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  EN_ATTENTE: {
    label: "En attente",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Clock,
  },
  PRIS_EN_CHARGE: {
    label: "Pris en charge",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Package,
  },
  EN_TRANSIT: {
    label: "En transit",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Truck,
  },
  EN_LIVRAISON: {
    label: "En livraison",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: MapPin,
  },
  LIVRE: {
    label: "Livre",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  RETOUR: {
    label: "Retour",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    icon: AlertTriangle,
  },
  INCIDENT: {
    label: "Incident",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    icon: AlertTriangle,
  },
  INCONNU: {
    label: "Inconnu",
    badgeClass: "bg-zinc-700/50 text-zinc-400 border-zinc-700",
    icon: Package,
  },
}

export default function TrackingCell({ parcel, compact = false }: TrackingCellProps) {
  if (!parcel) {
    return (
      <span className="text-xs text-zinc-600 font-medium">Aucun colis</span>
    )
  }

  const config = STATUS_CONFIG[parcel.status] ?? STATUS_CONFIG.INCONNU
  const Icon = config.icon

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-wide",
          config.badgeClass
        )}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide w-fit",
          config.badgeClass
        )}
      >
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
      {parcel.lastEventDescription && (
        <p className="text-[10px] text-zinc-500 truncate max-w-[180px]" title={parcel.lastEventDescription}>
          {parcel.lastEventDescription}
        </p>
      )}
    </div>
  )
}

export type { Parcel, ParcelStatus }
