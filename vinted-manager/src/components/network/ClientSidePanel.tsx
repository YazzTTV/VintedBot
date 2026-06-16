'use client';

import React from 'react';
import { X, User, MessageCircle, ShoppingBag, Star } from 'lucide-react';
import Link from 'next/link';

interface ClientSidePanelProps {
  client: any;
  onClose: () => void;
}

export default function ClientSidePanel({ client, onClose }: ClientSidePanelProps) {
  if (!client) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-96 bg-zinc-950/90 backdrop-blur-xl border-l border-zinc-800/50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800/50 flex items-start justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 text-blue-400">
            <User className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Client Inbox</span>
          </div>
          <h2 className="text-xl font-black text-white leading-tight">
            {client.username || client.name}
          </h2>
          <p className="text-zinc-500 text-xs mt-1 font-mono">{client.id}</p>
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
        
        {/* Badges */}
        <div className="flex gap-2">
          {client.hasBought && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-xs font-semibold">
              <ShoppingBag className="w-3.5 h-3.5" />
              Acheteur
            </div>
          )}
          {client.hasOffer && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold">
              <Star className="w-3.5 h-3.5" />
              A fait une offre
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">Conversation Associée</h3>
          
          {client.conversation ? (
              <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <MessageCircle className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium">Message</span>
                  </div>
                </div>
                {client.conversation.title && (
                  <p className="text-xs text-zinc-500 mb-3 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                    &quot;{client.conversation.title}&quot;
                  </p>
                )}
                <Link 
                  href={`/inbox`} 
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors block text-center"
                >
                  Ouvrir la conversation
                </Link>
              </div>
          ) : (
             <div className="text-zinc-500 text-sm italic">Aucun détail disponible.</div>
          )}
        </div>

      </div>
    </div>
  );
}
