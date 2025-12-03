'use client'

import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useAppsSync } from '@/hooks/useAppsSync'
import { useAppStore } from '@/lib/app-store'
import { deleteAppAction } from '@/app/actions/apps'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function AppsPage() {
  const { setCurrentApp } = useAppStore()
  const router = useRouter()
  const { isSignedIn } = useAuth()
  const { apps, isLoading } = useAppsSync()
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleOpenApp = (id: string) => {
    setCurrentApp(id)
    router.push('/workspace')
  }

  const handleDeleteApp = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this app?')) {
      return
    }

    try {
      setIsDeleting(id)
      await deleteAppAction(id)
    } catch (error) {
      console.error('Failed to delete app:', error)
      alert('Failed to delete app')
    } finally {
      setIsDeleting(null)
    }
  }

  const sortedApps = [...apps].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

  return (
    <>
      <AppSidebar />
      <div className="flex flex-col min-h-screen bg-background p-4 md:p-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              My apps
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse, open, and manage the apps you have created.
            </p>
          </div>
        </header>

        {!isSignedIn ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <p className="text-sm text-muted-foreground mb-2">
                Please sign in to view your apps.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <p className="text-sm text-muted-foreground mb-2">
                Loading your apps...
              </p>
            </div>
          </div>
        ) : apps.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <p className="text-sm text-muted-foreground mb-2">
                You have not created any apps yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Use the prompt bar on the home page or the New App button in the side
                menu to create your first app.
              </p>
            </div>
          </div>
        ) : (
          <main className="flex-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => handleOpenApp(app.id)}
                  className="flex flex-col items-start text-left rounded-xl border border-border bg-card/80 hover:bg-card shadow-sm hover:shadow-md transition-all p-4 space-y-2 group"
                  disabled={isDeleting === app.id}
                >
                  <div className="inline-flex items-center px-2 py-1 rounded-full bg-secondary text-xs text-muted-foreground mb-1">
                    App
                  </div>
                  <h2 className="text-sm font-semibold text-foreground truncate w-full">
                    {app.name}
                  </h2>
                  {app.description && (
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {app.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between w-full text-[11px] text-muted-foreground">
                    <span>Updated {new Date(app.updated_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isDeleting === app.id ? (
                        <span className="text-xs">Deleting...</span>
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleDeleteApp(app.id, e)}
                            className="p-1 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete app"
                            disabled={isDeleting === app.id}
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                          <span>Open →</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </main>
        )}
      </div>
    </>
  )
}
