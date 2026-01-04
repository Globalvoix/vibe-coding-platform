'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface RenameProjectModalProps {
  isOpen: boolean
  onClose: () => void
  currentName: string
  projectId: string
}

export function RenameProjectModal({
  isOpen,
  onClose,
  currentName,
  projectId,
}: RenameProjectModalProps) {
  const [name, setName] = React.useState(currentName)
  const [isSaving, setIsSaving] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    setName(currentName)
  }, [currentName])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Project name cannot be empty')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        throw new Error('Failed to rename project')
      }

      toast.success('Project renamed successfully')
      onClose()
      // Use window.location.reload() to refresh the page and show the new name
      // since the project name is fetched in the workspace layout/page
      window.location.reload()
    } catch (error) {
      console.error('Error renaming project:', error)
      toast.error('Failed to rename project')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[440px] p-8 gap-6 rounded-2xl border-none shadow-2xl bg-white">
        <DialogHeader className="gap-2">
          <DialogTitle className="text-[22px] font-bold text-[#0F172A]">
            Rename project
          </DialogTitle>
          <DialogDescription className="text-[14px] text-[#475569] leading-relaxed">
            Update how this project appears in your workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-bold text-[#0F172A]">
            Display name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 px-4 text-[15px] bg-[#F8FAFC] border-[#E2E8F0] focus-visible:ring-[#1A73E8]/10 focus-visible:border-[#1A73E8] focus-visible:bg-[#EFF6FF] transition-all rounded-lg"
            placeholder="My Project"
            maxLength={100}
            autoFocus
          />
          <div className="space-y-1.5 pt-1">
            <p className="text-[12px] text-[#64748B] leading-relaxed">
              Supports spaces and special characters, up to 100 characters.
            </p>
            <p className="text-[12px] text-[#64748B] leading-relaxed">
              <span className="font-semibold text-[#475569]">Note:</span> this name is only visible to you and members of your workspace, not to visitors of your published app.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-2 flex sm:justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-10 px-6 text-[14px] font-bold text-[#475569] bg-[#F1F5F9]/50 hover:bg-[#F1F5F9] rounded-lg transition-colors border border-[#E2E8F0]/50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="h-10 px-8 text-[14px] font-bold bg-[#111827] hover:bg-black text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
