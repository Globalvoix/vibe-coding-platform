'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Database, 
  Cloud, 
  Key, 
  CircleHelp, 
  ArrowUpRight, 
  Loader,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const SupabaseLogo = ({ className }: { className?: string }) => (
  <img
    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F76461b5f5e4b4e5281dbefb676a6c1e8?format=webp&width=80"
    alt="Supabase"
    className={className}
  />
)

interface SupabaseConnectionStatus {
  connected: boolean
  projectName?: string
  projectRef?: string
  organizationId?: string
}

interface Props {
  projectId?: string
}

export function SupabaseCloudPanel({ projectId }: Props) {
  const [connectionStatus, setConnectionStatus] = useState<SupabaseConnectionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkStatus() {
      if (!projectId) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        const response = await fetch(
          `/api/supabase-oauth/status?projectId=${encodeURIComponent(projectId)}`
        )

        if (!response.ok) {
          throw new Error('Failed to check status')
        }

        const status = (await response.json()) as SupabaseConnectionStatus
        if (!cancelled) {
          setConnectionStatus(status)
        }
      } catch (error) {
        console.error('Error checking Supabase connection status:', error)
        if (!cancelled) {
          setConnectionStatus({ connected: false })
        }
      } finally {
        if (!cancelled) {
          setIsLoading(val => false)
        }
      }
    }

    checkStatus()

    return () => {
      cancelled = true
    }
  }, [projectId])

  const handleDisconnect = async () => {
    if (!projectId || isDisconnecting) return

    try {
      setIsDisconnecting(true)
      const response = await fetch('/api/supabase-oauth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setConnectionStatus({ connected: false })
      toast.success('Supabase disconnected')
    } catch (error) {
      console.error('Error disconnecting Supabase:', error)
      toast.error('Failed to disconnect Supabase')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleConnect = () => {
    if (!projectId) return
    const startUrl = `/api/supabase-oauth/start?appProjectId=${encodeURIComponent(projectId)}`
    window.location.href = startUrl
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#F7F4ED]">
        <Loader className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
      </div>
    )
  }

  if (!connectionStatus?.connected) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 text-center bg-[#F7F4ED]">
        <div className="max-w-md p-10 bg-white rounded-3xl border border-black/[0.03] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <SupabaseLogo className="w-16 h-16 mx-auto mb-6 opacity-90" />
          <h3 className="text-xl font-semibold mb-2 text-zinc-900">Connect Supabase</h3>
          <p className="text-zinc-500 mb-8 text-balance text-sm">
            Connect your project to Supabase to manage users, databases, edge functions, and more.
          </p>
          <Button onClick={handleConnect} className="h-11 px-8 rounded-xl bg-[#3ECF8E] hover:bg-[#34b27b] text-white font-semibold transition-all shadow-md">
            Connect project
          </Button>
        </div>
      </div>
    )
  }

  const projectRef = connectionStatus.projectRef
  const projectName = connectionStatus.projectName || 'My Project'

  const links = [
    {
      label: 'Runway',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#3ECF8E]">
          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="currentColor" />
        </svg>
      ),
      href: `https://supabase.com/dashboard/project/${projectRef}`,
    },
    {
      label: 'Manage Users',
      icon: <Users className="w-[14px] h-[14px] text-zinc-500" />,
      href: `https://supabase.com/dashboard/project/${projectRef}/auth/users`,
    },
    {
      label: 'SQL Editor',
      icon: <Database className="w-[14px] h-[14px] text-zinc-500" />,
      href: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
    },
    {
      label: 'Edge functions',
      icon: <Cloud className="w-[14px] h-[14px] text-zinc-500" />,
      href: `https://supabase.com/dashboard/project/${projectRef}/functions`,
    },
    {
      label: 'Manage Secrets',
      icon: <Key className="w-[14px] h-[14px] text-zinc-500" />,
      href: `https://supabase.com/dashboard/project/${projectRef}/settings/api`,
    },
  ]

  return (
    <div className="h-full w-full flex items-center justify-center bg-[#F7F4ED]">
      <div className="w-[480px] bg-white border border-black/[0.03] rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.05)] p-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-[20px] font-semibold text-zinc-900 tracking-tight">Supabase</h2>
            <p className="text-[14px] text-zinc-500 mt-0.5 font-medium">Manage your Supabase project</p>
          </div>
          <div className="flex items-center gap-1.5 py-1 px-1 text-zinc-500 text-[13px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </div>
        </div>

        <div className="space-y-0.5 mb-8">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between group py-3.5 px-1 transition-colors border-b border-zinc-50 last:border-0"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-5 h-5 shrink-0">
                  {link.icon}
                </div>
                <span className="text-[15px] font-semibold text-zinc-800 tracking-tight">
                  {link.label}
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" strokeWidth={1.5} />
            </a>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-zinc-50 text-zinc-400 transition-colors">
            <CircleHelp className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-6 py-2.5 text-[14px] font-bold text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
            <button className="px-6 py-2.5 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-[14px] font-bold text-zinc-900 transition-colors shadow-sm">
              Manage Organizations
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
