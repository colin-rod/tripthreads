'use server';

/**
 * Server Actions for Expense Management
 *
 * Handles expense creation, updates, and deletion with proper RLS enforcement.
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CreateExpenseInput {
  tripId: string;
  amount: number; // in minor units (cents)
  currency: string; // ISO 4217 code
  description: string;
  category: string | null;
  payer: string | null; // Name of payer
  splitType: 'equal' | 'custom' | 'shares' | 'none';
  splitCount: number | null;
  participants: string[] | null; // Names of participants
  customSplits: { name: string; amount: number }[] | null;
  date?: string; // ISO 8601, defaults to now
}

export async function createExpense(input: CreateExpenseInput) {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    // Verify user is a participant of the trip
    const { data: participant, error: participantError } = await supabase
      .from('trip_participants')
      .select('id, role')
      .eq('trip_id', input.tripId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return {
        success: false,
        error: 'You must be a participant of this trip to add expenses',
      };
    }

    // Viewers cannot add expenses
    if (participant.role === 'viewer') {
      return {
        success: false,
        error: 'Viewers cannot add expenses',
      };
    }

    // Create expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        trip_id: input.tripId,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        category: input.category || 'other',
        payer_id: user.id, // For now, assume current user is payer
        date: input.date || new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (expenseError) {
      console.error('Error creating expense:', expenseError);
      return {
        success: false,
        error: 'Failed to create expense',
      };
    }

    // TODO: Create expense participants based on split logic
    // This would involve:
    // 1. Get all trip participants
    // 2. Calculate shares based on splitType, splitCount, participants, customSplits
    // 3. Insert into expense_participants table

    // For now, we'll create a simple equal split for all participants
    if (input.splitType === 'equal' && input.splitCount) {
      const shareAmount = Math.floor(input.amount / input.splitCount);

      const { data: tripParticipants, error: participantsError } = await supabase
        .from('trip_participants')
        .select('user_id')
        .eq('trip_id', input.tripId)
        .limit(input.splitCount);

      if (!participantsError && tripParticipants) {
        const expenseParticipants = tripParticipants.map((p) => ({
          expense_id: expense.id,
          user_id: p.user_id,
          share_amount: shareAmount,
          share_type: 'equal' as const,
          share_value: 100 / input.splitCount, // percentage
        }));

        await supabase.from('expense_participants').insert(expenseParticipants);
      }
    }

    // Revalidate trip page
    revalidatePath(`/trips/${input.tripId}`);

    return {
      success: true,
      expense,
    };
  } catch (error) {
    console.error('Unexpected error creating expense:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
