"use client"

import React, { useState, useEffect, useMemo } from "react"
import { 
  MessageSquare, 
  User, 
  Search, 
  Tag, 
  Check, 
  X, 
  Send, 
  Loader2, 
  ExternalLink,
  Clock,
  DollarSign,
  AlertCircle,
  ArrowRightLeft
} from "lucide-react"
import { cn } from "@/lib/utils"

// Palette de couleurs signature par compte pour repérage immédiat
const ACCOUNT_COLORS: Record<string, { bg: string, text: string, border: string, glow: string }> = {
  lena: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", glow: "shadow-[0_0_8px_rgba(168,85,247,0.2)]" },
  margaux: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", glow: "shadow-[0_0_8px_rgba(16,185,129,0.2)]" },
  nina: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", glow: "shadow-[0_0_8px_rgba(6,182,212,0.2)]" },
  orane: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", glow: "shadow-[0_0_8px_rgba(245,158,11,0.2)]" },
  emma: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", glow: "shadow-[0_0_8px_rgba(244,63,94,0.2)]" },
}

const getAccountStyle = (name: string) => {
  const cleanName = name.toLowerCase()
  return ACCOUNT_COLORS[cleanName] || { bg: "bg-zinc-800", text: "text-zinc-400", border: "border-zinc-700", glow: "" }
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>("ALL")
  
  // Formulaires de réponse et de contre-offre
  const [replyText, setReplyText] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  
  const [showCounterModal, setShowCounterModal] = useState(false)
  const [counterAmount, setCounterAmount] = useState("")
  
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'success' | 'error' } | null>(null)

  // 📡 Charger la messagerie
  const fetchInbox = async (silently = false) => {
    if (!silently) setLoading(true)
    try {
      const res = await fetch('/api/extension/sync/inbox')
      const result = await res.json()
      if (result.success) {
        setConversations(result.data)
        // Si aucune conv sélectionnée, prendre la première par défaut
        if (result.data.length > 0 && !selectedConvId && !silently) {
          setSelectedConvId(result.data[0].id)
        }
      }
    } catch (err) {
      console.error("Inbox fetching failed:", err)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchInbox()
    // Polling discret toutes les 15 secondes pour mimer le temps réel
    const interval = setInterval(() => fetchInbox(true), 15000)
    return () => clearInterval(interval)
  }, [])

  // 🧹 Filtrage dynamique
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchSearch = 
        c.buyerUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchAccount = selectedAccountFilter === "ALL" || c.botAccount.name === selectedAccountFilter
      
      return matchSearch && matchAccount
    })
  }, [conversations, searchTerm, selectedAccountFilter])

  // 👤 Liste des comptes présents pour les onglets dynamiques
  const availableAccounts = useMemo(() => {
    const accounts = new Set<string>()
    conversations.forEach(c => accounts.add(c.botAccount.name))
    return Array.from(accounts)
  }, [conversations])

  // 💬 Conversation active
  const activeConv = useMemo(() => {
    return conversations.find(c => c.id === selectedConvId) || null
  }, [conversations, selectedConvId])

  // 🚀 TRANSMETTRE UN ORDRE À LA FILE D'ATTENTE (BotActionQueue)
  const pushAction = async (type: "SEND_MESSAGE" | "ACCEPT_OFFER" | "COUNTER_OFFER", payload: any) => {
    if (!activeConv) return
    
    setActionLoadingId(type)
    setStatusMessage({ text: "📡 Transmission de l'ordre à l'extension...", type: 'info' })
    
    try {
      const res = await fetch('/api/extension/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botAccountName: activeConv.botAccount.name,
          actionType: type,
          payload
        })
      })
      
      const result = await res.json()
      
      if (result.success) {
        setStatusMessage({ text: "⚡ Ordre envoyé ! En attente d'exécution furtive...", type: 'success' })
        // Temporisateur fictif avant de vider le statut
        setTimeout(() => setStatusMessage(null), 5000)
        
        // Si c'est un message, on l'ajoute temporairement à la liste locale pour un feedback immédiat
        if (type === "SEND_MESSAGE") {
          // Simulation visuelle en local avant le prochain fetch
          const fakeMsg = {
            id: `fake_${Math.random()}`,
            conversationId: activeConv.id,
            senderUsername: activeConv.botAccount.name, // Le bot lui-même
            content: payload.message,
            createdAtVinted: new Date().toISOString()
          }
          // Mettre à jour l'état local
          setConversations(prev => prev.map(c => {
            if (c.id === activeConv.id) {
              return {
                ...c,
                lastMessage: payload.message,
                lastMessageTime: new Date().toISOString(),
                messages: [...(c.messages || []), fakeMsg]
              }
            }
            return c
          }))
          setReplyText("")
        }
      } else {
        throw new Error(result.error || "Échec de transmission")
      }
    } catch (err: any) {
      setStatusMessage({ text: `❌ Erreur : ${err.message}`, type: 'error' })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handlers de soumission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !activeConv) return
    pushAction("SEND_MESSAGE", { conversationId: activeConv.id, message: replyText.trim() })
  }

  const handleAcceptOffer = () => {
    if (!activeConv) return
    if (confirm(`Accepter définitivement l'offre de ${Number(activeConv.offerPrice).toFixed(2)} € ?`)) {
      pushAction("ACCEPT_OFFER", { conversationId: activeConv.id, amount: Number(activeConv.offerPrice) })
    }
  }

  const handleCounterOfferSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!counterAmount || !activeConv) return
    pushAction("COUNTER_OFFER", { conversationId: activeConv.id, amount: parseFloat(counterAmount) })
    setShowCounterModal(false)
    setCounterAmount("")
  }

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-[#09090b]">
      
      {/* Ambient Background Glow - Violet pour rappeler la messagerie */}
      <div className="absolute top-[-10%] right-[-5%] w-[45%] h-[45%] bg-violet-500/5 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-[-5%] left-[10%] w-[35%] h-[35%] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Top Header */}
      <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-6 backdrop-blur-md flex-shrink-0 bg-zinc-950/40 relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.1)]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Inbox Omnicanal</h1>
            <p className="text-[11px] text-zinc-500">Messagerie centralisée multi-comptes</p>
          </div>
        </div>

        {/* Onglets des comptes */}
        <div className="flex items-center gap-1.5 bg-zinc-900/40 p-1 rounded-xl border border-zinc-800/60 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setSelectedAccountFilter("ALL")}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer",
              selectedAccountFilter === "ALL" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
            )}
          >
            Tous les Comptes
          </button>
          
          {availableAccounts.map(acc => {
            const style = getAccountStyle(acc)
            const isActive = selectedAccountFilter === acc
            return (
              <button
                key={acc}
                onClick={() => setSelectedAccountFilter(acc)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                  isActive 
                    ? `${style.bg} ${style.text} border ${style.border} ${style.glow}`
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full bg-current")} />
                {acc}
              </button>
            )
          })}
        </div>
      </header>

      {/* Main Content : Master-Detail Split Pane */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        
        {/* ------------------ MASTER PANEL : THREAD LIST ------------------ */}
        <div className="w-80 md:w-96 border-r border-zinc-800/50 flex flex-col flex-shrink-0 bg-zinc-950/20 backdrop-blur-sm h-full">
          
          {/* Search in Inbox */}
          <div className="p-4 border-b border-zinc-800/40">
            <div className="relative w-full">
              <input 
                type="text"
                placeholder="Filtrer acheteur, annonce..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-9 pr-4 py-2 text-xs focus:border-indigo-500/40 transition-all outline-none"
              />
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Threads Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900 scrollbar-thin scrollbar-thumb-zinc-800/50 hover:scrollbar-thumb-zinc-800">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">Chargement des fils...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Aucune conversation trouvée.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = selectedConvId === conv.id
                const style = getAccountStyle(conv.botAccount.name)
                const timeString = new Date(conv.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 text-left transition-all relative group cursor-pointer",
                      isActive 
                        ? "bg-zinc-900/60 border-l-2 border-indigo-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]" 
                        : "hover:bg-zinc-900/30"
                    )}
                  >
                    {/* Avatar/User Image */}
                    <div className="w-11 h-11 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden relative bg-gradient-to-br from-zinc-700 to-zinc-900 shadow-sm">
                      {conv.buyerPhoto ? (
                        <img src={conv.buyerPhoto} alt={conv.buyerUsername} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-zinc-500" />
                      )}
                      
                      {/* Badge Compte sur l'avatar */}
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-zinc-950 flex items-center justify-center text-[7px] font-black uppercase",
                        style.bg, style.text
                      )}>
                        {conv.botAccount.name.substring(0, 1)}
                      </div>
                    </div>

                    {/* Thread Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-sm text-zinc-200 truncate max-w-[140px]">
                          @{conv.buyerUsername}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {timeString}
                        </span>
                      </div>

                      {/* Item Linked */}
                      {conv.title && (
                        <div className="text-[10px] font-semibold text-indigo-400/80 tracking-tight flex items-center gap-1 mb-1 truncate">
                          <Tag className="w-2.5 h-2.5 flex-shrink-0" /> {conv.title}
                        </div>
                      )}

                      {/* Last Message Snippet */}
                      <p className={cn(
                        "text-xs truncate transition-colors",
                        isActive ? "text-zinc-300" : "text-zinc-500 group-hover:text-zinc-400"
                      )}>
                        {conv.lastMessage || "Aucun message"}
                      </p>

                      {/* Badge OFFRE EN COURS 🔥 */}
                      {conv.hasOffer && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black text-[9px] shadow-[0_0_8px_rgba(16,185,129,0.15)] animate-pulse">
                          <DollarSign className="w-2.5 h-2.5" /> PROPOSITION : {Number(conv.offerPrice).toFixed(2)}€
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ------------------ DETAIL PANEL : ACTIVE CHAT WINDOW ------------------ */}
        <div className="flex-1 flex flex-col h-full bg-zinc-950/30">
          
          {activeConv ? (
            <>
              {/* Active Chat Top Bar */}
              <div className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-6 flex-shrink-0 backdrop-blur-sm bg-zinc-950/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">@{activeConv.buyerUsername}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase",
                        getAccountStyle(activeConv.botAccount.name).bg, 
                        getAccountStyle(activeConv.botAccount.name).text
                      )}>
                        BOT: {activeConv.botAccount.name}
                      </span>
                    </div>
                    {activeConv.title && (
                      <span className="text-[11px] text-zinc-500 truncate max-w-[300px]">
                        Intéressé(e) par : <span className="text-zinc-300 font-medium">{activeConv.title}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConv.itemId && (
                    <a
                      href={`https://www.vinted.fr/items/${activeConv.itemId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer hover:border-zinc-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Vinted
                    </a>
                  )}
                </div>
              </div>

              {/* 💰 ACTIVE OFFER NOTIFICATION BANNER 💰 */}
              {activeConv.hasOffer && (
                <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-teal-950/20 to-transparent border-b border-emerald-800/30 relative overflow-hidden animate-in slide-in-from-top duration-300">
                  <div className="absolute top-0 left-0 h-full w-1 bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                          Offre Directe Reçue !
                        </h4>
                        <p className="text-xs text-emerald-400/90 font-medium">
                          L'acheteur propose <span className="text-lg font-black text-emerald-400">{Number(activeConv.offerPrice).toFixed(2)} €</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto flex-shrink-0">
                      <button 
                        onClick={() => setShowCounterModal(true)}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-bold transition-all hover:bg-zinc-800 hover:-translate-y-0.5 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Contre-Offre
                      </button>
                      <button 
                        onClick={handleAcceptOffer}
                        disabled={actionLoadingId === "ACCEPT_OFFER"}
                        className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {actionLoadingId === "ACCEPT_OFFER" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Accepter l'Offre
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 📡 TRANSMISSION FEEDBACK ALERT 📡 */}
              {statusMessage && (
                <div className={cn(
                  "mx-6 mt-4 p-3 rounded-xl border text-xs font-medium animate-in zoom-in-95 flex items-center gap-2 shadow-md",
                  statusMessage.type === 'info' ? "bg-indigo-950/30 border-indigo-500/20 text-indigo-300" :
                  statusMessage.type === 'success' ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-300" :
                  "bg-rose-950/30 border-rose-500/20 text-rose-300"
                )}>
                  {statusMessage.type === 'info' ? <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /> :
                   statusMessage.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> :
                   <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  {statusMessage.text}
                </div>
              )}

              {/* Messages History View */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800/50">
                {(!activeConv.messages || activeConv.messages.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-xs italic">
                    Début de la discussion avec @{activeConv.buyerUsername}
                  </div>
                ) : (
                  activeConv.messages.map((msg: any) => {
                    const isMe = msg.senderUsername.toLowerCase() !== activeConv.buyerUsername.toLowerCase()
                    const msgTime = new Date(msg.createdAtVinted).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})

                    return (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex flex-col max-w-[75%] animate-in fade-in duration-200",
                          isMe ? "ml-auto items-end" : "items-start"
                        )}
                      >
                        {/* Expéditeur Label */}
                        <span className="text-[10px] text-zinc-500 mb-1 font-semibold tracking-wide uppercase px-1">
                          {isMe ? `Moi (${activeConv.botAccount.name})` : msg.senderUsername}
                        </span>
                        
                        {/* Bulle de Message */}
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm leading-relaxed relative break-words whitespace-pre-line w-full border",
                          isMe 
                            ? `${getAccountStyle(activeConv.botAccount.name).bg} text-zinc-100 ${getAccountStyle(activeConv.botAccount.name).border} rounded-tr-sm ${getAccountStyle(activeConv.botAccount.name).glow}` 
                            : "bg-zinc-900/90 text-zinc-100 border-zinc-800 rounded-tl-sm shadow-black/20"
                        )}>
                          {msg.content}
                        </div>

                        {/* Heure */}
                        <span className="text-[9px] text-zinc-600 font-mono mt-1 px-1">
                          {msgTime}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Reply Form Bottom Input Bar */}
              <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/40 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                  <input 
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Écrire un message en tant que @${activeConv.botAccount.name}...`}
                    className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-2xl px-4 py-3.5 pr-12 text-sm focus:border-indigo-500/50 transition-all outline-none shadow-inner"
                  />
                  
                  <button 
                    type="submit"
                    disabled={!replyText.trim() || actionLoadingId === "SEND_MESSAGE"}
                    className={cn(
                      "absolute right-2.5 p-2 rounded-xl transition-all cursor-pointer",
                      replyText.trim() 
                        ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20" 
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    )}
                  >
                    {actionLoadingId === "SEND_MESSAGE" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
                <p className="text-[10px] text-zinc-600 mt-2 text-center px-4 italic">
                  💡 Vos messages sont injectés dans la file de votre profil Chrome pour un envoi natif à 100% sans robotisation visible pour Vinted.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900/50 border border-zinc-800/60 flex items-center justify-center text-zinc-600 mb-4">
                <MessageSquare className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-bold text-zinc-300">Messagerie Omnicanal</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Sélectionnez une conversation dans la colonne de gauche pour afficher l'historique des discussions et gérer les offres actives.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------ MODAL DE CONTRE-OFFRE PREMIUM ------------------ */}
      {showCounterModal && activeConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl relative shadow-emerald-900/5 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Glowing Green Accent Top */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
            
            <button 
              onClick={() => setShowCounterModal(false)}
              className="absolute right-4 top-5 p-2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Faire une Contre-Offre</h3>
                <p className="text-[11px] text-zinc-500">Pour @{activeConv.buyerUsername} • Vendu par {activeConv.botAccount.name}</p>
              </div>
            </div>

            {/* Rappel du prix offert */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 mb-6 flex justify-between items-center">
              <span className="text-xs text-zinc-400">Offre initiale reçue :</span>
              <span className="text-sm font-extrabold text-emerald-400">{Number(activeConv.offerPrice).toFixed(2)} €</span>
            </div>

            <form onSubmit={handleCounterOfferSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider">Nouveau Prix Proposé (€)</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white font-black text-lg rounded-2xl pl-5 pr-12 py-4 outline-none focus:border-emerald-500/40 transition-all"
                  />
                  <DollarSign className="w-5 h-5 text-zinc-500 absolute right-5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowCounterModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850 font-bold text-xs transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={!counterAmount || actionLoadingId === "COUNTER_OFFER"}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 font-extrabold text-xs shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:-translate-y-0.5"
                >
                  {actionLoadingId === "COUNTER_OFFER" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Envoyer Offre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
