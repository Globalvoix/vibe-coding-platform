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
    src="https://cdn.builder.io/api/v1/image/assets%2F1d734cd0ef68491eb64e3e5bf6a74b6f%2F78ab58fa65ca497c8a79a60452a29c7a?format=webp&width=80"
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
          setIsLoadingStatus(false)
        }
      }
    }

    async function setIsLoadingStatus(val: boolean) {
        setIsLoading(val)
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
      <div className="h-full w-full flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
      </div>
    )
  }

  if (!connectionStatus?.connected) {
    return (
      <div className="h-full w-full flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <SupabaseLogo className="w-16 h-16 mx-auto mb-6 opacity-80" />
          <h3 className="text-xl font-semibold mb-2">Connect Supabase</h3>
          <p className="text-muted-foreground mb-8 text-balance">
            Connect your project to Supabase to manage users, databases, edge functions, and more.
          </p>
          <Button onClick={handleConnect} className="h-11 px-8 rounded-lg bg-[#3ECF8E] hover:bg-[#34b27b] text-white">
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
      label: projectName,
      icon: <SupabaseLogo className="w-4 h-4" />,
      href: `https://supabase.com/dashboard/project/${projectRef}`,
    },
    {
      label: 'Manage Users',
      icon: <Users className="w-4 h-4 text-muted-foreground" />,
      href: `https://supabase.com/dashboard/project/${projectRef}/auth/users`,
    },
    {
      label: 'SQL Editor',
      icon: <Database className="w-4 h-4 text-muted-foreground" />,
      href: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
    },
    {
      label: 'Edge functions',
      icon: <Cloud className="w-4 h-4 text-muted-foreground" />,
      href: `https://supabase.com/dashboard/project/${projectRef}/functions`,
    },
    {
      label: 'Manage Secrets',
      icon: <Key className="w-4 h-4 text-muted-foreground" />,
      href: `https://supabase.com/dashboard/project/${projectRef}/settings/api`,
    },
  ]

  return (
    <div className="h-full w-full flex items-center justify-center bg-transparent">
      <div className="w-[440px] bg-white dark:bg-zinc-950 border border-black/5 dark:border-white/5 rounded-2xl shadow-2xl p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold text-foreground">Supabase</h2>
            <p className="text-[13px] text-muted-foreground mt-1">Manage your Supabase project</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </div>
        </div>

        <div className="space-y-1 mb-10">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between group p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-5 h-5 shrink-0">
                  {link.icon}
                </div>
                <span className="text-[14px] font-medium text-foreground/80 group-hover:text-foreground">
                  {link.label}
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </a>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground/60 transition-colors">
            <CircleHelp className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-4 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
            <button className="px-4 py-2 bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.07] dark:hover:bg-white/[0.07] rounded-lg text-[13px] font-semibold transition-colors">
              Manage Organizations
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
