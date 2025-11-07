'use client'

/**
 * ItineraryViewContainer Component
 *
 * Container that manages Calendar/List view toggle, data fetching, and item dialogs.
 */

import { useState, useEffect } from 'react'
import { CalendarView } from './CalendarView'
import { ListView } from './ListView'
import { ItineraryItemDialog } from './ItineraryItemDialog'
import type { ItineraryItemWithParticipants } from '@/../../packages/shared/types/itinerary'
import { Button } from '@/components/ui/button'
import { Calendar, List, Plus } from 'lucide-react'
import { getTripItineraryItems } from '@/../../packages/shared/lib/supabase/queries/itinerary'
import { deleteItineraryItem } from '@/app/actions/itinerary'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
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

interface ItineraryViewContainerProps {
  tripId: string
  tripStartDate: string
  tripEndDate: string
  currentUserId: string
  tripParticipants: Array<{ id: string; full_name: string | null }>
  canEdit: boolean
}

type ViewMode = 'calendar' | 'list'
type DialogMode = 'view' | 'edit' | 'create' | null

export function ItineraryViewContainer({
  tripId,
  tripStartDate,
  tripEndDate,
  currentUserId,
  tripParticipants,
  canEdit,
}: ItineraryViewContainerProps) {
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [items, setItems] = useState<ItineraryItemWithParticipants[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedItem, setSelectedItem] = useState<ItineraryItemWithParticipants | undefined>()
  const [itemToDelete, setItemToDelete] = useState<ItineraryItemWithParticipants | null>(null)

  // Load itinerary items
  const loadItems = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()
      const data = await getTripItineraryItems(supabase, tripId)
      setItems(data)
    } catch (error) {
      console.error('Error loading itinerary items:', error)
      toast({
        title: 'Error',
        description: 'Failed to load itinerary items',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [tripId])

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('itinerary-view-mode')
    if (savedView === 'calendar' || savedView === 'list') {
      setViewMode(savedView)
    }
  }, [])

  // Save view preference
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('itinerary-view-mode', mode)
  }

  const handleItemClick = (item: ItineraryItemWithParticipants) => {
    setSelectedItem(item)
    setDialogMode(canEdit && item.created_by === currentUserId ? 'edit' : 'view')
  }

  const handleEditClick = (item: ItineraryItemWithParticipants) => {
    setSelectedItem(item)
    setDialogMode('edit')
  }

  const handleDeleteClick = (item: ItineraryItemWithParticipants) => {
    setItemToDelete(item)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      const result = await deleteItineraryItem(itemToDelete.id)
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Itinerary item deleted successfully',
        })
        await loadItems()
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete item',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setItemToDelete(null)
    }
  }

  const handleDialogSuccess = async () => {
    await loadItems()
    setDialogMode(null)
    setSelectedItem(undefined)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Toggle and Add Button */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border p-1">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('calendar')}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('list')}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>

        {canEdit && (
          <Button
            onClick={() => {
              setSelectedItem(undefined)
              setDialogMode('create')
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      {/* Views */}
      {viewMode === 'calendar' ? (
        <CalendarView
          items={items}
          tripId={tripId}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          currentUserId={currentUserId}
          onItemClick={handleItemClick}
        />
      ) : (
        <ListView
          items={items}
          currentUserId={currentUserId}
          onItemClick={handleItemClick}
          onEditItem={handleEditClick}
          onDeleteItem={handleDeleteClick}
        />
      )}

      {/* Item Dialog */}
      {dialogMode && (
        <ItineraryItemDialog
          open={dialogMode !== null}
          onOpenChange={open => {
            if (!open) {
              setDialogMode(null)
              setSelectedItem(undefined)
            }
          }}
          mode={dialogMode}
          item={selectedItem}
          tripId={tripId}
          tripParticipants={tripParticipants}
          onSuccess={handleDialogSuccess}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={itemToDelete !== null}
        onOpenChange={open => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Itinerary Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
