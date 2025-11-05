'use client';

/**
 * Client Wrapper for Itinerary Input
 *
 * Wraps ItineraryInput component and handles server action integration.
 */

import { ItineraryInput } from './ItineraryInput';
import { createItineraryItem, type CreateItineraryItemInput } from '@/app/actions/itinerary';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ItineraryInputWrapperProps {
  tripId: string;
}

export function ItineraryInputWrapper({ tripId }: ItineraryInputWrapperProps) {
  const router = useRouter();

  const handleSubmit = async (item: Omit<CreateItineraryItemInput, 'tripId'>) => {
    const result = await createItineraryItem({
      tripId,
      ...item,
    });

    if (result.success) {
      toast.success('Itinerary item added successfully!');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to add itinerary item');
      throw new Error(result.error);
    }
  };

  return <ItineraryInput tripId={tripId} onSubmit={handleSubmit} />;
}
