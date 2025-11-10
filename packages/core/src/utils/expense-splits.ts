import { SplitType, SplitCalculation } from '../types/expense'

export interface NormalizedSplitParticipant {
  userId: string
  shareValue?: number | null
}

export interface NormalizedSplitConfig {
  totalAmount: number
  splitType: SplitType
  participants: NormalizedSplitParticipant[]
}

export function calculateExpenseShares({
  totalAmount,
  splitType,
  participants,
}: NormalizedSplitConfig): SplitCalculation[] {
  if (participants.length === 0) {
    throw new Error('At least one participant is required for share calculation')
  }

  switch (splitType) {
    case 'equal': {
      const shareAmount = Math.floor(totalAmount / participants.length)
      const remainder = totalAmount - shareAmount * participants.length

      return participants.map((participant, index) => ({
        userId: participant.userId,
        shareAmount: shareAmount + (index === 0 ? remainder : 0),
        shareType: 'equal',
      }))
    }

    case 'percentage': {
      let totalAssigned = 0

      return participants.map((participant, index) => {
        const percentage = participant.shareValue ?? 0
        let shareAmount: number

        if (index === participants.length - 1) {
          shareAmount = totalAmount - totalAssigned
        } else {
          shareAmount = Math.floor((totalAmount * percentage) / 100)
          totalAssigned += shareAmount
        }

        return {
          userId: participant.userId,
          shareAmount,
          shareType: 'percentage' as const,
          shareValue: percentage,
        }
      })
    }

    case 'amount': {
      const sum = participants.reduce((acc, participant) => acc + (participant.shareValue ?? 0), 0)

      if (sum !== totalAmount) {
        throw new Error(`Participant shares (${sum}) do not sum to expense total (${totalAmount})`)
      }

      return participants.map(participant => ({
        userId: participant.userId,
        shareAmount: participant.shareValue ?? 0,
        shareType: 'amount' as const,
        shareValue: participant.shareValue ?? 0,
      }))
    }

    default: {
      const exhaustiveCheck: never = splitType
      throw new Error(`Unknown split type: ${exhaustiveCheck}`)
    }
  }
}
