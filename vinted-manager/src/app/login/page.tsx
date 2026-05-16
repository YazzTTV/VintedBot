"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Lock, 
  BarChart3, 
  ArrowRight, 
  Loader2,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const result = await res.json()

      if (result.success) {
        // Force total hard reload to fully refresh middleware state context
        window.location.href = "/"
      } else {
        setError(result.message || "Accès refusé.")
        setLoading(false)
      }
    } catch (err) {
      setError("Erreur réseau.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0c0c0e] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Cinematic Radiant Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none select-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none select-none -z-10" />

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.25)] mb-4 animate-pulse">
             <BarChart3 className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
            Vinted Manager
          </h1>
          <p className="text-zinc-500 mt-1 text-sm font-medium">Système de pilotage sécurisé</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl shadow-black relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent"></div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2 text-center mb-4">
               <h2 className="text-xl font-bold text-white">Accès Restreint</h2>
               <p className="text-xs text-zinc-500">Entrez le code d'accès maître pour entrer.</p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input 
                  type="password" 
                  required
                  placeholder="••••••••••••"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full bg-zinc-900/50 border rounded-xl pl-11 pr-4 py-3.5 text-white text-center tracking-[0.3em] text-lg font-bold outline-none transition-all focus:ring-2 focus:ring-emerald-500/20",
                    error ? "border-rose-500/50 text-rose-200" : "border-zinc-800 focus:border-emerald-500/50"
                  )}
                />
                <Lock className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors", error ? "text-rose-500" : "text-zinc-600")} />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs font-medium animate-in shake px-1">
                  <AlertCircle className="w-3 h-3" /> {error}
                </div>
              )}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full relative group bg-white hover:bg-zinc-200 text-black font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] disabled:opacity-70 overflow-hidden"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Débloquer le Système
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

        </div>

        <p className="text-center mt-8 text-[10px] text-zinc-600 font-bold tracking-widest uppercase">
          End-to-End Encrypted Infrastructure
        </p>

      </div>
    </div>
  )
}
