'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Loader, AlertCircle, CheckCircle2, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { toast } from 'sonner'

interface SupabaseProject {
  ref: string
  id: string
  name: string
  region: string
  organizationId: string
}

function SupabaseSelectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const appProjectId = searchParams.get('appProjectId')
  const accessToken = searchParams.get('accessToken')
  const refreshToken = searchParams.get('refreshToken')
  const expiresIn = searchParams.get('expiresIn')

  const [projects, setProjects] = useState<SupabaseProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRef, setSelectedRef] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch Supabase projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!accessToken) {
        setError('Missing access token')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/supabase-oauth/projects', {
          method: 'GET',
          headers: {
            'x-supabase-access-token': accessToken,
          },
        })

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string }
          throw new Error(
            errorData.error || `Failed to fetch projects (${response.status})`
          )
        }

        const data = (await response.json()) as { projects: SupabaseProject[] }
        setProjects(data.projects)

        if (data.projects.length === 0) {
          setError('No Supabase projects found. Create one in your Supabase dashboard.')
        } else if (data.projects.length === 1) {
          setSelectedRef(data.projects[0].ref)
        }
      } catch (err) {
        console.error('Error fetching projects:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to load projects'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [accessToken])

  const handleSelectProject = async () => {
    if (!selectedRef || !appProjectId || !accessToken) {
      setError('Missing required information')
      return
    }

    const project = projects.find((p) => p.ref === selectedRef)
    if (!project) {
      setError('Project not found')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/supabase-oauth/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appProjectId,
          supabaseProjectRef: project.ref,
          supabaseProjectName: project.name,
          supabaseOrgId: project.organizationId,
          accessToken,
          refreshToken: refreshToken || undefined,
          expiresIn: expiresIn ? parseInt(expiresIn) : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        throw new Error(errorData.error || 'Failed to save project')
      }

      toast.success('Supabase project connected!')
      router.push(`/workspace?projectId=${appProjectId}&sb=connected`)
    } catch (err) {
      console.error('Error selecting project:', err)
      setError(err instanceof Error ? err.message : 'Failed to save project')
      toast.error('Failed to connect Supabase project')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (appProjectId) {
      router.push(`/workspace?projectId=${appProjectId}`)
    } else {
      router.push('/home')
    }
  }

  // Filter projects based on search query
  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase()
    return (
      project.name.toLowerCase().includes(query) ||
      project.ref.toLowerCase().includes(query) ||
      project.region.toLowerCase().includes(query)
    )
  })

  return (
    <>
      <AppSidebar />
      <main className="flex-1 flex flex-col h-screen max-h-screen overflow-hidden bg-background">
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="max-w-2xl w-full mx-auto px-4 py-8 flex flex-col h-full">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
                Select Supabase Project
              </h1>
              <p className="text-sm text-muted-foreground">
                Choose which Supabase project to connect to this workspace
              </p>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader className="w-10 h-10 animate-spin text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading your Supabase projects...</p>
                </div>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-semibold mb-2">No projects found</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a project in your Supabase dashboard
                  </p>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="mb-6">
                  <input
                    type="text"
                    placeholder="Search projects by name, ref, or region..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  />
                </div>

                {/* Projects List */}
                <div className="flex-1 space-y-3 mb-6 overflow-y-auto">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.ref}
                      onClick={() => setSelectedRef(project.ref)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedRef === project.ref
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                          : 'border-border hover:border-foreground/20 hover:bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {selectedRef === project.ref ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-5 h-5 border-2 border-muted-foreground rounded-full mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {project.name}
                          </h3>
                          <div className="mt-1 space-y-1">
                            <p className="text-xs text-muted-foreground font-mono">
                              {project.ref}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Globe className="w-3 h-3" />
                              <span>{project.region}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredProjects.length === 0 && projects.length > 0 && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground">No projects match your search</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-border">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSelectProject}
                    disabled={!selectedRef || saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin mr-2" />
                        Connecting...
                      </>
                    ) : (
                      'Connect Project'
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

export default function SupabaseSelectProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center w-full h-screen">
          <div className="text-center">
            <Loader className="w-10 h-10 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SupabaseSelectContent />
    </Suspense>
  )
}
