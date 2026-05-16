"use client"

/**
 * ParcelsNavLink
 *
 * Composant de navigation à intégrer manuellement dans DashboardLayout.tsx.
 *
 * --- COMMENT INTEGRER ---
 * 1. Ouvrir src/components/DashboardLayout.tsx
 * 2. Dans le tableau `navigation`, ajouter l'entree suivante apres 'Ventes' (ou a l'endroit desire) :
 *
 *    { name: 'Colis', href: '/parcels', icon: Package }
 *
 *    (Package est deja importe en haut de DashboardLayout.tsx)
 *
 * C'est tout — DashboardLayout gere automatiquement le style actif/inactif via pathname.
 * ---
 *
 * Ce fichier exporte aussi un composant standalone si besoin de placer le lien ailleurs.
 */

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ParcelsNavLink() {
  const pathname = usePathname()
  const isActive = pathname === "/parcels"

  return (
    <Link
      href="/parcels"
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out relative overflow-hidden group",
        isActive
          ? "bg-zinc-900 text-emerald-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full shadow-[0_0_10px_#10b981]" />
      )}
      <Package
        className={cn(
          "w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110",
          isActive
            ? "text-emerald-500"
            : "text-zinc-500 group-hover:text-zinc-300"
        )}
      />
      Colis
    </Link>
  )
}
