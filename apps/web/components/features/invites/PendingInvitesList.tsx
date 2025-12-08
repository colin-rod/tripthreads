'use client'

/**
 * PendingInvitesList Component
 *
 * Displays and manages all invites for a trip.
 * Features:
 * - List of all invites (link and email)
 * - Copy link button
 * - Resend email button (for pending email invites)
 * - Revoke button
 * - Status badges
 * - Usage tracking for link invites
 */

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Check, Copy, Link as LinkIcon, Mail, MoreVertical, RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

import { createClient } from '@/lib/supabase/client'
import { getTripInvites, revokeInvite, getInviteUrl, type TripInvite } from '@tripthreads/core'

interface PendingInvitesListProps {
  tripId: string
  isOwner: boolean
  wrapped?: boolean
}

export function PendingInvitesList({ tripId, isOwner, wrapped = true }: PendingInvitesListProps) {
  const { toast } = useToast()
  const [invites, setInvites] = useState<TripInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadInvites()
  }, [tripId])

  async function loadInvites() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const data = await getTripInvites(supabase, tripId)
      setInvites(data)
    } catch (error) {
      console.error('Error loading invites:', error)
      toast({
        title: 'Error loading invites',
        description: 'Failed to fetch invite list',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopyLink(invite: TripInvite) {
    const url = getInviteUrl(invite.token)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(invite.id)
      toast({
        title: 'Link copied!',
        description: 'Invite link copied to clipboard',
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      })
    }
  }

  async function handleRevoke(invite: TripInvite) {
    try {
      const supabase = createClient()
      await revokeInvite(supabase, invite.id)

      toast({
        title: 'Invite revoked',
        description:
          invite.invite_type === 'email'
            ? `Invite to ${invite.email} has been revoked`
            : 'Shareable link has been revoked',
      })

      // Reload invites
      await loadInvites()
    } catch (error) {
      console.error('Error revoking invite:', error)
      toast({
        title: 'Error revoking invite',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    }
  }

  async function handleResend(_invite: TripInvite) {
    // TODO: Implement actual email sending when Supabase email is configured
    toast({
      title: 'Resend not implemented',
      description:
        'Email sending requires Supabase configuration. Copy the link and send manually.',
    })
  }

  if (!isOwner) {
    return null
  }

  const pendingInvites = invites.filter(inv => inv.status === 'pending')
  const acceptedInvites = invites.filter(inv => inv.status === 'accepted')
  const revokedInvites = invites.filter(inv => inv.status === 'revoked')

  const content = (
    <>
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
          <p>Loading invitations...</p>
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No invitations yet</p>
          <p className="text-sm mt-1">Create an invite to share this trip with others</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Pending ({pendingInvites.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map(invite => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        {invite.invite_type === 'link' ? (
                          <div className="flex items-center gap-2">
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Link</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Email</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {invite.email || (
                          <span className="text-muted-foreground italic">Anyone with link</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invite.role === 'participant' ? 'default' : 'secondary'}>
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(invite.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {invite.invite_type === 'link' ? (
                          <span>{invite.use_count} uses</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyLink(invite)}>
                              {copiedId === invite.id ? (
                                <>
                                  <Check className="mr-2 h-4 w-4 text-green-600" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Link
                                </>
                              )}
                            </DropdownMenuItem>
                            {invite.invite_type === 'email' && (
                              <DropdownMenuItem onClick={() => handleResend(invite)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Resend Email
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleRevoke(invite)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Revoke
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Accepted Invites */}
          {acceptedInvites.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 text-green-600">
                Accepted ({acceptedInvites.length})
              </h3>
              <div className="text-sm text-muted-foreground">
                {acceptedInvites.length} invitation{acceptedInvites.length > 1 ? 's' : ''} accepted
              </div>
            </div>
          )}

          {/* Revoked Invites */}
          {revokedInvites.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                Revoked ({revokedInvites.length})
              </h3>
              <div className="text-sm text-muted-foreground">
                {revokedInvites.length} invitation{revokedInvites.length > 1 ? 's' : ''} revoked
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )

  if (wrapped) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>Manage trip invitations and view invitation history</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    )
  }

  return content
}
