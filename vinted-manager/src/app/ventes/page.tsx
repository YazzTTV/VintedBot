"use client"

import React, { useState, useEffect, useMemo } from "react"
import { 
  DollarSign, 
  TrendingUp, 
  User, 
  Calendar,
  ExternalLink,
  Filter,
  ChevronRight,
  Loader2,
  Percent,
  Plus,
  X,
  CheckCircle2,
  MoreVertical,
  Trash2,
  Pencil,
  Truck,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  Download
} from "lucide-react"
import { cn, getWorkingDaysDifference, addWorkingDays } from "@/lib/utils"

export default function VentesPage() {
  const [ventes, setVentes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const handleAutoSource = async (venteId: string) => {
    try {
      const res = await fetch(`/api/ventes/${venteId}/auto-source`, { method: 'POST' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      alert("✅ L'extension Chrome va ajouter l'article au panier Shein dans quelques secondes !")
    } catch (err: any) {
      alert("Erreur: " + err.message)
    }
  }
  
  // New Sale Creation Flow States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [stock, setStock] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  
  // NOUVEAU : Mode Dropshipping & Sourcing
  const [saleMode, setSaleMode] = useState<'inventory' | 'catalogue'>('inventory')
  const [sourcingSearch, setSourcingSearch] = useState('')
  const [sourcingResults, setSourcingResults] = useState([])
  const [selectedSourcingItem, setSelectedSourcingItem] = useState<any>(null)
  const [isSearchingSourcing, setIsSearchingSourcing] = useState(false)
  const [botAccounts, setBotAccounts] = useState<any[]>([])

  // NOUVEAU : Moteur de Filtrage & Panneaux Volants
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'EN_ATTENTE' | 'EXPEDIEE'>('all')
  const [sortKey, setSortKey] = useState<'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'profit-desc'>('date-desc')

  // Action Popover (⋮) local tracker
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

  // Modale d'Édition de Vente existante
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeVenteToEdit, setActiveVenteToEdit] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    pseudoAcheteur: '',
    prixVente: '',
    lienVente: '',
    statut: 'EN_ATTENTE',
    extensionStatut: 'AUCUNE',
    dateLimiteExpedition: ''
  })
  
  // NOUVEAU : Suivi pour la modale de confirmation de suppression custom
  const [venteToDelete, setVenteToDelete] = useState<any | null>(null)

  const [saleForm, setSaleForm] = useState({
    articleId: '',
    pseudoAcheteur: '',
    prixVente: '',
    lienVente: '',
    botAccountId: '',
    fraisVinted: 0.70,
    taille: 'S'
  })

  const loadVentes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ventes')
      const d = await res.json()
      if (d.success) setVentes(d.data)
    } catch (e) {}
    setLoading(false)
  }

  const loadStock = async () => {
    try {
      const res = await fetch('/api/articles')
      const d = await res.json()
      if (d.success) {
        // MODIFIÉ : On charge à la fois le stock physique ET virtuel (en transit) !
        setStock(d.data.filter((a: any) => a.statut === 'STOCK' || a.statut === 'EN_TRANSIT'))
      }
    } catch (e) {}
  }

  const loadBotAccounts = async () => {
    try {
      const res = await fetch('/api/bots')
      const d = await res.json()
      if (d.success) setBotAccounts(d.data)
    } catch (e) {}
  }

  // Debounce effect pour la recherche Sourcing Catalog
  useEffect(() => {
    if (sourcingSearch.length < 2) {
      setSourcingResults([])
      return
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingSourcing(true)
      try {
        const res = await fetch(`/api/sourcing?q=${encodeURIComponent(sourcingSearch)}`)
        const r = await res.json()
        if (r.success) setSourcingResults(r.data)
      } catch (e) {}
      setIsSearchingSourcing(false)
    }, 400)

    return () => clearTimeout(delayDebounceFn)
  }, [sourcingSearch])

  useEffect(() => { 
    loadVentes()
    loadStock()
    loadBotAccounts()
  }, [])

  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (saleMode === 'inventory' && !saleForm.articleId) {
      return alert("Veuillez sélectionner un article")
    }
    if (saleMode === 'catalogue' && !selectedSourcingItem) {
      return alert("Veuillez sélectionner un produit du Catalogue Sourcing")
    }

    setIsSaving(true)
    try {
      // Envoyer l'articleId pour inventaire OU le sourcingItem pour la commande d'urgence automatique
      const payload = {
        saleMode,
        articleId: saleForm.articleId,
        sourcingItemId: selectedSourcingItem?.id,
        pseudoAcheteur: saleForm.pseudoAcheteur,
        prixVente: Number(saleForm.prixVente),
        fraisVinted: Number(saleForm.fraisVinted),
        taille: saleForm.taille || null,
        botAccountId: saleForm.botAccountId || null
      }

      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      if (data.success) {
        if (saleMode === 'catalogue' && selectedSourcingItem?.url?.toLowerCase().includes('shein')) {
          alert("✅ Vente enregistrée ! L'extension Chrome va automatiquement ouvrir Shein et ajouter l'article au panier dans quelques secondes.")
        }
        setIsModalOpen(false)
        setSaleForm({ 
          articleId: '', 
          pseudoAcheteur: '', 
          prixVente: '', 
          lienVente: '', 
          botAccountId: '',
          fraisVinted: 0.70,
          taille: 'S'
        })
        setSelectedSourcingItem(null)
        setSourcingSearch('')
        setSaleMode('inventory')
        loadVentes() // recharger transactions
        loadStock()  // recharger stock restant
      } else {
        alert(data.error || "Erreur d'enregistrement")
      }
    } catch(err) {
      alert("Erreur de connexion")
    }
    setIsSaving(false)
  }

  // Find current selected article to show real-time profit math
  const selectedArticleData: any = stock.find((a: any) => a.id === saleForm.articleId)
  // NOUVEAU : Moteur de Filtrage Intelligent & Reactif
  const filteredVentes = useMemo(() => {
    let result = [...ventes]
    const now = new Date()

    // 1. Filtre par Période Temporelle
    if (filterPeriod === 'today') {
      result = result.filter(v => {
        const d = new Date(v.dateVente)
        return d.toDateString() === now.toDateString()
      })
    } else if (filterPeriod === 'week') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(now.getDate() - 7)
      result = result.filter(v => new Date(v.dateVente) >= sevenDaysAgo)
    } else if (filterPeriod === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      result = result.filter(v => new Date(v.dateVente) >= startOfMonth)
    }

    // 2. Filtre par Statut Logistique
    if (filterStatus !== 'all') {
      result = result.filter(v => v.statut === filterStatus)
    }

    // 3. Algorithmes de Tri dynamiques
    result.sort((a: any, b: any) => {
      if (sortKey === 'date-desc') return new Date(b.dateVente).getTime() - new Date(a.dateVente).getTime()
      if (sortKey === 'date-asc') return new Date(a.dateVente).getTime() - new Date(b.dateVente).getTime()
      if (sortKey === 'price-desc') return Number(b.prixVente) - Number(a.prixVente)
      if (sortKey === 'price-asc') return Number(a.prixVente) - Number(b.prixVente)
      if (sortKey === 'profit-desc') return Number(b.beneficeNet) - Number(a.beneficeNet)
      return 0
    })

    return result
  }, [ventes, filterPeriod, filterStatus, sortKey])

  // --- ACTIONS CRUD SUR LES VENTES ---

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'EXPEDIEE' ? 'EN_ATTENTE' : 'EXPEDIEE'
    setOpenPopoverId(null)
    try {
      const res = await fetch(`/api/ventes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: nextStatus })
      })
      if (!res.ok) {
        const errTxt = await res.text()
        throw new Error(`Statut HTTP ${res.status} : ${errTxt.slice(0, 120)}`)
      }
      const d = await res.json()
      if (d.success) {
        loadVentes()
      } else {
        alert("❌ Erreur de modification : " + (d.error || "Inconnue"))
      }
    } catch (e: any) {
      console.error(e)
      alert("🚨 Impossible de modifier le statut :\n" + e.message)
    }
  }

  const handleUpdateExtension = async (id: string, nextExtensionStatut: string) => {
    setOpenPopoverId(null)
    try {
      const res = await fetch(`/api/ventes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionStatut: nextExtensionStatut })
      })
      if (!res.ok) throw new Error("Erreur réseau lors de l'allongement")
      const d = await res.json()
      if (d.success) {
        loadVentes()
      } else {
        alert("❌ Erreur d'allongement : " + (d.error || "Inconnue"))
      }
    } catch (e) {
      alert("🚨 Impossible de mettre à jour le délai d'expédition.")
    }
  }

  const executeDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/ventes/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errTxt = await res.text()
        throw new Error(`Statut HTTP ${res.status} : ${errTxt.slice(0, 120)}`)
      }
      const d = await res.json()
      if (d.success) {
        loadVentes()
        loadStock()
      } else {
        alert("❌ Erreur de suppression : " + (d.error || "Inconnue"))
      }
    } catch (e: any) {
      console.error(e)
      alert("🚨 Échec critique lors de la suppression :\n" + e.message)
    }
  }

  const handleOpenEditModal = (vente: any) => {
    setOpenPopoverId(null)
    setActiveVenteToEdit(vente)
    setEditForm({
      pseudoAcheteur: vente.pseudoAcheteur,
      prixVente: vente.prixVente.toString(),
      lienVente: vente.lienVente || '',
      statut: vente.statut,
      extensionStatut: vente.extensionStatut || 'AUCUNE',
      dateLimiteExpedition: vente.dateLimiteExpedition ? new Date(vente.dateLimiteExpedition).toISOString().substring(0, 10) : ''
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeVenteToEdit) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/ventes/${activeVenteToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      const d = await res.json()
      if (d.success) {
        setIsEditModalOpen(false)
        loadVentes()
      } else {
        alert(d.error || "Erreur de modification")
      }
    } catch (e) {
      alert("Erreur de connexion serveur")
    }
    setIsSaving(false)
  }

  // Overall aggregates asservis aux données filtrées dynamiquement
  const totalRev = filteredVentes.reduce((sum, v: any) => sum + Number(v.prixVente), 0)
  const totalProf = filteredVentes.reduce((sum, v: any) => sum + Number(v.beneficeNet), 0)
  const avgMargin = filteredVentes.length > 0 ? filteredVentes.reduce((sum, v: any) => sum + Number(v.margePct), 0) / filteredVentes.length : 0

  return (
    <div className="flex flex-col gap-4 md:gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full min-h-full">
      
      {/* Subtle radiant backdrop */}
      <div className="fixed top-0 right-0 w-[40%] h-[40%] bg-emerald-500/5 blur-[150px] -z-10 rounded-full pointer-events-none" />

      {/* Header with Quick Summaries */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="text-emerald-500 w-8 h-8" />
            Livre des Ventes
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Registre officiel de vos transactions et de votre rentabilité nette.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-2 backdrop-blur-md w-full md:w-auto md:flex md:items-center">
           <div className="px-2 md:px-4 py-2 text-center">
             <p className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total C.A.</p>
             <p className="text-sm md:text-lg font-extrabold text-white">{totalRev.toFixed(2)} €</p>
           </div>
           <div className="hidden md:block w-px h-8 bg-zinc-800"></div>
           <div className="px-2 md:px-4 py-2 text-center border-l border-zinc-800 md:border-l-0">
             <p className="text-[9px] md:text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Profit Net</p>
             <p className="text-sm md:text-lg font-extrabold text-emerald-400">{totalProf.toFixed(2)} €</p>
           </div>
           <div className="hidden md:block w-px h-8 bg-zinc-800"></div>
           <div className="px-2 md:px-4 py-2 text-center border-l border-zinc-800 md:border-l-0">
             <p className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Marge Moy.</p>
             <p className="text-sm md:text-lg font-extrabold text-zinc-300">{Math.round(avgMargin)}%</p>
           </div>
        </div>
      </div>

      {/* Responsive Transaction List */}
      <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl shadow-2xl backdrop-blur-md relative">
        
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/30 flex justify-between items-center rounded-t-2xl">
          <span className="text-sm font-bold text-zinc-300">{filteredVentes.length} Transaction{filteredVentes.length > 1 ? 's' : ''}</span>
          <div className="flex items-center gap-3">
            
            {/* MOTEUR DE FILTRAGE VOLANT */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 bg-zinc-900 text-xs font-bold rounded-xl border transition-all duration-200 shadow-sm",
                  isFilterOpen 
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" 
                    : "text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800"
                )}
              >
                <Filter className={cn("w-3.5 h-3.5", isFilterOpen && "animate-pulse")} /> 
                Filtrer {(filterPeriod !== 'all' || filterStatus !== 'all' || sortKey !== 'date-desc') && "•"}
              </button>

              {/* Panneau de Filtres */}
              {isFilterOpen && (
                <>
                  {/* Overlay invisible pour fermer au clic externe */}
                  <div className="fixed inset-0 z-20" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2.5 w-72 z-30 p-4 bg-zinc-950/95 border border-zinc-800/80 backdrop-blur-xl rounded-2xl shadow-2xl animate-in slide-in-from-top-2 duration-200">
                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-zinc-950 border-t border-l border-zinc-800 rotate-45" />
                    
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-900">
                      <span className="text-xs font-black tracking-widest uppercase text-zinc-400 flex items-center gap-1.5">
                        <ArrowUpDown className="w-3 h-3 text-emerald-500" /> Moteur de Tri
                      </span>
                      {(filterPeriod !== 'all' || filterStatus !== 'all' || sortKey !== 'date-desc') && (
                        <button 
                          onClick={() => { setFilterPeriod('all'); setFilterStatus('all'); setSortKey('date-desc'); }}
                          className="text-[10px] text-emerald-500 hover:underline font-bold"
                        >
                          Réinitialiser
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Groupe 1 : Période */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-600" /> Période Temporelle
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { key: 'all', label: 'Tout' },
                            { key: 'today', label: "Aujourd'hui" },
                            { key: 'week', label: '7 derniers j.' },
                            { key: 'month', label: 'Mois en cours' }
                          ].map(opt => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setFilterPeriod(opt.key as any)}
                              className={cn(
                                "text-[10px] font-bold py-2 rounded-lg border transition-all",
                                filterPeriod === opt.key 
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-zinc-900 border-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Groupe 2 : Statut Logistique */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                          <Truck className="w-3 h-3 text-emerald-600" /> Statut Logistique
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { key: 'all', label: 'Tous' },
                            { key: 'EN_ATTENTE', label: 'À envoyer' },
                            { key: 'EXPEDIEE', label: 'Expédiée' }
                          ].map(opt => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setFilterStatus(opt.key as any)}
                              className={cn(
                                "text-[10px] font-bold py-2 rounded-lg border transition-all text-center truncate px-0.5",
                                filterStatus === opt.key
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-zinc-900 border-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Groupe 3 : Algorithme de classement */}
                      <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-1">
                          <ArrowUpDown className="w-3 h-3 text-emerald-600" /> Classer la Liste par
                        </label>
                        <select
                          value={sortKey}
                          onChange={(e) => setSortKey(e.target.value as any)}
                          className="w-full bg-zinc-900 border border-zinc-800 text-white text-[11px] font-bold rounded-lg px-2.5 py-2 outline-none focus:border-emerald-500/30"
                        >
                          <option value="date-desc">Date : Plus récent ➡️ Plus ancien</option>
                          <option value="date-asc">Date : Plus ancien ➡️ Plus récent</option>
                          <option value="price-desc">Prix : Plus élevé ➡️ Plus faible</option>
                          <option value="price-asc">Prix : Plus faible ➡️ Plus élevé</option>
                          <option value="profit-desc">Bénéfice : Top Profit 🔥</option>
                        </select>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
            >
              <Plus className="w-3.5 h-3.5" /> Enregistrer une Vente
            </button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto w-full pb-28 min-h-[320px]">
          <table className="w-full text-left border-collapse min-w-[1300px]">
            <thead>
              <tr className="text-xs font-bold text-zinc-500 tracking-wider uppercase border-b border-zinc-900">
                <th className="px-3 py-4">Visuel</th>
                <th className="px-3 py-4">Date / Acheteur</th>
                <th className="px-3 py-4">Désignation Article</th>
                <th className="px-3 py-4 text-right">Prix Vente</th>
                <th className="px-3 py-4 text-right">Bénéfice Net</th>
                <th className="px-3 py-4 text-center">Statut</th>
                <th className="px-3 py-4 text-center">Délai Exp.</th>
                <th className="px-3 py-4 text-center">Bordereau</th>
                <th className="px-3 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
                    Chargement des transactions...
                  </td>
                </tr>
              ) : filteredVentes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-zinc-500">
                    <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    Aucune vente enregistrée ou correspondant aux filtres.
                  </td>
                </tr>
              ) : (
                filteredVentes.map((v: any) => (
                  <tr key={v.id} className="group hover:bg-zinc-900/30 transition-colors">
                    
                    {/* Visuel */}
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="w-10 h-14 bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:border-emerald-500/50 transition-colors">
                        {v.photoUrl ? (
                          <img src={v.photoUrl} alt={v.article?.nom} className="w-full h-full object-cover" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-zinc-600" />
                        )}
                      </div>
                    </td>

                    {/* Col 1: Info Acheteur & Date */}
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                         <div className="w-9 h-9 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
                           <User className="w-4 h-4" />
                         </div>
                         <div>
                           <div className="flex items-center gap-1.5">
                             <p className="font-bold text-white text-sm">@{v.pseudoAcheteur}</p>
                             {v.botAccount && (
                               <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 ml-1">
                                 {v.botAccount.name}
                               </span>
                             )}
                             {v.lienVente && (
                               <a href={v.lienVente} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-blue-400">
                                 <ExternalLink className="w-3 h-3" />
                               </a>
                             )}
                           </div>
                           <p className="text-xs text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                             <Calendar className="w-3 h-3" />
                             {new Date(v.dateVente).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}
                           </p>
                         </div>
                      </div>
                    </td>

                    {/* Col 2: Désignation & Origine */}
                    <td className="px-3 py-4">
                      <div className="text-xs max-w-[160px]">
                        <p className="text-white font-bold truncate leading-snug" title={v.article?.nom || "Article Standard"}>
                          {v.article?.nom || "Article Standard"}
                        </p>
                        <div className="flex flex-col gap-1.5 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800/50 tracking-widest">
                              {v.article?.commande?.fournisseur || 'N/A'}
                            </span>
                            <p className="text-[10px] text-zinc-600 font-mono truncate">#{v.article?.id?.slice(0,8)}</p>
                          </div>
                          {v.article?.commande?.numero?.startsWith('URGENCE') && (
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse w-fit">
                              <AlertTriangle className="w-2.5 h-2.5" /> À COMMANDER !
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Col 3: Sales Price */}
                    <td className="px-3 py-4 text-right">
                      <p className="text-sm font-extrabold text-white">{Number(v.prixVente).toFixed(2)} €</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Frais: {Number(v.fraisVinted).toFixed(2)} €</p>
                    </td>

                    {/* Col 4: Net Profit & Perc */}
                    <td className="px-3 py-4 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="text-sm font-black text-emerald-400">
                          +{Number(v.beneficeNet).toFixed(2)} €
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 rounded mt-0.5">
                          {Math.round(Number(v.margePct))}% marge
                        </span>
                      </div>
                    </td>

                    {/* Col 5: Shipment Status */}
                    <td className="px-3 py-4 text-center">
                       {v.statut === 'EXPEDIEE' ? (
                         <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                           Expédiée
                         </span>
                       ) : (
                         <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
                           À envoyer
                         </span>
                       )}
                    </td>

                    {/* Col 6: Délai Expéd. */}
                    <td className="px-3 py-4 text-center">
                      {v.statut === 'EXPEDIEE' ? (
                        <span className="text-[10px] font-bold text-zinc-500">—</span>
                      ) : (
                        (() => {
                          const limitDate = v.dateLimiteExpedition 
                            ? new Date(v.dateLimiteExpedition) 
                            : addWorkingDays(new Date(v.dateVente), 5);
                            
                          const diffDays = getWorkingDaysDifference(new Date(), limitDate);
                          let deadlineStyle = "text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20";
                          
                          if (diffDays <= 0) {
                            deadlineStyle = "text-rose-400 bg-rose-500/10 border border-rose-500/20 font-black animate-pulse";
                          } else if (diffDays === 1 || diffDays === 2) {
                            deadlineStyle = "text-orange-400 bg-orange-500/10 border border-orange-500/20 font-bold";
                          } else if (diffDays >= 3) {
                            deadlineStyle = "text-amber-500/80 bg-amber-500/5 border border-amber-500/10 font-semibold";
                          }

                          return (
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={cn("text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap", deadlineStyle)}>
                                <Clock className="w-3 h-3" />
                                J-{diffDays}
                              </span>
                              <span className="text-[9px] text-zinc-500 whitespace-nowrap">
                                {limitDate.toLocaleDateString('fr-FR')}
                              </span>
                              
                              {v.extensionStatut === 'DEMANDEE' && (
                                <span className="text-[8px] font-bold text-teal-400 border border-teal-500/20 bg-teal-500/5 px-1 rounded animate-pulse mt-0.5">
                                  ⏳ Demande en cours
                                </span>
                              )}

                              {v.extensionStatut === 'ACCEPTEE' && (
                                <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded flex items-center gap-0.5 mt-0.5 whitespace-nowrap">
                                  ➕ Allongé (+5j)
                                </span>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </td>

                    {/* Col 7: Bordereau */}
                    <td className="px-3 py-4 text-center">
                      {v.expedition?.bordereauUrl ? (
                        <a href={v.expedition.bordereauUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 rounded-lg hover:bg-teal-500/20 transition-colors whitespace-nowrap">
                          <Download className="w-3.5 h-3.5" /> Voir
                        </a>
                      ) : v.extensionStatut === 'DEMANDEE' ? (
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 opacity-50" /> Attente accord...
                        </span>
                      ) : v.extensionStatut === 'ACCEPTEE' ? (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg whitespace-nowrap inline-flex items-center gap-1.5 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin opacity-80" /> Extraction...
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-lg whitespace-nowrap inline-flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5 opacity-50" /> À extraire
                        </span>
                      )}
                    </td>

                    {/* Col 8: Options Menu Popover (⋮) */}
                    <td className="px-6 py-4 text-right relative">
                      <div className="relative flex justify-end items-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenPopoverId(openPopoverId === v.id ? null : v.id)
                          }}
                          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openPopoverId === v.id && (
                          <>
                            {/* Fermeture au clic externe */}
                            <div className="fixed inset-0 z-20" onClick={() => setOpenPopoverId(null)} />
                            <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-950/95 border border-zinc-800/60 backdrop-blur-md shadow-2xl rounded-xl p-1.5 z-30 animate-in slide-in-from-top-2 duration-150 flex flex-col gap-0.5 text-left">
                              
                              <button 
                                type="button"
                                onClick={() => handleToggleStatus(v.id, v.statut)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5 text-teal-500" /> 
                                {v.statut === 'EXPEDIEE' ? 'Marquer À Envoyer' : 'Marquer Expédiée'}
                              </button>

                              {v.article?.commande?.numero?.startsWith('URGENCE') && (
                                <button 
                                  type="button"
                                  onClick={() => handleAutoSource(v.id)}
                                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-black text-rose-400 hover:text-white hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer border-t border-zinc-900"
                                >
                                  🛒 Auto-Commander (Shein)
                                </button>
                              )}

                              {v.statut === 'EN_ATTENTE' && (
                                <>
                                  {v.extensionStatut === 'AUCUNE' && (
                                    <button 
                                      type="button"
                                      onClick={() => handleUpdateExtension(v.id, 'DEMANDEE')}
                                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-teal-400 hover:text-white hover:bg-teal-950/30 rounded-lg transition-colors cursor-pointer border-t border-zinc-900"
                                    >
                                      <Clock className="w-3.5 h-3.5" /> 
                                      Demander Allongement (+5j)
                                    </button>
                                  )}
                                  {v.extensionStatut === 'DEMANDEE' && (
                                    <button 
                                      type="button"
                                      onClick={() => handleUpdateExtension(v.id, 'ACCEPTEE')}
                                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-black text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer border-t border-zinc-900"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> 
                                      Confirmer Allongement
                                    </button>
                                  )}
                                </>
                              )}

                              <button 
                                type="button"
                                onClick={() => handleOpenEditModal(v)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-amber-500" /> Modifier la vente
                              </button>

                              <div className="h-px bg-zinc-900 my-1 w-[90%] mx-auto" />

                              <button 
                                type="button"
                                onClick={() => {
                                  setOpenPopoverId(null)
                                  setVenteToDelete(v)
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Supprimer la vente
                              </button>

                            </div>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Grille de cartes pour mobile */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden pb-28">
          {loading ? (
            <div className="py-16 text-center text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 opacity-50" />
              Chargement des transactions...
            </div>
          ) : filteredVentes.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
              Aucune vente enregistrée.
            </div>
          ) : (
            filteredVentes.map((v: any) => {
              const limitDate = v.dateLimiteExpedition 
                ? new Date(v.dateLimiteExpedition) 
                : addWorkingDays(new Date(v.dateVente), 5);
              
              const now = new Date();
              const diffDays = getWorkingDaysDifference(now, limitDate);
              
              let deadlineLabel = `J-${diffDays}`;
              let deadlineStyle = "text-zinc-400 bg-zinc-900 border border-zinc-800/50";
              if (diffDays < 0) {
                deadlineStyle = "text-rose-400 bg-rose-500/10 border border-rose-500/20 font-black animate-pulse";
                deadlineLabel = "RETARD !";
              } else if (diffDays === 0) {
                deadlineStyle = "text-rose-400 bg-rose-500/10 border border-rose-500/20 font-black animate-pulse";
                deadlineLabel = "AUJOURD'HUI";
              } else if (diffDays === 1 || diffDays === 2) {
                deadlineStyle = "text-orange-400 bg-orange-500/10 border border-orange-500/20 font-bold";
              } else if (diffDays >= 3) {
                deadlineStyle = "text-amber-500/80 bg-amber-500/5 border border-amber-500/10 font-semibold";
              }

              return (
                <div 
                  key={v.id}
                  className="p-4 rounded-2xl border border-zinc-850 bg-zinc-950/40 backdrop-blur-sm relative flex flex-col gap-4 shadow-md group"
                >
                  <div className="flex gap-4">
                    {/* Visual */}
                    <div className="w-16 h-20 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center relative shrink-0">
                      {v.photoUrl ? (
                        <img src={v.photoUrl} alt={v.article?.nom} className="w-full h-full object-cover" />
                      ) : (
                        <DollarSign className="w-6 h-6 text-zinc-700" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="font-bold text-white text-sm truncate">@{v.pseudoAcheteur}</span>
                          {v.botAccount && (
                            <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                              {v.botAccount.name}
                            </span>
                          )}
                        </div>
                        <h3 className="text-white text-xs truncate font-medium mt-1">
                          {v.article?.nom || "Article Standard"}
                        </h3>
                        <div className="flex flex-col gap-1.5 mt-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800/50">
                              {v.article?.commande?.fournisseur || 'N/A'}
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">#{v.article?.id?.slice(0, 8)}</span>
                          </div>
                          {v.article?.commande?.numero?.startsWith('URGENCE') && (
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse w-fit">
                              <AlertTriangle className="w-2 h-2" /> À COMMANDER !
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-900 text-center text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Prix Brut</span>
                      <span className="font-extrabold text-zinc-200">{Number(v.prixVente).toFixed(2)} €</span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l border-zinc-900">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Bénéfice</span>
                      <span className="font-extrabold text-emerald-400">+{Number(v.beneficeNet).toFixed(2)} €</span>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l border-zinc-900">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold">Marge</span>
                      <span className="font-extrabold text-zinc-300">{Math.round(Number(v.margePct))}%</span>
                    </div>
                  </div>

                  {/* Status / Deadline / Actions */}
                  <div className="flex items-center justify-between border-t border-zinc-900 pt-3 text-xs">
                    <div className="flex flex-col gap-1">
                      <div>
                        {v.statut === 'EXPEDIEE' ? (
                          <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Expédiée
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                            À envoyer
                          </span>
                        )}
                      </div>
                      <div>
                        {v.statut !== 'EXPEDIEE' && (
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 tracking-wider uppercase w-fit", deadlineStyle)}>
                            <Clock className="w-2.5 h-2.5" />
                            {deadlineLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {v.lienVente && (
                        <a 
                          href={v.lienVente} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Menu Contextuel */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenPopoverId(openPopoverId === v.id ? null : v.id)
                          }}
                          className="p-1.5 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-500 hover:text-white transition-all cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openPopoverId === v.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenPopoverId(null)} />
                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-950/95 border border-zinc-800/60 backdrop-blur-md shadow-2xl rounded-xl p-1.5 z-30 animate-in slide-in-from-bottom-2 duration-150 flex flex-col gap-0.5 text-left">
                              <button 
                                type="button"
                                onClick={() => handleToggleStatus(v.id, v.statut)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5 text-teal-500" /> 
                                {v.statut === 'EXPEDIEE' ? 'Marquer À Envoyer' : 'Marquer Expédiée'}
                              </button>

                              {v.statut === 'EN_ATTENTE' && (
                                <>
                                  {v.extensionStatut === 'AUCUNE' && (
                                    <button 
                                      type="button"
                                      onClick={() => handleUpdateExtension(v.id, 'DEMANDEE')}
                                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-teal-400 hover:text-white hover:bg-teal-950/30 rounded-lg transition-colors cursor-pointer border-t border-zinc-900"
                                    >
                                      <Clock className="w-3.5 h-3.5" /> 
                                      Demander Allongement (+5j)
                                    </button>
                                  )}
                                  {v.extensionStatut === 'DEMANDEE' && (
                                    <button 
                                      type="button"
                                      onClick={() => handleUpdateExtension(v.id, 'ACCEPTEE')}
                                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-black text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer border-t border-zinc-900"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" /> 
                                      Confirmer Allongement
                                    </button>
                                  )}
                                </>
                              )}

                              <button 
                                type="button"
                                onClick={() => handleOpenEditModal(v)}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-amber-500" /> Modifier la vente
                              </button>

                              <div className="h-px bg-zinc-900 my-1 w-[90%] mx-auto" />

                              <button 
                                type="button"
                                onClick={() => {
                                  setOpenPopoverId(null)
                                  setVenteToDelete(v)
                                }}
                                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Supprimer la vente
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>

      {/* --- MODAL DE CONFIRMATION DE SUPPRESSION HAUTE COUTURE --- */}
      {venteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-red-950/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative shadow-red-950/20 overflow-hidden scale-in-center">
            {/* Top Red Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-rose-500 to-orange-400"></div>
            
            <div className="flex flex-col items-center text-center">
              {/* Animated Warning Icon Icon */}
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 shadow-inner shadow-red-500/5">
                <AlertTriangle className="w-6 h-6 animate-bounce" style={{ animationDuration: '2.5s' }} />
              </div>
              
              <h3 className="text-lg font-extrabold text-zinc-100 mb-1.5">Supprimer la transaction ?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed mb-5">
                Voulez-vous vraiment effacer la vente pour <span className="font-bold text-zinc-200">@{venteToDelete.pseudoAcheteur}</span> ?
                <br/><br/>
                <span className="text-emerald-400 font-medium">⚡ L'article physique sera instantanément remis en STOCK.</span>
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setVenteToDelete(null)}
                  className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const targetId = venteToDelete.id
                    setVenteToDelete(null) // Close modal immediately
                    await executeDelete(targetId)
                  }}
                  className="flex-1 py-2.5 bg-red-600 text-white text-xs font-extrabold rounded-xl hover:bg-red-500 transition-all duration-200 shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: NOUVELLE VENTE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative shadow-emerald-900/10 overflow-hidden">
            {/* Top Glow */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
            
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-5 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Nouvelle Vente</h3>
              </div>
            </div>
            {/* Mode Selector Tabs */}
            <div className="flex p-1 bg-zinc-900/80 border border-zinc-800/60 rounded-xl mb-5 gap-1">
              <button
                type="button"
                onClick={() => setSaleMode('inventory')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  saleMode === 'inventory' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                📦 Stock & Route
              </button>
              <button
                type="button"
                onClick={() => setSaleMode('catalogue')}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                  saleMode === 'catalogue' ? "bg-emerald-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                🛒 Catalogue Sourcing
              </button>
            </div>

            <form onSubmit={handleSaleSubmit} className="space-y-4">
              
              {/* CONDITION 1: STOCK OU TRANSIT */}
              {saleMode === 'inventory' ? (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Sélectionner l'Article</label>
                  <select 
                    required
                    value={saleForm.articleId}
                    onChange={e => setSaleForm({...saleForm, articleId: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 cursor-pointer appearance-none"
                  >
                    <option value="" disabled className="text-zinc-600">Choisir un article...</option>
                    {stock.length === 0 ? (
                      <option disabled>Aucun article en stock ou route dispo</option>
                    ) : (
                      stock.map((a: any) => {
                        const itemTotalCost = (Number(a.prixAchatUnitaire) + Number(a.fraisPortUnitaires)).toFixed(2)
                        const statusBadge = a.statut === 'STOCK' ? '🟢 [Stock]' : '🚚 [Route]'
                        const aliasesLabel = a.aliases && a.aliases.length > 0 ? ` / ${a.aliases.join(' / ')}` : ''
                        return (
                          <option key={a.id} value={a.id}>
                            {statusBadge} [{a.commande.fournisseur}] {a.nom || 'Article Standard'}{aliasesLabel} ({itemTotalCost} €) | Réf: {a.commande.numero}
                          </option>
                        )
                      })
                    )}
                  </select>
                </div>
              ) : (
                /* CONDITION 2: CATALOGUE SOURCING DIRECT */
                <div className="space-y-2.5 animate-in fade-in duration-200">
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Recherche Rapide Sourcing</label>
                  
                  {selectedSourcingItem ? (
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/30 rounded-xl flex flex-col relative group">
                      <button 
                        type="button"
                        onClick={() => setSelectedSourcingItem(null)}
                        className="absolute top-2 right-2 text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-black tracking-wider uppercase text-emerald-500 mb-0.5">
                        Produit Sélectionné ({selectedSourcingItem.account})
                      </span>
                      <p className="text-sm font-bold text-white truncate pr-6">{selectedSourcingItem.title}</p>
                      <p className="text-[10px] text-zinc-500 mt-1 font-mono truncate">{selectedSourcingItem.fiche}</p>
                      
                      <div className="mt-2.5 text-[10px] font-black text-rose-400 bg-rose-950/30 border border-rose-900/30 px-2.5 py-1 rounded w-fit animate-pulse">
                        ⚠️ COMMANDE D'URGENCE GÉNÉRÉE AUTOMATIQUEMENT
                      </div>
                      
                      <div className="mt-3 space-y-1.5 border-t border-emerald-500/20 pt-3">
                        <label className="text-xs font-medium text-emerald-400">Taille de l'article (Optionnel, ex: S, M, L)</label>
                        <input 
                          type="text"
                          placeholder="S, M, L, XL, 38, 40..."
                          value={saleForm.taille}
                          onChange={e => setSaleForm({...saleForm, taille: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50"
                        />
                        <p className="text-[10px] text-zinc-500">Nécessaire pour l'Auto-Sourcing Shein via l'extension.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="Taper le nom du produit, robe, pantalon..."
                        value={sourcingSearch}
                        onChange={e => setSourcingSearch(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/50 placeholder:text-zinc-600"
                      />
                      {isSearchingSourcing && (
                        <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-zinc-500" />
                      )}

                      {/* Live Autocomplete Popover */}
                      {sourcingResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-zinc-900 scrollbar-thin">
                          {sourcingResults.map((item: any, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedSourcingItem(item)
                                setSourcingResults([])
                                setSourcingSearch('')
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-500/10 transition-colors group flex flex-col"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-white group-hover:text-emerald-400 truncate max-w-[75%]">{item.title}</span>
                                <span className="text-[9px] font-black uppercase bg-zinc-900 text-zinc-400 group-hover:bg-emerald-950 group-hover:text-emerald-500 px-1.5 py-0.5 rounded">{item.account}</span>
                              </div>
                              <span className="text-[9px] text-zinc-500 truncate font-mono mt-0.5">{item.fiche}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Pseudo Acheteur</label>
                  <input 
                    type="text" 
                    required
                    placeholder="ex: marion_23"
                    value={saleForm.pseudoAcheteur}
                    onChange={e => setSaleForm({...saleForm, pseudoAcheteur: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-zinc-600" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Prix Vente Brut (€)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    placeholder="0.00"
                    value={saleForm.prixVente}
                    onChange={e => setSaleForm({...saleForm, prixVente: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-zinc-600" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Compte Vinted (Bot)</label>
                <select 
                  value={saleForm.botAccountId}
                  onChange={e => setSaleForm({...saleForm, botAccountId: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50 cursor-pointer appearance-none"
                >
                  <option value="">Sélectionner un compte (Optionnel)</option>
                  {botAccounts.map((bot: any) => (
                    <option key={bot.id} value={bot.id}>
                      🤖 {bot.name.toUpperCase()} ({bot.vintedUsername || 'No Username'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Lien de la vente (Optionnel)</label>
                <input 
                  type="url" 
                  placeholder="https://vinted.fr/..."
                  value={saleForm.lienVente}
                  onChange={e => setSaleForm({...saleForm, lienVente: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-zinc-600" 
                />
              </div>

              {/* Real-time math estimation inside modal if inputs exist */}
              {saleForm.prixVente && selectedArticleData && (
                <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl animate-in zoom-in-95">
                   {(() => {
                     const sellP = parseFloat(saleForm.prixVente)
                     const buyP = Number(selectedArticleData.prixAchatUnitaire) + Number(selectedArticleData.fraisPortUnitaires)
                     const fees = 0.70
                     const profit = sellP - buyP - fees
                     const isProfitable = profit > 0
                     return (
                       <div className="flex items-center justify-between">
                         <div className="text-xs text-zinc-400 space-y-0.5">
                           <p>Coût Article: {buyP.toFixed(2)}€</p>
                           <p>Frais Vinted: {fees.toFixed(2)}€</p>
                         </div>
                         <div className="text-right">
                           <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Profit Estimé</p>
                           <p className={cn("text-xl font-extrabold", isProfitable ? "text-emerald-400" : "text-rose-400")}>
                             {isProfitable ? '+' : ''}{profit.toFixed(2)} €
                           </p>
                         </div>
                       </div>
                     )
                   })()}
                </div>
              )}

              <div className="pt-4 grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-bold hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-4 py-3 rounded-xl bg-white text-black text-sm font-extrabold hover:bg-zinc-200 transition-colors shadow-lg disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : "Valider"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: MODIFIER UNE VENTE EXISTANTE --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative shadow-amber-900/10 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-orange-400"></div>
            
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-5 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <Pencil className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Modifier la Vente</h3>
                <p className="text-[10px] font-medium text-zinc-500 tracking-widest uppercase mt-0.5">Réf Article: #{activeVenteToEdit?.articleId?.slice(0,8)}</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Pseudo Acheteur</label>
                  <input 
                    type="text" 
                    required
                    placeholder="ex: marion_23"
                    value={editForm.pseudoAcheteur}
                    onChange={e => setEditForm({...editForm, pseudoAcheteur: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Prix Vente Brut (€)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    placeholder="0.00"
                    value={editForm.prixVente}
                    onChange={e => setEditForm({...editForm, prixVente: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Statut de l'expédition</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({...editForm, statut: 'EN_ATTENTE'})}
                    className={cn(
                      "py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                      editForm.statut === 'EN_ATTENTE'
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-lg shadow-amber-950/20"
                        : "bg-zinc-900 border-zinc-900 hover:border-zinc-800 text-zinc-500"
                    )}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> À envoyer
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({...editForm, statut: 'EXPEDIEE'})}
                    className={cn(
                      "py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                      editForm.statut === 'EXPEDIEE'
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-950/20"
                        : "bg-zinc-900 border-zinc-900 hover:border-zinc-800 text-zinc-500"
                    )}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Expédiée
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Allongement (+5j)</label>
                  <select
                    value={editForm.extensionStatut}
                    onChange={e => setEditForm({...editForm, extensionStatut: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-500/50 cursor-pointer appearance-none"
                  >
                    <option value="AUCUNE">Aucun</option>
                    <option value="DEMANDEE">⏳ Demande envoyée</option>
                    <option value="ACCEPTEE">✅ Accepté (+5j)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Date Limite Exp.</label>
                  <input 
                    type="date" 
                    value={editForm.dateLimiteExpedition}
                    onChange={e => setEditForm({...editForm, dateLimiteExpedition: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-300 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all cursor-pointer" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Lien de la vente</label>
                <input 
                  type="url" 
                  placeholder="https://vinted.fr/..."
                  value={editForm.lienVente}
                  onChange={e => setEditForm({...editForm, lienVente: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all" 
                />
              </div>

              {/* Real-time profit recalculation preview */}
              {editForm.prixVente && activeVenteToEdit?.article && (
                <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-xs space-y-1 animate-in slide-in-from-top-1">
                  <div className="flex justify-between text-zinc-500">
                    <span>Prix Achat (+ Port) :</span>
                    <span className="font-bold text-zinc-400">
                      {(Number(activeVenteToEdit.article.prixAchatUnitaire) + Number(activeVenteToEdit.article.fraisPortUnitaires)).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Frais Vinted fixes :</span>
                    <span className="font-bold text-zinc-400">{Number(activeVenteToEdit.fraisVinted || 0.70).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-amber-400 border-t border-amber-500/10 pt-1.5 mt-1.5">
                    <span>Estimation Bénéfice Net :</span>
                    <span>
                      {(() => {
                        const sP = parseFloat(editForm.prixVente) || 0
                        const bP = Number(activeVenteToEdit.article.prixAchatUnitaire) + Number(activeVenteToEdit.article.fraisPortUnitaires)
                        const fee = Number(activeVenteToEdit.fraisVinted || 0.70)
                        return (sP - bP - fee).toFixed(2)
                      })()} €
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-4 py-3 rounded-xl bg-amber-500 text-black text-sm font-extrabold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/10 disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
