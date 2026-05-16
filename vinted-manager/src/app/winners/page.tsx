"use client"

import React, { useState, useEffect, useMemo } from "react"
import { 
  Flame, 
  Eye, 
  Heart, 
  ShoppingCart, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2,
  ExternalLink,
  TrendingUp,
  Clock,
  ShoppingBag,
  ArrowUpDown,
  PackageX
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function WinnersPage() {
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<'ALL' | 'WINNERS' | 'OUT_OF_STOCK_WINNERS'>('ALL')
  const [sortKey, setSortKey] = useState<'views-desc' | 'likes-desc' | 'date-desc'>('views-desc')

  // 📡 Charger les métriques
  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/extension/sync/metrics')
      const result = await res.json()
      if (result.success) {
        setMetrics(result.data)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  // 🧮 Statistiques globales
  const kpis = useMemo(() => {
    const totalWinners = metrics.filter(m => m.isWinner).length
    const winnersOutOfStock = metrics.filter(m => m.isWinner && m.physicalStockCount === 0 && m.status?.toLowerCase() !== 'vendu').length
    const totalViews = metrics.reduce((sum, m) => sum + (m.viewCount || 0), 0)
    
    return {
      totalWinners,
      winnersOutOfStock,
      totalViews
    }
  }, [metrics])

  // 🧹 Filtrage et Tri combinés
  const processedMetrics = useMemo(() => {
    let result = [...metrics]

    // 1. Filtres
    if (filterMode === 'WINNERS') {
      result = result.filter(m => m.isWinner)
    } else if (filterMode === 'OUT_OF_STOCK_WINNERS') {
      result = result.filter(m => m.isWinner && m.physicalStockCount === 0 && m.status?.toLowerCase() !== 'vendu')
    }

    // 2. Tris
    result.sort((a, b) => {
      if (sortKey === 'views-desc') return (b.viewCount || 0) - (a.viewCount || 0)
      if (sortKey === 'likes-desc') return (b.favouriteCount || 0) - (a.favouriteCount || 0)
      if (sortKey === 'date-desc') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      return 0
    })

    return result
  }, [metrics, filterMode, sortKey])

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full min-h-full relative">
      
      {/* Glows Ambient Backgrounds - Orange pour le feu des Winners */}
      <div className="fixed top-0 right-0 w-[45%] h-[45%] bg-orange-500/5 blur-[130px] pointer-events-none rounded-full -z-10" />
      <div className="fixed bottom-0 left-[10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] pointer-events-none rounded-full -z-10" />

      {/* --- HEADER --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Flame className="text-orange-500 w-8 h-8 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)] animate-pulse" />
            Radar à Winners 🔥
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm">
            Détection prédictive des produits tendances et surveillance du stock physique en temps réel.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
          {/* Select de Tri */}
          <div className="relative w-full sm:w-48">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-300 rounded-full pl-4 pr-8 py-2.5 text-xs font-extrabold focus:border-orange-500/30 transition-all outline-none backdrop-blur-md cursor-pointer appearance-none"
            >
              <option value="views-desc">👀 Plus Vus</option>
              <option value="likes-desc">❤️ Plus Likés</option>
              <option value="date-desc">📅 Sync Récents</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
              <ArrowUpDown className="w-3 h-3" />
            </div>
          </div>
          
          <button 
            onClick={fetchMetrics}
            className="w-full sm:w-auto bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold text-xs px-5 py-2.5 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Rafraîchir
          </button>
        </div>
      </header>

      {/* --- KPI BAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Winners Card */}
        <div className="p-6 bg-zinc-950/60 border border-zinc-800/60 rounded-2xl backdrop-blur-sm relative overflow-hidden shadow-lg group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-400" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">🏆 Winners Identifiés</p>
              <p className="text-3xl font-black text-white mt-2 group-hover:scale-105 transition-transform origin-left duration-300">{kpis.totalWinners}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-4">Fenêtre glissante des 24 premières heures</div>
        </div>

        {/* Alert Stock Card */}
        <div className={cn(
          "p-6 bg-zinc-950/60 border border-zinc-800/60 rounded-2xl backdrop-blur-sm relative overflow-hidden shadow-lg group transition-all",
          kpis.winnersOutOfStock > 0 ? "shadow-red-950/10 border-red-500/20" : ""
        )}>
          <div className={cn(
            "absolute top-0 left-0 w-full h-1 bg-gradient-to-r",
            kpis.winnersOutOfStock > 0 ? "from-red-500 to-rose-400 animate-pulse" : "from-emerald-500 to-teal-400"
          )} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">🚨 En Rupture (Winners)</p>
              <p className={cn(
                "text-3xl font-black mt-2 transition-all",
                kpis.winnersOutOfStock > 0 ? "text-red-500 font-black animate-pulse scale-105" : "text-emerald-500"
              )}>
                {kpis.winnersOutOfStock}
              </p>
            </div>
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center border",
              kpis.winnersOutOfStock > 0 
                ? "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}>
              {kpis.winnersOutOfStock > 0 ? <PackageX className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-4">Produits winners actifs sans pièces en stock</div>
        </div>

        {/* Total Activity Card */}
        <div className="p-6 bg-zinc-950/60 border border-zinc-800/60 rounded-2xl backdrop-blur-sm relative overflow-hidden shadow-lg group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase">👀 Volume Vues Total</p>
              <p className="text-3xl font-black text-white mt-2">{kpis.totalViews.toLocaleString('fr-FR')}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Eye className="w-6 h-6" />
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-4">Totalisation de la visibilité capturée</div>
        </div>
      </div>

      {/* --- FILTER TABS --- */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-1">
        <button 
          onClick={() => setFilterMode('ALL')}
          className={cn(
            "px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            filterMode === 'ALL' 
              ? "border-zinc-100 text-white" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          Toutes les Annonces ({metrics.length})
        </button>
        
        <button 
          onClick={() => setFilterMode('WINNERS')}
          className={cn(
            "px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            filterMode === 'WINNERS' 
              ? "border-orange-500 text-orange-400" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Flame className="w-3.5 h-3.5" /> Seuls les Winners ({kpis.totalWinners})
        </button>

        <button 
          onClick={() => setFilterMode('OUT_OF_STOCK_WINNERS')}
          className={cn(
            "px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            filterMode === 'OUT_OF_STOCK_WINNERS' 
              ? "border-red-500 text-red-400" 
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          )}
        >
          <PackageX className="w-3.5 h-3.5" /> Ruptures Critiques ({kpis.winnersOutOfStock})
        </button>
      </div>

      {/* --- MAIN TABLE --- */}
      <div className="bg-zinc-950/80 border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/60 backdrop-blur-md overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/40 text-zinc-500 text-[11px] font-black tracking-wider uppercase border-b border-zinc-800">
                <th className="px-6 py-5 w-24">Visuel</th>
                <th className="px-6 py-5">Détails Annonce</th>
                <th className="px-6 py-5">Engagement</th>
                <th className="px-6 py-5">Statut Winner</th>
                <th className="px-6 py-5">Stock Physique</th>
                <th className="px-6 py-5 text-right">Sourcing</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-zinc-900/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" /> Chargement des tendances...
                  </td>
                </tr>
              ) : processedMetrics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-zinc-500 text-xs">
                    Aucun produit détecté dans cette catégorie.
                  </td>
                </tr>
              ) : (
                processedMetrics.map((item: any) => {
                  const isSold = item.status?.toLowerCase().includes('vendu') || item.status?.toLowerCase().includes('sold')
                  const isWinner = item.isWinner
                  const isOutOfStockWinner = isWinner && item.physicalStockCount === 0 && !isSold

                  return (
                    <tr key={item.id} className={cn(
                      "hover:bg-zinc-900/20 transition-colors group relative",
                      isOutOfStockWinner ? "bg-red-950/5" : ""
                    )}>
                      {/* THUMBNAIL */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-14 h-20 rounded-lg bg-zinc-800 border border-zinc-700/60 overflow-hidden flex items-center justify-center relative shadow-sm bg-gradient-to-br from-zinc-750 to-zinc-900">
                          {item.photoUrl ? (
                            <img src={item.photoUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-zinc-600" />
                          )}
                          
                          {isWinner && (
                            <div className="absolute top-1 left-1 w-4 h-4 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.6)]">
                              <Flame className="w-2.5 h-2.5 fill-current" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* ITEM NAME & ACCOUNT */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="font-bold text-white text-[13px] tracking-tight group-hover:text-zinc-200 transition-colors flex items-center gap-1.5">
                            {item.title}
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-zinc-400 cursor-pointer">
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-zinc-850 border border-zinc-800 text-zinc-400">
                              {item.botAccount.name}
                            </span>
                            <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              Sync {new Date(item.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* ENGAGEMENT */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-850 w-16 flex-shrink-0">
                              <Eye className="w-3 h-3 text-blue-400" />
                              <span className="font-mono text-[11px] font-bold text-zinc-300">{item.viewCount}</span>
                            </div>
                            {item.viewCount > 150 && (
                              <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">🔥 Explosif</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded border border-zinc-850 w-16 flex-shrink-0">
                              <Heart className="w-3 h-3 text-rose-400" />
                              <span className="font-mono text-[11px] font-bold text-zinc-300">{item.favouriteCount}</span>
                            </div>
                            {item.favouriteCount >= 20 && (
                              <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest">💖 Désiré</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* WINNER STATUS */}
                      <td className="px-6 py-4">
                        {isWinner ? (
                          <div className="flex flex-col items-start gap-1">
                            {item.winnerReason === "STATISTIQUES" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[10px] font-extrabold tracking-wide shadow-[0_0_8px_rgba(245,158,11,0.1)]">
                                🏆 Winner Stats
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/25 text-[10px] font-extrabold tracking-wide shadow-[0_0_8px_rgba(217,70,239,0.1)]">
                                ⚡ Vente Flash
                              </span>
                            )}
                            <span className="text-[9px] text-zinc-600 italic font-medium">Fenêtre 24h validée</span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600 font-medium">Standard</span>
                        )}
                      </td>

                      {/* STOCK STATUS */}
                      <td className="px-6 py-4">
                        {isSold ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-850 text-zinc-500 border border-zinc-800 text-[10px] font-bold uppercase">
                            Produit Vendu
                          </span>
                        ) : item.physicalStockCount > 0 ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-extrabold shadow-sm">
                              <CheckCircle2 className="w-3 h-3" /> {item.physicalStockCount} Dispo
                            </span>
                            <span className="text-[9px] text-emerald-500/70 mt-0.5 pl-1 font-medium">Sécurisé</span>
                          </div>
                        ) : isWinner ? (
                          <div className="flex flex-col items-start">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/15 text-red-400 border border-red-500/25 text-xs font-black uppercase shadow-[0_0_12px_rgba(239,68,68,0.15)] animate-pulse">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Rupture !
                            </span>
                            <span className="text-[9px] text-red-400/70 font-bold mt-1 leading-tight">
                              ⚠️ Urgence Réassort
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500 italic font-medium">Zéro stock</span>
                        )}
                      </td>

                      {/* SOURCING ACTION */}
                      <td className="px-6 py-4 text-right">
                        {item.sourcingUrl ? (
                          <a 
                            href={item.sourcingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={cn(
                              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md hover:-translate-y-0.5 cursor-pointer",
                              isOutOfStockWinner 
                                ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-950/40 scale-105 ring-2 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-bounce"
                                : "bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white hover:border-zinc-700"
                            )}
                            style={isOutOfStockWinner ? { animationDuration: '2s' } : {}}
                          >
                            <ShoppingCart className="w-3.5 h-3.5 flex-shrink-0" />
                            {isOutOfStockWinner ? "Commander D'Urgence" : "Commander"}
                          </a>
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic font-medium">Lien Sourcing non lié</span>
                        )}
                      </td>

                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
