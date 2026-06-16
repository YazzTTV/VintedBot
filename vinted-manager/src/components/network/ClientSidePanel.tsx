'use client';

import React from 'react';
import { X, ExternalLink, MessageCircle, ShoppingBag, Star, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ClientSidePanelProps {
  client: any;
  onClose: () => void;
}

export default function ClientSidePanel({ client, onClose }: ClientSidePanelProps) {
  if (!client) return null;

  const conv = client.conversation;
  const messages = conv?.messages || [];
  const botName = client.botName || 'BOT';

  // Helper pour formater l'heure
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper pour formater la date
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  // Grouper les messages par jour
  const groupedMessages: { [key: string]: any[] } = {};
  messages.forEach((msg: any) => {
    const d = formatDate(msg.createdAtVinted);
    if (!groupedMessages[d]) groupedMessages[d] = [];
    groupedMessages[d].push(msg);
  });

  return (
    <div className="absolute right-0 top-0 h-full w-[450px] bg-[#09090b] border-l border-zinc-800/50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
      
      {/* Header façon Capture 2 */}
      <div className="p-4 border-b border-zinc-800/50 flex flex-col relative shrink-0">
        <div className="flex justify-between items-start w-full">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-black text-white">
                @{client.username || client.name}
              </h2>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider">
                BOT: {botName}
              </span>
            </div>
            
            {conv?.title && (
              <p className="text-zinc-400 text-xs">
                Intéressé(e) par : <span className="text-zinc-200 font-medium">{conv.title}</span>
              </p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Link 
              href={`/inbox`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg border border-zinc-800 transition-colors text-xs font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Vinted
            </Link>
            <button 
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Badges optionnels (Acheteur / Offre) */}
        {(client.hasBought || client.hasOffer) && (
          <div className="flex gap-2 mt-3">
            {client.hasBought && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded text-[10px] font-semibold">
                <ShoppingBag className="w-3 h-3" /> Acheteur
              </div>
            )}
            {client.hasOffer && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-semibold">
                <Star className="w-3 h-3" /> A fait une offre
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
            <MessageCircle className="w-8 h-8 opacity-20" />
            <p className="text-xs">Aucun message synchronisé.</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateStr, msgs]) => (
            <React.Fragment key={dateStr}>
              
              {/* Date Separator */}
              <div className="flex justify-center my-2">
                <span className="px-3 py-1 bg-zinc-900/60 text-zinc-500 text-[10px] font-medium rounded-full border border-zinc-800/50">
                  {dateStr}
                </span>
              </div>
              
              {/* Messages */}
              {msgs.map((msg: any) => {
                const isBot = msg.senderUsername === botName || msg.senderUsername === client.botUsername;
                
                return (
                  <div key={msg.id} className={`flex flex-col w-full ${isBot ? 'items-end' : 'items-start'} mb-1`}>
                    
                    <span className="text-[10px] text-zinc-600 mb-1 px-1 uppercase tracking-wider font-semibold">
                      {isBot ? `MOI (${botName})` : msg.senderUsername}
                    </span>
                    
                    <div 
                      className={`max-w-[85%] p-3 text-sm shadow-sm ${
                        isBot 
                          ? 'bg-[#151525] text-zinc-200 border border-indigo-500/20 rounded-2xl rounded-tr-sm' 
                          : 'bg-[#1c1c1f] text-zinc-300 border border-zinc-800/50 rounded-2xl rounded-tl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    
                    <span className="text-[10px] text-zinc-600 mt-1 px-1">
                      {formatTime(msg.createdAtVinted)}
                    </span>
                    
                  </div>
                );
              })}
            </React.Fragment>
          ))
        )}
      </div>
      
      {/* Footer hint */}
      <div className="p-3 bg-zinc-900/30 border-t border-zinc-800/50 text-center shrink-0">
        <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          Ouvrez la messagerie Vinted pour répondre.
        </p>
      </div>

    </div>
  );
}
