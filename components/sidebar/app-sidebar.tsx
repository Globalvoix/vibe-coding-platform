"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/app-store"
import { useUIStore } from "@/lib/ui-store"
import {
  ChevronDown,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateAppDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, description: string) => void
}

function CreateAppDialog({ isOpen, onClose, onCreate }: CreateAppDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onCreate(name, description)
      setName("")
      setDescription("")
      onClose()
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
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface AppMenuProps {
  isOpen: boolean
  appId: string
  onClose: () => void
  onDelete: () => void
  onRename: () => void
}

function AppContextMenu({ isOpen, appId, onClose, onDelete, onRename }: AppMenuProps) {
  if (!isOpen) return null

  return (
    <div className="absolute right-0 top-full mt-1 w-40 rounded-lg bg-background border border-border shadow-lg overflow-hidden z-40">
      <button
        onClick={onRename}
        className="w-full px-4 py-2 text-sm text-foreground hover:bg-secondary flex items-center gap-2 transition-colors"
      >
        <Edit2 className="w-4 h-4" />
        Rename
      </button>
      <button
        onClick={onDelete}
        className="w-full px-4 py-2 text-sm text-red-500 hover:bg-secondary flex items-center gap-2 transition-colors border-t border-border"
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
}

function RenameDialog({ isOpen, currentName, onClose, onRename }: RenameDialogProps) {
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
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-secondary border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [selectedAppForMenu, setSelectedAppForMenu] = useState<string | null>(null)
  const [selectedAppForRename, setSelectedAppForRename] = useState<string | null>(null)

  const {
    apps,
    currentAppId,
    createApp,
    deleteApp,
    setCurrentApp,
    renameApp,
  } = useAppStore()

  const currentApp = apps.find((app) => app.id === currentAppId)
  const sortedApps = [...apps].sort((a, b) => b.createdAt - a.createdAt)

  const handleCreateApp = (name: string, description: string) => {
    createApp(name, description)
  }

  const handleDeleteApp = (id: string) => {
    if (confirm("Are you sure you want to delete this app?")) {
      deleteApp(id)
      setSelectedAppForMenu(null)
    }
  }

  const handleRenameApp = (newName: string) => {
    if (selectedAppForRename) {
      renameApp(selectedAppForRename, newName)
      setSelectedAppForRename(null)
    }
  }

  return (
    <>
      <div
        className={cn(
          "fixed left-0 top-0 h-screen bg-background border-r border-border transition-all duration-300 z-30",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            {!isCollapsed && (
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-tight">
                Apps
              </h2>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Current App Info */}
          {currentApp && !isCollapsed && (
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

          {/* Create New App Button */}
          <div className="p-3 border-b border-border">
            <button
              onClick={() => setCreateDialogOpen(true)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors",
                isCollapsed && "px-0"
              )}
              title="Create new app"
            >
              <FolderPlus className="w-4 h-4" />
              {!isCollapsed && <span>New App</span>}
            </button>
          </div>

          {/* Apps List */}
          <div className="flex-1 overflow-y-auto">
            <div className={cn("p-3 space-y-2", isCollapsed && "p-1.5")}>
              {sortedApps.length === 0 ? (
                !isCollapsed && (
                  <div className="text-xs text-muted-foreground text-center py-8">
                    No apps yet. Create one to get started.
                  </div>
                )
              ) : (
                sortedApps.map((app) => (
                  <div
                    key={app.id}
                    className="relative"
                  >
                    <button
                      onClick={() => setCurrentApp(app.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg transition-colors relative group",
                        currentAppId === app.id
                          ? "bg-blue-600/20 border border-blue-500 text-foreground"
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                      title={isCollapsed ? app.name : undefined}
                    >
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {isCollapsed ? app.name.charAt(0).toUpperCase() : app.name}
                          </div>
                          {!isCollapsed && (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {new Date(app.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {!isCollapsed && currentAppId === app.id && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAppForMenu(
                                  selectedAppForMenu === app.id ? null : app.id
                                )
                              }}
                              className="p-1 hover:bg-secondary rounded transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            <AppContextMenu
                              isOpen={selectedAppForMenu === app.id}
                              appId={app.id}
                              onClose={() => setSelectedAppForMenu(null)}
                              onDelete={() => handleDeleteApp(app.id)}
                              onRename={() => {
                                setSelectedAppForRename(app.id)
                                setSelectedAppForMenu(null)
                              }}
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

          {/* Footer Info */}
          {!isCollapsed && apps.length > 0 && (
            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
              {apps.length} app{apps.length !== 1 ? "s" : ""} total
            </div>
          )}
        </div>
      </div>

      <CreateAppDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateApp}
      />

      <RenameDialog
        isOpen={renameDialogOpen}
        currentName={selectedAppForRename ? apps.find((a) => a.id === selectedAppForRename)?.name || "" : ""}
        onClose={() => setSelectedAppForRename(null)}
        onRename={handleRenameApp}
      />
    </>
  )
}
