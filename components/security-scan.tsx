'use client'

import * as React from 'react'
import { HelpCircle, ChevronRight, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Issue {
  id: string
  level: 'Error' | 'Warning'
  title: string
}

const issues: Issue[] = [
  {
    id: '1',
    level: 'Error',
    title: 'Subscription Data Could Be Modified by Unauthorized Users',
  },
  {
    id: '2',
    level: 'Warning',
    title: 'Leaked Password Protection Disabled',
  },
]

export function SecurityScan() {
  const [filter, setFilter] = React.useState<'All' | 'Error' | 'Warning'>('All')

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'All') return true
    return issue.level === filter
  })

  return (
    <div className="flex flex-col h-full bg-[#FAF9F6] overflow-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-[#FAF9F6]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Security scan</h2>
            <Badge variant="secondary" className="bg-[#E8F0FE] text-[#1A73E8] border-transparent font-medium">
              Up-to-date
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Last scan: less than a minute ago</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-white border-black/10 text-sm h-9 px-4">
            Add context
          </Button>
          <Button className="bg-[#1A73E8] hover:bg-[#1557B0] text-white border-transparent text-sm h-9 px-4">
            Update (Free)
          </Button>
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors ml-4">
            <HelpCircle className="w-4 h-4" />
            <span>Docs</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-8">
        <h3 className="text-md font-semibold text-foreground mb-4">Detected issues</h3>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 mb-6">
          <button
            onClick={() => setFilter('Error')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              filter === 'Error' ? "bg-white shadow-sm ring-1 ring-black/5 text-foreground" : "text-muted-foreground hover:bg-black/5"
            )}
          >
            1 Error
          </button>
          <button
            onClick={() => setFilter('Warning')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              filter === 'Warning' ? "bg-white shadow-sm ring-1 ring-black/5 text-foreground" : "text-muted-foreground hover:bg-black/5"
            )}
          >
            1 Warning
          </button>
          <button
            onClick={() => setFilter('All')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              filter === 'All' ? "bg-white shadow-sm ring-1 ring-black/5 text-foreground" : "text-muted-foreground hover:bg-black/5"
            )}
          >
            All
          </button>
        </div>

        {/* Issues List/Table */}
        <div className="border border-black/5 rounded-lg bg-white overflow-hidden shadow-sm">
          <div className="grid grid-cols-[100px_1fr_40px] px-4 py-3 border-b border-black/5 bg-[#F9FAFB] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div>Level</div>
            <div>Issue</div>
            <div></div>
          </div>
          <div className="divide-y divide-black/5">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="grid grid-cols-[100px_1fr_40px] items-center px-4 py-4 hover:bg-black/[0.02] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                  <Badge
                    className={cn(
                      "text-[10px] py-0 px-2 font-bold uppercase",
                      issue.level === 'Error'
                        ? "bg-[#FEE2E2] text-[#B91C1C] border-transparent"
                        : "bg-[#FEF3C7] text-[#D97706] border-transparent"
                    )}
                  >
                    {issue.level}
                  </Badge>
                </div>
                <div className="text-[14px] font-medium text-foreground">
                  {issue.title}
                </div>
                <div className="flex justify-end">
                  <ArrowRightIcon className="w-4 h-4 text-muted-foreground/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-6 border-t border-black/5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Requires a current scan — update scan first
        </p>
        <Button
          disabled
          className="bg-black/40 text-white border-transparent h-10 px-6 rounded-lg font-semibold"
        >
          Try to fix all (Free)
        </Button>
      </div>
    </div>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 7l9 9" />
      <path d="M16 7v9h-9" />
    </svg>
  )
}
