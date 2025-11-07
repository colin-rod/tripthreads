'use client';

/**
 * Client Wrapper for Itinerary Input
 *
 * Wraps ItineraryInput component and handles server action integration.
 */

import { ItineraryInput } from './ItineraryInput';
import { createItineraryItem } from '@/app/actions/itinerary';
import type { CreateItineraryItemInput } from '@/app/actions/itinerary';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ItineraryItemType } from '@tripthreads/shared/types/itinerary';

type UiItineraryType = 'flight' | 'stay' | 'activity';

const UI_TO_ITEM_TYPE_MAP: Record<UiItineraryType, ItineraryItemType> = {
  flight: 'transport',
  stay: 'accommodation',
  activity: 'activity',
};

type UiItineraryInput = Omit<CreateItineraryItemInput, 'tripId' | 'type'> & {
  type: UiItineraryType;
};

interface ItineraryInputWrapperProps {
  tripId: string;
}

export function ItineraryInputWrapper({ tripId }: ItineraryInputWrapperProps) {
  const router = useRouter();

  const handleSubmit = async (item: UiItineraryInput) => {
    const { type: uiType, ...rest } = item;

    const result = await createItineraryItem({
      tripId,
      ...rest,
      type: UI_TO_ITEM_TYPE_MAP[uiType],
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
