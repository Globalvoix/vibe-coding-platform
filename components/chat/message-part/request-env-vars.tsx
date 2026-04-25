'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { DataPart } from '@/ai/messages/data-parts'

interface Props {
  message: DataPart['request-env-vars']
}

export function RequestEnvVars({ message }: Props) {
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const requiredVars = message.requiredVars || []
  const reason = message.reason || ''
  const projectId = message.projectId

  const handleToggleVisibility = (key: string) => {
    const newVisible = new Set(visibleFields)
    if (newVisible.has(key)) {
      newVisible.delete(key)
    } else {
      newVisible.add(key)
    }
    setVisibleFields(newVisible)
  }

  const handleInputChange = (key: string, value: string) => {
    setEnvVars((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!projectId) {
      toast.error('Project ID not found')
      return
    }

    const missingVars = requiredVars
      .map((v) => v.key)
      .filter((key) => !envVars[key] || !envVars[key].trim())

    if (missingVars.length > 0) {
      toast.error(`Please provide: ${missingVars.join(', ')}`)
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/env-vars/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          envVars,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || 'Failed to save environment variables')
        return
      }

      toast.success('Environment variables saved and synced to your project!')
      setSubmitted(true)
    } catch (error) {
      console.error('Failed to submit env vars:', error)
      toast.error('Failed to save environment variables')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
          <AlertCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-bold text-emerald-900 text-[16px]">
            Environment Variables Saved
          </h4>
          <p className="text-[14px] text-emerald-700/80 font-medium leading-relaxed">
            Your secrets are encrypted and available to your project.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#FBF8F3] border border-black/[0.05] rounded-[24px] overflow-hidden shadow-sm w-full max-w-[500px] my-4">
      <div className="p-6 space-y-5">
        <div>
          <h3 className="text-[18px] font-bold text-black/80 tracking-tight">
            Add Secrets
          </h3>
          {reason && (
            <p className="text-[13px] text-black/50 font-medium mt-2">{reason}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {requiredVars.map((variable) => (
            <div key={variable.key} className="space-y-1.5">
              <label className="block text-[12.5px] font-bold text-black/70 uppercase tracking-wider">
                {variable.key}
              </label>
              <p className="text-[12px] text-black/40 font-medium">
                {variable.description}
              </p>
              <div className="relative flex items-center">
                <input
                  type={visibleFields.has(variable.key) ? 'text' : 'password'}
                  value={envVars[variable.key] || ''}
                  onChange={(e) =>
                    handleInputChange(variable.key, e.target.value)
                  }
                  placeholder={`Enter ${variable.key}`}
                  className={cn(
                    'w-full px-3 py-2.5 pr-10 text-[13px] font-medium',
                    'bg-white border border-black/[0.08] rounded-xl',
                    'placeholder-black/30 text-black',
                    'focus:outline-none focus:ring-2 focus:ring-black/[0.1] focus:border-transparent',
                    'transition-all'
                  )}
                />
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(variable.key)}
                  className="absolute right-3 text-black/40 hover:text-black/60 transition-colors p-1"
                  aria-label={
                    visibleFields.has(variable.key) ? 'Hide' : 'Show'
                  }
                >
                  {visibleFields.has(variable.key) ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting || requiredVars.length === 0}
            className={cn(
              'w-full py-2.5 px-4 mt-4 rounded-xl font-bold text-[13px]',
              'transition-all active:scale-[0.98]',
              submitting || requiredVars.length === 0
                ? 'bg-black/[0.04] text-black/30 cursor-not-allowed'
                : 'bg-black/[0.08] text-black/70 hover:bg-black/[0.12]'
            )}
          >
            {submitting ? 'Saving...' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  )
}
