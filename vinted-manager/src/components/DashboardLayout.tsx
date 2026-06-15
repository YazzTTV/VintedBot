"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tag,
  Truck,
  Settings,
  User,
  BarChart3,
  Archive,
  Search,
  MessageSquare,
  Flame,
  Boxes,
  Puzzle,
  Shirt,
  ShieldAlert,
  MessageCircleHeart,
  Network,
  Terminal
} from "lucide-react"
import { cn } from "@/lib/utils"
import PushToggle from "@/components/PushToggle"

const navigationGroups = [
  {
    category: 'PILOTAGE',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Ventes', href: '/ventes', icon: Tag },
      { name: 'Commandes', href: '/commandes', icon: ShoppingBag },
    ]
  },
  {
    category: 'ANNONCES',
    items: [
      { name: 'Dressing 👗', href: '/dressing', icon: Shirt },
      { name: 'Winners 🔥', href: '/winners', icon: Flame },
      { name: 'Archives', href: '/archives', icon: Archive },
    ]
  },
  {
    category: 'MESSAGERIE & SAV',
    items: [
      { name: 'Inbox 💬', href: '/inbox', icon: MessageSquare },
      { name: 'DM Favoris 💌', href: '/dm-favoris', icon: MessageCircleHeart },
      { name: 'SAV & Litiges', href: '/post-sale', icon: ShieldAlert },
    ]
  },
  {
    category: 'EXPÉDITION & STOCK',
    items: [
      { name: 'Stock', href: '/stock', icon: Boxes },
      { name: 'Suivi Colis', href: '/parcels', icon: Package },
      { name: 'Expéditions', href: '/expeditions', icon: Truck },
    ]
  },
  {
    category: 'OUTILS & RECHERCHE',
    items: [
      { name: 'Market Spy 🔍', href: '/market-spy', icon: Search },
      { name: 'Sourcing', href: '/sourcing', icon: Search },
      { name: 'Extension 🧩', href: '/extension', icon: Puzzle },
    ]
  },
  {
    category: 'SYSTÈME & OBSERVABILITÉ',
    items: [
      { name: 'Network 🌌', href: '/network', icon: Network },
      { name: 'Système Logs 📋', href: '/logs', icon: Terminal },
    ]
  }
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('[PWA] Service Worker enregistré avec succès scope:', reg.scope))
        .catch((err) => console.error('[PWA] Échec enregistrement Service Worker:', err));
    }
  }, [])

  // Skip main chrome layout logic for standard authorization page
  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen w-full bg-[#0c0c0e] text-white overflow-hidden font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 border-r border-zinc-800/50 bg-zinc-950 flex-col flex-shrink-0 relative group backdrop-blur-xl">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <BarChart3 className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
              Vinted Manager
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          {navigationGroups.map((group) => (
            <div key={group.category} className="space-y-0.5">
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                {group.category}
              </h3>
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ease-out relative overflow-hidden group",
                      isActive 
                        ? "bg-zinc-900 text-emerald-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-emerald-500 rounded-r-full shadow-[0_0_10px_#10b981]" />
                    )}
                    <item.icon className={cn(
                      "w-[16px] h-[16px] transition-transform duration-200 group-hover:scale-110", 
                      isActive ? "text-emerald-500" : "text-zinc-500 group-hover:text-zinc-300"
                    )} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800/50 mt-auto">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border border-zinc-700 shadow-sm">
              <User className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">Administrateur</p>
              <p className="text-xs text-zinc-500 truncate">Admin</p>
            </div>
            <PushToggle />
            <button className="text-zinc-500 hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-800">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (Menu coulissant tactile) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop avec effet de flou */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Drawer */}
          <aside className="relative w-64 max-w-xs bg-zinc-950 border-r border-zinc-800 flex flex-col h-full z-10 animate-in slide-in-from-left duration-250 ease-out shadow-2xl">
            <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/50 bg-zinc-950">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-md font-bold tracking-tight text-white">Vinted Manager</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-850"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
              {navigationGroups.map((group) => (
                <div key={group.category} className="space-y-1">
                  <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                    {group.category}
                  </h3>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all",
                          isActive 
                            ? "bg-zinc-900 text-emerald-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                            : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                        )}
                      >
                        <item.icon className={cn("w-[16px] h-[16px]", isActive ? "text-emerald-500" : "text-zinc-500")} />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-zinc-800/50 mt-auto bg-zinc-950/80">
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border border-zinc-700">
                  <User className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">Administrateur</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#0a0a0a]">
        {/* Mobile Header Bar */}
        <header className="md:hidden h-14 border-b border-zinc-800/50 bg-zinc-950 flex items-center justify-between px-4 z-20 flex-shrink-0">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800/50 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-md font-bold tracking-tight text-white">
              Vinted Manager
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <BarChart3 className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <PushToggle />
        </header>

        {/* Background ambient glow */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        {/* Main scrollable content */}
        <div className="flex-1 overflow-y-auto scroll-smooth relative z-10">
          {children}
        </div>
      </main>
    </div>
  )
}
