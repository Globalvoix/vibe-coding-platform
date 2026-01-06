'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronRight, CheckCircle2, ArrowUpRight } from 'lucide-react'
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
    if (!projectId || !sandboxId) {
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
        const data = await response.json()
        setError(data.error || 'Scan failed')
        setIsScanning(false)
        return
      }

      const data = await response.json()
      setIssues(data.issues || [])
      setLastScannedAt(data.scannedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
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
    <div className="flex flex-col h-full bg-[#FAF9F6] overflow-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-[#FAF9F6]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Security scan</h2>
            <Badge
              variant="secondary"
              className={cn(
                'border-transparent font-medium px-2 py-0.5 rounded-sm',
                isScanning ? 'bg-yellow-100 text-yellow-700' : 'bg-[#E8F0FE] text-[#1A73E8]'
              )}
            >
              {isScanning ? 'Scanning...' : 'Up-to-date'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {isScanning ? 'Running security scan...' : lastScannedAt ? `Last scan: ${new Date(lastScannedAt).toLocaleTimeString()}` : 'No scans yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleScan}
            disabled={isScanning || isFixing}
            className="bg-[#1A73E8] hover:bg-[#1557B0] text-white border-transparent text-xs h-8 px-3 rounded-md font-medium disabled:opacity-50"
          >
            {isScanning ? <Spinner size="sm" /> : 'Update (Free)'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8 overflow-auto flex flex-col">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {isScanning && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Spinner />
              <p className="text-sm text-muted-foreground">Scanning your code for security issues...</p>
            </div>
          </div>
        )}

        {!isScanning && (
          <>
            <h3 className="text-md font-semibold text-foreground mb-4">Detected issues</h3>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 mb-6">
              <button
                onClick={() => setFilter('Error')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2',
                  filter === 'Error'
                    ? 'bg-[#FEE2E2] text-[#B91C1C] ring-1 ring-[#FECACA]'
                    : 'bg-[#FEE2E2]/50 text-[#B91C1C] hover:bg-[#FEE2E2]'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-[#B91C1C]" />
                {issues.filter((i) => i.level === 'Error').length} Error{issues.filter((i) => i.level === 'Error').length !== 1 ? 's' : ''}
              </button>
              <button
                onClick={() => setFilter('Warning')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2',
                  filter === 'Warning'
                    ? 'bg-[#FEF3C7] text-[#D97706] ring-1 ring-[#FDE68A]'
                    : 'bg-[#FEF3C7]/50 text-[#D97706] hover:bg-[#FEF3C7]'
                )}
              >
                <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                {issues.filter((i) => i.level === 'Warning').length} Warning{issues.filter((i) => i.level === 'Warning').length !== 1 ? 's' : ''}
              </button>
              <button
                onClick={() => setFilter('All')}
                className={cn(
                  'px-4 py-1.5 text-xs font-medium rounded-md transition-all',
                  filter === 'All' ? 'bg-white shadow-sm ring-1 ring-black/5 text-foreground' : 'text-muted-foreground hover:bg-black/5'
                )}
              >
                All
              </button>
            </div>

            {/* Issues List/Table or Empty State */}
            {issues.length === 0 ? (
              <div className="flex-1 flex items-center justify-center border border-black/[0.08] rounded-xl bg-white">
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No security issues found</p>
                  <p className="text-xs text-muted-foreground">Your code looks secure</p>
                </div>
              </div>
            ) : (
              <div className="border border-black/[0.08] rounded-xl bg-white overflow-hidden shadow-sm">
                <div className="grid grid-cols-[120px_1fr_40px] px-6 py-3 border-b border-black/[0.05] bg-[#F9FAFB] text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                  <div>Level</div>
                  <div>Issue</div>
                  <div></div>
                </div>
                <div className="divide-y divide-black/[0.05]">
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
                      <div className="text-[14px] font-medium text-[#111827]">
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
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-6 flex items-center justify-between bg-white border-t border-black/5">
        <p className="text-sm text-muted-foreground">
          {issues.length === 0 ? 'No issues to fix' : `Found ${issues.length} issue${issues.length !== 1 ? 's' : ''} — click fix to resolve`}
        </p>
        <Button
          onClick={handleFixAll}
          disabled={isFixing || isScanning || issues.length === 0}
          className={cn(
            'h-9 px-4 rounded-md font-semibold',
            isFixing || issues.length === 0
              ? 'bg-[#A0A0A0] text-white opacity-100 disabled:opacity-100'
              : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white'
          )}
        >
          {isFixing ? <Spinner size="sm" /> : 'Try to fix all (5 credits)'}
        </Button>
      </div>
    </div>
  )
}
