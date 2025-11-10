'use client'

/**
 * Unmatched Participant Dialog
 *
 * Handles participant names that could not be matched to any trip participant
 * (confidence < 0.6). Provides suggestions for low-confidence matches and
 * a manual participant picker as fallback.
 *
 * Features:
 * - Shows unmatched name prominently
 * - Displays low-confidence suggestions (if any)
 * - Manual selection from all trip participants
 * - Validates that all unmatched names are resolved before proceeding
 */

import { useState } from 'react'
import type { ParticipantMatch, TripParticipant } from '@tripthreads/core'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UnmatchedParticipantDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean

  /**
   * Callback when user cancels
   */
  onCancel: () => void

  /**
   * Callback when user confirms selection
   * @param resolvedUserIds - Map of parsed name to selected user ID
   */
  onConfirm: (resolvedUserIds: Record<string, string>) => void

  /**
   * Unmatched participant names that need manual resolution
   */
  unmatchedNames: ParticipantMatch[]

  /**
   * All trip participants for manual selection
   */
  tripParticipants: TripParticipant[]
}

export function UnmatchedParticipantDialog({
  open,
  onCancel,
  onConfirm,
  unmatchedNames,
  tripParticipants,
}: UnmatchedParticipantDialogProps) {
  // State: Map of parsed name to selected user ID
  const [selections, setSelections] = useState<Record<string, string>>({})

  // Check if all unmatched names have been resolved
  const allResolved = unmatchedNames.every(match => selections[match.input] !== undefined)

  const handleConfirm = () => {
    if (!allResolved) return
    onConfirm(selections)
  }

  const handleCancel = () => {
    setSelections({}) // Reset selections
    onCancel()
  }

  const handleSelectionChange = (parsedName: string, userId: string) => {
    setSelections(prev => ({
      ...prev,
      [parsedName]: userId,
    }))
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && handleCancel()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Cannot Find Participant
          </DialogTitle>
          <DialogDescription>
            Some names could not be matched to trip participants. Please select from the list below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {unmatchedNames.map((match, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="error" className="text-xs">
                  Not Found
                </Badge>
                <p className="text-sm font-medium">
                  &quot;{match.input}&quot; is not a participant in this trip
                </p>
              </div>

              {/* Show low-confidence suggestions if available */}
              {match.matches.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Did you mean:</p>
                  <div className="space-y-1">
                    {match.matches.slice(0, 3).map((nameMatch, matchIdx) => (
                      <button
                        key={matchIdx}
                        type="button"
                        onClick={() => handleSelectionChange(match.input, nameMatch.userId)}
                        className={`w-full flex items-center justify-between p-2 rounded border transition-colors ${
                          selections[match.input] === nameMatch.userId
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{nameMatch.fullName}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {(nameMatch.confidence * 100).toFixed(0)}% match
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual participant picker */}
              <div className="space-y-2">
                <Label htmlFor={`manual-select-${idx}`} className="text-xs">
                  Or select from all participants:
                </Label>
                <Select
                  value={selections[match.input] || ''}
                  onValueChange={value => handleSelectionChange(match.input, value)}
                >
                  <SelectTrigger id={`manual-select-${idx}`}>
                    <SelectValue placeholder="Choose a participant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tripParticipants.map(participant => (
                      <SelectItem key={participant.user_id} value={participant.user_id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {participant.full_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        {!allResolved && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Please select a participant for each name above.</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allResolved}>
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
