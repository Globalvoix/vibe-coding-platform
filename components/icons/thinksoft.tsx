import { ChristmasCap } from '../ui/christmas-cap';
import { cn } from '@/lib/utils';

interface Props {
  className?: string
}

export function ThinksoftLogo({ className }: Props) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <svg
        height="24"
        viewBox="0 0 100 40"
        width="100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <text
          x="50"
          y="26"
          fontSize="28"
          fontWeight="700"
          textAnchor="middle"
          fill="currentColor"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="-0.5"
        >
          Thinksoft
        </text>
      </svg>
    </div>
  )
}
