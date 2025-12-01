'use client'

/**
 * Participant Disambiguation Dialog
 *
 * Handles ambiguous participant name matches where multiple trip participants
 * could match the parsed name (e.g., "Alice" → Alice Smith OR Alice Jones).
 *
 * Features:
 * - Shows all potential matches with confidence scores
 * - Allows user to select correct match for each ambiguous name
 * - Validates that all ambiguous names are resolved before proceeding
 */

import { useState } from 'react'
import type { ParticipantMatch } from '@tripthreads/core'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, User } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ParticipantDisambiguationDialogProps {
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
   * Ambiguous participant matches that need disambiguation
   */
  ambiguousMatches: ParticipantMatch[]
}

export function ParticipantDisambiguationDialog({
  open,
  onCancel,
  onConfirm,
  ambiguousMatches,
}: ParticipantDisambiguationDialogProps) {
  // State: Map of parsed name to selected user ID
  const [selections, setSelections] = useState<Record<string, string>>({})

  // Check if all ambiguous names have been resolved
  const allResolved = ambiguousMatches.every(match => selections[match.input] !== undefined)

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
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Confirm Participants
          </DialogTitle>
          <DialogDescription>
            Multiple people match some names. Please select the correct participant for each.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {ambiguousMatches.map((match, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="text-xs">
                  Ambiguous
                </Badge>
                <p className="text-sm font-medium">
                  Who did you mean by &quot;{match.input}&quot;?
                </p>
              </div>

              <RadioGroup
                value={selections[match.input] || ''}
                onValueChange={value => handleSelectionChange(match.input, value)}
              >
                {match.matches.map((nameMatch, matchIdx) => (
                  <div key={matchIdx} className="flex items-start space-x-3 space-y-0">
                    <RadioGroupItem value={nameMatch.userId} id={`${idx}-${matchIdx}`} />
                    <Label
                      htmlFor={`${idx}-${matchIdx}`}
                      className="flex-1 cursor-pointer space-y-1 font-normal"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{nameMatch.fullName}</span>
                        <Badge variant="outline" className="text-xs">
                          {(nameMatch.confidence * 100).toFixed(0)}% match
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">
                        {nameMatch.matchType} match
                      </p>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
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
