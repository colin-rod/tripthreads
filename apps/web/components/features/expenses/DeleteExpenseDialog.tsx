'use client'

/**
 * DeleteExpenseDialog Component
 *
 * Confirmation dialog for deleting expenses.
 * Features:
 * - Hard delete with confirmation
 * - Warning message about permanent deletion
 * - Loading state during deletion
 */

import { useState } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import type { ExpenseWithDetails } from '@tripthreads/core'
import { createClient } from '@/lib/supabase/client'
import { deleteExpense } from '@tripthreads/core'

interface DeleteExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseWithDetails
  onSuccess?: () => void
  onOptimisticDelete?: (expenseId: string) => void
}

export function DeleteExpenseDialog({
  open,
  onOpenChange,
  expense,
  onSuccess,
  onOptimisticDelete,
}: DeleteExpenseDialogProps) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)

    // Optimistically remove from UI immediately
    onOptimisticDelete?.(expense.id)
    onOpenChange(false) // Close dialog immediately

    try {
      const supabase = createClient()
      await deleteExpense(supabase, expense.id)

      toast({
        title: 'Expense deleted',
        description: `${expense.description} has been permanently deleted.`,
      })

      onSuccess?.()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast({
        title: 'Error deleting expense',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
      // Rollback will happen via onSuccess refresh
      onSuccess?.()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{expense.description}</strong>?
            </p>
            <p className="text-sm">
              This action cannot be undone. The expense and all its split information will be
              permanently removed.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
