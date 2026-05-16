"use client"

import React, { useState, useEffect } from "react"
import { 
  ShoppingBag, 
  Calendar, 
  DollarSign, 
  Tag, 
  PlusCircle, 
  Loader2, 
  CheckCircle,
  Link as LinkIcon,
  FileText,
  Maximize2,
  X,
  Search,
  Trash2,
  MoreVertical,
  Pencil
} from "lucide-react"
import { cn, addWorkingDays } from "@/lib/utils"

export default function CommandesPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [testClickCount, setTestClickCount] = useState(0)
  const [pastCommandes, setPastCommandes] = useState([])
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyFilter, setHistoryFilter] = useState("")
  
  // NOUVEAU : Gestion Popovers ⋮ & Édition
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeCmdToEdit, setActiveCmdToEdit] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    numero: '',
    fournisseur: 'SHEIN',
    notes: '',
    dateArriveeEstimee: ''
  })

  // NOUVEAU : Gestion Modal Validation Rapide
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false)
  const [validationCmd, setValidationCmd] = useState<any>(null)
  const [validationNum, setValidationNum] = useState('')
  
  // NOUVEAU : États pour le moteur d'importation Sourcing direct
  const [sourcingQuery, setSourcingQuery] = useState("")
  const [sourcingHits, setSourcingHits] = useState([])
  const [isSearchingHits, setIsSearchingHits] = useState(false)

  // Champs de formulaire contrôlés
  const [formData, setFormData] = useState({
    numero: '',
    fournisseur: 'SHEIN',
    dateCommande: new Date().toISOString().split('T')[0],
    prixTotal: '',
    fraisPort: '0',
    notes: '',
    dateArriveeEstimee: '',
    trackingNumber: '',
    carrier: ''
  })

  // NOUVEAU : Panier de commande multi-produits
  const [panier, setPanier] = useState<Array<{ nom: string, lien: string, quantite: number, prixUnitaire: string }>>([
    { nom: '', lien: '', quantite: 1, prixUnitaire: '' }
  ])

  // Calcul du nombre total d'articles cumulés
  const totalArticles = panier.reduce((acc, curr) => acc + (Number(curr.quantite) || 0), 0)

  // Calcul du sous-total comptable des articles (somme des qtés * prix unitaires)
  const itemsSubtotal = panier.reduce((acc, item) => {
    const qty = Number(item.quantite) || 0
    const price = parseFloat(item.prixUnitaire) || 0
    return acc + (qty * price)
  }, 0)

  // Effet d'asservissement dynamique : Recalcul automatique du total facturé à chaque frappe
  useEffect(() => {
    const shipping = parseFloat(formData.fraisPort) || 0
    const finalTotal = (itemsSubtotal + shipping).toFixed(2)
    setFormData(prev => ({ ...prev, prixTotal: finalTotal }))
  }, [itemsSubtotal, formData.fraisPort])

  const handleAddRow = () => {
    setPanier(prev => [...prev, { nom: '', lien: '', quantite: 1, prixUnitaire: '' }])
  }

  const handleUpdateRow = (index: number, key: string, value: any) => {
    setPanier(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [key]: value }
      return updated
    })
  }

  const handleRemoveRow = (index: number) => {
    if (panier.length <= 1) return
    setPanier(prev => prev.filter((_, i) => i !== index))
  }

  // NOUVEAU : Effet de recherche temps réel Sourcing direct
  useEffect(() => {
    if (sourcingQuery.length < 2) {
      setSourcingHits([])
      return
    }
    const delayFn = setTimeout(async () => {
      setIsSearchingHits(true)
      try {
        const res = await fetch(`/api/sourcing?q=${encodeURIComponent(sourcingQuery)}`)
        const d = await res.json()
        if (d.success) setSourcingHits(d.data)
      } catch (e) {}
      setIsSearchingHits(false)
    }, 400)
    return () => clearTimeout(delayFn)
  }, [sourcingQuery])

  const handlePresetArrival = (days: number) => {
    const base = formData.dateCommande ? new Date(formData.dateCommande) : new Date()
    const future = addWorkingDays(base, days)
    setFormData(prev => ({ ...prev, dateArriveeEstimee: future.toISOString().split('T')[0] }))
  }

  // Setup auto-reload past commands
  const fetchCommandes = async () => {
    try {
      // Utilisation d'un paramètre cache-buster pour rafraîchir instantanément
      const res = await fetch(`/api/commandes?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      const json = await res.json()
      if (json.success) setPastCommandes(json.data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchCommandes() }, [])

  const handleChange = (e: any) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (totalArticles <= 0) {
      alert("Veuillez ajouter au moins un article dans le panier.")
      return
    }

    setIsLoading(true)
    setIsSuccess(false)
    
    try {
      const payload = {
        ...formData,
        nbArticles: totalArticles,
        panier: panier,
        trackingNumber: formData.trackingNumber || undefined,
        carrier: formData.carrier || undefined
      }

      const res = await fetch('/api/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const result = await res.json()
      
      if (result.success) {
        setIsSuccess(true)
        
        // Réinitialiser le formulaire tout en gardant la date du jour
        setFormData(prev => ({
          ...prev,
          numero: '',
          prixTotal: '',
          notes: '',
          dateArriveeEstimee: '',
          trackingNumber: '',
          carrier: ''
        }))

        // Réinitialiser le panier avec 1 ligne vide
        setPanier([{ nom: '', lien: '', quantite: 1, prixUnitaire: '' }])
        
        fetchCommandes() // Rafraîchir la liste historique
        setTimeout(() => setIsSuccess(false), 4000)
      } else {
        alert("Erreur lors de l'enregistrement : " + (result.error || 'Erreur Inconnue'))
      }
    } catch (err) {
      alert("Erreur de connexion API")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkArrived = async (cmdId: string, e?: any) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!window.confirm("Confirmer l'arrivée de ce colis ? Les articles seront ajoutés à votre stock disponible.")) return
    try {
      const res = await fetch(`/api/commandes/${cmdId}/arrivee`, { method: 'POST' })
      const d = await res.json()
      if (d.success) {
        fetchCommandes()
      } else {
        alert(d.error || "Erreur")
      }
    } catch (e) { 
      alert("Erreur de communication") 
    }
  }

  const handleDeleteCommande = async (id: string, e?: any) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (!window.confirm("⚠️ ES-TU SÛR ? Supprimer cette commande supprimera également TOUS ses articles reliés du stock. Cette action est irréversible.")) return
    
    setOpenPopoverId(null)
    
    try {
      const res = await fetch(`/api/commandes/${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        fetchCommandes()
      } else {
        alert("❌ Erreur : " + (d.error || "Inconnue"))
      }
    } catch (e) {
      console.error("Delete Error:", e)
    }
  }

  const handleOpenEditModal = (cmd: any) => {
    setOpenPopoverId(null)
    setActiveCmdToEdit(cmd)
    setEditForm({
      numero: cmd.numero,
      fournisseur: cmd.fournisseur,
      notes: cmd.notes || '',
      dateArriveeEstimee: cmd.dateArriveeEstimee ? new Date(cmd.dateArriveeEstimee).toISOString().substring(0, 10) : ''
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCmdToEdit) return
    try {
      const res = await fetch(`/api/commandes/${activeCmdToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      const d = await res.json()
      if (d.success) {
        setIsEditModalOpen(false)
        fetchCommandes()
      } else {
        alert("❌ Erreur : " + (d.error || "Inconnue"))
      }
    } catch (e) {
      alert("🚨 Impossible d'enregistrer les modifications.")
    }
  }

  const handleOpenValidateModal = (cmd: any) => {
    setOpenPopoverId(null)
    setValidationCmd(cmd)
    setValidationNum(cmd.numero.replace('URGENCE_', ''))
    setIsValidateModalOpen(true)
  }

  const handleValidationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validationCmd || !validationNum.trim()) return
    
    try {
      const res = await fetch(`/api/commandes/${validationCmd.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: validationNum.trim(),
          fournisseur: validationCmd.fournisseur,
          notes: validationCmd.notes,
          dateArriveeEstimee: validationCmd.dateArriveeEstimee
        })
      })
      const d = await res.json()
      if (d.success) {
        setIsValidateModalOpen(false)
        fetchCommandes()
      } else {
        alert("❌ Erreur : " + (d.error || "Inconnue"))
      }
    } catch (e) {
      alert("🚨 Impossible de valider la commande.")
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">Commandes Fournisseurs</h1>
        <p className="text-zinc-400 mt-1 text-sm">Enregistrez vos nouveaux achats en gros. Les articles seront générés automatiquement dans le stock.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-8 shadow-2xl shadow-black/40 backdrop-blur-sm relative overflow-hidden">
            
            {/* Subdued ambient gradient inside card */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none -z-10" />
            
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" />
              Saisie Nouvelle Commande
            </h2>

            {/* NOUVEAU : WIDGET DE RECHERCHE DANS LE SOURCING DIRECT */}
            <div className="mb-8 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 relative animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-black uppercase tracking-wider text-emerald-500 mb-2 block flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" /> Importer depuis le Sourcing Direct
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  value={sourcingQuery}
                  onChange={(e) => setSourcingQuery(e.target.value)}
                  placeholder="Rechercher un produit catalogué par le bot (ex: Robe, Pantalon, ID)..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white text-sm rounded-xl pl-4 pr-10 py-2.5 focus:border-emerald-500/50 outline-none placeholder:text-zinc-600 transition-all"
                />
                {isSearchingHits && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-zinc-500" />
                )}
              </div>

              {/* Autocomplete Results Dropdown */}
              {sourcingHits.length > 0 && (
                <div className="absolute left-4 right-4 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-zinc-900 scrollbar-thin">
                  {sourcingHits.map((hit: any, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        const isShein = hit.url.toLowerCase().includes('shein')
                        
                        setPanier(prev => {
                          const updated = [...prev]
                          // Est-ce qu'on a une seule ligne vide initiale ? On la réutilise.
                          const isEmptyRow = updated.length === 1 && !updated[0].nom && !updated[0].lien
                          
                          if (isEmptyRow) {
                            updated[0] = { nom: hit.title, lien: hit.url, quantite: 1, prixUnitaire: '' }
                          } else {
                            updated.push({ nom: hit.title, lien: hit.url, quantite: 1, prixUnitaire: '' })
                          }
                          return updated
                        })

                        // Auto-sélection du fournisseur lors du premier import
                        if (panier.length === 1 && !panier[0].nom && !panier[0].lien) {
                          setFormData(prev => ({
                            ...prev,
                            fournisseur: isShein ? 'SHEIN' : 'TEMU'
                          }))
                        }
                        
                        setSourcingHits([])
                        setSourcingQuery("") // Vider la recherche
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-emerald-500/5 transition-colors flex flex-col gap-0.5 group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors truncate">{hit.title}</p>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800/50 group-hover:border-emerald-500/30 group-hover:text-emerald-400">{hit.account}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate font-mono">{hit.fiche}</p>
                    </button>
                  ))}
                </div>
              )}
              
              <p className="text-[10px] text-zinc-500 mt-2 leading-snug">💡 Sélectionner un produit pré-remplit instantanément le lien d'achat, détecte le fournisseur (Shein/Temu) et renseigne les notes de suivi !</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Supplier Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Fournisseur</label>
                <select 
                  name="fournisseur" 
                  value={formData.fournisseur}
                  onChange={handleChange}
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="SHEIN">🛍️ SHEIN</option>
                  <option value="TEMU">📦 TEMU</option>
                  <option value="AUTRE">🏷️ AUTRE</option>
                </select>
              </div>

              {/* Order Reference */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Numéro de Commande</label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="numero"
                    required
                    value={formData.numero}
                    onChange={handleChange}
                    placeholder="ex: SH24998111..." 
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all"
                  />
                  <ShoppingBag className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Date input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Date de Commande</label>
                <div className="relative">
                  <input 
                    type="date" 
                    name="dateCommande"
                    required
                    value={formData.dateCommande}
                    onChange={handleChange}
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                  />
                  <Calendar className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Estimated Arrival Box - Compact inside grid */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex justify-between">
                  <span>Arrivée Estimée</span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Presets</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { l: "4-7j", d: 7 },
                    { l: "6-9j", d: 9 },
                    { l: "7-12j", d: 12 },
                    { l: "8-15j", d: 15 },
                  ].map(p => (
                    <button 
                      key={p.l}
                      type="button"
                      onClick={() => handlePresetArrival(p.d)}
                      className="text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg py-1 text-zinc-400 hover:text-emerald-400 transition-all"
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input 
                    type="date" 
                    name="dateArriveeEstimee"
                    value={formData.dateArriveeEstimee}
                    onChange={handleChange}
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                  />
                  <Calendar className="w-5 h-5 text-emerald-600 absolute left-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Total cost */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex justify-between">
                  <span>Prix Total Payé</span>
                  <span className="text-[10px] text-teal-400 font-black tracking-widest animate-pulse bg-teal-950/50 border border-teal-900/50 px-1.5 py-0.5 rounded">✨ AUTO</span>
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01"
                    name="prixTotal"
                    required
                    readOnly
                    value={formData.prixTotal}
                    placeholder="0.00"
                    className="w-full bg-zinc-900/30 border border-zinc-800/60 text-teal-400 rounded-xl pl-11 pr-10 py-3 text-sm font-black outline-none opacity-90 transition-all shadow-inner cursor-not-allowed"
                  />
                  <DollarSign className="w-5 h-5 text-teal-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <span className="text-teal-600/70 absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold">€</span>
                </div>
              </div>

              {/* Shipping fees */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Frais de Port Inclus</label>
                <div className="relative">
                  <input 
                    type="number" 
                    step="0.01"
                    name="fraisPort"
                    value={formData.fraisPort}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-11 pr-10 py-3 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all"
                  />
                  <span className="text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2 text-sm">€</span>
                </div>
              </div>

              {/* --- SECTION PANIER INTERACTIF --- */}
              <div className="md:col-span-2 mt-4 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                  <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4" /> Contenu du Panier ({panier.length} modèles)
                  </h3>
                  <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-emerald-500" />
                    Total : <strong className="text-white text-sm">{totalArticles}</strong> articles
                  </div>
                </div>

                <div className="space-y-3">
                  {panier.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex flex-col md:flex-row items-start gap-3 bg-zinc-900/30 border border-zinc-900 p-3.5 rounded-xl transition-all group hover:border-zinc-800 animate-in zoom-in-95 duration-200"
                    >
                      {/* Qté */}
                      <div className="w-full md:w-20 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider md:hidden">Qté</label>
                        <input 
                          type="number"
                          min="1"
                          required
                          value={item.quantite}
                          onChange={(e) => handleUpdateRow(idx, 'quantite', e.target.value)}
                          placeholder="Qté"
                          className="w-full bg-zinc-950 border border-zinc-800 text-white text-center font-bold px-2 py-2 rounded-lg text-sm focus:border-emerald-500/50 outline-none"
                        />
                      </div>

                      {/* Prix Unit */}
                      <div className="w-full md:w-24 flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider md:hidden">Prix Unit.</label>
                        <div className="relative w-full">
                          <input 
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={item.prixUnitaire}
                            onChange={(e) => handleUpdateRow(idx, 'prixUnitaire', e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-zinc-950 border border-zinc-800 text-emerald-400 font-bold pl-2 pr-6 py-2 rounded-lg text-sm focus:border-emerald-500/50 outline-none text-right placeholder:text-zinc-700"
                          />
                          <span className="text-[10px] text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 font-medium">€</span>
                        </div>
                      </div>

                      {/* Nom de l'article */}
                      <div className="flex-1 w-full flex flex-col gap-1.5">
                        <input 
                          type="text"
                          required
                          value={item.nom}
                          onChange={(e) => handleUpdateRow(idx, 'nom', e.target.value)}
                          placeholder="Désignation / Modèle de l'article (ex: Robe noire chic...)"
                          className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg text-sm focus:border-emerald-500/50 outline-none placeholder:text-zinc-600 transition-all"
                        />
                      </div>

                      {/* Lien Produit */}
                      <div className="w-full md:w-1/3 flex flex-col gap-1.5">
                        <input 
                          type="url"
                          value={item.lien}
                          onChange={(e) => handleUpdateRow(idx, 'lien', e.target.value)}
                          placeholder="Lien du produit (optionnel)"
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 px-3 py-2 rounded-lg text-xs font-mono focus:border-emerald-500/50 outline-none placeholder:text-zinc-600 transition-all"
                        />
                      </div>

                      {/* Action Supprimer */}
                      <button
                        type="button"
                        disabled={panier.length <= 1}
                        onClick={() => handleRemoveRow(idx)}
                        className="p-2 bg-zinc-950 hover:bg-red-950/30 hover:text-red-400 border border-zinc-800 text-zinc-500 disabled:opacity-20 rounded-lg transition-all cursor-pointer h-[38px] self-end md:self-auto flex items-center justify-center flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button 
                  type="button"
                  onClick={handleAddRow}
                  className="mt-1 self-start text-xs font-bold text-zinc-400 hover:text-emerald-400 bg-zinc-900/60 hover:bg-zinc-900 hover:border-emerald-500/30 border border-zinc-800 py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-black/40 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Ajouter une ligne au panier
                </button>
              </div>

              {/* Notes full width */}
              <div className="md:col-span-2 space-y-2 mt-2">
                <label className="text-sm font-medium text-zinc-300">Notes Interne</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Détails sur les tailles, lots spécifiques..."
                    className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all resize-none"
                  />
                  <FileText className="w-5 h-5 text-zinc-500 absolute left-4 top-4" />
                </div>
              </div>

              {/* Numéro de suivi (optionnel) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Numéro de suivi (optionnel)</label>
                <input
                  type="text"
                  name="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={handleChange}
                  placeholder="ex: LY123456789CN"
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>

              {/* Transporteur (optionnel) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Transporteur (optionnel)</label>
                <select
                  name="carrier"
                  value={formData.carrier}
                  onChange={handleChange}
                  className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="">Auto-détection</option>
                  <option value="colissimo">Colissimo</option>
                  <option value="chinapost">China Post</option>
                  <option value="4px">4PX</option>
                  <option value="yanwen">Yanwen</option>
                  <option value="cainiao">Cainiao</option>
                  <option value="yunexpress">Yun Express</option>
                </select>
              </div>
            </div>

            {/* Submit Action */}
            <div className="mt-8 flex flex-col items-center gap-4">
              <button 
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full relative flex items-center justify-center gap-2 px-6 py-3.5 font-bold text-black rounded-xl transition-all duration-300 group overflow-hidden shadow-xl shadow-emerald-500/10",
                  isSuccess ? "bg-emerald-500 text-white" : "bg-white hover:bg-zinc-200"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Enregistrement en cours...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5 animate-bounce" />
                    <span>Commande et Articles créés avec succès !</span>
                  </>
                ) : (
                  <>
                    <span>Générer la Commande et le Stock</span>
                  </>
                )}
              </button>
              
              {/* Dynamic micro-math for psychological boost */}
              {formData.prixTotal && totalArticles > 0 && (
                <p className="text-xs text-emerald-500/80 animate-in fade-in slide-in-from-bottom-1 font-medium">
                  💡 Coût d'achat calculé : <strong>{(parseFloat(formData.prixTotal) / totalArticles).toFixed(2)}€</strong> par article.
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Recent History Column */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 h-full backdrop-blur-sm flex flex-col shadow-lg">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">Dernières saisies</h2>
              {pastCommandes.length > 0 && (
                <button 
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 flex items-center gap-1 uppercase tracking-wider transition-colors"
                >
                  <Maximize2 className="w-3 h-3" /> Voir Tout
                </button>
              )}
            </div>
            
            {pastCommandes.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-50">
                <ShoppingBag className="w-12 h-12 mb-3 stroke-[1]" />
                <p className="text-sm">Aucune commande passée.</p>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
                {pastCommandes
                  .filter((c: any) => c.statut !== 'RECUE')
                  .map((cmd: any) => {
                    const isLate = cmd.dateArriveeEstimee && (new Date(cmd.dateArriveeEstimee) < new Date())
                    const isUrgence = cmd.numero.startsWith('URGENCE_')
                    
                    return (
                      <div 
                        key={cmd.id} 
                        className={cn(
                          "p-4 rounded-xl bg-zinc-900/50 border transition-all flex flex-col gap-3 group relative",
                          isUrgence 
                            ? "border-rose-600 shadow-lg shadow-rose-900/10 animate-pulse hover:border-rose-500" 
                            : isLate 
                              ? "border-amber-800 hover:border-amber-700"
                              : "border-zinc-800 hover:border-zinc-700"
                        )}
                      >
                        
                         <div className="flex justify-between items-start">
                           <div>
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "text-xs font-bold tracking-wider transition-colors flex-shrink-0",
                                isUrgence ? "text-rose-400" : isLate ? "text-amber-500" : "text-emerald-500"
                              )}>
                                {cmd.fournisseur}
                              </p>
                              {isUrgence && (
                                <span className="px-1.5 py-0.5 bg-rose-600 text-[8px] font-black text-white rounded animate-pulse flex items-center gap-0.5 tracking-wider uppercase flex-shrink-0">
                                  🚨 À commander
                                </span>
                              )}
                            </div>
                            <p className={cn(
                              "text-sm font-semibold truncate mt-0.5",
                              isUrgence ? "text-rose-200 font-mono text-xs" : "text-white"
                            )}>{cmd.numero}</p>
                          </div>
                          <div className="flex items-center gap-1 relative flex-shrink-0">
                            <span className={cn(
                              "text-sm font-bold px-2 py-1 rounded-md",
                              isUrgence ? "bg-rose-950/40 text-rose-400 border border-rose-900/40" : "text-zinc-200 bg-zinc-800"
                            )}>{cmd.prixTotal} €</span>
                            
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setOpenPopoverId(openPopoverId === cmd.id ? null : cmd.id)}
                                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {openPopoverId === cmd.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenPopoverId(null)} />
                                  <div className="absolute right-0 mt-1 w-32 rounded-xl bg-zinc-950 border border-zinc-800 p-1.5 shadow-2xl z-20 animate-in fade-in zoom-in-95 duration-100 text-left">
                                    {isUrgence && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenValidateModal(cmd)}
                                        className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-lg cursor-pointer border-b border-zinc-900 pb-1.5 mb-1"
                                      >
                                        <CheckCircle className="w-3 h-3" /> Valider commande
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(cmd)}
                                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg cursor-pointer"
                                    >
                                      <Pencil className="w-3 h-3 text-amber-500" /> Modifier
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCommande(cmd.id)}
                                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg cursor-pointer border-t border-zinc-900 mt-1 pt-1.5"
                                    >
                                      <Trash2 className="w-3 h-3" /> Supprimer
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                    
                    <div className="flex justify-between items-center text-xs text-zinc-500">
                      <span className="flex items-center gap-1">📅 {new Date(cmd.dateCommande).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {cmd.nbArticles} arts</span>
                    </div>

                    {cmd.dateArriveeEstimee && (
                      <div className={cn(
                        "text-[11px] font-bold border px-2 py-1 rounded-md inline-flex items-center gap-1.5 w-fit transition-all",
                        isLate 
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}>
                        🚚 {isLate ? 'RETARD : ' : 'ETA : '} {new Date(cmd.dateArriveeEstimee).toLocaleDateString()}
                      </div>
                    )}

                    {isUrgence && cmd.lienProduit && (
                      <a 
                        href={cmd.lienProduit} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-2 w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-900/20 animate-pulse"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Commander chez le Fournisseur
                      </a>
                    )}

                    <button 
                      type="button"
                      onClick={(e) => handleMarkArrived(cmd.id, e)}
                      className={cn(
                        "mt-1 w-full py-2 text-white text-[11px] font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 z-30 relative cursor-pointer",
                        isLate 
                          ? "bg-amber-600 hover:bg-amber-500 shadow-amber-900/10" 
                          : "bg-emerald-600/90 hover:bg-emerald-500"
                      )}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Recevoir & Mettre en Stock
                    </button>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- FULL HISTORY MODAL OVERLAY --- */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-black/80 animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl shadow-black/80 overflow-hidden relative">
            
            {/* Header overlay */}
            <div className="p-6 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-500" />
                  Historique Complet des Commandes
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">{pastCommandes.length} commandes enregistrées au total</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    value={historyFilter}
                    onChange={e => setHistoryFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg pl-8 pr-3 py-2 focus:border-zinc-600 outline-none w-48"
                  />
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button 
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content List Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastCommandes
                  .filter((c: any) => 
                    c.numero.toLowerCase().includes(historyFilter.toLowerCase()) || 
                    c.fournisseur.toLowerCase().includes(historyFilter.toLowerCase())
                  )
                  .map((cmd: any) => {
                    const isLate = cmd.dateArriveeEstimee && (new Date(cmd.dateArriveeEstimee) < new Date()) && cmd.statut !== 'RECUE'
                    const isUrgence = cmd.numero.startsWith('URGENCE_') && cmd.statut !== 'RECUE'
                    
                    return (
                    <div key={cmd.id} className={cn(
                      "p-5 border rounded-2xl transition-all flex flex-col justify-between h-full shadow-sm relative overflow-hidden",
                      cmd.statut === 'RECUE' 
                        ? "bg-zinc-900/20 border-zinc-800 opacity-80" 
                        : isUrgence
                          ? "bg-zinc-900/50 border-rose-600 shadow-lg shadow-rose-950/10 animate-pulse hover:border-rose-500"
                          : isLate 
                            ? "bg-zinc-900/50 border-amber-800/40 shadow-amber-900/5"
                            : "bg-zinc-900/50 border-emerald-800/30 hover:border-emerald-500/50 shadow-emerald-900/5"
                    )}>
                       <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded flex-shrink-0",
                              isLate ? "bg-amber-950/50 text-amber-400" :
                              cmd.fournisseur === 'SHEIN' ? "bg-zinc-800 text-white" : "bg-blue-950/50 text-blue-400"
                            )}>
                              {cmd.fournisseur}
                            </span>
                            {isUrgence && (
                              <span className="px-1.5 py-0.5 bg-rose-600 text-[8px] font-black text-white rounded animate-pulse flex items-center gap-0.5 tracking-wider uppercase flex-shrink-0">
                                🚨 À passer
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 relative">
                            {cmd.statut === 'RECUE' ? (
                              <span className="text-[9px] font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                                <CheckCircle className="w-2.5 h-2.5" /> Archivée
                              </span>
                            ) : (
                              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg flex-shrink-0">
                                {cmd.prixTotal} €
                              </span>
                            )}

                            <div className="relative flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => setOpenPopoverId(openPopoverId === `hist-${cmd.id}` ? null : `hist-${cmd.id}`)}
                                className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {openPopoverId === `hist-${cmd.id}` && (
                                <>
                                  <div className="fixed inset-0 z-[60]" onClick={() => setOpenPopoverId(null)} />
                                  <div className="absolute right-0 mt-1 w-32 rounded-xl bg-zinc-950 border border-zinc-800 p-1.5 shadow-2xl z-[70] animate-in fade-in zoom-in-95 duration-100 text-left">
                                    {isUrgence && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenValidateModal(cmd)}
                                        className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-lg cursor-pointer border-b border-zinc-900 pb-1.5 mb-1"
                                      >
                                        <CheckCircle className="w-3 h-3" /> Valider commande
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(cmd)}
                                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg cursor-pointer"
                                    >
                                      <Pencil className="w-3 h-3 text-amber-500" /> Modifier
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCommande(cmd.id)}
                                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg cursor-pointer border-t border-zinc-900 mt-1 pt-1.5"
                                    >
                                      <Trash2 className="w-3 h-3" /> Supprimer
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1 font-mono flex items-center gap-2">
                          {cmd.numero}
                        </h4>
                        <p className="text-xs text-zinc-500 mb-4">📅 {new Date(cmd.dateCommande).toLocaleDateString('fr-FR', { dateStyle: 'medium' })}</p>
                      </div>
                      
                      <div className="border-t border-zinc-800/50 pt-3 flex flex-col gap-2 mt-auto">
                        <div className="flex justify-between text-[11px] text-zinc-400">
                          <span>Arts: <span className="font-bold text-zinc-200">{cmd.nbArticles}</span></span>
                          <span>Coût: <span className="font-bold text-zinc-200">{cmd.prixTotal}€</span></span>
                        </div>
                        
                        {cmd.dateArriveeEstimee && (
                            <div className={cn(
                              "text-[10px] font-bold border px-2 py-1 rounded flex items-center justify-center gap-1.5 w-full mt-1",
                              isLate 
                                ? "bg-amber-900/30 text-amber-400 border-amber-500/30" 
                                : "bg-emerald-900/20 text-emerald-400 border-emerald-900/20"
                            )}>
                              🚚 {isLate ? 'RETARD PRÉVU : ' : 'Prévu : '} {new Date(cmd.dateArriveeEstimee).toLocaleDateString()}
                            </div>
                        )}
                        
                        {isUrgence && cmd.lienProduit && (
                          <a 
                            href={cmd.lienProduit} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="mt-1 w-full font-black py-1.5 px-3 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-md"
                          >
                            <ShoppingBag className="w-3 h-3" /> Commander chez le Fournisseur
                          </a>
                        )}
                        
                        {cmd.statut !== 'RECUE' ? (
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkArrived(cmd.id, e);
                            }}
                            className={cn(
                              "mt-2 w-full font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1.5 text-white z-30 relative cursor-pointer",
                              isLate ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"
                            )}
                          >
                            <CheckCircle className="w-3 h-3" /> Entrer en Stock
                          </button>
                        ) : (
                          <div className="mt-2 w-full bg-zinc-900 text-zinc-500 font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center justify-center gap-1.5">
                            ✅ Reçue & Stoquée
                          </div>
                        )}
                      </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: MODIFIER UNE COMMANDE EXISTANTE --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400"></div>
            
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute right-4 top-5 p-2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                <Pencil className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Modifier la Commande</h3>
                <p className="text-[10px] font-medium text-zinc-500 tracking-widest uppercase mt-0.5">Réf: {activeCmdToEdit?.numero}</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Fournisseur</label>
                <select 
                  value={editForm.fournisseur}
                  onChange={e => setEditForm({...editForm, fournisseur: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500/50 transition-all cursor-pointer"
                >
                  <option value="SHEIN">🛍️ SHEIN</option>
                  <option value="TEMU">📦 TEMU</option>
                  <option value="AUTRE">🏷️ AUTRE</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Numéro de Commande</label>
                <input 
                  type="text" 
                  required
                  value={editForm.numero}
                  onChange={e => setEditForm({...editForm, numero: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 transition-all" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Arrivée Estimée</label>
                <input 
                  type="date" 
                  value={editForm.dateArriveeEstimee}
                  onChange={e => setEditForm({...editForm, dateArriveeEstimee: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 outline-none focus:border-amber-500/50 transition-all cursor-pointer [color-scheme:dark]" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Notes Interne</label>
                <textarea 
                  rows={2}
                  value={editForm.notes}
                  onChange={e => setEditForm({...editForm, notes: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 transition-all resize-none" 
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-900/20 cursor-pointer"
                >
                  Enregistrer les modifications
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DÉDIÉ: VALIDER LA COMMANDE --- */}
      {isValidateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-emerald-800/30 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
            
            <button 
              onClick={() => setIsValidateModalOpen(false)}
              className="absolute right-4 top-5 p-2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Valider la Commande</h3>
                <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Passage en commande officielle</p>
              </div>
            </div>

            <form onSubmit={handleValidationSubmit} className="space-y-5">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Saisis le numéro de suivi final fourni par le fournisseur. Cela validera la commande et la fera passer en vert.
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-emerald-500 uppercase tracking-wider">N° Commande Final</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={validationNum}
                  onChange={e => setValidationNum(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 text-white rounded-xl px-4 py-3 text-base font-bold outline-none transition-all" 
                  placeholder="ex: SH39294920..."
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsValidateModalOpen(false)}
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold py-3 rounded-xl border border-zinc-800 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 cursor-pointer"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
