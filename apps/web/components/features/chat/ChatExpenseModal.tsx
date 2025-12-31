'use client'

import { useEffect, useState } from 'react'
import { ItemErrorModal } from './ItemErrorModal'
import { getExpenseForChat, type ExpenseWithDetails } from '@/app/actions/get-chat-items'
import { Loader2, Calendar, DollarSign, User, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface ChatExpenseModalProps {
  itemId: string
  tripId: string
  open: boolean
  onClose: () => void
}

export function ChatExpenseModal({ itemId, tripId, open, onClose }: ChatExpenseModalProps) {
  const [expense, setExpense] = useState<ExpenseWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'not_found' | 'permission_denied' | 'error' | null>(null)

  useEffect(() => {
    if (open) {
      fetchExpense()
    }
  }, [open, itemId])

  const fetchExpense = async () => {
    setLoading(true)
    setError(null)

    const result = await getExpenseForChat(itemId, tripId)

    if (result.success) {
      setExpense(result.expense)
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return <ItemErrorModal open={open} onClose={onClose} errorType={error} />
  }

  if (!expense) {
    return null
  }

  const formattedAmount = (expense.amount / 100).toFixed(2)
  const formattedDate = new Date(expense.date).toLocaleDateString()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{expense.description}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Amount</span>
            </div>
            <p className="text-2xl font-semibold">
              {expense.currency}
              {formattedAmount}
            </p>
          </div>

          <Separator />

          {/* Date */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span>Date</span>
            </div>
            <p className="text-base">{formattedDate}</p>
          </div>

          {/* Category */}
          {expense.category && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Category</div>
              <Badge variant="secondary">{expense.category}</Badge>
            </div>
          )}

          <Separator />

          {/* Payer */}
          {expense.payer_profile && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <User className="h-4 w-4" />
                <span>Paid By</span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={expense.payer_profile.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {expense.payer_profile.full_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{expense.payer_profile.full_name}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Split Details */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span>Split Between</span>
            </div>
            <div className="space-y-2">
              {expense.expense_participants?.map(
                (ep: ExpenseWithDetails['expense_participants'][0]) => {
                  const participantAmount = (ep.amount / 100).toFixed(2)
                  const percentage = ep.percentage || 0

                  return (
                    <div
                      key={ep.participant.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={ep.participant.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {ep.participant.full_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{ep.participant.full_name}</span>
                      </div>
                      <div className="text-sm font-medium">
                        {expense.currency}
                        {participantAmount}
                        <span className="text-muted-foreground ml-1">({percentage}%)</span>
                      </div>
                    </div>
                  )
                }
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
