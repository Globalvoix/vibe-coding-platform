'use client'

import * as React from 'react'
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
  Github,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/ui-store'
import { Button } from '@/components/ui/button'
import { GithubIcon } from '@/components/icons/github'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

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
      { id: 'workspace-name', label: "Prasuk's Lovable", icon: <div className="w-4 h-4 bg-pink-500 rounded text-[10px] text-white flex items-center justify-center font-bold">P</div> },
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
    <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
      <DialogContent className="max-w-[1000px] w-[95vw] h-[80vh] p-0 overflow-hidden flex flex-row rounded-2xl border-none shadow-2xl bg-white">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Configure your project and account settings</DialogDescription>

        {/* Sidebar */}
        <div className="w-[240px] bg-[#F9FAFB] border-r border-gray-100 flex flex-col p-4 overflow-y-auto shrink-0">
          {menuItems.map((section, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              <h4 className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {section.section}
              </h4>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSettingsTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors",
                      settingsTab === item.id
                        ? "bg-white text-gray-900 shadow-sm border border-gray-200/50"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                    )}
                  >
                    <span className={cn(
                      "transition-colors",
                      settingsTab === item.id ? "text-gray-900" : "text-gray-400"
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
        <div className="flex-1 bg-white flex flex-col min-w-0 h-full relative">
          <div className="flex items-center justify-between px-8 border-b border-gray-100 h-16 shrink-0">
            <h2 className="text-lg font-bold text-gray-900">
              {getTabLabel(settingsTab)}
            </h2>
            <button
              onClick={() => setSettingsModalOpen(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10">
            {settingsTab === 'github' ? (
              <div className="max-w-4xl space-y-10">
                {/* Header Section */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[14px] text-gray-500 leading-relaxed">
                      Sync your project 2-way with GitHub to collaborate at source.
                    </p>
                  </div>
                  <a href="#" className="flex items-center gap-1.5 text-[13px] font-medium text-gray-400 hover:text-gray-900 transition-colors">
                    <BookOpen className="w-4 h-4" />
                    Docs
                  </a>
                </div>

                <div className="h-px bg-gray-100 w-full" />

                {/* Connect Project Section */}
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[15px] font-bold text-gray-900">Connect project</h3>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF7ED] border border-[#FFEDD5]">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          <span className="text-[10px] font-bold text-orange-700 uppercase tracking-tight">Not connected</span>
                        </div>
                      </div>
                      <p className="text-[13px] text-gray-500 leading-relaxed">
                        Connect your project to your GitHub organization in a 2-way sync.
                      </p>
                    </div>
                    <Button
                      onClick={handleConnectGithub}
                      disabled={loading}
                      className="bg-[#111827] hover:bg-[#111827]/90 text-white rounded-lg px-4 h-9 flex items-center gap-2 text-[13px] font-bold transition-all active:scale-[0.98]"
                    >
                      <GithubIcon className="w-4 h-4 text-white" />
                      {loading ? 'Connecting...' : 'Connect project'}
                    </Button>
                  </div>
                </div>

                <div className="h-px bg-gray-100 w-full" />

                {/* Connected Account Section */}
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h3 className="text-[15px] font-bold text-gray-900">Connected account</h3>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F4F6] border border-[#E5E7EB]">
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">Admin</span>
                        </div>
                      </div>
                      <p className="text-[13px] text-gray-500 leading-relaxed">
                        Add your GitHub account to manage connected organizations.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[13px] font-medium text-gray-400 hover:text-gray-900 cursor-pointer transition-colors pt-1">
                      <GithubIcon className="w-4.5 h-4.5" />
                      <span>{githubStatus.connected ? githubStatus.username : 'Globalvoix'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                <Settings className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium">Select a tab to configure settings</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
