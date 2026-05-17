"use client"

import React from 'react'
import { X, Loader2, Trash2, Copy } from 'lucide-react'
import { useDiagnostic } from '@/context/DiagnosticContext'

export function DiagnosticConsole() {
  const { diagLogs, isDiagConsoleOpen, setIsDiagConsoleOpen, clearDiagLogs } = useDiagnostic()

  if (!isDiagConsoleOpen) {
    return (
      <button 
        onClick={() => setIsDiagConsoleOpen(true)}
        className="fixed bottom-6 right-6 z-[200] bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 p-3 rounded-2xl shadow-2xl backdrop-blur-md transition-all flex items-center gap-2 group"
        title="Ouvrir la console diagnostic"
      >
        <Loader2 className="w-4 h-4 group-hover:animate-spin" />
        <span className="text-xs font-bold">Diagnostic</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-[200] w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-zinc-950/95 border border-zinc-800 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl flex flex-col gap-4 shadow-emerald-500/5">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" /> Console Diagnostic Global
          </h3>
          <button 
            onClick={() => setIsDiagConsoleOpen(false)} 
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <textarea 
          readOnly
          className="w-full h-64 bg-black/50 border border-zinc-800 rounded-xl p-3 text-[10px] font-mono text-emerald-500 scrollbar-thin outline-none"
          value={diagLogs.length > 0 ? diagLogs.join('\n') : "En attente d'événements..."}
        />
        
        <div className="flex gap-2">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(diagLogs.join('\n'))
              alert("Copié !")
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-xl transition-all"
          >
            <Copy className="w-3.5 h-3.5" /> Copier
          </button>
          <button 
            onClick={clearDiagLogs}
            className="px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-bold py-2 rounded-xl border border-zinc-800 transition-all flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
