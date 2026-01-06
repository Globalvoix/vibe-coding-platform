'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { 
  X, 
  Settings, 
  Globe, 
  BookOpen, 
  Users, 
  CreditCard, 
  Cloud, 
  ShieldCheck, 
  User, 
  Beaker, 
  Layers, 
  Search,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/ui-store'
import { Button } from '@/components/ui/button'
import { GithubIcon } from '@/components/icons/github'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

interface GithubConnectionStatus {
  connected: boolean
  username?: string
  avatarUrl?: string
  installationId?: string
}

export function LargeSettingsModal() {
  const { settingsModalOpen, setSettingsModalOpen, settingsTab, setSettingsTab } = useUIStore()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  
  const [githubStatus, setGithubStatus] = useState<GithubConnectionStatus>({ connected: false })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (settingsModalOpen && settingsTab === 'github' && projectId) {
      checkGithubStatus()
    }
  }, [settingsModalOpen, settingsTab, projectId])

  const checkGithubStatus = async () => {
    try {
      const res = await fetch(`/api/github-oauth/status?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setGithubStatus(data)
      }
    } catch (error) {
      console.error('Error checking GitHub status:', error)
    }
  }

  const handleConnectGithub = () => {
    if (!projectId) return
    setLoading(true)
    window.location.href = `/api/github-oauth/start?projectId=${projectId}`
  }

  const menuItems = [
    { section: 'Project', items: [
      { id: 'settings', label: 'Project settings', icon: <Settings className="w-4 h-4" /> },
      { id: 'domains', label: 'Domains', icon: <Globe className="w-4 h-4" /> },
      { id: 'knowledge', label: 'Knowledge', icon: <BookOpen className="w-4 h-4" /> },
    ]},
    { section: 'Workspace', items: [
      { id: 'workspace-name', label: "Prasuk's Lovable", icon: <div className="w-4 h-4 bg-[#D946EF] rounded text-[10px] text-white flex items-center justify-center font-bold">P</div> },
      { id: 'people', label: 'People', icon: <Users className="w-4 h-4" /> },
      { id: 'plans', label: 'Plans & credits', icon: <CreditCard className="w-4 h-4" /> },
      { id: 'cloud', label: 'Cloud & AI balance', icon: <Cloud className="w-4 h-4" /> },
      { id: 'privacy', label: 'Privacy & security', icon: <ShieldCheck className="w-4 h-4" /> },
    ]},
    { section: 'Account', items: [
      { id: 'account', label: 'Prasuk Jain', icon: <User className="w-4 h-4" /> },
      { id: 'labs', label: 'Labs', icon: <Beaker className="w-4 h-4" /> },
    ]},
    { section: 'Connectors', items: [
      { id: 'connectors', label: 'Connectors', icon: <Layers className="w-4 h-4" /> },
      { id: 'github', label: 'GitHub', icon: <GithubIcon className="w-4 h-4" /> },
    ]}
  ]

  const getTabLabel = (id: string) => {
    for (const section of menuItems) {
      const item = section.items.find(i => i.id === id)
      if (item) return item.label
    }
    return 'Settings'
  }

  return (
    <DialogPrimitive.Root open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          className="fixed left-[50%] top-[50%] z-[101] flex h-[90vh] w-[95vw] max-w-[1400px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-[24px] bg-[#F7F4ED] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Settings</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Configure your project and account settings</DialogPrimitive.Description>

          {/* Sidebar */}
          <div className="flex w-[280px] flex-col border-r border-black/[0.04] bg-[#F7F4ED] py-8 overflow-y-auto shrink-0">
            {menuItems.map((section, idx) => (
              <div key={idx} className="mb-8 last:mb-0">
                <h4 className="px-8 text-[10px] font-bold text-[#111827]/30 uppercase tracking-[0.2em] mb-4">
                  {section.section}
                </h4>
                <div className="px-4 space-y-1">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSettingsTab(item.id)}
                      className={cn(
                        "group w-full flex items-center gap-3.5 px-4 py-2.5 text-[14px] font-semibold rounded-xl transition-all",
                        settingsTab === item.id 
                          ? "bg-white text-[#111827] shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-black/[0.03]" 
                          : "text-[#111827]/50 hover:text-[#111827] hover:bg-black/[0.03]"
                      )}
                    >
                      <span className={cn(
                        "transition-colors",
                        settingsTab === item.id ? "text-[#111827]" : "text-[#111827]/30 group-hover:text-[#111827]/60"
                      )}>
                        {item.icon}
                      </span>
                      <span className="truncate tracking-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex flex-1 flex-col min-w-0 bg-white m-2 rounded-[20px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Header */}
            <div className="flex h-20 items-center justify-between border-b border-black/[0.04] px-12 shrink-0">
              <h2 className="text-[20px] font-bold text-[#111827] tracking-tight">
                {getTabLabel(settingsTab)}
              </h2>
              <DialogPrimitive.Close className="rounded-full p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-900 active:scale-90">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-16 py-12 custom-scrollbar">
              {settingsTab === 'github' ? (
                <div className="max-w-[840px] space-y-14">
                  {/* Summary */}
                  <div className="flex items-start justify-between gap-8">
                    <p className="text-[16px] leading-[1.6] text-[#111827]/60 font-medium">
                      Sync your project 2-way with GitHub to collaborate at source. High-fidelity synchronization ensures your codebase stays consistent across environments.
                    </p>
                    <a href="#" className="flex items-center gap-2 text-[14px] font-bold text-[#111827]/40 transition-colors hover:text-[#111827] shrink-0 pt-1">
                      <BookOpen className="h-4.5 w-4.5" />
                      <span>Docs</span>
                    </a>
                  </div>

                  <div className="h-px w-full bg-black/[0.04]" />

                  {/* Connect Project Section */}
                  <div className="flex items-start justify-between group gap-10">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">Connect project</h3>
                        <div className="flex items-center gap-2 rounded-full border border-orange-200/50 bg-[#FFF7ED] px-3 py-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                          <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">Not connected</span>
                        </div>
                      </div>
                      <p className="text-[14px] leading-relaxed text-[#111827]/50 font-medium">
                        Connect your project to your GitHub organization in a 2-way sync. This will allow you to push and pull changes directly.
                      </p>
                    </div>
                    <Button 
                      onClick={handleConnectGithub}
                      disabled={loading}
                      className="h-11 rounded-xl bg-[#111827] px-6 text-[14px] font-bold text-white transition-all hover:bg-black hover:shadow-lg active:scale-[0.97] flex items-center gap-3 shrink-0"
                    >
                      <GithubIcon className="h-5 w-5 text-white" />
                      {loading ? 'Connecting...' : 'Connect project'}
                    </Button>
                  </div>

                  <div className="h-px w-full bg-black/[0.04]" />

                  {/* Connected Account Section */}
                  <div className="flex items-start justify-between gap-10">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <h3 className="text-[18px] font-bold text-[#111827] tracking-tight">Connected account</h3>
                        <div className="flex items-center gap-2 rounded-full border border-black/[0.04] bg-gray-100 px-3 py-1">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Admin</span>
                        </div>
                      </div>
                      <p className="text-[14px] leading-relaxed text-[#111827]/50 font-medium">
                        Add your GitHub account to manage connected organizations and access private repositories.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-[#F7F4ED] px-5 py-2.5 text-[14px] font-bold text-[#111827]/40 transition-all hover:text-[#111827] hover:bg-white hover:shadow-md cursor-pointer shrink-0 mt-1">
                      <GithubIcon className="h-5 w-5" />
                      <span className="tracking-tight">{githubStatus.connected ? githubStatus.username : 'Globalvoix'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-6 text-[#111827]/20">
                  <div className="rounded-[32px] bg-[#F7F4ED] p-12 shadow-sm border border-black/[0.02]">
                    <Settings className="h-16 w-16 opacity-10" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-[18px] font-bold tracking-tight text-[#111827]/40">Work in Progress</p>
                    <p className="text-[14px] font-medium opacity-50">This section is being refined for your experience.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
