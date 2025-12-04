'use client'

import { MessageSquare, DollarSign, Calendar, Camera } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DashboardCard } from './DashboardCard'

interface QuickActionsCardProps {
  tripId: string
  onNavigate: (section: 'chat' | 'expenses' | 'plan' | 'feed') => void
}

export function QuickActionsCard({ onNavigate }: QuickActionsCardProps) {
  return (
    <DashboardCard>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => onNavigate('chat')}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-sm">Chat</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => onNavigate('expenses')}
          >
            <DollarSign className="h-5 w-5" />
            <span className="text-sm">Add Expense</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => onNavigate('plan')}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-sm">Add Activity</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col gap-2"
            onClick={() => onNavigate('feed')}
          >
            <Camera className="h-5 w-5" />
            <span className="text-sm">Upload Photo</span>
          </Button>
        </div>
      </CardContent>
    </DashboardCard>
  )
}
