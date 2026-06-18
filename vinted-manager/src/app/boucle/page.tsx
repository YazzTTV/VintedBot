"use client"

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { RefreshCcw, Copy, ExternalLink, Image as ImageIcon } from 'lucide-react';

export default function BouclePage() {
  const [data, setData] = useState({ bots: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/winner-queue');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDuplicate = async (itemId: string, targetBotId: string) => {
    if (!targetBotId) return;
    setDuplicating(true);
    try {
      const res = await fetch('/api/winner-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, targetBotId })
      });
      if (res.ok) {
        await fetchData(); // Refresh
      } else {
        alert('Erreur lors de la duplication');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la duplication');
    } finally {
      setDuplicating(false);
    }
  };

  const groupedItems = data.items.reduce((acc: any, item: any) => {
    if (!acc[item.botAccountId]) {
      acc[item.botAccountId] = {
        bot: item.botAccount,
        items: []
      };
    }
    acc[item.botAccountId].items.push(item);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-white/10 shadow-xl">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent drop-shadow-sm">
              Boucle Vinted
            </h1>
            <p className="text-gray-400 mt-1">Gérez la file d'attente des annonces gagnantes pour la republication.</p>
          </div>
          <button 
            onClick={fetchData} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded-xl transition-all border border-indigo-500/30 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {loading && <div className="text-center py-12 text-gray-400 animate-pulse">Chargement...</div>}

        {!loading && Object.keys(groupedItems).length === 0 && (
          <div className="text-center py-12 bg-gray-900/50 rounded-2xl border border-gray-800 shadow-xl">
            <p className="text-gray-400">Aucune annonce dans la file d'attente des comptes VENTE.</p>
          </div>
        )}

        <div className="space-y-8">
          {Object.values(groupedItems).map((group: any) => (
            <div key={group.bot.id} className="bg-gray-900/50 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
              <div className="bg-gray-800/80 px-6 py-4 border-b border-gray-700/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                  <h2 className="text-xl font-semibold text-white">
                    {group.bot.name} <span className="text-gray-400 text-sm font-normal">(@{group.bot.vintedUsername})</span>
                  </h2>
                </div>
                <span className="bg-purple-500/20 text-purple-300 text-xs px-3 py-1 rounded-full border border-purple-500/30">
                  {group.items.length} annonce(s)
                </span>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {group.items.map((item: any) => (
                  <div key={item.id} className="group relative bg-gray-800/40 hover:bg-gray-800/80 rounded-2xl border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden flex flex-col shadow-lg">
                    <div className="h-48 bg-gray-900 relative overflow-hidden flex items-center justify-center">
                      {item.originalPhotoUrl ? (
                        <img 
                          src={item.originalPhotoUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-gray-700" />
                      )}
                      <div className="absolute top-2 right-2">
                        <span className={`text-xs px-2 py-1 rounded-full border backdrop-blur-md font-medium ${item.status === 'QUEUED' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-green-500/20 text-green-300 border-green-500/30'}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-medium text-gray-100 line-clamp-2 mb-2 text-sm" title={item.title}>
                        {item.title}
                      </h3>
                      
                      {item.sourcingUrl && (
                        <a href={item.sourcingUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-auto mb-4 w-fit transition-colors">
                          Lien de sourcing <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      
                      <div className="mt-auto pt-4 border-t border-gray-700/50 flex flex-col gap-2">
                        <label className="text-xs font-medium text-gray-400">Dupliquer vers :</label>
                        <div className="flex gap-2">
                          <select 
                            className="flex-1 bg-gray-900/80 border border-gray-700 rounded-lg text-sm px-2 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
                            id={`target-${item.id}`}
                            defaultValue=""
                          >
                            <option value="" disabled>Sélectionner un compte</option>
                            {data.bots.filter((b: any) => b.id !== group.bot.id).map((b: any) => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                          <button 
                            onClick={() => {
                              const select = document.getElementById(`target-${item.id}`) as HTMLSelectElement;
                              handleDuplicate(item.id, select.value);
                            }}
                            disabled={duplicating || data.bots.filter((b: any) => b.id !== group.bot.id).length === 0}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center"
                            title="Dupliquer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
