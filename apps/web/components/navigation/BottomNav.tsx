'use client'

import Link from 'next/link'
import { Home, MessageSquare, DollarSign, Calendar, Menu, Camera, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { useHashNavigation } from '@/hooks/useHashNavigation'

interface BottomNavProps {
  tripId: string
  unreadChatCount?: number
  className?: string
}

interface BottomTabProps {
  href: string
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: number
}

function BottomTab({ href, active, icon: Icon, label, badge }: BottomTabProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs font-medium transition-colors rounded-md min-w-[60px]',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className="relative">
        <Icon className={cn('w-5 h-5', active && 'fill-current')} />
        {badge !== undefined && badge > 0 && (
          <Badge
            variant="default"
            className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
          >
            {badge > 9 ? '9+' : badge}
          </Badge>
        )}
      </div>
      <span>{label}</span>
    </Link>
  )
}

export function BottomNav({ tripId, unreadChatCount = 0, className }: BottomNavProps) {
  const { section: currentSection } = useHashNavigation()

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50',
        className
      )}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex justify-around items-center h-16 px-2">
        <BottomTab
          href={`/trips/${tripId}`}
          active={currentSection === 'home'}
          icon={Home}
          label="Home"
        />
        <BottomTab
          href={`/trips/${tripId}#chat`}
          active={currentSection === 'chat'}
          icon={MessageSquare}
          label="Chat"
          badge={unreadChatCount}
        />
        <BottomTab
          href={`/trips/${tripId}#expenses`}
          active={currentSection === 'expenses'}
          icon={DollarSign}
          label="Expenses"
        />
        <BottomTab
          href={`/trips/${tripId}#plan`}
          active={currentSection === 'plan'}
          icon={Calendar}
          label="Plan"
        />

        {/* More Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-[60px]"
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-medium">More</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 mt-4">
              <Link
                href={`/trips/${tripId}#feed`}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg hover:bg-accent transition-colors',
                  currentSection === 'feed' && 'bg-accent'
                )}
              >
                <Camera className="w-5 h-5" />
                <div>
                  <p className="font-medium">Feed</p>
                  <p className="text-sm text-muted-foreground">View trip photos</p>
                </div>
              </Link>
              <Link
                href={`/trips/${tripId}#settings`}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg hover:bg-accent transition-colors',
                  currentSection === 'settings' && 'bg-accent'
                )}
              >
                <Settings className="w-5 h-5" />
                <div>
                  <p className="font-medium">Settings</p>
                  <p className="text-sm text-muted-foreground">Manage trip settings</p>
                </div>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
