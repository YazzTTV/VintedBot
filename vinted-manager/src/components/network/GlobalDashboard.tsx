'use client';

import React, { useState } from 'react';
import { TrendingUp, Wallet, ShoppingBag, Activity, ChevronDown, ChevronUp } from 'lucide-react';

interface GlobalDashboardProps {
  bots: any[];
}

export default function GlobalDashboard({ bots }: GlobalDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate global stats
  let totalDispo = 0;
  let totalAttente = 0;
  let globalCaDuJour = 0;
  let botsOnline = 0;

  bots.forEach(bot => {
    totalDispo += Number(bot.balancePending || 0);
    totalAttente += Number(bot.balanceAvailable || 0);
    globalCaDuJour += bot.caDuJour || 0;
    
    if (bot.lastSync && new Date().getTime() - new Date(bot.lastSync).getTime() < 20 * 60 * 1000) {
      botsOnline++;
    }
  });

  if (!isExpanded) {
    return (
      <button 
        onClick={() => setIsExpanded(true)}
        className="absolute top-6 right-6 z-10 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 rounded-lg shadow-xl p-3 flex items-center gap-2 hover:bg-zinc-900 transition-colors"
      >
        <Activity className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold text-zinc-300">Flotte Globale</span>
        <ChevronDown className="w-4 h-4 text-zinc-500 ml-2" />
      </button>
    );
  }

  return (
    <div className="absolute top-6 right-6 z-10 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 rounded-2xl shadow-2xl p-5 w-72 transition-all">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          Flotte Globale
        </h2>
        <button 
          onClick={() => setIsExpanded(false)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-900/50 hover:bg-zinc-800 p-1.5 rounded-md"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="space-y-4">
        {/* CA du jour */}
        <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">CA du jour</span>
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{globalCaDuJour.toFixed(2)} €</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Dispo */}
          <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Dispo</span>
              <Wallet className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-black text-emerald-400">{totalDispo.toFixed(2)} €</div>
          </div>
          
          {/* Attente */}
          <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Attente</span>
              <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-lg font-black text-amber-400">{totalAttente.toFixed(2)} €</div>
          </div>
        </div>
        
        {/* Status */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
          <span className="text-xs font-medium text-zinc-400">Bots En Ligne</span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
            {botsOnline} / {bots.length}
          </span>
        </div>
      </div>
    </div>
  );
}
