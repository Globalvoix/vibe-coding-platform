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
          className="fixed left-[50%] top-[50%] z-[101] flex h-[85vh] w-[92vw] max-w-[1280px] translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-[20px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Settings</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Configure your project and account settings</DialogPrimitive.Description>

          {/* Sidebar */}
          <div className="flex w-[260px] flex-col border-r border-gray-100 bg-[#FAFAFA] py-6 overflow-y-auto shrink-0">
            {menuItems.map((section, idx) => (
              <div key={idx} className="mb-8 last:mb-0">
                <h4 className="px-6 text-[11px] font-bold text-gray-400 uppercase tracking-[0.05em] mb-3">
                  {section.section}
                </h4>
                <div className="px-3 space-y-0.5">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSettingsTab(item.id)}
                      className={cn(
                        "group w-full flex items-center gap-3 px-3 py-2 text-[14px] font-medium rounded-xl transition-all",
                        settingsTab === item.id 
                          ? "bg-white text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-200/50" 
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/60"
                      )}
                    >
                      <span className={cn(
                        "transition-colors",
                        settingsTab === item.id ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
                      )}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex flex-1 flex-col min-w-0 bg-white">
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-gray-100 px-10 shrink-0">
              <h2 className="text-[18px] font-bold text-gray-900">
                {getTabLabel(settingsTab)}
              </h2>
              <DialogPrimitive.Close className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto px-12 py-10">
              {settingsTab === 'github' ? (
                <div className="max-w-[800px] space-y-12">
                  {/* Summary */}
                  <div className="flex items-start justify-between">
                    <p className="text-[15px] leading-relaxed text-gray-500">
                      Sync your project 2-way with GitHub to collaborate at source.
                    </p>
                    <a href="#" className="flex items-center gap-1.5 text-[14px] font-semibold text-gray-400 transition-colors hover:text-gray-900">
                      <BookOpen className="h-4 w-4" />
                      Docs
                    </a>
                  </div>

                  <div className="h-px w-full bg-gray-100" />

                  {/* Connect Project Section */}
                  <div className="flex items-start justify-between group">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[16px] font-bold text-gray-900">Connect project</h3>
                        <div className="flex items-center gap-1.5 rounded-full border border-orange-100 bg-[#FFF7ED] px-2.5 py-0.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                          <span className="text-[10px] font-extrabold text-orange-700 uppercase tracking-tight">Not connected</span>
                        </div>
                      </div>
                      <p className="text-[14px] leading-relaxed text-gray-500">
                        Connect your project to your GitHub organization in a 2-way sync.
                      </p>
                    </div>
                    <Button 
                      onClick={handleConnectGithub}
                      disabled={loading}
                      className="h-10 rounded-xl bg-black px-5 text-[14px] font-bold text-white transition-all hover:bg-black/90 active:scale-[0.98] flex items-center gap-2.5"
                    >
                      <GithubIcon className="h-4 w-4 text-white" />
                      {loading ? 'Connecting...' : 'Connect project'}
                    </Button>
                  </div>

                  <div className="h-px w-full bg-gray-100" />

                  {/* Connected Account Section */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[16px] font-bold text-gray-900">Connected account</h3>
                        <div className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-[#F3F4F6] px-2.5 py-0.5">
                          <span className="text-[10px] font-extrabold text-gray-600 uppercase tracking-tight">Admin</span>
                        </div>
                      </div>
                      <p className="text-[14px] leading-relaxed text-gray-500">
                        Add your GitHub account to manage connected organizations.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2 text-[14px] font-bold text-gray-400 transition-colors hover:text-gray-900 cursor-pointer">
                      <GithubIcon className="h-5 w-5" />
                      <span>{githubStatus.connected ? githubStatus.username : 'Globalvoix'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-4 text-gray-300">
                  <div className="rounded-2xl border-2 border-dashed border-gray-100 p-8">
                    <Settings className="h-12 w-12 opacity-20" />
                  </div>
                  <p className="text-[15px] font-medium">Coming soon</p>
                </div>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
