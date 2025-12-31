'use client'

/**
 * InviteDialog Component
 *
 * Modal dialog for inviting participants to a trip.
 * Features:
 * - Share Link tab: Generate shareable link with QR code
 * - Email Invites tab: Send email invitations (Phase 3)
 * - Role selector (Participant/Viewer)
 * - Copy to clipboard functionality
 */

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Info, Link as LinkIcon, Mail, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'

import { createClient } from '@/lib/supabase/client'
import { createInviteLink, createBatchEmailInvites, type InviteLinkResult } from '@tripthreads/core'
import { Textarea } from '@/components/ui/textarea'
import { trackInviteSent } from '@/lib/analytics'
import { UpgradePromptDialog } from '@/components/features/subscription/UpgradePromptDialog'

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
}

interface LimitInfo {
  currentCount: number
  limit: number
  isProUser: boolean
}

export function InviteDialog({ open, onOpenChange, tripId }: InviteDialogProps) {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState<'participant' | 'viewer'>('participant')
  const [inviteLink, setInviteLink] = useState<InviteLinkResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Email invite state
  const [emailInput, setEmailInput] = useState('')
  const [isSendingEmails, setIsSendingEmails] = useState(false)

  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [limitInfo, setLimitInfo] = useState<LimitInfo | null>(null)

  // Check participant limit before allowing invites
  async function checkParticipantLimit(): Promise<boolean> {
    try {
      const response = await fetch(`/api/trips/${tripId}/participant-limit`)
      const data = await response.json()

      if (!data.allowed) {
        setLimitInfo({
          currentCount: data.currentCount,
          limit: data.limit,
          isProUser: data.isProUser,
        })
        setShowUpgradePrompt(true)
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking participant limit:', error)
      // If check fails, allow the action (fail open)
      return true
    }
  }

  async function handleGenerateLink() {
    // Check participant limit first
    const canInvite = await checkParticipantLimit()
    if (!canInvite) return

    setIsGenerating(true)
    try {
      const supabase = createClient()
      const result = await createInviteLink(supabase, tripId, selectedRole)

      // Track successful invite link creation
      trackInviteSent({
        tripId: tripId,
        inviteMethod: 'link',
        role: selectedRole,
      })

      setInviteLink(result)
      toast({
        title: 'Invite link created!',
        description: 'Share this link with anyone you want to invite to the trip.',
      })
    } catch (error) {
      console.error('Error generating invite link:', error)
      toast({
        title: 'Error creating invite link',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink.url)
      setCopied(true)
      toast({
        title: 'Link copied!',
        description: 'Invite link copied to clipboard',
      })

      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually',
        variant: 'destructive',
      })
    }
  }

  function handleGenerateNew() {
    setInviteLink(null)
  }

  async function handleSendEmailInvites() {
    if (!emailInput.trim()) {
      toast({
        title: 'No emails entered',
        description: 'Please enter at least one email address',
        variant: 'destructive',
      })
      return
    }

    // Check participant limit first
    const canInvite = await checkParticipantLimit()
    if (!canInvite) return

    setIsSendingEmails(true)
    try {
      const supabase = createClient()

      // Parse emails (comma or newline separated)
      const emails = emailInput
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0)

      if (emails.length === 0) {
        throw new Error('No valid email addresses found')
      }

      if (emails.length > 50) {
        throw new Error('Maximum 50 emails per batch')
      }

      // Create email invites
      const invites = await createBatchEmailInvites(supabase, tripId, emails, selectedRole)

      const successCount = invites.length
      const failCount = emails.length - successCount

      if (successCount > 0) {
        toast({
          title: `${successCount} invite${successCount > 1 ? 's' : ''} sent!`,
          description:
            failCount > 0
              ? `${failCount} invite${failCount > 1 ? 's' : ''} failed to send`
              : 'Email invitations have been created successfully',
        })

        // Clear input on success
        setEmailInput('')
      } else {
        throw new Error('Failed to send any invitations')
      }
    } catch (error) {
      console.error('Error sending email invites:', error)
      toast({
        title: 'Error sending invitations',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSendingEmails(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Invite Participants</DialogTitle>
          <DialogDescription>
            Share a link or send email invitations to add people to this trip.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <LinkIcon className="h-4 w-4 mr-2" />
              Share Link
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email Invites
            </TabsTrigger>
          </TabsList>

          {/* Share Link Tab */}
          <TabsContent value="link" className="space-y-6 mt-6">
            {/* Role Selector */}
            <div className="space-y-3">
              <Label>Invite as</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={value => setSelectedRole(value as 'participant' | 'viewer')}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-2 rounded-md border px-4 py-2 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="participant" id="participant" />
                  <Label htmlFor="participant" className="font-normal cursor-pointer">
                    Participant
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border px-4 py-2 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="viewer" id="viewer" />
                  <Label htmlFor="viewer" className="font-normal cursor-pointer">
                    Viewer
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                {selectedRole === 'participant'
                  ? 'Participants can view and edit the trip, add expenses, and upload photos.'
                  : 'Viewers can only view trip details. They cannot edit or add content.'}
              </p>
            </div>

            {!inviteLink ? (
              /* Generate Link Button */
              <div className="space-y-4">
                <Button onClick={handleGenerateLink} disabled={isGenerating} className="w-full">
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Generate Invite Link
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  This link will never expire and can be used unlimited times
                </p>
              </div>
            ) : (
              /* Link Generated */
              <div className="space-y-4">
                {/* Link Display */}
                <div className="space-y-2">
                  <Label>Invite Link</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 bg-muted rounded-md text-sm break-all font-mono">
                      {inviteLink.url}
                    </div>
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* QR Code */}
                <div className="space-y-2">
                  <Label>QR Code</Label>
                  <div className="flex justify-center p-6 bg-white rounded-lg border">
                    <QRCodeSVG
                      value={inviteLink.url}
                      size={200}
                      level="M"
                      includeMargin={true}
                      fgColor="#11333B"
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Scan this code to join the trip
                  </p>
                </div>

                {/* Generate New Link */}
                <div className="pt-2 border-t">
                  <Button onClick={handleGenerateNew} variant="ghost" className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate New Link
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Creating a new link will not invalidate the current one
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Email Invites Tab */}
          <TabsContent value="email" className="space-y-6 mt-6">
            {/* Role Selector */}
            <div className="space-y-3">
              <Label>Invite as</Label>
              <RadioGroup
                value={selectedRole}
                onValueChange={value => setSelectedRole(value as 'participant' | 'viewer')}
                className="flex gap-3"
              >
                <div className="flex items-center space-x-2 rounded-md border px-4 py-2 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="participant" id="email-participant" />
                  <Label htmlFor="email-participant" className="font-normal cursor-pointer">
                    Participant
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rounded-md border px-4 py-2 hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="viewer" id="email-viewer" />
                  <Label htmlFor="email-viewer" className="font-normal cursor-pointer">
                    Viewer
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-sm text-muted-foreground">
                {selectedRole === 'participant'
                  ? 'Participants can view and edit the trip, add expenses, and upload photos.'
                  : 'Viewers can only view trip details. They cannot edit or add content.'}
              </p>
            </div>

            {/* Email Input */}
            <div className="space-y-3">
              <Label htmlFor="email-input">Email Addresses</Label>
              <Textarea
                id="email-input"
                placeholder="Enter email addresses (one per line or comma-separated)&#10;&#10;Example:&#10;alice@example.com, bob@example.com&#10;charlie@example.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                disabled={isSendingEmails}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                You can enter up to 50 email addresses. Separate with commas or line breaks.
              </p>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendEmailInvites}
              disabled={isSendingEmails || !emailInput.trim()}
              className="w-full"
            >
              {isSendingEmails ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending Invitations...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email Invitations
                </>
              )}
            </Button>

            {/* How it Works Tooltip */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Need help understanding how email invites work?
              </p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="How email invites work"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-sm">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">How it works</h4>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li>Invitations are created and stored in the database</li>
                        <li>Recipients must sign up or log in to accept</li>
                        <li>Each email invite can only be used once</li>
                        <li>You can resend invitations if needed</li>
                      </ul>
                      <p className="text-xs text-muted-foreground pt-2">
                        Note: Email sending requires Supabase email configuration. Invites are
                        created but automatic emails are not yet implemented.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Upgrade Prompt Dialog */}
      <UpgradePromptDialog
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        title="Participant Limit Reached"
        description="You've reached the free tier limit for participants. Upgrade to Pro for unlimited participants."
        limitType="participants"
        currentUsage={limitInfo?.currentCount ?? 0}
        limit={limitInfo?.limit ?? 5}
      />
    </Dialog>
  )
}
