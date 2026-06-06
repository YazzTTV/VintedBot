"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Shirt,
  Search,
  ChevronDown,
  Loader2,
  Eye,
  Heart,
  Clock,
  Check,
  X,
  Settings2,
  AlertCircle,
  ShoppingBag
} from "lucide-react"
import { cn } from "@/lib/utils"

interface DressingAccount {
  name: string
  vintedUsername: string
  itemCount: number
}

interface DressingItem {
  id: string
  title: string
  price: number | null
  photoUrl: string
  viewCount: number
  favouriteCount: number
  status: string
  url: string
  sourcingUrl: string | null
  uploadedAtVinted: string
}

interface RepostItem {
  itemId: string
  cropPercent: number
  newTitle: string | null
  newDescription: string | null
  newPrice: number | null
  photoOrder: null
}

interface Toast {
  message: string
  type: 'success' | 'error'
}

export default function DressingPage() {
  const [accounts, setAccounts] = useState<DressingAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [items, setItems] = useState<DressingItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<'ACTIF' | 'BROUILLON'>('ACTIF')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showDropdown, setShowDropdown] = useState(false)

  const [showRepostModal, setShowRepostModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateItemInfo, setDuplicateItemInfo] = useState<DressingItem | null>(null)
  
  const [repostLoading, setRepostLoading] = useState(false)
  const [duplicateLoading, setDuplicateLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const [repostForm, setRepostForm] = useState({
    cropPercent: 0,
    newTitle: "",
    newDescription: "",
    newPrice: "",
    minDelaySec: 80,
    maxDelaySec: 120
  })

  const [duplicateForm, setDuplicateForm] = useState({
    destinationAccount: "",
    asDraft: false,
    cropPercent: 0
  })

  // Charger les comptes disponibles
  useEffect(() => {
    const fetchAccounts = async () => {
      setAccountsLoading(true)
      try {
        const res = await fetch('/api/dressing/accounts')
        const data = await res.json()
        if (data.success && data.data) {
          setAccounts(data.data)
          if (data.data.length > 0) {
            setSelectedAccount(data.data[0].name)
          }
        }
      } catch (e) {
        console.error("Failed to load accounts:", e)
        showToast("Erreur lors du chargement des comptes", "error")
      }
      setAccountsLoading(false)
    }

    fetchAccounts()
  }, [])

  // Charger les annonces du compte selectionnee
  useEffect(() => {
    if (!selectedAccount) return

    const fetchItems = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/dressing?botAccountName=${encodeURIComponent(selectedAccount)}`)
        const data = await res.json()
        if (data.success && data.data) {
          setItems(data.data)
          setSelectedItems(new Set())
        }
      } catch (e) {
        console.error("Failed to load items:", e)
        showToast("Erreur lors du chargement des annonces", "error")
      }
      setLoading(false)
    }

    fetchItems()
  }, [selectedAccount])

  // Filtrer les annonces par titre et statut
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (item.status === "Supprimé" || item.status === "Vendu") return false;
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase())
      const isBrouillon = item.status === "Brouillon" || item.status === "Masqué" || item.status?.toLowerCase().includes('hidden') || item.status?.toLowerCase().includes('draft')
      const matchesTab = activeTab === 'BROUILLON' ? isBrouillon : !isBrouillon
      return matchesSearch && matchesTab
    })
  }, [items, searchTerm, activeTab])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }



  const handleRepostSubmit = async () => {
    if (selectedItems.size === 0) return

    setRepostLoading(true)
    try {
      const repostItems: RepostItem[] = Array.from(selectedItems).map(itemId => ({
        itemId,
        cropPercent: repostForm.cropPercent,
        newTitle: repostForm.newTitle || null,
        newDescription: repostForm.newDescription || null,
        newPrice: repostForm.newPrice ? parseFloat(repostForm.newPrice) : null,
        photoOrder: null
      }))

      const res = await fetch('/api/dressing/repost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botAccountName: selectedAccount,
          items: repostItems,
          timing: {
            minDelaySec: repostForm.minDelaySec,
            maxDelaySec: repostForm.maxDelaySec
          }
        })
      })

      const data = await res.json()
      if (data.success) {
        showToast(`${selectedItems.size} republications planifiees`, "success")
        setShowRepostModal(false)
        setSelectedItems(new Set())
        setRepostForm({
          cropPercent: 0,
          newTitle: "",
          newDescription: "",
          newPrice: "",
          minDelaySec: 80,
          maxDelaySec: 120
        })
      } else {
        showToast(data.error || "Erreur lors de la republication", "error")
      }
    } catch (e) {
      console.error("Failed to repost:", e)
      showToast("Erreur reseau ou serveur", "error")
    }
    setRepostLoading(false)
  }

  const handleDuplicateSubmit = async () => {
    if (!duplicateItemInfo || !duplicateForm.destinationAccount) return

    setDuplicateLoading(true)
    try {
      const res = await fetch('/api/extension/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botAccountName: duplicateForm.destinationAccount,
          actionType: 'DUPLICATE_ITEM',
          payload: { 
            sourceItemId: duplicateItemInfo.id,
            asDraft: duplicateForm.asDraft,
            cropPercent: duplicateForm.cropPercent
          }
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Duplication de l'article vers ${duplicateForm.destinationAccount} planifiee`, "success")
        setShowDuplicateModal(false)
        setDuplicateItemInfo(null)
      } else {
        showToast(data.error || "Erreur lors de la duplication", "error")
      }
    } catch (e) {
      console.error("Action error:", e)
      showToast("Erreur reseau", "error")
    }
    setDuplicateLoading(false)
  }

  const handleAction = async (item: DressingItem, actionType: string) => {
    try {
      const res = await fetch('/api/extension/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botAccountName: selectedAccount,
          actionType,
          payload: { itemId: item.id }
        })
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Action ${actionType} planifiee pour ${item.title}`, "success")
      } else {
        showToast(data.error || "Erreur lors de la planification de l'action", "error")
      }
    } catch (e) {
      console.error("Action error:", e)
      showToast("Erreur reseau", "error")
    }
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return "a l'instant"
    if (diffMins < 60) return `il y a ${diffMins}m`
    if (diffHours < 24) return `il y a ${diffHours}h`
    if (diffDays < 7) return `il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR')
  }

  return (
    <div className="flex flex-col gap-4 md:gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full min-h-full relative">

      {/* Ambient background */}
      <div className="fixed top-0 right-0 w-[45%] h-[45%] bg-emerald-500/5 blur-[130px] pointer-events-none rounded-full -z-10" />

      {/* Toast notification */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 p-4 rounded-2xl border shadow-lg backdrop-blur-md z-40 animate-in fade-in slide-in-from-top-2 duration-200",
          toast.type === 'success'
            ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-200"
            : "bg-red-950/80 border-red-500/30 text-red-200"
        )}>
          <p className="text-sm font-medium flex items-center gap-2">
            {toast.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {toast.message}
          </p>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Shirt className="text-emerald-500 w-8 h-8" />
            Dressing
          </h1>
          <p className="text-zinc-400 mt-1.5 text-sm">
            Gerez vos annonces Vinted, repostez et optimisez votre visibilite.
          </p>
        </div>
      </header>

      {/* Account Selector */}
      {accountsLoading ? (
        <div className="p-6 bg-zinc-950/60 border border-zinc-800/60 rounded-2xl flex items-center justify-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
          <p className="text-zinc-400 text-sm">Chargement des comptes...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-6 bg-zinc-950/60 border border-zinc-800/60 rounded-2xl text-center">
          <p className="text-zinc-400 text-sm">Aucun compte Vinted disponible. Lancez une synchro depuis l'extension.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative w-full sm:w-64">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full px-4 py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-300 text-sm font-medium flex items-center justify-between hover:border-emerald-500/30 transition-all"
            >
              <span className="truncate">
                {accounts.find(a => a.name === selectedAccount)?.vintedUsername || "Selectionnez un compte"}
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0 text-zinc-500" />
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-30 overflow-hidden animate-in slide-in-from-top-2 duration-150">
                  {accounts.map((account) => (
                    <button
                      key={account.name}
                      onClick={() => {
                        setSelectedAccount(account.name)
                        setShowDropdown(false)
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-left text-sm font-medium border-b border-zinc-900 last:border-b-0 transition-colors",
                        selectedAccount === account.name
                          ? "bg-emerald-950/30 text-emerald-400"
                          : "text-zinc-300 hover:bg-zinc-900"
                      )}
                    >
                      <div className="font-medium">{account.vintedUsername}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{account.itemCount} annonces</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            Connecte
          </div>
        </div>
      )}

      {/* Search & Actions Bar */}
      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher par titre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-800/80 text-white text-sm rounded-xl placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all"
              />
            </div>

            <div className="flex bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('ACTIF')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  activeTab === 'ACTIF' ? "bg-emerald-600 text-white shadow" : "text-zinc-400 hover:text-white"
                )}
              >
                En ligne
              </button>
              <button
                onClick={() => setActiveTab('BROUILLON')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  activeTab === 'BROUILLON' ? "bg-emerald-600 text-white shadow" : "text-zinc-400 hover:text-white"
                )}
              >
                Brouillons
              </button>
            </div>
          </div>
          
          <div className="text-sm text-zinc-500 text-right">
            {filteredItems.length} annonce{filteredItems.length !== 1 ? 's' : ''} dans cet onglet
          </div>
        </div>
      )}

      {/* Selection Actions Bar */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-md p-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-zinc-300">
              <strong className="text-white">{selectedItems.size}</strong> annonce{selectedItems.size !== 1 ? 's' : ''} selectionnee{selectedItems.size !== 1 ? 's' : ''}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => setSelectedItems(new Set())}
                className="px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Desselectionner
              </button>

              <button
                onClick={() => setShowRepostModal(true)}
                className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
              >
                <Settings2 className="w-4 h-4" />
                Reposter la selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
          <p className="text-sm font-medium text-zinc-400">Chargement de vos annonces...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/50 rounded-3xl py-24 px-6 text-center">
          <ShoppingBag className="w-16 h-16 text-zinc-700 mb-4 stroke-[1]" />
          <h3 className="text-lg font-black text-zinc-300">Aucune annonce</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-xs mx-auto">
            Lancez une synchro depuis l'extension pour importer vos annonces Vinted.
          </p>
        </div>
      ) : (
        <div className="pb-24">
          {/* Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="group relative bg-zinc-950/60 border border-zinc-800/60 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
              >


                {/* Photo & Actions Overlay */}
                <div className="aspect-[3/4] bg-zinc-900 overflow-hidden relative flex items-center justify-center">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ShoppingBag className="w-8 h-8 text-zinc-700" />
                  )}

                  {/* Selection highlight */}
                  {selectedItems.has(item.id) && (
                    <div className="absolute inset-0 bg-emerald-500/20 border-2 border-emerald-500/50 z-0" />
                  )}

                  {/* Hover Buttons */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-center gap-2 p-4 z-10">
                    {activeTab === 'ACTIF' ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedItems(new Set([item.id])); setShowRepostModal(true); }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Reposter
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setDuplicateItemInfo(item);
                            // Selectionner le premier compte par defaut si possible
                            const otherAccounts = accounts.filter(a => a.name !== selectedAccount);
                            setDuplicateForm(prev => ({ ...prev, destinationAccount: otherAccounts.length > 0 ? otherAccounts[0].name : "" }));
                            setShowDuplicateModal(true); 
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Dupliquer
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction(item, 'DELETE_ITEM'); }}
                          className="w-full py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Supprimer
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAction(item, 'PUBLISH_DRAFT'); }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Publier en ligne
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <h3 className="text-xs font-bold text-white line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>

                  {item.price !== null && (
                    <div className="text-sm font-black text-emerald-400">
                      {item.price.toFixed(2)} EUR
                    </div>
                  )}

                  {item.price === null && (
                    <div className="text-sm font-medium text-zinc-500">
                      -
                    </div>
                  )}

                  {/* Engagement Badges */}
                  <div className="flex gap-2 pt-2 border-t border-zinc-800">
                    <div className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-zinc-900/60 rounded text-[10px] font-bold text-blue-400">
                      <Eye className="w-3 h-3" />
                      {item.viewCount}
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-zinc-900/60 rounded text-[10px] font-bold text-rose-400">
                      <Heart className="w-3 h-3" />
                      {item.favouriteCount}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1 pt-2 text-[10px] text-zinc-500 font-medium">
                    <Clock className="w-3 h-3" />
                    {formatRelativeDate(item.uploadedAtVinted)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repost Modal */}
      {showRepostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />

            <button
              onClick={() => setShowRepostModal(false)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
                <Settings2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Reposter la Selection</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{selectedItems.size} annonce{selectedItems.size !== 1 ? 's' : ''} selectionnee{selectedItems.size !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Crop Percent Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-400">Recadrage</label>
                  <span className="text-sm font-bold text-white">{repostForm.cropPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={repostForm.cropPercent}
                  onChange={(e) => setRepostForm({...repostForm, cropPercent: parseInt(e.target.value)})}
                  className="w-full h-2 bg-zinc-900 border border-zinc-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* New Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Nouveau Titre (optionnel)</label>
                <input
                  type="text"
                  placeholder="Laisser vide pour conserver l'original"
                  value={repostForm.newTitle}
                  onChange={(e) => setRepostForm({...repostForm, newTitle: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/30 transition-all"
                />
              </div>

              {/* New Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Nouvelle Description (optionnel)</label>
                <textarea
                  placeholder="Laisser vide pour conserver l'original"
                  value={repostForm.newDescription}
                  onChange={(e) => setRepostForm({...repostForm, newDescription: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/30 transition-all h-24 resize-none"
                />
              </div>

              {/* New Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Nouveau Prix EUR (optionnel)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Laisser vide pour conserver l'original"
                  value={repostForm.newPrice}
                  onChange={(e) => setRepostForm({...repostForm, newPrice: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/30 transition-all"
                />
              </div>

              {/* Delays */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Delai Min (s)</label>
                  <input
                    type="number"
                    min="0"
                    value={repostForm.minDelaySec}
                    onChange={(e) => setRepostForm({...repostForm, minDelaySec: parseInt(e.target.value) || 0})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/30 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">Delai Max (s)</label>
                  <input
                    type="number"
                    min="0"
                    value={repostForm.maxDelaySec}
                    onChange={(e) => setRepostForm({...repostForm, maxDelaySec: parseInt(e.target.value) || 0})}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRepostModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-sm font-medium border border-zinc-800 hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRepostSubmit}
                  disabled={repostLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {repostLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    "Lancer la Republication"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Duplicate Modal */}
      {showDuplicateModal && duplicateItemInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />

            <button
              onClick={() => {
                setShowDuplicateModal(false);
                setDuplicateItemInfo(null);
              }}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                <Shirt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Dupliquer l'annonce</h3>
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{duplicateItemInfo.title}</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Destination Account */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-400">Compte de destination</label>
                <select
                  value={duplicateForm.destinationAccount}
                  onChange={(e) => setDuplicateForm({...duplicateForm, destinationAccount: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/30 transition-all appearance-none"
                >
                  <option value="" disabled>Sélectionner un compte</option>
                  {accounts.filter(a => a.name !== selectedAccount).map(acc => (
                    <option key={acc.name} value={acc.name}>
                      {acc.vintedUsername}
                    </option>
                  ))}
                </select>
                {accounts.filter(a => a.name !== selectedAccount).length === 0 && (
                  <p className="text-xs text-red-400 mt-1">Vous n'avez pas d'autre compte configuré.</p>
                )}
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div>
                  <label className="text-sm font-bold text-white block">Garder en brouillon</label>
                  <span className="text-xs text-zinc-500">Ne pas publier immédiatement l'annonce</span>
                </div>
                <input
                  type="checkbox"
                  checked={duplicateForm.asDraft}
                  onChange={(e) => setDuplicateForm({...duplicateForm, asDraft: e.target.checked})}
                  className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 cursor-pointer accent-blue-500"
                />
              </div>

              {/* Crop Percent */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-400">Recadrage des photos</label>
                  <span className="text-sm font-bold text-white">{duplicateForm.cropPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={duplicateForm.cropPercent}
                  onChange={(e) => setDuplicateForm({...duplicateForm, cropPercent: parseInt(e.target.value)})}
                  className="w-full h-2 bg-zinc-900 border border-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setDuplicateItemInfo(null);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 text-zinc-400 text-sm font-medium border border-zinc-800 hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateSubmit}
                  disabled={duplicateLoading || !duplicateForm.destinationAccount}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {duplicateLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    "Dupliquer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
