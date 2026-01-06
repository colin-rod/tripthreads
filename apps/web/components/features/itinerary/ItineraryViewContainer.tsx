'use client'

/**
 * ItineraryViewContainer Component
 *
 * Container that manages Calendar/List view toggle, data fetching, and item dialogs.
 */

import { useState, useEffect } from 'react'
import { startOfMonth, parseISO } from 'date-fns'
import { CalendarView } from './CalendarView'
import { ListView } from './ListView'
import { MonthView } from './MonthView'
import { ItineraryItemDialog } from './ItineraryItemDialog'
import { ItineraryItemDetailSheet } from './ItineraryItemDetailSheet'
import type { ItineraryItemWithParticipants } from '@tripthreads/core'
import { Button } from '@/components/ui/button'
import { Calendar, List, Plus, CalendarDays } from 'lucide-react'
import { getTripItineraryItems } from '@tripthreads/core'
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

type ViewMode = 'calendar' | 'list' | 'month'

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

  // Unified Sheet state with mode (for view/edit)
  const [sheetState, setSheetState] = useState<{
    item: ItineraryItemWithParticipants | null
    mode: 'view' | 'edit'
  }>({ item: null, mode: 'view' })

  // Separate dialog for create mode
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const [itemToDelete, setItemToDelete] = useState<ItineraryItemWithParticipants | null>(null)
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(parseISO(tripStartDate))
  )

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
    if (savedView === 'calendar' || savedView === 'list' || savedView === 'month') {
      setViewMode(savedView)
    }
  }, [])

  // Save view preference
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('itinerary-view-mode', mode)
  }

  const handleItemClick = (item: ItineraryItemWithParticipants) => {
    // Always open in view mode, user can click Edit button if they can edit
    setSheetState({ item, mode: 'view' })
  }

  const handleEditClick = (item: ItineraryItemWithParticipants) => {
    // Open directly in edit mode (from dropdown menu)
    setSheetState({ item, mode: 'edit' })
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

  const handleSuccess = async () => {
    await loadItems()
  }

  const handleNavigateToWeek = () => {
    setViewMode('calendar')
    localStorage.setItem('itinerary-view-mode', 'calendar')
  }

  const handleCreateItemForDate = () => {
    // TODO: Pre-fill the dialog with the selected date
    setCreateDialogOpen(true)
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
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('month')}
            className="gap-2"
          >
            <CalendarDays className="h-4 w-4" />
            Month
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange('calendar')}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            Week
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
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        )}
      </div>

      {/* Views */}
      {viewMode === 'month' ? (
        <MonthView
          items={items}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          onItemClick={handleItemClick}
          onNavigateToWeek={handleNavigateToWeek}
          onCreateItem={handleCreateItemForDate}
          currentUserId={currentUserId}
          canEdit={canEdit}
        />
      ) : viewMode === 'calendar' ? (
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

      {/* Detail Sheet (view + edit inline) */}
      {sheetState.item && (
        <ItineraryItemDetailSheet
          item={sheetState.item}
          open={!!sheetState.item}
          onOpenChange={open => {
            if (!open) setSheetState({ item: null, mode: 'view' })
          }}
          mode={sheetState.mode}
          onModeChange={mode => setSheetState(prev => ({ ...prev, mode }))}
          tripId={tripId}
          tripParticipants={tripParticipants}
          onDelete={() => handleDeleteClick(sheetState.item!)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Create Dialog (create only) */}
      <ItineraryItemDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        tripId={tripId}
        tripParticipants={tripParticipants}
        onSuccess={handleSuccess}
      />

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
