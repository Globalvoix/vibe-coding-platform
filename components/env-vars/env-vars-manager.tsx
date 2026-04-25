'use client'

import { useEffect, useState, useCallback } from 'react'
import { Lock, Plus, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface EnvVar {
  id: string
  key: string
  is_sensitive: boolean
  has_value: boolean
}

interface Props {
  projectId?: string
}

export function EnvVarsManager({ projectId }: Props) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set())

  const fetchEnvVars = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}/env-vars`)
      if (!response.ok) throw new Error('Failed to fetch env vars')

      const data = await response.json()
      setEnvVars(data.envVars || [])
    } catch (error) {
      toast.error('Failed to load environment variables')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchEnvVars()
  }, [fetchEnvVars])

  const handleAddEnvVar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectId || !newKey.trim() || !newValue.trim()) {
      toast.error('Key and value are required')
      return
    }

    // Validate key format
    if (!/^[A-Z0-9_]+$/.test(newKey)) {
      toast.error('Key must be uppercase alphanumeric with underscores')
      return
    }

    try {
      setIsAdding(true)
      const response = await fetch(`/api/projects/${projectId}/env-vars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newKey,
          value: newValue,
          is_sensitive: true,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add environment variable')
      }

      setNewKey('')
      setNewValue('')
      setVisibleValues(new Set())
      toast.success(`Environment variable "${newKey}" added`)
      await fetchEnvVars()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add environment variable')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteEnvVar = async (key: string) => {
    if (!projectId) return

    if (!confirm(`Delete environment variable "${key}"?`)) return

    try {
      const response = await fetch(`/api/projects/${projectId}/env-vars`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success(`Environment variable "${key}" deleted`)
      await fetchEnvVars()
    } catch (error) {
      toast.error('Failed to delete environment variable')
    }
  }

  const toggleValueVisibility = (key: string) => {
    const newVisible = new Set(visibleValues)
    if (newVisible.has(key)) {
      newVisible.delete(key)
    } else {
      newVisible.add(key)
    }
    setVisibleValues(newVisible)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-2">Add New Variable</h3>
            <form onSubmit={handleAddEnvVar} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="KEY_NAME (uppercase)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  disabled={isAdding}
                  className="flex-1 font-mono text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Value (hidden)"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  disabled={isAdding}
                  className="flex-1 font-mono text-xs"
                />
              </div>
              <Button
                type="submit"
                disabled={isAdding || !newKey.trim() || !newValue.trim()}
                size="sm"
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Variable
              </Button>
            </form>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">
              Environment Variables ({envVars.length})
            </h3>
            {loading ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                Loading...
              </div>
            ) : envVars.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No environment variables yet
              </div>
            ) : (
              <div className="space-y-2">
                {envVars.map((envVar) => (
                  <div
                    key={envVar.id}
                    className="border border-border rounded-lg p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {envVar.is_sensitive && (
                        <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {envVar.key}
                        </div>
                        {envVar.has_value && (
                          <div className="text-xs text-muted-foreground">
                            ✓ Value set
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEnvVar(envVar.key)}
                      className="ml-2 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors text-red-600 dark:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-900 dark:text-blue-200">
              <strong>Tip:</strong> Add your API keys here. The AI will use these to generate code. Keys are encrypted and never exposed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
