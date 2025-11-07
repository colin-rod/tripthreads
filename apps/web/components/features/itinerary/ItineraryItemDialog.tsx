'use client'

/**
 * ItineraryItemDialog Component
 *
 * Modal dialog for viewing, creating, and editing itinerary items.
 * Supports all fields including notes, links, participants, and type-specific metadata.
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import type {
  ItineraryItemWithParticipants,
  ItineraryItemLink,
  ItineraryItemType,
} from '@tripthreads/shared/types/itinerary'
import { ITINERARY_ITEM_TYPE_CONFIG } from '@tripthreads/shared/constants/itinerary'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Link as LinkIcon, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createItineraryItem, updateItineraryItem } from '@/app/actions/itinerary'
import { useToast } from '@/components/ui/use-toast'

interface ItineraryItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'view' | 'edit' | 'create'
  item?: ItineraryItemWithParticipants
  tripId: string
  tripParticipants: Array<{ id: string; full_name: string | null }>
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

export function ItineraryItemDialog({
  open,
  onOpenChange,
  mode,
  item,
  tripId,
  onSuccess,
}: ItineraryItemDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [links, setLinks] = useState<ItineraryItemLink[]>([])
  const [newLink, setNewLink] = useState({ title: '', url: '' })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      type: item?.type || 'activity',
      title: item?.title || '',
      description: item?.description || '',
      notes: item?.notes || '',
      location: item?.location || '',
      startTime: item?.start_time ? format(new Date(item.start_time), "yyyy-MM-dd'T'HH:mm") : '',
      endTime: item?.end_time ? format(new Date(item.end_time), "yyyy-MM-dd'T'HH:mm") : '',
      isAllDay: item?.is_all_day || false,
    },
  })

  // Load links from item
  useEffect(() => {
    if (item?.links && Array.isArray(item.links)) {
      setLinks(item.links as ItineraryItemLink[])
    } else {
      setLinks([])
    }
  }, [item])

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open && item) {
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
    } else if (open && mode === 'create') {
      reset({
        type: 'activity',
        title: '',
        description: '',
        notes: '',
        location: '',
        startTime: '',
        endTime: '',
        isAllDay: false,
      })
      setLinks([])
    }
  }, [open, item, mode, reset])

  const isAllDay = watch('isAllDay')
  const isViewMode = mode === 'view'

  const addLink = () => {
    if (newLink.title && newLink.url) {
      setLinks([...links, { ...newLink }])
      setNewLink({ title: '', url: '' })
    }
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      if (mode === 'create') {
        const result = await createItineraryItem({
          tripId,
          type: data.type as ItineraryItemType,
          title: data.title,
          description: data.description || undefined,
          notes: data.notes || undefined,
          location: data.location || undefined,
          startTime: new Date(data.startTime).toISOString(),
          endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined,
          isAllDay: data.isAllDay,
          links: links.length > 0 ? links : undefined,
        })

        if (result.success) {
          toast({
            title: 'Success',
            description: 'Itinerary item created successfully',
          })
          onSuccess?.()
          onOpenChange(false)
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to create item',
            variant: 'destructive',
          })
        }
      } else if (mode === 'edit' && item) {
        const result = await updateItineraryItem({
          id: item.id,
          type: data.type as ItineraryItemType,
          title: data.title,
          description: data.description || null,
          notes: data.notes || null,
          location: data.location || null,
          startTime: new Date(data.startTime).toISOString(),
          endTime: data.endTime ? new Date(data.endTime).toISOString() : null,
          isAllDay: data.isAllDay,
          links: links.length > 0 ? links : [],
        })

        if (result.success) {
          toast({
            title: 'Success',
            description: 'Itinerary item updated successfully',
          })
          onSuccess?.()
          onOpenChange(false)
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to update item',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' && 'Add Itinerary Item'}
            {mode === 'edit' && 'Edit Itinerary Item'}
            {mode === 'view' && 'Itinerary Item Details'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' && 'Add a new item to your trip itinerary'}
            {mode === 'edit' && 'Update the details of this itinerary item'}
            {mode === 'view' && 'View the details of this itinerary item'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={watch('type')}
              onValueChange={value => setValue('type', value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ITINERARY_ITEM_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span className={cn('font-medium', config.color)}>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Title is required' })}
              disabled={isViewMode}
              placeholder="e.g., Flight to Paris"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              disabled={isViewMode}
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
              disabled={isViewMode}
            />
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime">{isAllDay ? 'Start Date' : 'Start Date & Time'} *</Label>
            <Input
              id="startTime"
              type={isAllDay ? 'date' : 'datetime-local'}
              {...register('startTime', { required: 'Start time is required' })}
              disabled={isViewMode}
            />
            {errors.startTime && (
              <p className="text-sm text-destructive">{errors.startTime.message}</p>
            )}
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <Label htmlFor="endTime">{isAllDay ? 'End Date' : 'End Date & Time'}</Label>
            <Input
              id="endTime"
              type={isAllDay ? 'date' : 'datetime-local'}
              {...register('endTime')}
              disabled={isViewMode}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              {...register('location')}
              disabled={isViewMode}
              placeholder="e.g., Charles de Gaulle Airport"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              disabled={isViewMode}
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
                  <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(index)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              {!isViewMode && (
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
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            {isViewMode ? (
              <Button type="button" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
