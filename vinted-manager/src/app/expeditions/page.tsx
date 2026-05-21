"use client"

import React, { useState, useEffect } from "react"
import { 
  Truck, 
  Package2, 
  CheckCircle, 
  Loader2,
  ChevronRight,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"
import LabelDropzone from "@/components/LabelDropzone"

// Icône WhatsApp personnalisée pour coller au design officiel
const WhatsAppIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.73.44 3.43 1.28 4.93l-1.36 4.98 5.09-1.34c1.45.79 3.08 1.21 4.74 1.21a10 10 0 0 0 10-10c0-5.52-4.48-10-10-10zm5.87 14.22c-.25.7-1.25 1.36-1.72 1.41-.47.05-.93.24-3.06-.58-2.55-.98-4.18-3.55-4.31-3.72-.13-.17-1.02-1.36-1.02-2.6s.64-1.83.87-2.08c.23-.25.5-.31.66-.31.17 0 .33.01.47.02.15.01.35-.05.55.43.2.48.69 1.69.75 1.81.06.12.1.26.02.43-.08.17-.12.27-.24.41-.12.14-.26.31-.37.42-.12.13-.26.27-.11.53.15.26.67 1.1 1.44 1.78.99.88 1.82 1.15 2.08 1.28.26.13.41.11.56-.06.15-.17.66-.76.83-1.03.18-.27.35-.23.59-.14.24.09 1.53.72 1.79.85.26.13.43.2.5.31.07.11.07.64-.18 1.34z"/>
  </svg>
)

