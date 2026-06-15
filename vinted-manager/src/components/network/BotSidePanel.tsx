import React from 'react';
import { X, Bot, Clock, Wallet, ShoppingBag, Activity, RefreshCw, MessageSquare, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BotSidePanelProps {
  bot: any | null;
  onClose: () => void;
}

export default function BotSidePanel({ bot, onClose }: BotSidePanelProps) {
  if (!bot) return null;

  const isOnline = bot.lastSync ? (new Date().getTime() - new Date(bot.lastSync).getTime() < 20 * 60 * 1000) : false;

  // Inverted mapping to match the UI fix on Dashboard
  const dispo = Number(bot.balancePending || 0).toFixed(2);
  const attente = Number(bot.balanceAvailable || 0).toFixed(2);

  return (
    <div className="absolute top-0 right-0 h-full w-[400px] bg-zinc-950/90 backdrop-blur-2xl border-l border-zinc-800/50 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-50 flex flex-col transform transition-transform duration-300 ease-out translate-x-0">
      
      {/* Header */}
      <div className="p-6 border-b border-zinc-800/50 flex justify-between items-start relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex gap-4 items-center z-10">
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-lg">
            <Bot className={cn("w-6 h-6", isOnline ? "text-emerald-400" : "text-zinc-500")} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white capitalize tracking-tight">{bot.name}</h2>
            <p className="text-sm text-zinc-400 font-medium">@{bot.vintedUsername || `${bot.name}.shop`}</p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="p-2 bg-zinc-900/50 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors border border-zinc-800/50 z-10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800">
        
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border tracking-wider uppercase",
            isOnline ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
          )}>
            {isOnline && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            {isOnline ? "Système En Ligne" : "Système Hors-Ligne"}
          </div>
          
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {bot.lastSync ? new Date(bot.lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Jamais'}
            </span>
          </div>
        </div>

        {/* Financial Core */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-purple-400" /> Flux Financiers
          </h3>
          
          <div className="bg-zinc-900/60 border border-blue-500/30 rounded-xl p-4 flex flex-col gap-1 mb-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">CA du Jour</p>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white tracking-tight">{(bot.caDuJour || 0).toFixed(2)} €</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 flex flex-col gap-1 hover:bg-zinc-900/60 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Dispo</p>
                <Wallet className="w-3.5 h-3.5 text-emerald-500/50" />
              </div>
              <p className="text-xl font-black text-emerald-400 tracking-tight">{dispo} €</p>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 flex flex-col gap-1 hover:bg-zinc-900/60 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">Attente</p>
                <ShoppingBag className="w-3.5 h-3.5 text-amber-500/50" />
              </div>
              <p className="text-xl font-black text-amber-400 tracking-tight">{attente} €</p>
            </div>
          </div>
        </div>

        {/* Live Feed (Logs) */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" /> Terminal Live
          </h3>
          <div className="bg-[#0c0c0e] border border-zinc-800/50 rounded-xl p-4 font-mono text-[11px] space-y-2.5 shadow-inner">
            {bot.logs && bot.logs.length > 0 ? (
              bot.logs.map((log: any) => (
                <div key={log.id} className="flex gap-3 items-start border-l-2 border-zinc-800 pl-2">
                  <span className="text-zinc-600 shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={cn(
                    "break-words flex-1",
                    log.level === 'ERROR' ? 'text-red-400' : 
                    log.level === 'WARN' ? 'text-amber-400' : 'text-zinc-300'
                  )}>
                    {log.message}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-zinc-600 italic text-center py-4">Aucune donnée télémétrique disponible.</p>
            )}
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-4 pb-24 border-t border-zinc-800/50 bg-zinc-900/30 flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors border border-zinc-700">
          <MessageSquare className="w-4 h-4" /> Inbox
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-semibold py-2.5 rounded-lg transition-colors border border-emerald-500/20">
          <RefreshCw className="w-4 h-4" /> Force Sync
        </button>
      </div>

    </div>
  );
}
