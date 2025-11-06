'use client'

/**
 * AccessRequestsList Component
 *
 * Displays pending access requests for trip organizers.
 * Shows when viewers have requested to be upgraded to participants.
 *
 * Features:
 * - List of pending requests with user info
 * - Approve/Reject buttons
 * - Real-time updates via Supabase subscriptions (future)
 */

import { useState } from 'react'
import { Check, X, UserCheck } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { approveAccessRequest, rejectAccessRequest } from '@/app/actions/permissions'

interface AccessRequest {
  id: string
  user_id: string
  requested_at: string
  user: {
    id: string
    full_name: string | null
    avatar_url: string | null
    email: string
  }
}

interface AccessRequestsListProps {
  tripId: string
  requests: AccessRequest[]
  isOwner: boolean
}

export function AccessRequestsList({ requests, isOwner }: AccessRequestsListProps) {
  const { toast } = useToast()
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Don't show if not owner or no requests
  if (!isOwner || requests.length === 0) {
    return null
  }

  async function handleApprove(requestId: string) {
    setProcessingId(requestId)
    try {
      await approveAccessRequest(requestId)

      toast({
        title: 'Access granted!',
        description: 'The user has been upgraded to participant.',
      })
    } catch (error) {
      console.error('Error approving request:', error)
      toast({
        title: 'Failed to approve request',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(requestId: string) {
    setProcessingId(requestId)
    try {
      await rejectAccessRequest(requestId)

      toast({
        title: 'Request rejected',
        description: 'The access request has been declined.',
      })
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast({
        title: 'Failed to reject request',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Access Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            {requests.length} {requests.length === 1 ? 'viewer has' : 'viewers have'} requested edit
            access to this trip.
          </AlertDescription>
        </Alert>

        {requests.map(request => (
          <div
            key={request.id}
            className="flex items-center justify-between gap-4 p-4 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={request.user.avatar_url || undefined} />
                <AvatarFallback>
                  {request.user.full_name
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>

              <div>
                <p className="font-medium">{request.user.full_name || 'Unknown User'}</p>
                <p className="text-sm text-muted-foreground">{request.user.email}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApprove(request.id)}
                disabled={processingId === request.id}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReject(request.id)}
                disabled={processingId === request.id}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
