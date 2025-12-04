import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DashboardCardProps {
  children: React.ReactNode
  className?: string
}

export function DashboardCard({ children, className }: DashboardCardProps) {
  return <Card className={cn('transition-shadow hover:shadow-md', className)}>{children}</Card>
}
