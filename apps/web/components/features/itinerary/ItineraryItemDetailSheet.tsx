'use client'

/**
 * ItineraryItemDetailSheet Component
 *
 * Side panel displaying full itinerary item details with type-specific metadata.
 * Supports two modes:
 * - View mode: Read-only display with collapsible sections
 * - Edit mode: Inline form for editing all fields including metadata
 *
 * Width: 672px (max-w-2xl) to accommodate complex metadata
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import type {
  ItineraryItemWithParticipants,
  ItineraryItemLink,
  ItineraryItemType,
  ItineraryItemMetadata,
  TransportMetadata,
  AccommodationMetadata,
  DiningMetadata,
  ActivityMetadata,
  SightseeingMetadata,
} from '@tripthreads/core'
import { ITINERARY_ITEM_TYPE_CONFIG } from '@tripthreads/core'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ChipSelector, type ChipOption } from '@/components/ui/chip-selector'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Edit,
  Trash,
  Calendar,
  MapPin,
  FileText,
  Link as LinkIcon,
  Users,
  ChevronDown,
  X,
  Plus,
  Loader2,
} from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { updateItineraryItem } from '@/app/actions/itinerary'
import { SectionHeader } from './shared/SectionHeader'
import { InfoRow } from './shared/InfoRow'
import { MetadataDisplay } from './MetadataDisplay'
import { TransportMetadataFields } from './metadata/TransportMetadataFields'
import { AccommodationMetadataFields } from './metadata/AccommodationMetadataFields'
import { DiningMetadataFields } from './metadata/DiningMetadataFields'
import { ActivityMetadataFields } from './metadata/ActivityMetadataFields'
import { SightseeingMetadataFields } from './metadata/SightseeingMetadataFields'

interface ItineraryItemDetailSheetProps {
  item: ItineraryItemWithParticipants
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'view' | 'edit'
  onModeChange?: (mode: 'view' | 'edit') => void
  tripId: string
  tripParticipants: Array<{ id: string; full_name: string | null }>
  onDelete?: () => void
  onSuccess?: () => void
}

interface FormData {
  type: string
  title: string
  description: string
  notes: string
  location: string
  startTime: string
  endTime: string
  isAllDay: boolean
  links: ItineraryItemLink[]
}

// Build chip options from ITINERARY_ITEM_TYPE_CONFIG
const itineraryTypeOptions: ChipOption<ItineraryItemType>[] = Object.entries(
  ITINERARY_ITEM_TYPE_CONFIG
).map(([key, config]) => {
  const iconName = config.icon as keyof typeof LucideIcons
  const IconComponent = (LucideIcons[iconName] as LucideIcon) || LucideIcons.Calendar

  return {
    value: key as ItineraryItemType,
    label: config.label,
    icon: IconComponent,
    description: config.description,
  }
})

export function ItineraryItemDetailSheet({
  item,
  open,
  onOpenChange,
  mode = 'view',
  onModeChange,
  tripId: _tripId,
  onDelete,
  onSuccess,
}: ItineraryItemDetailSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Links and metadata state for edit mode
  const [links, setLinks] = useState<ItineraryItemLink[]>([])
  const [newLink, setNewLink] = useState({ title: '', url: '' })
  const [metadata, setMetadata] = useState<ItineraryItemMetadata | undefined>(undefined)

  // Collapsible state for view mode
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [notesLinksOpen, setNotesLinksOpen] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      type: item.type,
      title: item.title,
      description: item.description || '',
      notes: item.notes || '',
      location: item.location || '',
      startTime: item.start_time ? format(new Date(item.start_time), "yyyy-MM-dd'T'HH:mm") : '',
      endTime: item.end_time ? format(new Date(item.end_time), "yyyy-MM-dd'T'HH:mm") : '',
      isAllDay: item.is_all_day || false,
    },
  })

  // Load item data when switching to edit mode
  useEffect(() => {
    if (open && mode === 'edit') {
      reset({
        type: item.type,
        title: item.title,
        description: item.description || '',
        notes: item.notes || '',
        location: item.location || '',
        startTime: item.start_time ? format(new Date(item.start_time), "yyyy-MM-dd'T'HH:mm") : '',
        endTime: item.end_time ? format(new Date(item.end_time), "yyyy-MM-dd'T'HH:mm") : '',
        isAllDay: item.is_all_day || false,
      })

      // Load links
      if (item.links && Array.isArray(item.links)) {
        setLinks(item.links as ItineraryItemLink[])
      } else {
        setLinks([])
      }

      // Load metadata
      if (item.metadata) {
        setMetadata(item.metadata)
      } else {
        setMetadata(undefined)
      }
    }
  }, [open, mode, item, reset])

  const currentType = watch('type')
  const isAllDay = watch('isAllDay')

  const addLink = () => {
    if (newLink.title && newLink.url) {
      setLinks([...links, { ...newLink }])
      setNewLink({ title: '', url: '' })
    }
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  async function handleSave(values: FormData) {
    setIsSubmitting(true)

    try {
      const result = await updateItineraryItem({
        id: item.id,
        type: values.type as ItineraryItemType,
        title: values.title,
        description: values.description || null,
        notes: values.notes || null,
        location: values.location || null,
        startTime: new Date(values.startTime).toISOString(),
        endTime: values.endTime ? new Date(values.endTime).toISOString() : null,
        isAllDay: values.isAllDay,
        links: links.length > 0 ? links : [],
        metadata: metadata || undefined,
      })

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Itinerary item updated successfully',
        })
        onSuccess?.()
        onModeChange?.('view')
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update item',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error updating itinerary item:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleCancel() {
    // Reset form to original values
    reset({
      type: item.type,
      title: item.title,
      description: item.description || '',
      notes: item.notes || '',
      location: item.location || '',
      startTime: item.start_time ? format(new Date(item.start_time), "yyyy-MM-dd'T'HH:mm") : '',
      endTime: item.end_time ? format(new Date(item.end_time), "yyyy-MM-dd'T'HH:mm") : '',
      isAllDay: item.is_all_day || false,
    })

    // Reset links and metadata
    if (item.links && Array.isArray(item.links)) {
      setLinks(item.links as ItineraryItemLink[])
    } else {
      setLinks([])
    }
    if (item.metadata) {
      setMetadata(item.metadata)
    } else {
      setMetadata(undefined)
    }

    onModeChange?.('view')
  }

  // Get type config for display
  const typeConfig = ITINERARY_ITEM_TYPE_CONFIG[item.type]
  const TypeIcon = typeConfig
    ? (LucideIcons[typeConfig.icon as keyof typeof LucideIcons] as LucideIcon) ||
      LucideIcons.Calendar
    : LucideIcons.Calendar

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-muted-foreground" />
            <SheetTitle className="text-2xl">
              {mode === 'view' ? item.title : 'Edit Itinerary Item'}
            </SheetTitle>
          </div>
          <SheetDescription>
            {mode === 'view' ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: typeConfig?.bgColor,
                    color: typeConfig?.color,
                    borderColor: typeConfig?.borderColor,
                  }}
                >
                  {typeConfig?.label}
                </Badge>
                <span>•</span>
                <span>
                  {format(
                    new Date(item.start_time),
                    item.is_all_day ? 'MMM d, yyyy' : 'MMM d, yyyy h:mm a'
                  )}
                </span>
              </div>
            ) : (
              'Update the itinerary item details and metadata'
            )}
          </SheetDescription>
        </SheetHeader>

        {mode === 'view' ? (
          // VIEW MODE - Read-only display with collapsible sections
          <div className="space-y-6 py-6">
            {/* Basic Info */}
            <div className="space-y-3">
              {item.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-base">{item.description}</p>
                </div>
              )}

              <InfoRow
                icon={Calendar}
                label={item.is_all_day ? 'Date' : 'Start Time'}
                value={format(
                  new Date(item.start_time),
                  item.is_all_day ? 'EEEE, MMMM d, yyyy' : 'EEEE, MMMM d, yyyy h:mm a'
                )}
              />

              {item.end_time && (
                <InfoRow
                  icon={Calendar}
                  label={item.is_all_day ? 'End Date' : 'End Time'}
                  value={format(
                    new Date(item.end_time),
                    item.is_all_day ? 'EEEE, MMMM d, yyyy' : 'EEEE, MMMM d, yyyy h:mm a'
                  )}
                />
              )}

              {item.location && <InfoRow icon={MapPin} label="Location" value={item.location} />}
            </div>

            {/* Type-Specific Metadata - Collapsible */}
            {item.metadata && (
              <>
                <Separator />
                <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                    <SectionHeader icon={FileText} title="Details" />
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        detailsOpen && 'transform rotate-180'
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    <MetadataDisplay metadata={item.metadata} type={item.type} />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Notes & Links - Collapsible */}
            {(item.notes || (item.links && item.links.length > 0)) && (
              <>
                <Separator />
                <Collapsible open={notesLinksOpen} onOpenChange={setNotesLinksOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                    <SectionHeader icon={FileText} title="Notes & Links" />
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        notesLinksOpen && 'transform rotate-180'
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-4">
                    {item.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Notes</p>
                        <p className="text-base whitespace-pre-wrap">{item.notes}</p>
                      </div>
                    )}

                    {item.links && item.links.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Links & Bookings</p>
                        <div className="space-y-2">
                          {(item.links as ItineraryItemLink[]).map((link, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 border rounded-lg"
                            >
                              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{link.title}</p>
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline truncate block"
                                >
                                  {link.url}
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {/* Participants */}
            {item.participants && item.participants.length > 0 && (
              <>
                <Separator />
                <div>
                  <SectionHeader icon={Users} title="Participants" />
                  <div className="flex flex-wrap gap-2">
                    {item.participants.map(participant => (
                      <Badge key={participant.id} variant="secondary">
                        {participant.user?.full_name || 'Unknown'}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          // EDIT MODE - Form fields
          <form onSubmit={handleSubmit(handleSave)} className="space-y-6 py-6">
            {/* Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <ChipSelector
                options={itineraryTypeOptions}
                value={watch('type')}
                onValueChange={value => setValue('type', value)}
                aria-label="Select itinerary item type"
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                {...register('title', { required: 'Title is required' })}
                id="title"
                disabled={isSubmitting}
                placeholder="e.g., Flight to Paris"
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                {...register('description')}
                id="description"
                disabled={isSubmitting}
                placeholder="Add details about this item..."
                rows={3}
              />
            </div>

            {/* All-day toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="isAllDay">All-day event</Label>
              <Switch
                id="isAllDay"
                checked={isAllDay}
                onCheckedChange={checked => setValue('isAllDay', checked)}
                disabled={isSubmitting}
                aria-label="All-day event"
              />
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">{isAllDay ? 'Start Date' : 'Start Date & Time'} *</Label>
              <Input
                {...register('startTime', { required: 'Start time is required' })}
                id="startTime"
                type={isAllDay ? 'date' : 'datetime-local'}
                disabled={isSubmitting}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>

            {/* End Time */}
            <div className="space-y-2">
              <Label htmlFor="endTime">{isAllDay ? 'End Date' : 'End Date & Time'}</Label>
              <Input
                {...register('endTime')}
                id="endTime"
                type={isAllDay ? 'date' : 'datetime-local'}
                disabled={isSubmitting}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                {...register('location')}
                id="location"
                disabled={isSubmitting}
                placeholder="e.g., Charles de Gaulle Airport"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                {...register('notes')}
                id="notes"
                disabled={isSubmitting}
                placeholder="Additional notes, reminders, or important information..."
                rows={4}
              />
            </div>

            {/* Links */}
            <div className="space-y-2">
              <Label>Links & Bookings</Label>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                    <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{link.title}</p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block"
                      >
                        {link.url}
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(index)}
                      className="shrink-0"
                      aria-label="Remove link"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Input
                    placeholder="Link title"
                    value={newLink.title}
                    onChange={e => setNewLink({ ...newLink, title: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    placeholder="URL"
                    value={newLink.url}
                    onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addLink}
                    disabled={!newLink.title || !newLink.url}
                    aria-label="Add link"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Type-Specific Metadata - Collapsible */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                <Label>Type-Specific Details</Label>
                <ChevronDown className="h-4 w-4 transition-transform ui-open:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                {currentType === 'transport' && (
                  <TransportMetadataFields
                    metadata={(metadata as Partial<TransportMetadata>) || {}}
                    onChange={updatedMetadata =>
                      setMetadata(updatedMetadata as ItineraryItemMetadata)
                    }
                    disabled={isSubmitting}
                  />
                )}
                {currentType === 'accommodation' && (
                  <AccommodationMetadataFields
                    metadata={(metadata as Partial<AccommodationMetadata>) || {}}
                    onChange={updatedMetadata =>
                      setMetadata(updatedMetadata as ItineraryItemMetadata)
                    }
                    disabled={isSubmitting}
                  />
                )}
                {currentType === 'dining' && (
                  <DiningMetadataFields
                    metadata={(metadata as Partial<DiningMetadata>) || {}}
                    onChange={updatedMetadata =>
                      setMetadata(updatedMetadata as ItineraryItemMetadata)
                    }
                    disabled={isSubmitting}
                  />
                )}
                {currentType === 'activity' && (
                  <ActivityMetadataFields
                    metadata={(metadata as Partial<ActivityMetadata>) || {}}
                    onChange={updatedMetadata =>
                      setMetadata(updatedMetadata as ItineraryItemMetadata)
                    }
                    disabled={isSubmitting}
                  />
                )}
                {currentType === 'sightseeing' && (
                  <SightseeingMetadataFields
                    metadata={(metadata as Partial<SightseeingMetadata>) || {}}
                    onChange={updatedMetadata =>
                      setMetadata(updatedMetadata as ItineraryItemMetadata)
                    }
                    disabled={isSubmitting}
                  />
                )}
                {currentType === 'general' && (
                  <p className="text-sm text-muted-foreground">
                    No type-specific fields for general items.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          </form>
        )}

        {/* Footer Actions */}
        <SheetFooter className="flex-row gap-2 sm:space-x-0">
          {mode === 'view' ? (
            <>
              <Button onClick={() => onModeChange?.('edit')} variant="outline" className="flex-1">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {onDelete && (
                <Button onClick={onDelete} variant="destructive" className="flex-1">
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
                type="button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit(handleSave)}
                className="flex-1"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
