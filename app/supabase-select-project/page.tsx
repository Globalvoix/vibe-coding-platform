'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SupabaseProject {
  ref: string
  id: string
  name: string
  region: string
  organizationId: string
}

export default function SupabaseSelectProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const appProjectId = searchParams.get('appProjectId')
  const token = searchParams.get('token')
  const refreshToken = searchParams.get('refreshToken')
  const expiresIn = searchParams.get('expiresIn')

  const [projects, setProjects] = useState<SupabaseProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRef, setSelectedRef] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchProjects = async () => {
      if (!token) {
        setError('Missing Supabase token')
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/supabase-connect/projects', {
          headers: {
            'x-supabase-token': token,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.status}`)
        }

        const data = (await response.json()) as { projects: SupabaseProject[] }
        setProjects(data.projects)
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
  }, [token])

  const handleSelectProject = async () => {
    if (!selectedRef || !appProjectId || !token) {
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
      const response = await fetch('/api/supabase-connect/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appProjectId,
          supabaseProjectRef: project.ref,
          supabaseProjectName: project.name,
          supabaseOrgId: project.organizationId,
          accessToken: token,
          refreshToken: refreshToken || undefined,
          expiresIn: expiresIn ? parseInt(expiresIn) : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        throw new Error(errorData.error || 'Failed to save project')
      }

      router.push(`/workspace?projectId=${appProjectId}&sb=connected`)
    } catch (err) {
      console.error('Error saving project:', err)
      setError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg
              className="w-6 h-6 text-blue-600 dark:text-blue-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">
            Select Supabase Project
          </h1>
          <p className="text-center text-slate-600 dark:text-slate-400 text-sm mb-6">
            Choose which Supabase project to connect to your application
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                No Supabase projects found in your organization
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                {projects.map((project) => (
                  <button
                    key={project.ref}
                    onClick={() => setSelectedRef(project.ref)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedRef === project.ref
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {project.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Ref: {project.ref} • {project.region}
                        </p>
                      </div>
                      {selectedRef === project.ref && (
                        <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleSelectProject}
                disabled={!selectedRef || saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Project'
                )}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            onClick={() =>
              router.push(
                `/workspace?projectId=${appProjectId}`
              )
            }
            className="w-full mt-3"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