export default function ExpeditionsPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  
  // États locaux par carte
  const [transporteurs, setTransporteurs] = useState<Record<string, string>>({})
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({})
  const [trackingNumbers, setTrackingNumbers] = useState<Record<string, string>>({})
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({})
  const [successData, setSuccessData] = useState<Record<string, any>>({})

  const loadPending = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/expeditions')
      const r = await res.json()
      if (r.success) setSales(r.data)
    } catch (e) {
      console.error("Failed to load sales", e)
    }
    setLoading(false)
  }

  useEffect(() => { loadPending() }, [])

  // Callback de sélection de fichier & extraction intelligente du numéro
  const handleFileSelected = (saleId: string, file: File | null, extractedNumber: string) => {
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [saleId]: file }))
      if (extractedNumber) {
        setTrackingNumbers(prev => ({ ...prev, [saleId]: extractedNumber }))
      }
    } else {
      setSelectedFiles(prev => {
        const copy = { ...prev }
        delete copy[saleId]
        return copy
      })
      setTrackingNumbers(prev => {
        const copy = { ...prev }
        delete copy[saleId]
        return copy
      })
    }
  }

  const handleAddTestSale = () => {
    const testSale = {
      id: `test-sale-${Date.now()}`,
      pseudoAcheteur: "ClientTest",
      dateVente: new Date().toISOString(),
      dateLimiteExpedition: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      photoUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80",
      extensionStatut: "AUCUNE",
      isTest: true,
      botAccount: { name: "test-bot" },
      article: {
        id: "test-art-12345",
        nom: "Poussette Test Premium",
        commande: {
          fournisseur: "TEMU"
        }
      }
    }
    setSales(prev => [testSale, ...prev] as any)
  }

  // Soumission de l'upload vers Supabase
  const handleDispatchSubmit = async (saleId: string) => {
    const file = selectedFiles[saleId]
    const transporteur = transporteurs[saleId] || 'Mondial Relay'
    const numeroBordereau = trackingNumbers[saleId] || ''

    if (!file) {
      alert("Veuillez d'abord glisser ou sélectionner le fichier PDF du bordereau.")
      return
    }

    setProcessingIds(prev => ({ ...prev, [saleId]: true }))

    if (saleId.startsWith('test-sale-')) {
      setTimeout(() => {
        const fakeBordereauUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        const sale = sales.find((s: any) => s.id === saleId) as any
        const dateStr = new Date(sale.dateVente).toLocaleDateString('fr-FR')
        const itemPhoto = sale.photoUrl || ""
        
        const message = `Salut Noah ! 📦
[TEST] Nouveau colis à préparer !

👤 *Acheteur :* ${sale.pseudoAcheteur}
🤖 *Compte :* ${sale.botAccount?.name?.toUpperCase() || 'N/A'}
🚚 *Transporteur :* ${transporteur}
${numeroBordereau ? `🔢 *N° Bordereau :* ${numeroBordereau}\n` : ''}📅 *Vendu le :* ${dateStr}

${itemPhoto ? `🖼️ *Photo du produit :*\n${itemPhoto}\n\n` : ''}📄 *Bordereau à imprimer :*
${fakeBordereauUrl}

Merci ! 💪`

        const whatsappUrl = `https://wa.me/33783642205?text=${encodeURIComponent(message)}`
        
        setSuccessData(prev => ({ 
          ...prev, 
          [saleId]: { 
            expedition: { id: "fake-exp", transporteur, bordereauUrl: fakeBordereauUrl },
            whatsappUrl,
            bordereauUrl: fakeBordereauUrl
          } 
        }))
        setProcessingIds(prev => ({ ...prev, [saleId]: false }))
      }, 1000)
      return
    }

    try {
      // Construction du multipart FormData
      const formData = new FormData()
      formData.append('venteId', saleId)
      formData.append('transporteur', transporteur)
      formData.append('numeroBordereau', numeroBordereau)
      formData.append('file', file)

      const res = await fetch('/api/expeditions', {
        method: 'POST',
        body: formData
        // FormData configure automatiquement le bon header de type 'multipart/form-data'
      })
      
      const result = await res.json()
      
      if (result.success) {
        // Sauvegarder les liens de dispatch générés pour cette carte
        setSuccessData(prev => ({ ...prev, [saleId]: result.data }))
      } else {
        throw new Error(result.error || "Erreur serveur lors de l'upload")
      }
    } catch (e: any) {
      alert(`Erreur d'expédition : ${e.message || "Une erreur est survenue"}`)
    } finally {
      setProcessingIds(prev => ({ ...prev, [saleId]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full min-h-full">
      
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Truck className="text-blue-500 w-8 h-8" />
            Logistic Agent
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Préparez les colis et générez les bordereaux Supabase pour Noah.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleAddTestSale}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/80 px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 active:scale-98"
          >
            🧪 Injecter Colis Test
          </button>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
            <span className="text-sm font-bold text-zinc-200">{sales.length} colis en attente</span>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-50 text-white">
           <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
           <p>Récupération des ventes en attente de bordereau...</p>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-zinc-950/50 border border-dashed border-zinc-800 rounded-3xl flex-1 flex flex-col items-center justify-center py-24 text-center">
           <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 mb-4">
             <CheckCircle className="w-12 h-12" />
           </div>
           <h3 className="text-xl font-bold text-white">Logistique à jour !</h3>
           <p className="text-zinc-500 mt-2 text-sm max-w-xs">Tous vos colis vendus ont été transmis au dispatcher ou livrés.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {sales.map((sale: any) => {
            const now = new Date()
            const deadline = sale.dateLimiteExpedition ? new Date(sale.dateLimiteExpedition) : null
            const isExtensionPending = sale.extensionStatut === 'DEMANDEE'
            
            let isLate = false
            let isUrgent = false
            
            if (deadline) {
              const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 3600)
              isLate = now > deadline
              isUrgent = diffHours > 0 && diffHours < 48 // Moins de 48h restantes
            } else {
              const daysElapsed = Math.floor((now.getTime() - new Date(sale.dateVente).getTime()) / (1000 * 3600 * 24))
              isUrgent = daysElapsed >= 2
            }
            
            // Si une extension est demandée, on n'affiche plus d'alerte critique
            // if (isExtensionPending) {
            //   isLate = false
            //   isUrgent = false
            // }

            const isSuccess = !!successData[sale.id]
            
            return (
              <div key={sale.id} className={cn(
                "bg-zinc-950 border rounded-2xl overflow-hidden shadow-xl transition-all duration-300 relative group flex flex-col",
                isSuccess ? "border-emerald-900/40 shadow-emerald-950/5" :
                isLate ? "border-red-900/60 shadow-red-950/10" :
                isUrgent ? "border-rose-900/40 shadow-rose-900/5" : "border-zinc-800/80 hover:border-zinc-700"
              )}>
                
                {/* Étiquette d'État Logistique */}
                {!isSuccess && (
                  <>
                    {isLate && (
                      <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-1 px-4 absolute top-4 -right-8 rotate-45 w-32 shadow-lg z-10">
                        En Retard
                      </div>
                    )}
                    {isUrgent && !isLate && (
                      <div className="bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest text-center py-1 px-4 absolute top-4 -right-8 rotate-45 w-32 shadow-lg z-10">
                        Urgent
                      </div>
                    )}
                  </>
                )}

                {isSuccess ? (
                  /* --- VUE SUCCÈS : DISPATCH WHATSAPP --- */
                  <div className="p-8 flex flex-col items-center justify-center text-center h-full min-h-[360px] animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-500 mb-4">
                      <CheckCircle className="w-12 h-12 animate-pulse" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-white">Prêt pour Noah !</h3>
                    <p className="text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
                      Le bordereau pour <strong>{sale.pseudoAcheteur}</strong> est hébergé sur Supabase.
                    </p>
                    
                    <div className="h-px bg-zinc-900 my-6 w-full"></div>
                    
                    <div className="flex flex-col gap-3 w-full">
                      <a 
                        href={successData[sale.id].whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all active:scale-98 shadow-lg shadow-emerald-950/30 hover:shadow-emerald-900/40"
                      >
                        <WhatsAppIcon className="w-5 h-5" />
                        Dispatcher à Noah sur WhatsApp
                      </a>
                      
                      <button 
                        onClick={() => {
                          // On enlève définitivement l'item de la liste visuelle
                          setSales(prev => prev.filter((s: any) => s.id !== sale.id))
                        }}
                        className="text-xs font-medium text-zinc-500 hover:text-zinc-300 py-2 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        Terminer et masquer l'annonce <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* --- VUE FORMULAIRE : LOGISTIC AGENT --- */
                  <div className="p-6 flex flex-col flex-1">
                    
                    {/* En-tête Produit */}
                    <div className="flex gap-4 items-start">
                      <div className="w-16 h-20 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {sale.photoUrl ? (
                          <img 
                            src={sale.photoUrl} 
                            alt={sale.article.nom || "Produit"} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package2 className="w-6 h-6 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white truncate">Colis pour {sale.pseudoAcheteur}</h3>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                           {sale.botAccount && (
                             <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                               {sale.botAccount.name}
                             </span>
                           )}
                           <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{sale.article.commande.fournisseur}</span>
                           <span>•</span>
                           <span>Vendu le {new Date(sale.dateVente).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-zinc-900 my-5 w-full"></div>

                    {/* Formulaire de Dispatch */}
                    <div className="space-y-4">
                      
                      {/* Sélection Transporteur */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Transporteur</label>
                        <select 
                          className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:border-zinc-700 transition-all"
                          value={transporteurs[sale.id] || 'Mondial Relay'}
                          onChange={(e) => setTransporteurs(prev => ({ ...prev, [sale.id]: e.target.value }))}
                        >
                          <option value="Mondial Relay">Mondial Relay</option>
                          <option value="Relais Colis">Relais Colis</option>
                          <option value="Chronopost">Chronopost</option>
                          <option value="Colissimo">Colissimo</option>
                        </select>
                      </div>

                      {/* Champ N° Bordereau */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                          <span>N° Bordereau (Optionnel)</span>
                          {trackingNumbers[sale.id] && (
                            <span className="text-[10px] text-emerald-400 normal-case flex items-center gap-1 font-semibold animate-pulse">
                              ✨ Extrait automatiquement
                            </span>
                          )}
                        </label>
                        <input
                          type="text"
                          placeholder="Saisir manuellement ou via PDF..."
                          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-600 shadow-inner"
                          value={trackingNumbers[sale.id] || ""}
                          onChange={(e) => setTrackingNumbers(prev => ({ ...prev, [sale.id]: e.target.value }))}
                        />
                      </div>

                      {/* Zone de Drag & Drop PDF */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Bordereau Vinted (PDF)</label>
                        <LabelDropzone 
                          onFileSelected={(file, extracted) => handleFileSelected(sale.id, file, extracted)}
                        />
                      </div>

                    </div>

                    {/* Action de Validation */}
                    <div className="mt-auto pt-6">
                      <button 
                        onClick={() => handleDispatchSubmit(sale.id)}
                        disabled={processingIds[sale.id] || !selectedFiles[sale.id]}
                        className={cn(
                          "w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                          selectedFiles[sale.id] && !processingIds[sale.id]
                            ? "bg-white hover:bg-blue-50 text-black"
                            : "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                        )}
                      >
                        {processingIds[sale.id] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Hébergement Supabase...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" /> Valider et Préparer le Dispatch
                          </>
                        )}
                      </button>
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
