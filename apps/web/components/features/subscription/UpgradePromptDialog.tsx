'use client'

/**
 * UpgradePromptDialog Component
 *
 * Reusable dialog shown when users hit subscription limits.
 * Features:
 * - Crown icon for Pro visual branding
 * - Shows current usage vs limit
 * - Displays Pro benefits
 * - "Upgrade to Pro" CTA that navigates to settings
 * - "Maybe Later" option to dismiss
 */

import { Crown, AlertCircle, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface UpgradePromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  limitType: 'trips' | 'participants' | 'photos'
  currentCount: number
  limit: number
}

const LIMIT_BENEFITS = {
  trips: [
    'Unlimited trips',
    'Unlimited participants per trip',
    'Unlimited photo uploads',
    'Priority support',
  ],
  participants: [
    'Unlimited participants per trip',
    'Unlimited trips',
    'Unlimited photo uploads',
    'Priority support',
  ],
  photos: [
    'Unlimited photo uploads',
    'Unlimited trips',
    'Unlimited participants per trip',
    'Priority support',
  ],
}

const LIMIT_LABELS = {
  trips: 'trip',
  participants: 'participant',
  photos: 'photo',
}

export function UpgradePromptDialog({
  open,
  onOpenChange,
  title,
  description,
  limitType,
  currentCount,
  limit,
}: UpgradePromptDialogProps) {
  const router = useRouter()

  function handleUpgrade() {
    onOpenChange(false)
    router.push('/settings?tab=subscription')
  }

  const benefits = LIMIT_BENEFITS[limitType]
  const label = LIMIT_LABELS[limitType]
  const plural = limit === 1 ? label : `${label}s`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You're currently using {currentCount} of {limit} {plural} on the free tier.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <p className="text-sm font-semibold">Upgrade to Pro to unlock:</p>
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="bg-primary hover:bg-primary/90">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
