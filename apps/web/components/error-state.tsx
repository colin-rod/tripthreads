'use client'

import { AlertTriangle, WifiOff, Lock, FileQuestion, ServerCrash, LucideIcon } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card'

export type ErrorType = 'network' | 'permission' | '404' | '500' | 'generic'

interface ErrorConfig {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
}

const errorConfigs: Record<ErrorType, ErrorConfig> = {
  network: {
    icon: WifiOff,
    title: 'No internet connection',
    description: "We couldn't connect to the internet. Please check your connection and try again.",
    actionLabel: 'Retry',
  },
  permission: {
    icon: Lock,
    title: 'Access denied',
    description:
      "You don't have permission to access this resource. Contact your trip organizer if you think this is an error.",
    actionLabel: 'Go back',
  },
  '404': {
    icon: FileQuestion,
    title: 'Page not found',
    description: "The page you're looking for doesn't exist or has been moved.",
    actionLabel: 'Go home',
  },
  '500': {
    icon: ServerCrash,
    title: 'Server error',
    description:
      'Something went wrong on our end. Our team has been notified and is working on it.',
    actionLabel: 'Try again',
  },
  generic: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    actionLabel: 'Retry',
  },
}

export interface ErrorStateProps {
  type?: ErrorType
  title?: string
  description?: string
  action?: () => void
  actionLabel?: string
  showAction?: boolean
}

export function ErrorState({
  type = 'generic',
  title,
  description,
  action,
  actionLabel,
  showAction = true,
}: ErrorStateProps) {
  const config = errorConfigs[type]
  const Icon = config.icon

  const finalTitle = title || config.title
  const finalDescription = description || config.description
  const finalActionLabel = actionLabel || config.actionLabel

  const handleAction = () => {
    if (action) {
      action()
    } else if (type === '404') {
      window.location.href = '/'
    } else if (type === 'permission') {
      window.history.back()
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-3 rounded-full bg-error/10">
              <Icon className="h-8 w-8 text-error" />
            </div>
            <div className="space-y-2">
              <CardTitle>{finalTitle}</CardTitle>
              <CardDescription>{finalDescription}</CardDescription>
            </div>
          </div>
        </CardHeader>
        {showAction && (
          <CardFooter className="flex justify-center">
            <Button onClick={handleAction}>{finalActionLabel}</Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

// Specific error state components for convenience
export function NetworkError(props: Omit<ErrorStateProps, 'type'>) {
  return <ErrorState type="network" {...props} />
}

export function PermissionError(props: Omit<ErrorStateProps, 'type'>) {
  return <ErrorState type="permission" {...props} />
}

export function NotFoundError(props: Omit<ErrorStateProps, 'type'>) {
  return <ErrorState type="404" {...props} />
}

export function ServerError(props: Omit<ErrorStateProps, 'type'>) {
  return <ErrorState type="500" {...props} />
}
