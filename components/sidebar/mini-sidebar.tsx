'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Home, 
  LayoutGrid, 
  Users, 
  Search, 
  Star, 
  PanelLeft,
  Compass,
  Package,
  Library,
  Inbox
} from 'lucide-react'
import { useAuth } from '@clerk/nextjs'

export function MiniSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  
  const navItems = [
    { icon: Home, label: 'Home', href: '/home', active: pathname === '/home' },
    { icon: Search, label: 'Search', href: '#', active: false },
    { icon: LayoutGrid, label: 'All Projects', href: '/projects', active: pathname === '/projects' },
    { icon: Star, label: 'Favorites', href: '#', active: false },
    { icon: Users, label: 'Shared with me', href: '#', active: false },
  ]

  const bottomItems = [
    { icon: Compass, label: 'Explore', href: '#' },
    { icon: Package, label: 'Packages', href: '#' },
    { icon: Library, label: 'Library', href: '#' },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-[72px] bg-[#FDFDFB] border-r border-gray-100 flex flex-col items-center py-6 z-40">
      {/* Top Toggle */}
      <button className="p-2 mb-6 text-gray-400 hover:text-gray-900 transition-colors">
        <PanelLeft className="w-5 h-5" />
      </button>

      {/* User Avatar */}
      <div className="mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#BE123C] flex items-center justify-center text-white font-bold text-lg shadow-sm">
          M
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex flex-col gap-4 w-full items-center flex-1">
        {navItems.map((item, i) => (
          <button
            key={i}
            onClick={() => item.href !== '#' && router.push(item.href)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200 group relative",
              item.active 
                ? "bg-[#EFEFE9] text-gray-900" 
                : "text-gray-400 hover:text-gray-900 hover:bg-gray-50"
            )}
            title={item.label}
          >
            <item.icon className={cn("w-5 h-5", item.active ? "stroke-[2.5px]" : "stroke-[2px]")} />
            
            {/* Tooltip */}
            <span className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-[11px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className="flex flex-col gap-4 w-full items-center mb-6">
        {bottomItems.map((item, i) => (
          <button
            key={i}
            className="p-2.5 text-gray-400 hover:text-gray-900 transition-colors group relative"
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
            <span className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-[11px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* User Button / Inbox */}
      <div className="flex flex-col gap-4 items-center">
        <div className="w-8 h-8 rounded-full bg-[#5B21B6] flex items-center justify-center text-white text-[10px] font-bold">
          P
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
          <Inbox className="w-5 h-5" />
        </button>
      </div>
    </aside>
  )
}
