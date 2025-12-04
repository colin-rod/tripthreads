import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ExpandableCardProps {
  isExpanded: boolean
  className?: string
  children: React.ReactNode
}

export function ExpandableCard({ isExpanded, className, children }: ExpandableCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-300',
        isExpanded && 'md:col-span-2', // Take full width when expanded on desktop
        className
      )}
    >
      {children}
    </Card>
  )
}
