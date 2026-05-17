"use client"

import React, { useState, useEffect } from "react"
import { 
  Package, 
  Search, 
  Tag, 
  MoreVertical, 
  ExternalLink, 
  ArrowRight,
  X,
  Loader2,
  TrendingUp,
  CheckCircle2,
  Pencil,
  Trash2,
  ArrowUpDown,
  AlertTriangle
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function StockPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Modal state for marking as sold
  const [selectedArticle, setSelectedArticle] = useState<any>(null)
  const [isSelling, setIsSelling] = useState(false)
  
  const [saleForm, setSaleForm] = useState({
    pseudoAcheteur: '',
    prixVente: '',
    lienVente: ''
  })

  // NOUVEAU : Popover contextuel local tracker (⋮)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

  // NOUVEAU : États d'édition d'un article physique
  const [articleToEdit, setArticleToEdit] = useState<any | null>(null)
  const [isUpdatingArticle, setIsUpdatingArticle] = useState(false)
  const [editArticleForm, setEditArticleForm] = useState({
    nom: '',
    prixAchatUnitaire: '',
    fraisPortUnitaires: '',
    lienProduit: ''
  })

  // NOUVEAU : État de suppression d'un article
  const [articleToDelete, setArticleToDelete] = useState<any | null>(null)

  // NOUVEAU : Système de Tri dynamique (Tri identique au Livre des Ventes)
  const [sortKey, setSortKey] = useState<'date-desc' | 'date-asc' | 'cost-desc' | 'cost-asc' | 'name-asc'>('date-desc')

  const loadStock = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/articles')
      const data = await res.json()
      if (data.success) setArticles(data.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { loadStock() }, [])

  const filteredArticles = React.useMemo(() => {
    const result = [...articles].filter((art: any) => 
      art.commande.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      art.commande.fournisseur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (art.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (art.aliases || []).some((alias: string) => alias.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    result.sort((a: any, b: any) => {
      if (sortKey === 'date-desc') return new Date(b.dateAjoutStock).getTime() - new Date(a.dateAjoutStock).getTime()
      if (sortKey === 'date-asc') return new Date(a.dateAjoutStock).getTime() - new Date(b.dateAjoutStock).getTime()
      
      const costA = Number(a.prixAchatUnitaire) + Number(a.fraisPortUnitaires)
      const costB = Number(b.prixAchatUnitaire) + Number(b.fraisPortUnitaires)
      if (sortKey === 'cost-desc') return costB - costA
      if (sortKey === 'cost-asc') return costA - costB
      
      if (sortKey === 'name-asc') return (a.nom || '').localeCompare(b.nom || '')
      return 0
    })

    return result
  }, [articles, searchTerm, sortKey])

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSelling(true)
    try {
      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          articleId: selectedArticle.id,
          ...saleForm
        })
      })
      const ret = await res.json()
      if (ret.success) {
        setSelectedArticle(null)
        setSaleForm({ pseudoAcheteur: '', prixVente: '', lienVente: '' })
        loadStock() // Refresh automatically
      } else {
        alert(ret.error || "Erreur")
      }
    } catch(e) {
      alert("Erreur de réseau")
    }
    setIsSelling(false)
  }

  const handleOpenEditArticle = (art: any) => {
    setOpenPopoverId(null)
    setArticleToEdit(art)
    setEditArticleForm({
      nom: art.nom || '',
      prixAchatUnitaire: art.prixAchatUnitaire ? Number(art.prixAchatUnitaire).toString() : '',
      fraisPortUnitaires: art.fraisPortUnitaires ? Number(art.fraisPortUnitaires).toString() : '',
      lienProduit: art.lienProduit || ''
    })
  }

  const handleEditArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!articleToEdit) return
    setIsUpdatingArticle(true)
    try {
      const res = await fetch(`/api/articles/${articleToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editArticleForm)
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Statut HTTP ${res.status} : ${txt.slice(0, 120)}`)
      }
      const data = await res.json()
      if (data.success) {
        setArticleToEdit(null)
        loadStock()
      } else {
        alert("❌ Impossible de modifier l'article : " + (data.error || "Erreur"))
      }
    } catch (err: any) {
      console.error(err)
      alert("🚨 Erreur critique de mise à jour :\n" + err.message)
    } finally {
      setIsUpdatingArticle(false)
    }
  }

  const executeDeleteArticle = async (id: string) => {
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Statut HTTP ${res.status} : ${txt.slice(0, 120)}`)
      }
      const data = await res.json()
      if (data.success) {
        loadStock()
      } else {
        alert("❌ Échec de la suppression : " + (data.error || "Erreur"))
      }
    } catch (err: any) {
      console.error(err)
      alert("🚨 Erreur réseau/serveur lors de la suppression :\n" + err.message)
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full min-h-full relative">
      
      {/* Ambient background gradients specific to this page */}
      <div className="fixed top-0 right-0 w-[50%] h-[50%] bg-blue-500/5 blur-[120px] pointer-events-none rounded-full -z-10"></div>
      
      {/* Headers */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Package className="text-emerald-500 w-8 h-8" />
            Inventaire du Stock
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Gestion de vos pièces individuelles et enregistrement des ventes.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-shrink-0">
          
          {/* Select de Tri */}
          <div className="relative w-full sm:w-48">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-300 rounded-full pl-4 pr-8 py-2.5 text-xs font-semibold focus:border-zinc-600 transition-all outline-none backdrop-blur-md cursor-pointer appearance-none"
            >
              <option value="date-desc">📅 Récents d'abord</option>
              <option value="date-asc">📅 Anciens d'abord</option>
              <option value="cost-desc">💰 Coût : Élevé ➡️ Bas</option>
              <option value="cost-asc">💰 Coût : Bas ➡️ Élevé</option>
              <option value="name-asc">🔤 Nom : A ➡️ Z</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
              <ArrowUpDown className="w-3 h-3" />
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64 md:w-80">
            <input 
              type="text" 
              placeholder="Rechercher par n°, modèle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-full pl-10 pr-4 py-2.5 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all outline-none backdrop-blur-md"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </header>

      {/* Stats Mini Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-950 border border-zinc-800/60 rounded-2xl backdrop-blur-sm shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Total Articles</p>
          <p className="text-xl font-bold text-white mt-1">{articles.length}</p>
        </div>
        <div className="p-4 bg-zinc-950 border border-zinc-800/60 rounded-2xl backdrop-blur-sm shadow-sm">
          <p className="text-xs font-medium text-zinc-500">En Stock</p>
          <p className="text-xl font-bold text-emerald-500 mt-1">{articles.filter((a:any)=>a.statut === 'STOCK').length}</p>
        </div>
        <div className="p-4 bg-zinc-950 border border-zinc-800/60 rounded-2xl backdrop-blur-sm shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Vendus</p>
          <p className="text-xl font-bold text-blue-400 mt-1">{articles.filter((a:any)=>a.statut === 'VENDU').length}</p>
        </div>
        <div className="p-4 bg-zinc-950 border border-zinc-800/60 rounded-2xl backdrop-blur-sm shadow-sm">
          <p className="text-xs font-medium text-zinc-500">Taux Écoulement</p>
          <p className="text-xl font-bold text-zinc-200 mt-1">
            {articles.length > 0 ? Math.round((articles.filter((a:any)=>a.statut === 'VENDU').length / articles.length)*100) : 0} %
          </p>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-md flex-1 flex flex-col relative">
        <div className="overflow-x-auto w-full pb-28 min-h-[320px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50 text-zinc-400 text-xs font-bold tracking-wider uppercase border-b border-zinc-800">
                <th className="px-6 py-4">Visuel</th>
                <th className="px-6 py-4">Désignation / Modèle</th>
                <th className="px-6 py-4">Origine</th>
                <th className="px-6 py-4">Coût Achat Unitaire</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-zinc-900 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Chargement du stock...
                  </td>
                </tr>
              ) : filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    Aucun article trouvé.
                  </td>
                </tr>
              ) : (
                filteredArticles.map((art: any) => {
                  const totalCost = (Number(art.prixAchatUnitaire) + Number(art.fraisPortUnitaires)).toFixed(2)
                  const isSold = art.statut === 'VENDU'

                  return (
                    <tr key={art.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-16 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-emerald-500/50 transition-colors">
                            {art.photoUrl ? (
                              <img src={art.photoUrl} alt={art.nom} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-zinc-600" />
                            )}
                          </div>
                          <div>
                            <div className="font-mono text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
                              #{art.id.slice(0,8)}
                            </div>
                            <div className="text-[9px] text-zinc-600 mt-0.5 whitespace-nowrap">Ajouté {new Date(art.dateAjoutStock).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                          {art.nom || "Article Standard"}
                          {art.lienProduit && (
                            <a 
                              href={art.lienProduit} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-zinc-600 hover:text-emerald-400 transition-colors p-1 rounded hover:bg-zinc-900"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        
                        {art.aliases && art.aliases.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                            <span className="text-[9px] text-emerald-500/70 font-black uppercase tracking-wider">Synonymes :</span>
                            {art.aliases.map((alias: string, i: number) => (
                              <span key={i} className="text-[10px] text-zinc-400 bg-zinc-900/60 border border-zinc-800/60 px-1.5 py-0.5 rounded-md font-medium truncate max-w-[200px]" title={alias}>
                                {alias}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-widest text-zinc-400">{art.commande.fournisseur}</span>
                          <span className="text-white font-medium text-xs">{art.commande.numero}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-medium text-zinc-300">
                        {totalCost} €
                        <span className="block text-[10px] text-zinc-600 font-normal mt-0.5">({Number(art.prixAchatUnitaire).toFixed(2)} + {Number(art.fraisPortUnitaires).toFixed(2)} port)</span>
                      </td>

                      <td className="px-6 py-4">
                        {isSold ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
                            VENDU
                          </span>
                        ) : art.statut === 'EN_TRANSIT' ? (() => {
                          const isLate = art.commande?.dateArriveeEstimee && (new Date(art.commande.dateArriveeEstimee) < new Date())
                          return isLate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-extrabold shadow-[0_0_8px_rgba(239,68,68,0.1)]">
                              🚨 RETARD
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                              EN TRANSIT
                            </span>
                          )
                        })() : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                            EN STOCK
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {isSold ? (
                            <div className="flex flex-col items-end whitespace-nowrap">
                               <span className="text-xs font-bold text-zinc-200">{Number(art.vente?.prixVente).toFixed(2)} €</span>
                               <span className="text-[10px] text-emerald-400 font-bold">+{Number(art.vente?.beneficeNet).toFixed(2)}€ profit</span>
                            </div>
                          ) : art.statut === 'EN_TRANSIT' ? (
                            <span className="text-[10px] font-medium text-zinc-500 italic">Attente livraison</span>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => setSelectedArticle(art)}
                              className="inline-flex items-center gap-1.5 bg-white text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-all shadow-sm hover:-translate-y-0.5 cursor-pointer"
                            >
                              <Tag className="w-3 h-3" /> Vendre
                            </button>
                          )}

                          {/* MENU CONTEXTUEL (⋮) */}
                          <div className="relative flex-shrink-0">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenPopoverId(openPopoverId === art.id ? null : art.id)
                              }}
                              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openPopoverId === art.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setOpenPopoverId(null)} />
                                <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-950/95 border border-zinc-800/60 backdrop-blur-md shadow-2xl rounded-xl p-1.5 z-30 animate-in slide-in-from-top-2 duration-150 flex flex-col gap-0.5 text-left">
                                  
                                  <button 
                                    type="button"
                                    onClick={() => handleOpenEditArticle(art)}
                                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-amber-500" /> Modifier l'article
                                  </button>

                                  <div className="h-px bg-zinc-900 my-1 w-[90%] mx-auto" />

                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setOpenPopoverId(null)
                                      setArticleToDelete(art)
                                    }}
                                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Supprimer l'article
                                  </button>

                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL ACTION VENTE --- */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative shadow-emerald-900/10 overflow-hidden">
            {/* Glowing border overlay */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500"></div>
            
            <button 
              onClick={() => setSelectedArticle(null)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Enregistrer une Vente</h3>
                <p className="text-xs text-zinc-500">Article de la commande {selectedArticle.commande.numero}</p>
              </div>
            </div>

            {/* Preview calculations card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mb-6 text-xs flex justify-between items-center text-zinc-400">
              <span>Coût Total Actuel :</span>
              <span className="font-bold text-white">{(Number(selectedArticle.prixAchatUnitaire) + Number(selectedArticle.fraisPortUnitaires)).toFixed(2)} €</span>
            </div>

            <form onSubmit={handleSaleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Pseudo Acheteur Vinted</label>
                <input 
                  type="text" 
                  required
                  value={saleForm.pseudoAcheteur}
                  onChange={e => setSaleForm({...saleForm, pseudoAcheteur: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-600" 
                  placeholder="ex: lucie22"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Prix de Vente Brut (€)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required
                  value={saleForm.prixVente}
                  onChange={e => setSaleForm({...saleForm, prixVente: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-zinc-600" 
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Lien de la transaction (Optional)</label>
                <input 
                  type="url" 
                  value={saleForm.lienVente}
                  onChange={e => setSaleForm({...saleForm, lienVente: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-600" 
                  placeholder="https://www.vinted.fr/..."
                />
              </div>

              {/* Real-time profit math display inside modal */}
              {saleForm.prixVente && parseFloat(saleForm.prixVente) > 0 && (
                <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-xl animate-in zoom-in-95 duration-200">
                   {(() => {
                     const sp = parseFloat(saleForm.prixVente)
                     const cp = Number(selectedArticle.prixAchatUnitaire) + Number(selectedArticle.fraisPortUnitaires) + 0.70
                     const prof = sp - cp
                     return (
                       <div className="flex items-center justify-between text-sm">
                         <span className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Estimation Profit :</span>
                         <span className={cn("font-extrabold", prof > 0 ? "text-emerald-400" : "text-rose-400")}>{prof.toFixed(2)} €</span>
                       </div>
                     )
                   })()}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setSelectedArticle(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-sm font-medium border border-zinc-800 hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSelling}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-colors flex justify-center items-center gap-2"
                >
                  {isSelling ? <Loader2 className="w-4 h-4 animate-spin"/> : "Confirmer Vente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODALE D'ÉDITION D'ARTICLE PREMIUM --- */}
      {articleToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative shadow-amber-900/5 overflow-hidden">
            {/* Top Amber Glow */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-400"></div>
            
            <button 
              onClick={() => setArticleToEdit(null)}
              className="absolute right-4 top-5 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
                <Pencil className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Modifier l'Article</h3>
                <p className="text-xs text-zinc-500">Réf #{articleToEdit.id.slice(0,8)} • Commande {articleToEdit.commande.numero}</p>
              </div>
            </div>

            {articleToEdit.statut === 'VENDU' && (
              <div className="mb-6 p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 leading-relaxed flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400 animate-pulse" />
                <span>
                  <strong>Alerte de Rentabilité :</strong> Cet article est déjà enregistré comme **Vendu**. 
                  Modifier les coûts d'achat ou de port recalculera **immédiatement** le bénéfice net et la marge dans ton Livre des Ventes !
                </span>
              </div>
            )}

            <form onSubmit={handleEditArticleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Désignation / Nom du Modèle</label>
                <input 
                  type="text" 
                  required
                  value={editArticleForm.nom}
                  onChange={e => setEditArticleForm({...editArticleForm, nom: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/30" 
                  placeholder="ex: Robe noire plissée"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Prix Achat Unitaire (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={editArticleForm.prixAchatUnitaire}
                    onChange={e => setEditArticleForm({...editArticleForm, prixAchatUnitaire: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/30" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Frais Port Unitaires (€)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={editArticleForm.fraisPortUnitaires}
                    onChange={e => setEditArticleForm({...editArticleForm, fraisPortUnitaires: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/30" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Lien de Sourcing / Produit</label>
                <input 
                  type="url" 
                  value={editArticleForm.lienProduit}
                  onChange={e => setEditArticleForm({...editArticleForm, lienProduit: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-amber-500/30" 
                  placeholder="https://..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setArticleToEdit(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-bold border border-zinc-800 hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdatingArticle}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-lg shadow-amber-900/20 hover:bg-amber-500 transition-colors flex justify-center items-center gap-2"
                >
                  {isUpdatingArticle ? <Loader2 className="w-4 h-4 animate-spin"/> : "Sauvegarder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODALE DE CONFIRMATION DE SUPPRESSION D'ARTICLE --- */}
      {articleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-red-950/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative shadow-red-950/20 overflow-hidden">
            {/* Top Red Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-rose-400"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4">
                <AlertTriangle className="w-6 h-6 animate-bounce" style={{ animationDuration: '2.5s' }} />
              </div>
              
              <h3 className="text-lg font-extrabold text-zinc-100 mb-1.5">Supprimer l'Article ?</h3>
              
              <div className="text-xs text-zinc-400 leading-relaxed mb-5">
                Voulez-vous vraiment effacer <span className="font-bold text-zinc-200">{articleToDelete.nom || 'cet article'}</span> du stock ?
                
                {articleToDelete.statut === 'VENDU' ? (
                  <div className="mt-4 p-2.5 bg-red-950/40 border border-red-500/30 rounded-lg text-red-400 font-semibold flex flex-col gap-1.5 text-left">
                    <span>⚠️ DANGER : Cet article est enregistré comme VENDU !</span>
                    <span>La suppression va également effacer définitivement :</span>
                    <ul className="list-disc list-inside font-normal text-zinc-300 pl-1">
                      <li>Sa ligne dans le livre des ventes</li>
                      <li>Toute expédition ou bordereau lié</li>
                    </ul>
                  </div>
                ) : (
                  <span className="block mt-3 text-zinc-500 italic">Cette opération effacera l'article définitivement de la commande associée.</span>
                )}
              </div>
              
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setArticleToDelete(null)}
                  className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl hover:border-zinc-700 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const targetId = articleToDelete.id
                    setArticleToDelete(null)
                    await executeDeleteArticle(targetId)
                  }}
                  className="flex-1 py-2.5 bg-red-600 text-white text-xs font-extrabold rounded-xl hover:bg-red-500 shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
