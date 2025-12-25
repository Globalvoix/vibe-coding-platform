'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  LayoutGrid,
  Users,
  PanelLeft,
  Coins,
  ChevronRight
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { CREDITS_UPDATED_EVENT } from '@/lib/credits-events'
import { useUIStore } from '@/lib/ui-store'
import { motion, AnimatePresence } from 'framer-motion'

export function MiniSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn } = useAuth()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!isSignedIn) return

    async function loadCredits() {
      try {
        const response = await fetch('/api/user/credits')
        if (response.ok) {
          const data = await response.json()
          setCreditBalance(typeof data.credits === 'number' ? data.credits : 0)
        }
      } catch (err) {
        console.error('Failed to load credits', err)
      }
    }

    loadCredits()
    window.addEventListener(CREDITS_UPDATED_EVENT, loadCredits)
    return () => window.removeEventListener(CREDITS_UPDATED_EVENT, loadCredits)
  }, [isSignedIn])

  const navItems = [
    { icon: Home, label: 'Home', href: '/home', active: pathname === '/home' },
    { icon: LayoutGrid, label: 'All Projects', href: '/projects', active: pathname === '/projects' },
    { icon: Users, label: 'Shared with me', href: '/shared', active: pathname === '/shared' },
  ]

  return (
    <motion.aside 
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 60 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-screen bg-[#FDFDFB] border-r border-gray-100 flex flex-col items-start py-6 z-50 overflow-hidden shadow-sm"
    >
      {/* Top Toggle */}
      <div className="w-full px-[18px] mb-6">
        <button 
          onClick={toggleSidebar}
          className="p-1 text-gray-400 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100/50"
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="w-5 h-5 stroke-[1.2px]" />
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex flex-col gap-2 w-full px-2 flex-1">
        {navItems.map((item, i) => (
          <button
            key={i}
            onClick={() => {
              if (item.href !== '#') {
                router.push(item.href)
              }
            }}
            className={cn(
              "flex items-center w-full gap-3 p-2 rounded-[6px] transition-all duration-200 group relative",
              item.active
                ? "bg-[#EFEFE9] text-gray-900 font-semibold"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 font-medium"
            )}
            title={!sidebarOpen ? item.label : undefined}
          >
            <div className="min-w-[24px] flex justify-center ml-1">
               <item.icon className={cn("w-[18px] h-[18px]", item.active ? "stroke-[2px]" : "stroke-[1.5px]")} />
            </div>
            
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-[13px] whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>

            {/* Tooltip for collapsed mode */}
            {!sidebarOpen && (
              <span className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60] shadow-xl">
                {item.label}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User Profile / Credits */}
      <div className="flex flex-col gap-4 w-full px-2 mt-auto">
        {isSignedIn && creditBalance !== null && (
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-xl transition-all group relative",
            sidebarOpen ? "bg-emerald-50/30 border border-emerald-100/50" : ""
          )}>
            <div className="min-w-[24px] flex justify-center ml-1">
               <Coins className="w-[18px] h-[18px] text-emerald-600/70 stroke-[1.5px]" />
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col"
                >
                  <span className="text-[11px] text-emerald-700 font-semibold">{creditBalance} credits</span>
                  <span className="text-[9px] text-emerald-600/60 font-medium">Balance</span>
                </motion.div>
              )}
            </AnimatePresence>
            {!sidebarOpen && (
              <span className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60] shadow-xl">
                {creditBalance} credits
              </span>
            )}
          </div>
        )}
        
        <div className={cn(
          "flex items-center gap-3 p-1 rounded-full",
          sidebarOpen ? "bg-gray-50/50" : ""
        )}>
           <div className="w-8 h-8 rounded-full bg-[#5B21B6] flex items-center justify-center text-white text-[10px] font-bold shadow-sm cursor-pointer shrink-0 ml-1">
             P
           </div>
           <AnimatePresence>
             {sidebarOpen && (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="flex flex-col overflow-hidden"
               >
                 <span className="text-[12px] text-gray-900 font-semibold truncate">User Profile</span>
                 <span className="text-[10px] text-gray-500 font-medium truncate">Settings</span>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  )
}
