"use client"

import React from "react"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Euro,
  ShoppingBag,
  ArrowUpRight,
  MoreHorizontal,
  CheckCircle2,
  Wallet,
  Bot,
  Server,
  Clock
} from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts"
import { cn } from "@/lib/utils"
import ParcelAlertBanner from "@/components/ParcelAlertBanner"

export default function Dashboard() {
  const [stats, setStats] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/stats/dashboard')
      .then(r => r.json())
      .then(d => {
        if(d.success) setStats(d.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Fallback dummy chart structure during loading to maintain layout
  const displayChart = stats?.chartData?.length > 0 ? stats.chartData : [
    { date: 'Lun', sales: 0, profit: 0 },
    { date: 'Mar', sales: 0, profit: 0 },
    { date: 'Mer', sales: 0, profit: 0 },
    { date: 'Jeu', sales: 0, profit: 0 },
    { date: 'Ven', sales: 0, profit: 0 },
    { date: 'Sam', sales: 0, profit: 0 },
    { date: 'Dim', sales: 0, profit: 0 },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
      {/* Parcel Alert Banner */}
      <ParcelAlertBanner />

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Bonjour Administrateur</h1>
          <p className="text-zinc-400 mt-1 text-sm font-medium flex items-center gap-2">Aperçu général de votre activité de revente en temps réel.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Updates
          </span>
          <button className="bg-white text-black text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg hover:bg-zinc-200 transition-colors duration-200 shadow-md">
            Exporter rapport
          </button>
        </div>
      </header>

      {/* Grid des KPIs (2 colonnes sur mobile, 3 sur tablette, 6 sur desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard 
          title="CA Total" 
          value={loading ? "..." : `${Number(stats?.caTotal || 0).toFixed(2)} €`}
          trend={loading ? "" : "+ En direct"}
          icon={Euro}
          positive={true}
        />
        <KPICard 
          title="Dépenses Commandes" 
          value={loading ? "..." : `${Number(stats?.totalExpenses || 0).toFixed(2)} €`}
          trend="Total des achats" 
          icon={CreditCard}
          positive={false}
        />
        <KPICard 
          title="Bénéfice Net" 
          value={loading ? "..." : `${Number(stats?.beneficeTotal || 0).toFixed(2)} €`}
          trend={loading ? "" : "+ En direct"}
          icon={TrendingUp}
          positive={true}
        />
        <KPICard 
          title="Marge Moyenne" 
          value={loading ? "..." : `${Number(stats?.margeMoyenne || 0).toFixed(1)} %`}
          trend="Moyenne par vente"
          icon={TrendingDown}
          positive={true}
        />
        <KPICard 
          title="Vinted Disponible" 
          value={loading ? "..." : `${Number(stats?.totalWalletAvailable || 0).toFixed(2)} €`}
          trend="Fonds transférables" 
          icon={Wallet}
          positive={true}
        />
        <KPICard 
          title="Vinted En Attente" 
          value={loading ? "..." : `${Number(stats?.totalWalletPending || 0).toFixed(2)} €`}
          trend="Transactions en cours" 
          icon={ShoppingBag}
          positive={null}
        />
      </div>

      {/* Graphique Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 shadow-2xl shadow-black/40 flex flex-col backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Évolution des Ventes</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Les 7 derniers jours glissants</p>
            </div>
          </div>
          
          <div className="h-72 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.4} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#09090b', 
                    borderColor: '#27272a', 
                    borderRadius: '12px',
                    color: '#fff',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dernières Activités */}
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 shadow-xl backdrop-blur-sm flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-white">Alertes Expédition</h2>
            <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {loading ? (
              <div className="text-center py-10 text-zinc-500 text-xs animate-pulse">
                Chargement des alertes...
              </div>
            ) : stats?.alertesExpeditions?.length > 0 ? (
              stats.alertesExpeditions.map((alert: any) => (
                <AlertRow 
                  key={alert.id}
                  label={alert.label} 
                  buyer={alert.buyer} 
                  deadline={alert.deadline} 
                  urgency={alert.urgency}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-zinc-300">Toutes les expéditions sont à jour !</p>
                <p className="text-xs text-zinc-500 mt-1">Aucune urgence détectée.</p>
              </div>
            )}
          </div>

          <Link href="/expeditions" className="mt-auto pt-6 text-sm text-emerald-400 font-medium text-center hover:text-emerald-300 flex items-center justify-center gap-1 transition-colors w-full border-t border-zinc-900/50 group">
            Voir toutes les expéditions
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Flotte de Bots & Statuts Financiers Réels (Phase 2) */}
      <section className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-6 shadow-2xl flex flex-col backdrop-blur-sm relative overflow-hidden">
        {/* Decorative soft gradient behind section */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              Surveillance Opérationnelle de la Flotte
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 font-medium">État des 5 comptes bots et finances individuelles synchronisés par extension Chrome.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-lg self-start">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-zinc-300 tracking-wide uppercase">Système Actif</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-40 bg-zinc-900/30 border border-zinc-800/40 rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : stats?.bots?.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {stats.bots.map((bot: any) => {
              // Déterminer si le bot est considéré "ONLINE" (dernière synchro < 20 min)
              const isOnline = bot.lastSync ? (new Date().getTime() - new Date(bot.lastSync).getTime() < 20 * 60 * 1000) : false;
              
              return (
                <div key={bot.id} className="bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/60 rounded-xl p-4 flex flex-col shadow-md transition-all duration-300 group">
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-zinc-800 border border-zinc-700 rounded-lg group-hover:scale-105 transition-transform duration-200">
                        <Bot className="w-4 h-4 text-zinc-300 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <h3 className="text-sm font-extrabold text-white capitalize">{bot.name}</h3>
                    </div>
                    
                    {/* Statut Lumineux */}
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase",
                      isOnline 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    )}>
                      {isOnline && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                      )}
                      {isOnline ? "Online" : "Offline"}
                    </div>
                  </div>

                  {/* Vinted Username */}
                  <p className="text-xs text-zinc-500 font-medium truncate mb-4">
                    @{bot.vintedUsername || `${bot.name}.shop`}
                  </p>

                  {/* Balance Details */}
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950/40 border border-zinc-800/30 rounded-lg p-2 mb-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Dispo</p>
                      <p className="text-sm font-extrabold text-emerald-400">{Number(bot.balanceAvailable || 0).toFixed(2)} €</p>
                    </div>
                    <div className="border-l border-zinc-800/50 pl-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">Attente</p>
                      <p className="text-sm font-extrabold text-amber-400">{Number(bot.balancePending || 0).toFixed(2)} €</p>
                    </div>
                  </div>

                  {/* Footer Card : Timestamp */}
                  <div className="mt-auto flex items-center gap-1 text-[10px] font-medium text-zinc-600">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {bot.lastSync 
                        ? `Synchro : ${new Date(bot.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                        : "Aucune synchro"
                      }
                    </span>
                  </div>
                  
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center">
            <Server className="w-8 h-8 text-zinc-700 mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-zinc-400">Aucun robot synchronisé pour le moment</p>
            <p className="text-xs text-zinc-600 mt-1">Active tes extensions Chrome pour alimenter la base.</p>
          </div>
        )}
      </section>
    </div>
  )
}

// Sous-composant pour les cartes KPI
function KPICard({ title, value, trend, icon: Icon, positive }: any) {
  return (
    <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-5 flex flex-col shadow-md hover:border-zinc-700/80 hover:bg-zinc-900/20 transition-all duration-300 group backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500">
        <Icon className="w-24 h-24" />
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-sm text-zinc-400 font-medium">{title}</span>
        <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl group-hover:scale-110 group-hover:bg-zinc-800/50 transition-all duration-300">
          <Icon className="w-5 h-5 text-zinc-300" />
        </div>
      </div>
      <div className="relative z-10 mt-auto">
        <h3 className="text-2xl font-extrabold tracking-tight text-white">{value}</h3>
        {trend && (
          <span className={cn(
            "text-xs font-semibold mt-1 inline-flex items-center gap-1",
            positive === true ? "text-emerald-400" : positive === false ? "text-rose-400" : "text-zinc-400"
          )}>
            {trend} 
            <span className="font-normal opacity-70">vs mois dernier</span>
          </span>
        )}
      </div>
    </div>
  )
}

// Sous-composant pour les lignes d'alertes
function AlertRow({ label, buyer, deadline, urgency }: any) {
  const urgentColors = {
    high: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  }
  
  const colorClass = urgentColors[urgency as keyof typeof urgentColors] || urgentColors.low

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-900/50 border border-transparent hover:border-zinc-800 transition-all group">
      <div className="p-2.5 bg-zinc-900 rounded-lg border border-zinc-800">
        <ShoppingBag className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{label}</p>
        <p className="text-xs text-zinc-500 truncate">Acheté par {buyer}</p>
      </div>
      <div className={cn("text-xs font-bold px-2.5 py-1 rounded-lg border shrink-0 whitespace-nowrap", colorClass)}>
        {deadline}
      </div>
    </div>
  )
}
