"use client"

import React, { useState, useEffect } from 'react'
import { 
  ShieldAlert, 
  Package, 
  RefreshCw, 
  Search, 
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  XCircle,
  MessageSquareWarning,
  Send,
  MoreVertical
} from 'lucide-react'

type Order = {
  id: string
  title: string
  price: string | number
  buyerLogin: string
  status: string
  shippingStatus: string
  trackingCode?: string
  createdAtVinted: string
  botAccount?: { name: string }
}

export default function PostSaleDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'disputes'>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    try {
      const endpoint = activeTab === 'orders' ? '/api/orders' : '/api/disputes'
      const res = await fetch(endpoint)
      const data = await res.json()
      // If db is empty, mock some data for the premium UI demonstration
      if (data[activeTab]?.length > 0) {
        setOrders(data[activeTab])
      } else {
        setOrders(generateMockData(activeTab))
      }
    } catch (err) {
      console.error(err)
      setOrders(generateMockData(activeTab))
    } finally {
      setLoading(false)
    }
  }

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('issue') || s.includes('incident') || s.includes('litige')) {
      return "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
    }
    if (s.includes('shipped') || s.includes('expédié')) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
    }
    if (s.includes('cancelled') || s.includes('annulé')) {
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
    }
    return "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
  }

  return (
    <div className="min-h-full p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Service Client</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-zinc-200 to-zinc-500">
            Commandes & Litiges
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-xl">
            Gérez vos expéditions, suivez l'état de vos commandes et résolvez les litiges clients depuis une interface centralisée.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-95">
            <Download className="w-4 h-4" />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "À Expédier", value: "24", icon: Package, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
          { label: "En Transit", value: "156", icon: Clock, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
          { label: "Litiges Actifs", value: "3", icon: AlertCircle, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20", glow: "shadow-[0_0_30px_rgba(244,63,94,0.15)]" },
          { label: "Terminées (30j)", value: "842", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
        ].map((kpi, i) => (
          <div key={i} className={`relative overflow-hidden p-6 rounded-2xl bg-zinc-900/50 backdrop-blur-xl border ${kpi.border} ${kpi.glow || ''} transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/80`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-zinc-400 font-medium">{kpi.label}</span>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <div className="text-3xl font-black text-white">{kpi.value}</div>
            {/* Background decoration */}
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 ${kpi.bg} rounded-full blur-2xl opacity-50`} />
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col rounded-3xl bg-zinc-950/50 backdrop-blur-xl border border-zinc-800/50 overflow-hidden shadow-2xl">
        {/* Toolbar & Tabs */}
        <div className="p-4 border-b border-zinc-800/50 bg-zinc-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex p-1 space-x-1 rounded-xl bg-zinc-900/80 border border-zinc-800/50 backdrop-blur-md">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === 'orders' 
                  ? 'bg-zinc-800 text-white shadow-lg' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Toutes les Commandes
            </button>
            <button
              onClick={() => setActiveTab('disputes')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                activeTab === 'disputes' 
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Litiges & Retours
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold">3</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Rechercher (pseudo, titre...)" 
                className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>
            <button className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-900/10 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Article & Acheteur</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Statut</th>
                <th className="px-6 py-4 font-medium text-right">Montant</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 bg-zinc-800 rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-zinc-800 rounded"></div>
                          <div className="h-3 w-20 bg-zinc-800/50 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-zinc-800 rounded"></div></td>
                    <td className="px-6 py-5"><div className="h-6 w-24 bg-zinc-800 rounded-full"></div></td>
                    <td className="px-6 py-5"><div className="h-4 w-16 bg-zinc-800 rounded ml-auto"></div></td>
                    <td className="px-6 py-5"><div className="h-8 w-8 bg-zinc-800 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>Aucune commande trouvée.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order, i) => (
                  <tr key={order.id} className="group hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                          {/* Placeholder image representation */}
                          <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900 opacity-50" />
                          <Package className="w-5 h-5 text-zinc-500 z-10" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                            {order.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-zinc-500 font-medium">@{order.buyerLogin}</span>
                            {order.botAccount?.name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                {order.botAccount.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm text-zinc-300">
                        {new Date(order.createdAtVinted).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(order.createdAtVinted).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(order.status)}`}>
                        {order.status.includes('issue') || order.status.includes('incident') ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : order.status.includes('shipped') ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        <span className="capitalize">{order.status}</span>
                      </div>
                      {order.trackingCode && (
                        <p className="text-[10px] text-zinc-500 mt-1.5 font-mono tracking-wider">
                          {order.trackingCode}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="text-sm font-bold text-white">{Number(order.price).toFixed(2)} €</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(order.status === 'pending' || order.status === 'a_expedier') && (
                          <button className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all tooltip-trigger" title="Marquer expédié">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'a_expedier') && (
                          <button className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all tooltip-trigger" title="Télécharger Bordereau">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {(order.status.includes('issue') || activeTab === 'disputes') && (
                          <button className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all tooltip-trigger" title="Gérer Litige">
                            <MessageSquareWarning className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/20 flex items-center justify-between text-sm text-zinc-500">
          <p>Affichage de {orders.length} éléments</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors" disabled>Précédent</button>
            <button className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors">Suivant</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper to generate stunning mock data if DB is empty
function generateMockData(tab: 'orders' | 'disputes'): Order[] {
  const base = [
    {
      id: "ord_1", title: "Robe d'été Zara Fleurie", price: 24.50, buyerLogin: "marie.dupont99",
      status: "a_expedier", shippingStatus: "label_generated", trackingCode: "Mondial Relay 8X92K",
      createdAtVinted: new Date(Date.now() - 3600000 * 2).toISOString(),
      botAccount: { name: "Bot_Paris" }
    },
    {
      id: "ord_2", title: "Sneakers Nike Air Max", price: 85.00, buyerLogin: "sneakerhead_fr",
      status: "shipped", shippingStatus: "in_transit", trackingCode: "Colissimo 8L44532",
      createdAtVinted: new Date(Date.now() - 86400000 * 1.5).toISOString(),
      botAccount: { name: "Bot_Lyon" }
    },
    {
      id: "ord_3", title: "Veste en Cuir Vintage", price: 120.00, buyerLogin: "vintage_lover",
      status: "issue_reported", shippingStatus: "delivered", trackingCode: "Chronopost XY902",
      createdAtVinted: new Date(Date.now() - 86400000 * 4).toISOString(),
      botAccount: { name: "Bot_Paris" }
    },
    {
      id: "ord_4", title: "Pantalon Cargo Noir", price: 18.00, buyerLogin: "alex.fashion",
      status: "cancelled", shippingStatus: "none",
      createdAtVinted: new Date(Date.now() - 86400000 * 5).toISOString(),
      botAccount: { name: "Bot_Marseille" }
    },
    {
      id: "ord_5", title: "Pull en Laine Mango", price: 30.00, buyerLogin: "camille_styles",
      status: "a_expedier", shippingStatus: "pending",
      createdAtVinted: new Date(Date.now() - 3600000 * 5).toISOString(),
      botAccount: { name: "Bot_Lyon" }
    }
  ]

  if (tab === 'disputes') {
    return base.filter(o => o.status.includes('issue') || o.status.includes('cancel'))
  }
  return base
}
