'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth, useClerk } from '@clerk/nextjs'
import {
  MoreVertical,
  Trash2,
  Edit2,
  X,
  FolderPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/ui-store'
import { useAppsSync } from '@/hooks/useAppsSync'
import {
  createAppAction,
  deleteAppAction,
  renameAppAction,
} from '@/app/actions/apps'
import { useAppStore } from '@/lib/app-store'
import type { Database } from '@/lib/supabase'

type App = Database['public']['Tables']['apps']['Row']

interface CreateAppDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, description: string) => void
  isLoading?: boolean
}

function CreateAppDialog({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
}: CreateAppDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onCreate(name, description)
      setName('')
      setDescription('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Create New App</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              App Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter app name..."
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your app..."
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface AppContextMenuProps {
  isOpen: boolean
  onClose: () => void
  onDelete: () => void
  onRename: () => void
  isLoading?: boolean
}

function AppContextMenu({
  isOpen,
  onClose,
  onDelete,
  onRename,
  isLoading = false,
}: AppContextMenuProps) {
  if (!isOpen) return null

  return (
    <div className="absolute right-0 top-full mt-1 w-40 rounded-lg bg-background border border-border shadow-lg overflow-hidden z-40">
      <button
        onClick={onRename}
        disabled={isLoading}
        className="w-full px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Edit2 className="w-4 h-4" />
        Rename
      </button>
      <button
        onClick={onDelete}
        disabled={isLoading}
        className="w-full px-4 py-2 text-sm text-red-500 hover:bg-secondary flex items-center gap-2 transition-colors border-t border-border disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </div>
  )
}

interface RenameDialogProps {
  isOpen: boolean
  currentName: string
  onClose: () => void
  onRename: (newName: string) => void
  isLoading?: boolean
}

function RenameDialog({
  isOpen,
  currentName,
  onClose,
  onRename,
  isLoading = false,
}: RenameDialogProps) {
  const [newName, setNewName] = useState(currentName)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newName.trim()) {
      onRename(newName)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-background border border-border shadow-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Rename App</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter new app name..."
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            disabled={isLoading}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AppSidebar() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedAppForMenu, setSelectedAppForMenu] = useState<string | null>(null)
  const [selectedAppForRename, setSelectedAppForRename] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const pathname = usePathname()
  const isWorkspacePage = pathname === '/workspace'
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const { isSignedIn } = useAuth()
  const { openSignIn } = useClerk()
  const { setCurrentApp, currentAppId } = useAppStore()

  const { apps, isLoading: appsLoading } = useAppsSync(5)

  const currentApp = isWorkspacePage && currentAppId ? apps.find((a) => a.id === currentAppId) || null : null

  const handleCreateApp = async (name: string, description: string) => {
    if (!isSignedIn) {
      openSignIn()
      return
    }

    try {
      setIsLoading(true)
      const newApp = await createAppAction(name, description)
      if (newApp) {
        setCurrentApp(newApp.id)
        setCreateDialogOpen(false)
      }
    } catch (error) {
      console.error('Failed to create app:', error)
      alert('Failed to create app')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteApp = async (id: string) => {
    if (confirm('Are you sure you want to delete this app?')) {
      try {
        setIsLoading(true)
        await deleteAppAction(id)
        setSelectedAppForMenu(null)
      } catch (error) {
        console.error('Failed to delete app:', error)
        alert('Failed to delete app')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleRenameApp = async (newName: string) => {
    if (selectedAppForRename) {
      try {
        setIsLoading(true)
        await renameAppAction(selectedAppForRename, newName)
        setSelectedAppForRename(null)
      } catch (error) {
        console.error('Failed to rename app:', error)
        alert('Failed to rename app')
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-background border-r border-border z-30 transform transition-transform duration-300 overflow-y-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-tight">
              Apps
            </h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Close app menu"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {currentApp && (
            <div className="p-4 border-b border-border bg-secondary/50">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Current App
              </div>
              <div className="text-sm font-semibold text-foreground truncate">
                {currentApp.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {currentApp.description}
              </div>
            </div>
          )}

          <div className="p-3 border-b border-border">
            <button
              onClick={() => {
                if (!isSignedIn) {
                  openSignIn()
                  return
                }
                setSidebarOpen(false)
                router.push('/apps')
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-secondary/70 hover:bg-secondary text-foreground text-sm font-medium transition-colors"
            >
              <span>My apps</span>
              <span className="text-xs text-muted-foreground">
                View all
              </span>
            </button>
          </div>

          <div className="p-3 border-b border-border">
            <button
              onClick={() => {
                setSidebarOpen(false)
                router.push('/home')
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New App</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-2">
              {appsLoading ? (
                <div className="text-xs text-muted-foreground text-center py-8">
                  Loading apps...
                </div>
              ) : apps.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-8">
                  No apps yet. Create one to get started.
                </div>
              ) : (
                apps.map((app) => (
                  <div key={app.id} className="relative">
                    <button
                      onClick={() => {
                        setCurrentApp(app.id)
                        setSidebarOpen(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-lg transition-colors relative group',
                        currentAppId === app.id
                          ? 'bg-blue-600/20 border border-blue-500 text-foreground'
                          : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {app.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {new Date(app.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                        {currentAppId === app.id && (
                          <div className="relative">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAppForMenu(
                                  selectedAppForMenu === app.id ? null : app.id
                                )
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  setSelectedAppForMenu(
                                    selectedAppForMenu === app.id ? null : app.id
                                  )
                                }
                              }}
                              className="p-1 hover:bg-secondary rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </div>
                            <AppContextMenu
                              isOpen={selectedAppForMenu === app.id}
                              onClose={() => setSelectedAppForMenu(null)}
                              onDelete={() => handleDeleteApp(app.id)}
                              onRename={() => {
                                setSelectedAppForRename(app.id)
                                setSelectedAppForMenu(null)
                              }}
                              isLoading={isLoading}
                            />
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {!appsLoading && apps.length > 0 && (
            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
              {apps.length} app{apps.length !== 1 ? 's' : ''} shown (recent)
            </div>
          )}
        </div>
      </div>

      <CreateAppDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateApp}
        isLoading={isLoading}
      />

      <RenameDialog
        isOpen={selectedAppForRename !== null}
        currentName={
          selectedAppForRename
            ? apps.find((a) => a.id === selectedAppForRename)?.name || ''
            : ''
        }
        onClose={() => setSelectedAppForRename(null)}
        onRename={handleRenameApp}
        isLoading={isLoading}
      />
    </>
  )
}
