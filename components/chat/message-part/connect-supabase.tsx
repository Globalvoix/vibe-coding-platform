'use client'

import { useState, useEffect } from 'react'
import { Database, Zap, TrendingUp, HelpCircle, ChevronDown, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { DataPart } from '@/ai/messages/data-parts'

const SupabaseLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-[#3ECF8E]", className)}
  >
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" />
  </svg>
)

interface Props {
  message: DataPart['connect-supabase']
}

export function ConnectSupabase({ message }: Props) {
  const [connecting, setConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const projectId = message.projectId

  useEffect(() => {
    async function checkStatus() {
      if (!projectId) {
        setIsLoading(false)
        return
      }
      try {
        const response = await fetch(`/api/supabase-oauth/status?projectId=${encodeURIComponent(projectId)}`)
        if (response.ok) {
          const data = await response.json()
          setConnected(data.connected)
        }
      } catch (e) {
        console.error('Failed to check Supabase status:', e)
      } finally {
        setIsLoading(false)
      }
    }
    checkStatus()
  }, [projectId])

  const handleConnect = () => {
    if (!projectId || connecting) return
    setConnecting(true)
    window.location.href = `/api/supabase-oauth/start?appProjectId=${encodeURIComponent(projectId)}`
  }

  if (isLoading) {
    return (
      <div className="bg-[#FBF8F3] border border-black/[0.05] rounded-[24px] p-8 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-black/20" />
      </div>
    )
  }

  if (connected) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
          <Check className="w-7 h-7 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-bold text-emerald-900 text-[16px]">Cloud Connected</h4>
          <p className="text-[14px] text-emerald-700/80 font-medium leading-relaxed">
            Supabase is now integrated. Your AI agent can now manage your database and backend.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#FBF8F3] border border-black/[0.05] rounded-[24px] overflow-hidden shadow-sm w-full max-w-[440px] my-4">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-bold text-black/80 tracking-tight">Enabled Cloud</h3>
          <div className="bg-[#B4BCF8] px-3 py-1 rounded-md text-white text-[11px] font-extrabold uppercase tracking-wider">
            Auto-approved
          </div>
        </div>

        <p className="text-[14.5px] text-black/60 leading-relaxed font-medium">
          Complete backend and AI models out of the box.
        </p>

        <div className="space-y-7 py-2">
          <div className="flex gap-4">
            <div className="w-11 h-11 bg-white border border-black/[0.03] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Database className="w-5.5 h-5.5 text-black/40" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-black/80">Built-in backend</h4>
              <p className="text-[13px] text-black/50 font-medium leading-relaxed mt-0.5">
                Database, storage, authentication, and backend logic—all ready to use.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-11 h-11 bg-white border border-black/[0.03] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Zap className="w-5.5 h-5.5 text-black/40" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-black/80">Add an LLM to your app</h4>
              <p className="text-[13px] text-black/50 font-medium leading-relaxed mt-0.5">
                Powerful AI models with zero setup. Add chat, image generation, and text analysis instantly.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-11 h-11 bg-white border border-black/[0.03] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <TrendingUp className="w-5.5 h-5.5 text-black/40" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-black/80">Free to start</h4>
              <p className="text-[13px] text-black/50 font-medium leading-relaxed mt-0.5">
                Free usage included to get you started. Track usage in Settings → Usage.
              </p>
            </div>
          </div>
        </div>

        <p className="text-[13px] text-black/40 font-bold italic">
          Note: This can&#39;t be undone once enabled.
        </p>
      </div>

      <div className="bg-black/[0.02] border-t border-black/[0.04] p-3 flex items-center justify-between px-6">
        <button className="flex items-center gap-1.5 text-[12.5px] font-bold text-black/40 hover:text-black/60 transition-colors">
          Ask each time <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-1.5 text-[12.5px] font-bold text-black/40 hover:text-black/60 transition-colors"
        >
          {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cloud'} <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {!connected && (
        <div className="p-5 bg-white border-t border-black/[0.04]">
          <Button 
            onClick={handleConnect}
            disabled={connecting}
            className="w-full bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-white font-bold h-12 rounded-xl gap-2.5 shadow-sm transition-all active:scale-[0.98]"
          >
            {connecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <SupabaseLogo className="w-5.5 h-5.5 text-white" />
            )}
            {connecting ? 'Redirecting to Supabase...' : 'Connect to Supabase'}
          </Button>
        </div>
      )}
    </div>
  )
}
