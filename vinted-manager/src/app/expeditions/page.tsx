"use client"

import React, { useState, useEffect } from "react"
import { 
  Truck, 
  Package2, 
  CheckCircle, 
  Loader2,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function ExpeditionsPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPending = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/expeditions')
      const r = await res.json()
      if (r.success) {
        setSales(r.data)
      }
    } catch (e) {
      console.error("Failed to load sales", e)
    }
    setLoading(false)
  }

  useEffect(() => { loadPending() }, [])

  return (
    <div className="flex flex-col gap-4 md:gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full min-h-full">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Truck className="text-blue-500 w-8 h-8" />
            Supervision Logistique
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Suivi automatisé des expéditions et des envois Sourcing.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-inner">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
            <span className="text-sm font-bold text-zinc-200">{sales.length} expéditions en cours</span>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-50 text-white">
           <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
           <p>Récupération de l'état logistique...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-zinc-950/50 border border-dashed border-zinc-800 rounded-3xl flex-1 flex flex-col items-center justify-center py-24 text-center">
           <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
             <CheckCircle className="w-12 h-12" />
           </div>
           <h3 className="text-xl font-bold text-white">Logistique à jour !</h3>
           <p className="text-zinc-500 mt-2 text-sm max-w-xs">Aucune expédition en cours de traitement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {sales.map((sale: any) => {
            const isWaitingBordereau = sale.statut === 'EN_ATTENTE'
            const hasParcel = !!sale.parcel
            const isDelivered = sale.parcel?.status === 'LIVRÉ' || sale.parcel?.status === 'LIVRE'

            return (
              <div key={sale.id} className={cn(
                "bg-zinc-950 border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 relative group flex flex-col",
                isDelivered ? "border-emerald-900/40 shadow-[0_0_20px_rgba(16,185,129,0.05)]" :
                (!hasParcel && !isWaitingBordereau) ? "border-amber-900/40" : "border-zinc-800/80 hover:border-zinc-700"
              )}>
                
                {/* VUE SUCCÈS : LIVRÉ & DISPATCHÉ */}
                {isDelivered ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px] animate-in fade-in zoom-in-95 duration-300 bg-gradient-to-b from-emerald-500/5 to-transparent">
                    <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      <CheckCircle className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Livré chez Noah !</h3>
                    <p className="text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
                      Le colis Sourcing est arrivé. Le bordereau Vinted pour <strong>{sale.pseudoAcheteur}</strong> a été envoyé automatiquement sur WhatsApp.
                    </p>
                    <button 
                      onClick={() => setSales(prev => prev.filter((s: any) => s.id !== sale.id))}
                      className="mt-6 text-xs font-medium text-zinc-500 hover:text-zinc-300 py-2 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      Masquer <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  /* VUE SUIVI LOGISTIQUE */
                  <div className="p-6 flex flex-col flex-1">
                    
                    {/* En-tête Produit */}
                    <div className="flex gap-4 items-start">
                      <div className="w-16 h-20 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {sale.photoUrl ? (
                          <img 
                            src={sale.photoUrl} 
                            alt={sale.article?.nom || "Produit"} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package2 className="w-6 h-6 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white truncate">Commande {sale.pseudoAcheteur}</h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                           {sale.botAccount && (
                             <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                               {sale.botAccount.name}
                             </span>
                           )}
                           <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{sale.article?.commande?.fournisseur || 'Sourcing'}</span>
                           <span>•</span>
                           <span>Vendu le {new Date(sale.dateVente).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-zinc-900 my-5 w-full"></div>

                    {/* État de l'automatisation */}
                    <div className="space-y-6">
                      
                      {/* Étape 1 : Bordereau Vinted */}
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 flex-shrink-0 rounded-full p-1", !isWaitingBordereau ? "bg-emerald-500/20 text-emerald-500" : "bg-zinc-800 text-zinc-500")}>
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className={cn("text-sm font-bold", !isWaitingBordereau ? "text-white" : "text-zinc-400")}>Extraction du Bordereau</h4>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {!isWaitingBordereau ? "Bordereau Vinted obtenu et sauvegardé sur Supabase." : "En attente de la validation de l'acheteur pour extraire le bordereau."}
                          </p>
                        </div>
                      </div>

                      {/* Étape 2 : Suivi Sourcing */}
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 flex-shrink-0 rounded-full p-1", hasParcel ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500")}>
                          {hasParcel ? <Truck className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
                        </div>
                        <div className="flex-1">
                          <h4 className={cn("text-sm font-bold", hasParcel ? "text-white" : "text-zinc-400")}>Acheminement Sourcing</h4>
                          {hasParcel ? (
                            <div className="mt-2 bg-zinc-900/50 rounded-lg border border-zinc-800 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase text-zinc-500">N° {sale.parcel.trackingNumber}</span>
                                <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">{sale.parcel.carrier || '17TRACK'}</span>
                              </div>
                              <p className="text-sm font-medium text-zinc-300">
                                {sale.parcel.status || "En cours d'acheminement"}
                              </p>
                              {sale.parcel.lastEvent && (
                                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                                  Dernier événement : {sale.parcel.lastEvent}
                                </p>
                              )}
                              {sale.parcel.estimatedDelivery && (
                                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                                  <span>ETA :</span> {new Date(sale.parcel.estimatedDelivery).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              En attente du scraper Shein (8h00) pour lier le numéro de colis.
                            </p>
                          )}
                        </div>
                      </div>

                    </div>
                    
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
