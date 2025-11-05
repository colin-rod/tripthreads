'use client';

/**
 * Client Wrapper for Expense Input
 *
 * Wraps ExpenseInput component and handles server action integration.
 */

import { ExpenseInput } from './ExpenseInput';
import { createExpense, type CreateExpenseInput } from '@/app/actions/expenses';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ExpenseInputWrapperProps {
  tripId: string;
}

export function ExpenseInputWrapper({ tripId }: ExpenseInputWrapperProps) {
  const router = useRouter();

  const handleSubmit = async (expense: Omit<CreateExpenseInput, 'tripId'>) => {
    const result = await createExpense({
      tripId,
      ...expense,
    });

    if (result.success) {
      toast.success('Expense added successfully!');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to add expense');
      throw new Error(result.error);
    }
  };

  return <ExpenseInput tripId={tripId} onSubmit={handleSubmit} />;
}
