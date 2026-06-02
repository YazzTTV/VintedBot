"use client"

import React, { useState, useEffect, useRef } from "react"
import { 
  Puzzle, 
  Bot, 
  Clock, 
  Terminal as TerminalIcon, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Send,
  ShieldAlert,
  Server,
  Play,
  XCircle,
  HelpCircle,
  TrendingUp,
  Cpu,
  Laptop
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function ExtensionDashboard() {
  const [bots, setBots] = useState<any[]>([])
  const [actionQueue, setActionQueue] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filters
  const [selectedBot, setSelectedBot] = useState("all")
  const [selectedLevel, setSelectedLevel] = useState("all")
  const [autoScroll, setAutoScroll] = useState(true)

  // Test action form
  const [testBot, setTestBot] = useState("")
  const [testAction, setTestAction] = useState("SEND_MESSAGE")
  const [testPayload, setTestPayload] = useState('{\n  "conversationId": "123456",\n  "message": "Hello ! L\'offre est acceptée."\n}')
  const [injecting, setInjecting] = useState(false)
  const [injectStatus, setInjectStatus] = useState<{ success?: boolean; message?: string } | null>(null)

  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Fetch status and logs
  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true)
    try {
      // 1. Fetch bots and queue
      const statusRes = await fetch("/api/extension/status")
      const statusData = await statusRes.json()
      if (statusData.success) {
        setBots(statusData.bots || [])
        setActionQueue(statusData.actionQueue || [])
        
        // Auto-select first bot for test form if not set
        if (!testBot && statusData.bots?.length > 0) {
          setTestBot(statusData.bots[0].name)
        }
      }

      // 2. Fetch logs
      const logsUrl = `/api/extension/logs?botName=${selectedBot}&type=${selectedLevel}`
      const logsRes = await fetch(logsUrl)
      const logsData = await logsRes.json()
      if (logsData.success) {
        setLogs(logsData.logs || [])
      }
    } catch (error) {
      console.error("Error fetching extension data:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      fetchData()
    }, 5000) // Poll every 5s

    return () => clearInterval(interval)
  }, [selectedBot, selectedLevel])

  // Scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, autoScroll])

  // Clear logs handler
  const handleClearLogs = async () => {
    if (!confirm("Voulez-vous vraiment vider tous les logs de la base de données ?")) return
    try {
      const res = await fetch("/api/extension/logs", { method: "DELETE" })
      const data = await res.json()
      if (data.success) {
        setLogs([])
      }
    } catch (error) {
      console.error("Error clearing logs:", error)
    }
  }

  // Inject action handler
  const handleInjectAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testBot) return
    
    let parsedPayload = {}
    try {
      parsedPayload = JSON.parse(testPayload)
    } catch (err) {
      setInjectStatus({ success: false, message: "JSON Payload invalide !" })
      return
    }

    setInjecting(true)
    setInjectStatus(null)

    try {
      const res = await fetch("/api/extension/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botAccountName: testBot,
          actionType: testAction,
          payload: parsedPayload
        })
      })
      const data = await res.json()
      if (data.success) {
        setInjectStatus({ success: true, message: `Action #${data.actionId.slice(-6)} injectée en attente !` })
        fetchData()
      } else {
        setInjectStatus({ success: false, message: data.error || "Échec de l'injection." })
      }
    } catch (error: any) {
      setInjectStatus({ success: false, message: error.message })
    } finally {
      setInjecting(false)
    }
  }

  const getLogColor = (type: string) => {
    switch (type) {
      case "SUCCESS": return "text-emerald-400 font-semibold"
      case "ERROR": return "text-rose-400 font-semibold"
      case "WARNING": return "text-amber-400 font-semibold"
      case "ACTION": return "text-sky-400 font-semibold"
      default: return "text-zinc-300"
    }
  }

  const getLogBadgeColor = (type: string) => {
    switch (type) {
      case "SUCCESS": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      case "ERROR": return "bg-rose-500/10 text-rose-400 border-rose-500/20"
      case "WARNING": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
      case "ACTION": return "bg-sky-500/10 text-sky-400 border-sky-500/20"
      default: return "bg-zinc-800 text-zinc-400 border-zinc-700/50"
    }
  }

  const getQueueStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            En attente
          </span>
        )
      case "RUNNING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" />
            En cours
          </span>
        )
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Succès
          </span>
        )
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3 text-rose-400" />
            Échec
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
            Inconnu
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Puzzle className="w-7 h-7 text-emerald-400" />
            <h1 className="text-3xl font-bold text-white tracking-tight">Supervision Extension Bot</h1>
          </div>
          <p className="text-zinc-400 mt-1 font-medium">Visualisez les logs en direct, surveillez la flotte de bots et pilotez la file d'actions.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-800/80">
            <Clock className="w-3.5 h-3.5" />
            Mise à jour automatique 5s
          </span>
          <button 
            onClick={() => fetchData(true)}
            className="p-2 bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center gap-2 hover:bg-zinc-900/30"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Flotte de Bots */}
      <section className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              État de la Flotte
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">Dernière synchronisation et statuts des bots Vinted</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-32 bg-zinc-900/30 border border-zinc-800/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : bots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {bots.map((bot) => {
              const isOnline = bot.lastSync ? (Date.now() - new Date(bot.lastSync).getTime() < 15 * 60 * 1000) : false
              
              return (
                <div key={bot.id} className="bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700/80 rounded-xl p-4 flex flex-col justify-between transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                      <span className="text-sm font-extrabold text-white capitalize">{bot.name}</span>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-wider uppercase",
                      isOnline 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-zinc-800/50 border-zinc-700 text-zinc-500"
                    )}>
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 truncate mb-3">
                    @{bot.vintedUsername || `${bot.name}.shop`}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 bg-zinc-950/50 border border-zinc-800/30 rounded-lg p-2 mb-2 text-center">
                    <div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 block">Dispo</span>
                      <span className="text-xs font-bold text-emerald-400">{bot.balanceAvailable.toFixed(2)} €</span>
                    </div>
                    <div className="border-l border-zinc-800/50">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 block">Attente</span>
                      <span className="text-xs font-bold text-amber-400">{bot.balancePending.toFixed(2)} €</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {bot.lastSync 
                        ? new Date(bot.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : "Jamais"
                      }
                    </span>
                    {bot.pendingActionsCount > 0 && (
                      <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-extrabold border border-emerald-500/20">
                        {bot.pendingActionsCount} actions
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-zinc-800/80 rounded-xl">
            <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-zinc-400">Aucun bot connecté pour le moment.</p>
            <p className="text-xs text-zinc-600 mt-1">Ouvrez l'extension sur vos profils Vinted pour lier les comptes.</p>
          </div>
        )}
      </section>

      {/* Main Grid: Console Logs & Action Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Terminal Logs (2 cols) */}
        <section className="lg:col-span-2 bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 shadow-2xl flex flex-col h-[580px] backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Live Activity Logs</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Select Bot */}
              <select
                value={selectedBot}
                onChange={(e) => setSelectedBot(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-zinc-700 capitalize"
              >
                <option value="all">Tous les bots</option>
                <option value="system">System</option>
                {bots.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>

              {/* Select Level */}
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-zinc-700"
              >
                <option value="all">Tous les niveaux</option>
                <option value="INFO">INFO</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
                <option value="ACTION">ACTION</option>
              </select>

              <button 
                onClick={handleClearLogs}
                title="Vider la base de logs"
                className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Terminal Screen */}
          <div className="flex-1 bg-black border border-zinc-900 rounded-xl p-4 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-900">
            {logs.length > 0 ? (
              <div className="space-y-1.5">
                {logs.slice().reverse().map((log) => (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-zinc-900/30 py-0.5 rounded px-1 transition-colors">
                    {/* Timestamp */}
                    <span className="text-zinc-600 select-none">
                      [{new Date(log.createdAt).toLocaleTimeString('fr-FR')}]
                    </span>
                    {/* Badge level */}
                    <span className={cn("px-1.5 py-0.2 rounded text-[8px] font-bold border shrink-0 tracking-wide uppercase", getLogBadgeColor(log.type))}>
                      {log.type}
                    </span>
                    {/* Bot name */}
                    <span className="text-zinc-500 font-extrabold capitalize shrink-0 select-none">
                      {log.botName}:
                    </span>
                    {/* Message */}
                    <span className={cn("break-all", getLogColor(log.type))}>
                      {log.message}
                    </span>
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                <TerminalIcon className="w-8 h-8 opacity-20 animate-pulse" />
                <p>En attente d'activité de l'extension...</p>
              </div>
            )}
          </div>

          {/* Auto Scroll Checkbox */}
          <div className="flex items-center justify-between text-xs text-zinc-500 mt-3">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-400 select-none">
              <input 
                type="checkbox" 
                checked={autoScroll} 
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              Faire défiler automatiquement
            </label>
            <span>Total : {logs.length} logs affichés</span>
          </div>
        </section>

        {/* Action Queue & Controls (1 col) */}
        <section className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 shadow-2xl flex flex-col h-[580px] backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-zinc-900">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">File d'Actions Auto</h2>
          </div>

          {/* Action queue list */}
          <div className="flex-1 overflow-y-auto mb-4 border border-zinc-900 bg-zinc-950/40 rounded-xl p-3 scrollbar-thin scrollbar-thumb-zinc-900">
            {actionQueue.length > 0 ? (
              <div className="space-y-3">
                {actionQueue.map((action) => (
                  <div key={action.id} className="p-3 bg-zinc-900/20 border border-zinc-800/40 rounded-lg hover:border-zinc-700/60 transition-all flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-white uppercase capitalize">{action.botAccount?.name || "inconnu"}</span>
                        <span className="text-[10px] text-zinc-500">#{action.id.slice(-6)}</span>
                      </div>
                      {getQueueStatusBadge(action.status)}
                    </div>
                    
                    <div className="text-zinc-300">
                      Type : <span className="font-bold text-emerald-400">{action.actionType}</span>
                    </div>

                    <div className="text-[10px] bg-black/40 border border-zinc-900 rounded p-1.5 font-mono text-zinc-400 break-words mt-1 max-h-16 overflow-y-auto">
                      {JSON.stringify(action.payload)}
                    </div>

                    {action.errorMessage && (
                      <div className="text-[10px] text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded p-1.5 font-mono mt-1 break-words">
                        Erreur : {action.errorMessage}
                      </div>
                    )}

                    <div className="text-[9px] text-zinc-600 flex items-center justify-between mt-1">
                      <span>Créé : {new Date(action.createdAt).toLocaleTimeString('fr-FR')}</span>
                      {action.completedAt && (
                        <span>Fini : {new Date(action.completedAt).toLocaleTimeString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center gap-2">
                <CheckCircle2 className="w-8 h-8 opacity-25 text-emerald-500" />
                <p className="font-medium text-zinc-500 text-xs">Aucune action planifiée dans la file.</p>
              </div>
            )}
          </div>

          {/* Test Action Generator */}
          <form onSubmit={handleInjectAction} className="border-t border-zinc-900 pt-4 flex flex-col gap-3">
            <h3 className="text-xs font-extrabold text-white flex items-center gap-1">
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              Injecter un ordre test
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {/* Bot Select */}
              <select
                value={testBot}
                onChange={(e) => setTestBot(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded focus:outline-none focus:border-zinc-700 capitalize"
                required
              >
                <option value="" disabled>Bot Cible</option>
                {bots.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>

              {/* Action Type */}
              <select
                value={testAction}
                onChange={(e) => setTestAction(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded focus:outline-none focus:border-zinc-700"
              >
                <option value="SEND_MESSAGE">SEND_MESSAGE</option>
                <option value="ACCEPT_OFFER">ACCEPT_OFFER</option>
                <option value="COUNTER_OFFER">COUNTER_OFFER</option>
              </select>
            </div>

            {/* Payload JSON */}
            <textarea
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-mono p-2 rounded focus:outline-none focus:border-zinc-700 h-20 resize-none leading-relaxed"
              placeholder="JSON Payload"
              required
            />

            {injectStatus && (
              <div className={cn(
                "p-2 rounded text-[10px] font-medium border",
                injectStatus.success 
                  ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" 
                  : "bg-rose-500/5 border-rose-500/10 text-rose-400"
              )}>
                {injectStatus.message}
              </div>
            )}

            <button
              type="submit"
              disabled={injecting || !testBot}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-black text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              {injecting ? "Injection..." : "Injecter l'action"}
            </button>
          </form>
        </section>
      </div>

      {/* Configuration & Documentation */}
      <section className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 shrink-0">
            <Cpu className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">Liaison Technique de l'Extension</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              L'extension Vinted Pro Bot envoie automatiquement ses rapports de fonctionnement à ce manager. L'adresse API est configurée dans le stockage local de l'extension. Par défaut, elle est reliée en local à <code className="text-emerald-400 font-mono">http://localhost:3000</code> pour le développement, et bascule vers <code className="text-emerald-400 font-mono">https://vinted-manager-flame.vercel.app</code> en production.
            </p>
            <div className="flex gap-4 mt-3">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <Laptop className="w-3 h-3 text-emerald-400" />
                Edge Debugging Port : <code className="text-zinc-300 bg-zinc-900 px-1 py-0.2 rounded font-mono">9222</code>
              </span>
              <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-500" />
                Anti-detection : Jitter furtif actif (8-10m)
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
