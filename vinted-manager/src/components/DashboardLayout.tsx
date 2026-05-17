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
  Boxes
} from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inbox 💬', href: '/inbox', icon: MessageSquare },
  { name: 'Winners 🔥', href: '/winners', icon: Flame },
  { name: 'Commandes', href: '/commandes', icon: ShoppingBag },
  { name: 'Stock', href: '/stock', icon: Boxes },
  { name: 'Ventes', href: '/ventes', icon: Tag },
  { name: 'Suivi Colis', href: '/parcels', icon: Package },
  { name: 'Expéditions', href: '/expeditions', icon: Truck },
  { name: 'Sourcing', href: '/sourcing', icon: Search },
  { name: 'Archives', href: '/archives', icon: Archive },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Skip main chrome layout logic for standard authorization page
  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen w-full bg-[#0c0c0e] text-white overflow-hidden font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800/50 bg-zinc-950 flex flex-col flex-shrink-0 relative group backdrop-blur-xl">
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

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out relative overflow-hidden group",
                  isActive 
                    ? "bg-zinc-900 text-emerald-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full shadow-[0_0_10px_#10b981]" />
                )}
                <item.icon className={cn(
                  "w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110", 
                  isActive ? "text-emerald-500" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
                {item.name}
              </Link>
            )
          })}
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
            <button className="text-zinc-500 hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-800">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#0a0a0a]">
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
