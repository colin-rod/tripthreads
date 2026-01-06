'use client'

/**
 * SplitConfiguration Component
 *
 * Reusable split configuration UI component for expense creation and editing.
 * Handles split type selection, participant picking, and split amount inputs.
 * Designed to be used in both ExpenseFormDialog (create) and ExpenseDetailSheet (edit).
 */

import { useMemo } from 'react'
import { SplitTypeSelector, type SplitMode } from './SplitTypeSelector'
import { ParticipantPicker } from './ParticipantPicker'
import { PercentageSplitInput } from './PercentageSplitInput'
import { CustomAmountInput } from './CustomAmountInput'
import { SplitPreview } from './SplitPreview'

interface Participant {
  id: string
  name: string
  avatar_url?: string
}

interface SplitConfigurationProps {
  tripParticipants: Participant[]
  splitType: SplitMode
  onSplitTypeChange: (type: SplitMode) => void
  selectedParticipants: string[]
  onSelectedParticipantsChange: (participants: string[]) => void
  percentageSplits: Record<string, number>
  onPercentageSplitsChange: (splits: Record<string, number>) => void
  customAmounts: Record<string, number>
  onCustomAmountsChange: (amounts: Record<string, number>) => void
  totalAmount: number
  currency: string
  payerId: string
  isSplitValid: boolean
}

export function SplitConfiguration({
  tripParticipants,
  splitType,
  onSplitTypeChange,
  selectedParticipants,
  onSelectedParticipantsChange,
  percentageSplits,
  onPercentageSplitsChange,
  customAmounts,
  onCustomAmountsChange,
  totalAmount,
  currency,
  payerId,
  isSplitValid,
}: SplitConfigurationProps) {
  // Calculate preview data
  const splitPreviewData = useMemo(() => {
    return selectedParticipants
      .map(participantId => {
        const participant = tripParticipants.find(p => p.id === participantId)
        if (!participant) return null

        let shareAmount = 0
        let sharePercentage = 0

        if (splitType === 'equal') {
          shareAmount = totalAmount / selectedParticipants.length
          sharePercentage = 100 / selectedParticipants.length
        } else if (splitType === 'percentage') {
          sharePercentage = percentageSplits[participantId] || 0
          shareAmount = (totalAmount * sharePercentage) / 100
        } else if (splitType === 'amount') {
          shareAmount = customAmounts[participantId] || 0
          sharePercentage = totalAmount > 0 ? (shareAmount / totalAmount) * 100 : 0
        }

        return {
          id: participantId,
          name: participant.name,
          avatar_url: participant.avatar_url,
          amount: shareAmount,
          percentage: sharePercentage,
        }
      })
      .filter(Boolean) as Array<{
      id: string
      name: string
      avatar_url?: string
      amount: number
      percentage: number
    }>
  }, [
    totalAmount,
    splitType,
    selectedParticipants,
    percentageSplits,
    customAmounts,
    tripParticipants,
  ])

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">Split Configuration</h4>

      {/* Split Type Selector */}
      <SplitTypeSelector value={splitType} onChange={onSplitTypeChange} />

      {/* Participant Picker */}
      <ParticipantPicker
        participants={tripParticipants}
        selectedIds={selectedParticipants}
        onChange={onSelectedParticipantsChange}
        payerId={payerId}
      />

      {/* Percentage Split Input */}
      {splitType === 'percentage' && selectedParticipants.length > 0 && (
        <PercentageSplitInput
          participants={selectedParticipants
            .map(id => tripParticipants.find(p => p.id === id))
            .filter(Boolean)
            .map(p => ({
              id: p!.id,
              name: p!.name,
              avatar_url: p!.avatar_url,
            }))}
          values={percentageSplits}
          onChange={onPercentageSplitsChange}
          isValid={isSplitValid}
        />
      )}

      {/* Custom Amount Input */}
      {splitType === 'amount' && selectedParticipants.length > 0 && (
        <CustomAmountInput
          participants={selectedParticipants
            .map(id => tripParticipants.find(p => p.id === id))
            .filter(Boolean)
            .map(p => ({
              id: p!.id,
              name: p!.name,
              avatar_url: p!.avatar_url,
            }))}
          totalAmount={totalAmount}
          currency={currency}
          values={customAmounts}
          onChange={onCustomAmountsChange}
          isValid={isSplitValid}
        />
      )}

      {/* Split Preview */}
      {selectedParticipants.length > 0 && totalAmount > 0 && (
        <SplitPreview
          totalAmount={totalAmount}
          currency={currency}
          splitType={splitType}
          participants={splitPreviewData}
        />
      )}
    </div>
  )
}
