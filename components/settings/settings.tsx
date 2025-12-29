import { AutoFixErrors } from './auto-fix-errors'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ReasoningEffort } from './reasoning-effort'
import { SlidersVerticalIcon } from 'lucide-react'

export function Settings() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="cursor-pointer h-8 w-8 rounded-full border border-border/60 shadow-xs"
          style={{ backgroundColor: '#F7F4ED' }}
          variant="ghost"
          size="icon"
        >
          <SlidersVerticalIcon className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-96">
        <div className="p-4 space-y-6">
          <AutoFixErrors />
          <ReasoningEffort />
        </div>
      </PopoverContent>
    </Popover>
  )
}
