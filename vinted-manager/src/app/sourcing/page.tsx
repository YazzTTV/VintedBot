"use client"

import { useState, useEffect } from "react"
import { 
  Search, 
  ExternalLink, 
  ShoppingBag, 
  User, 
  Calendar, 
  Hash,
  Filter,
  Sparkles,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function SourcingPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState("")
  const [accountFilter, setAccountFilter] = useState("")
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([])
  
  // États de pagination
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // Charger les données
  const fetchSourcing = async (pageNumber: number, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    
    try {
      const params = new URLSearchParams()
      if (search) params.append("q", search)
      if (accountFilter) params.append("account", accountFilter)
      params.append("page", pageNumber.toString())
      params.append("pageSize", "60")

      const res = await fetch(`/api/sourcing?${params.toString()}`)
      const data = await res.json()
      
      if (data.success) {
        if (append) {
          setItems(prev => [...prev, ...data.data])
        } else {
          setItems(data.data)
        }
        
        setTotalCount(data.totalCount || 0)
        setHasMore(data.hasMore || false)
        setPage(pageNumber)
        
        // Enregistrer dynamiquement la liste de TOUS les comptes retournés par l'API
        if (data.accounts && availableAccounts.length === 0) {
          setAvailableAccounts(data.accounts)
        }
      }
    } catch (error) {
      console.error("Failed to load sourcing:", error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Déclencheur de la recherche initiale (Reset pagination quand les filtres changent)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchSourcing(1, false)
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [search, accountFilter])

  // Fonction pour charger la page suivante
  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchSourcing(page + 1, true)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col min-h-screen gap-8">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-900 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] font-black tracking-wider text-emerald-400 uppercase animate-pulse flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> Catalogue Supabase Cloud
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Sourcing Global
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Visualisez et explorez l'intégralité des articles trouvés par vos bots Vinted.
          </p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-sm shadow-black/20 backdrop-blur-md self-start md:self-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Produits Synchronisés</span>
            <span className="text-lg font-black text-white tracking-tight">{loading && items.length === 0 ? "..." : totalCount} articles</span>
          </div>
        </div>
      </header>

      {/* Command Bar / Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-zinc-950/60 border border-zinc-800/60 p-4 rounded-2xl shadow-lg backdrop-blur-md">
        
        {/* Search Input */}
        <div className="flex-1 relative group">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Rechercher par mot-clé, type d'article, robe, pantalon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-800/80 text-white text-sm rounded-xl placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all"
          />
        </div>

        {/* Filter by Account */}
        <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-3 py-1.5 md:w-64 relative">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full bg-transparent border-none text-zinc-300 text-sm py-1.5 outline-none cursor-pointer font-medium appearance-none pr-6"
          >
            <option value="" className="bg-zinc-950 text-white">👥 Tous les comptes bots</option>
            {availableAccounts.map(acc => (
              <option key={acc} value={acc} className="bg-zinc-950 text-white">🤖 Compte : {acc}</option>
            ))}
          </select>
          <div className="absolute right-3 pointer-events-none text-zinc-600">▼</div>
        </div>
      </div>

      {/* Results Grid */}
      {loading && items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-sm font-bold text-zinc-400">Récupération du catalogue en direct...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-3xl py-24 px-6 text-center">
          <ShoppingBag className="w-16 h-16 text-zinc-700 mb-4 stroke-[1]" />
          <h3 className="text-lg font-black text-zinc-300">Aucun produit trouvé</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-xs mx-auto">
            {search || accountFilter 
              ? "Modifiez vos filtres de recherche pour explorer d'autres articles." 
              : "Vos robots n'ont pas encore synchronisé d'articles. Lancez le bot pour commencer !"}
          </p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const isShein = item.url?.toLowerCase().includes("shein")
            
            return (
              <div 
                key={item.id} 
                className="bg-zinc-950 border border-zinc-800/50 hover:border-zinc-700/80 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all group hover:-translate-y-1 duration-300 relative overflow-hidden"
              >
                {/* Subtle background glow on hover */}
                <div className="absolute -right-12 -bottom-12 w-24 h-24 bg-emerald-500/5 group-hover:bg-emerald-500/10 blur-2xl rounded-full transition-all duration-500 pointer-events-none" />
                <div>
                  {/* Top line labels */}
                  <div className="flex gap-4 mb-4">
                    <div className="w-16 h-20 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-emerald-500/40 transition-colors shadow-inner">
                       {item.photoUrl ? (
                         <img src={item.photoUrl} alt={item.title} className="w-full h-full object-cover" />
                       ) : (
                         <ShoppingBag className="w-6 h-6 text-zinc-700" />
                       )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex items-center gap-1",
                          isShein 
                            ? "bg-zinc-900 text-zinc-300 border border-zinc-800" 
                            : "bg-blue-950/30 text-blue-400 border border-blue-900/30"
                        )}>
                          {isShein ? "🛍️ SHEIN" : "📦 TEMU"}
                        </span>

                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" /> {item.account}
                        </span>
                      </div>
                      
                      <h3 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Metadata rows */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 truncate">
                      <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate bg-zinc-900/30 px-1 rounded">{item.fiche}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Synchro : {new Date(item.updatedAt || item.createdAt).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}</span>
                    </div>
                  </div>
                </div>

                {/* Action Link */}
                <div className="pt-3 border-t border-zinc-900 flex items-center justify-between gap-2 mt-auto">
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-zinc-900 hover:bg-emerald-950/40 hover:text-emerald-400 hover:border-emerald-500/30 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group/link"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 transition-transform group-hover/link:scale-110" />
                    Voir le produit original
                    <ExternalLink className="w-3 h-3 opacity-50 group-hover/link:opacity-100" />
                  </a>
                </div>
              </div>
            )
          })}
          </div>

          {/* Bouton de chargement supplémentaire */}
          {hasMore && (
            <div className="flex justify-center pt-8 pb-12">
              <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3.5 bg-zinc-900/60 hover:bg-emerald-950/20 hover:border-emerald-500/40 border border-zinc-800/80 rounded-xl text-zinc-300 hover:text-emerald-400 text-sm font-black tracking-tight transition-all flex items-center gap-3 shadow-md disabled:opacity-50 backdrop-blur-md group cursor-pointer"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    Chargement en cours...
                  </>
                ) : (
                  <>
                    <span>Charger plus de produits</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors font-mono">
                      {items.length} / {totalCount}
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

    </div>
  )
}
