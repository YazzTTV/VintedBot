"use client"

import React, { useState, useEffect } from "react"
import { 
  Archive, 
  Search, 
  User, 
  Calendar, 
  Package, 
  FileText, 
  ExternalLink,
  Tag,
  Loader2,
  Truck
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function ArchivesPage() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  const fetchArchives = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/archives')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (e) {}
    setLoading(false)
  }

  useEffect(() => { fetchArchives() }, [])

  const filtered = data.filter((item: any) => {
    const q = query.toLowerCase()
    return (
      item.vente.pseudoAcheteur.toLowerCase().includes(q) ||
      (item.numeroBordereau && item.numeroBordereau.toLowerCase().includes(q)) ||
      item.vente.article.commande.numero.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Archive className="text-blue-400 w-8 h-8" />
            Archives Historiques
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">Historique complet des expéditions finalisées et détails SAV.</p>
        </div>

        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            placeholder="Rechercher acheteur, bordereau..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-zinc-600 transition-all outline-none"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-20 text-center text-zinc-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 opacity-50" />
            Chargement de l'historique...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center text-zinc-500">
            <Archive className="w-12 h-12 mx-auto mb-4 opacity-20" />
            Aucune expédition archivée trouvée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-900/40 text-zinc-400 text-xs font-bold tracking-wider uppercase border-b border-zinc-800">
                  <th className="px-6 py-4">Date Expédition</th>
                  <th className="px-6 py-4">Acheteur & Vente</th>
                  <th className="px-6 py-4">Origine Commande</th>
                  <th className="px-6 py-4">Bordereau / Transport</th>
                  <th className="px-6 py-4 text-right">Financier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filtered.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-zinc-900/20 transition-colors group">
                    
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 font-medium text-zinc-300">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        {new Date(exp.dateExpedition).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-[10px] text-zinc-600 mt-0.5 pl-6 font-mono">
                        {new Date(exp.dateExpedition).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          <User className="w-3.5 h-3.5 text-zinc-400"/>
                          @{exp.vente.pseudoAcheteur}
                        </div>
                        {exp.vente.lienVente && (
                          <a 
                            href={exp.vente.lienVente} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[10px] text-blue-400 flex items-center gap-1 mt-1 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3"/> Lien transaction
                          </a>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <Package className="w-3 h-3"/> {exp.vente.article.commande.fournisseur}
                        </span>
                        <span className="font-mono text-xs text-zinc-300">Cmd: {exp.vente.article.commande.numero}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      {exp.numeroBordereau ? (
                        <div className="flex flex-col">
                          <div className="text-xs font-extrabold text-zinc-200 flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5 text-blue-400" />
                            {exp.numeroBordereau}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1">
                            Transporteur: <span className="font-bold">{exp.transporteur || 'N/D'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-zinc-600 text-xs">Pas de bordereau</span>
                      )}
                      {exp.notes && (
                        <p className="text-[10px] text-zinc-500 mt-1 italic border-l-2 border-zinc-800 pl-2 max-w-[180px] truncate">"{exp.notes}"</p>
                      )}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-white">{Number(exp.vente.prixVente).toFixed(2)} €</span>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1">
                          +{Number(exp.vente.beneficeNet).toFixed(2)} € net
                        </span>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
