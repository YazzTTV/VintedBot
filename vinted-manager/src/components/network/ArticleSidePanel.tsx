'use client';

import React from 'react';
import { X, Tag, Package, BarChart2 } from 'lucide-react';
import Link from 'next/link';

interface ArticleSidePanelProps {
  article: any;
  onClose: () => void;
}

export default function ArticleSidePanel({ article, onClose }: ArticleSidePanelProps) {
  if (!article) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-800/50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800/50 flex items-start justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 text-purple-400">
            <Tag className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Article</span>
          </div>
          <h2 className="text-xl font-black text-white leading-tight">
            {article.name || 'Article'}
          </h2>
          <p className="text-zinc-500 text-xs mt-1 font-mono">{article.id}</p>
        </div>
        
        <button 
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors bg-zinc-900/50 hover:bg-zinc-800 p-2 rounded-xl relative z-10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Status / Quick Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/30">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <Package className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Statut</span>
            </div>
            <div className="text-sm font-bold text-white">
               {article.name?.includes('inconnu') || article.name?.includes('supprimé') ? 'Inactif / Non tracké' : 'Actif en ligne'}
            </div>
          </div>
          
          <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/30">
            <div className="flex items-center gap-2 text-zinc-400 mb-2">
              <BarChart2 className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase">Vues</span>
            </div>
            <div className="text-sm font-bold text-zinc-500 italic">Non tracké</div>
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-4 pb-24 border-t border-zinc-800/50 bg-zinc-900/30 flex mt-auto">
        <Link href={`/stock`} className="flex-1 flex items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-sm font-semibold py-2.5 rounded-lg transition-colors border border-purple-500/20">
          <Tag className="w-4 h-4" /> Voir dans le Stock
        </Link>
      </div>

    </div>
  );
}
