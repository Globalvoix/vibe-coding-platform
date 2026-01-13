'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronRight, CheckCircle2, ArrowUpRight, Shield, HelpCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { useSandboxStore } from '@/app/state'

interface Issue {
  id: string
  level: 'Error' | 'Warning'
  title: string
  filePath?: string
  lineNumber?: number
}

export function SecurityScan() {
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const modelId = searchParams.get('modelId')
  const { sandboxId } = useSandboxStore()

  const [issues, setIssues] = React.useState<Issue[]>([])
  const [filter, setFilter] = React.useState<'All' | 'Error' | 'Warning'>('All')
  const [isScanning, setIsScanning] = React.useState(false)
  const [isFixing, setIsFixing] = React.useState(false)
  const [lastScannedAt, setLastScannedAt] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [creditsRemaining, setCreditsRemaining] = React.useState<number | null>(null)

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'All') return true
    return issue.level === filter
  })

  const handleScan = React.useCallback(async () => {
    if (!projectId) {
      setError('Project ID not available')
      setIsScanning(false)
      return
    }

    if (!sandboxId) {
      setError('Sandbox not initialized. Please generate code first.')
      setIsScanning(false)
      return
    }

    setIsScanning(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/security/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId }),
      })

      if (!response.ok) {
        try {
          const errorData = await response.json()
          setError(errorData.error || `Scan failed with status ${response.status}`)
        } catch {
          setError(`Scan failed with status ${response.status}`)
        }
        setIsScanning(false)
        return
      }

      const data = await response.json()
      const scannedIssues = Array.isArray(data.issues) ? data.issues : []
      setIssues(scannedIssues)
      setLastScannedAt(data.scannedAt || new Date().toISOString())
    } catch (err) {
      console.error('Scan error:', err)
      setError(err instanceof Error ? err.message : 'Scan failed - network or server error')
    } finally {
      setIsScanning(false)
    }
  }, [projectId, sandboxId])

  const handleFixAll = React.useCallback(async () => {
    if (!projectId || !sandboxId || issues.length === 0) {
      if (!sandboxId) {
        setError('Sandbox not initialized.')
      }
      setIsFixing(false)
      return
    }

    setIsFixing(true)
    setError(null)

    try {

      const response = await fetch(`/api/projects/${projectId}/security/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId, issues, modelId }),
      })

      if (response.status === 402) {
        const data = await response.json()
        setError(`Insufficient credits. Need ${data.required}, have ${data.available}`)
        setIsFixing(false)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Fix failed')
        setIsFixing(false)
        return
      }

      const data = await response.json()
      if (typeof data.creditsRemaining === 'number') {
        setCreditsRemaining(data.creditsRemaining)
      }

      if (Array.isArray(data.remainingIssues)) {
        setIssues(data.remainingIssues)
      } else if (data.success) {
        setIssues([])
      }

      if (typeof data.scannedAt === 'string') {
        setLastScannedAt(data.scannedAt)
      } else {
        setLastScannedAt(new Date().toISOString())
      }

      if (Array.isArray(data.remainingIssues) && data.remainingIssues.length > 0) {
        setError('Some issues could not be fixed automatically. Review the remaining issues and try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fix failed')
    } finally {
      setIsFixing(false)
    }
  }, [projectId, sandboxId, issues])

  return (
    <div className="flex flex-col h-full bg-[#FAF9F6] overflow-auto custom-scrollbar">
      {/* Docs Link */}
      <div className="flex items-center justify-end px-4 py-2">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Docs</span>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="mx-4 p-2.5 bg-[#F7F4ED] rounded-xl border border-black/[0.03] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-[13px] font-bold text-[#111827]">Security scan</h2>
          <Badge
            className={cn(
              'border-transparent text-[10px] font-bold px-2 py-0.5 rounded-md tracking-tight',
              isScanning ? 'bg-yellow-100 text-yellow-700' : 'bg-[#D2E3FC] text-[#1A73E8]'
            )}
          >
            {isScanning ? 'Scanning...' : 'Up-to-date'}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-4 bg-black/[0.06] rounded-full relative cursor-pointer">
              <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-xs" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">Advanced view</span>
          </div>

          <Button
            variant="outline"
            className="h-8 rounded-lg bg-white border-black/[0.08] text-[11px] px-3 font-semibold text-[#111827] hover:bg-gray-50 shadow-xs"
          >
            Add context
          </Button>

          <Button
            onClick={handleScan}
            disabled={isScanning || isFixing}
            className="bg-[#1A73E8] hover:bg-[#1557B0] text-white border-transparent text-[11px] h-8 px-4 rounded-lg font-bold shadow-sm disabled:opacity-50"
          >
            {isScanning ? <Spinner size="sm" /> : 'Update (Free)'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pt-8">
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-[12px] text-red-600 font-medium">{error}</p>
          </div>
        )}

        {isScanning ? (
          <div className="flex-1 flex items-center justify-center pb-20">
            <div className="flex flex-col items-center gap-4">
              <Spinner />
              <p className="text-[13px] font-medium text-muted-foreground">Scanning your code for security issues...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col px-6">
            <h3 className="text-[14px] font-bold text-[#111827] mb-4">Detected issues</h3>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setFilter('All')}
                className={cn(
                  'px-3.5 py-1.5 text-[11px] font-bold rounded-lg border transition-all',
                  filter === 'All'
                    ? 'bg-white border-black/[0.08] text-[#111827] shadow-sm'
                    : 'bg-transparent border-transparent text-muted-foreground hover:bg-black/[0.03]'
                )}
              >
                All
              </button>
              {issues.length > 0 && (
                <>
                  <button
                    onClick={() => setFilter('Error')}
                    className={cn(
                      'px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-2',
                      filter === 'Error'
                        ? 'bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]'
                        : 'bg-transparent border-transparent text-[#B91C1C] hover:bg-[#FEE2E2]/50'
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />
                    {issues.filter((i) => i.level === 'Error').length} Error{issues.filter((i) => i.level === 'Error').length !== 1 ? 's' : ''}
                  </button>
                  <button
                    onClick={() => setFilter('Warning')}
                    className={cn(
                      'px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all flex items-center gap-2',
                      filter === 'Warning'
                        ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#D97706]'
                        : 'bg-transparent border-transparent text-[#D97706] hover:bg-[#FEF3C7]/50'
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                    {issues.filter((i) => i.level === 'Warning').length} Warning{issues.filter((i) => i.level === 'Warning').length !== 1 ? 's' : ''}
                  </button>
                </>
              )}
            </div>

            {/* Issues Content */}
            {issues.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center min-h-[340px] border border-black/[0.04] rounded-2xl bg-white/40 mb-10">
                <div className="p-3 bg-white rounded-xl shadow-xs border border-black/[0.04] mb-4">
                  <Shield className="w-6 h-6 text-black/[0.15]" strokeWidth={2} />
                </div>
                <div className="max-w-[240px] text-center">
                  <p className="text-[12px] font-medium text-[#111827]/80 leading-relaxed">
                    All clear—no issues spotted. Keep in mind our scan can't catch every possible risk.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-black/[0.06] rounded-xl bg-white overflow-hidden shadow-sm mb-10">
                <div className="grid grid-cols-[120px_1fr_40px] px-6 py-3 border-b border-black/[0.04] bg-[#F9FAFB] text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  <div>Level</div>
                  <div>Issue</div>
                  <div></div>
                </div>
                <div className="divide-y divide-black/[0.04]">
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="grid grid-cols-[120px_1fr_40px] items-center px-6 py-4 hover:bg-black/[0.01] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                        <Badge
                          className={cn(
                            'text-[9px] py-0.5 px-2 font-bold uppercase rounded-md tracking-wider border-0',
                            issue.level === 'Error' ? 'bg-[#FFE4E6] text-[#E11D48]' : 'bg-[#FEF3C7] text-[#D97706]'
                          )}
                        >
                          {issue.level}
                        </Badge>
                      </div>
                      <div className="text-[13px] font-semibold text-[#111827]">
                        {issue.title}
                      </div>
                      <div className="flex justify-end">
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer / Try to fix all Section */}
      <div className="mt-auto px-6 py-8 flex flex-col items-end gap-3 bg-transparent">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-medium text-muted-foreground">
            {issues.length === 0
              ? 'Requires a current scan — update scan first'
              : `Found ${issues.length} issue${issues.length !== 1 ? 's' : ''} to fix`}
          </span>
          <Button
            onClick={handleFixAll}
            disabled={isFixing || isScanning || issues.length === 0}
            className={cn(
              'h-9 px-5 rounded-lg font-bold text-[12px] shadow-sm transition-all',
              isFixing || issues.length === 0
                ? 'bg-[#A0A0A0] text-white opacity-100 disabled:opacity-100 cursor-default shadow-none'
                : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white'
            )}
          >
            {isFixing ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Fixing...</span>
              </div>
            ) : (
              `Try to fix all ${creditsRemaining !== null ? `(${creditsRemaining} credits)` : '(Free)'}`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
