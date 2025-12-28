'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from 'sonner'
import { createExpense } from '@/app/actions/expenses'
import { createItineraryItem } from '@/app/actions/itinerary'
import { Loader2, Plus, X, LinkIcon } from 'lucide-react'
import type { ItineraryItemType, ItineraryItemMetadata, ItineraryItemLink } from '@tripthreads/core'

// Import metadata field components
import { TransportMetadataFields } from '@/components/features/itinerary/metadata/TransportMetadataFields'
import { AccommodationMetadataFields } from '@/components/features/itinerary/metadata/AccommodationMetadataFields'
import { ActivityMetadataFields } from '@/components/features/itinerary/metadata/ActivityMetadataFields'

type UiItineraryType = 'flight' | 'stay' | 'activity'

const UI_TO_ITEM_TYPE_MAP: Record<UiItineraryType, ItineraryItemType> = {
  flight: 'transport',
  stay: 'accommodation',
  activity: 'activity',
}

interface ParsedItemModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  tripId: string
  parsedData: {
    command: string
    success: boolean
    hasExpense: boolean
    hasItinerary: boolean
    expense?: {
      amount: number
      currency: string
      description: string
      category?: string
      payer?: string
      splitType?: 'equal' | 'custom' | 'percentage'
      splitCount?: number
      participants?: string[]
      date?: string
    }
    itinerary?: {
      type: 'flight' | 'stay' | 'activity'
      title: string
      description?: string
      startDate: string
      endDate?: string
      location?: string
      links?: Array<{ title: string; url: string }>
      isAllDay?: boolean
      metadata?: ItineraryItemMetadata
    }
  }
  currentIndex?: number
  totalCommands?: number
}

interface Payer {
  name: string
  amount: number
}

interface Participant {
  name: string
  splitType: 'equal' | 'amount' | 'percentage'
  value: number
}

export function ParsedItemModal({
  open,
  onClose,
  onConfirm,
  tripId,
  parsedData,
  currentIndex = 1,
  totalCommands = 1,
}: ParsedItemModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createExpenseChecked, setCreateExpenseChecked] = useState(parsedData.hasExpense)
  const [createItineraryChecked, setCreateItineraryChecked] = useState(parsedData.hasItinerary)

  // Expense state
  const [expenseAmount, setExpenseAmount] = useState(
    parsedData.expense?.amount ? parsedData.expense.amount / 100 : 0
  )
  const [expenseCurrency, setExpenseCurrency] = useState(parsedData.expense?.currency || 'USD')
  const [expenseDescription, setExpenseDescription] = useState(
    parsedData.expense?.description || ''
  )
  const [expenseCategory, setExpenseCategory] = useState(parsedData.expense?.category || 'other')
  const [expenseDate, setExpenseDate] = useState(
    parsedData.expense?.date
      ? new Date(parsedData.expense.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [payers, setPayers] = useState<Payer[]>([
    { name: parsedData.expense?.payer || '', amount: expenseAmount },
  ])
  const [participants, setParticipants] = useState<Participant[]>(
    parsedData.expense?.participants?.map(name => ({
      name,
      splitType: 'equal' as const,
      value: 0,
    })) || [{ name: '', splitType: 'equal' as const, value: 0 }]
  )

  // Itinerary state
  const [itineraryType, setItineraryType] = useState<UiItineraryType>(
    parsedData.itinerary?.type || 'activity'
  )
  const [itineraryTitle, setItineraryTitle] = useState(parsedData.itinerary?.title || '')
  const [itineraryDescription, setItineraryDescription] = useState(
    parsedData.itinerary?.description || ''
  )
  const [itineraryStartDate, setItineraryStartDate] = useState(
    parsedData.itinerary?.startDate
      ? new Date(parsedData.itinerary.startDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )
  const [itineraryEndDate, setItineraryEndDate] = useState(
    parsedData.itinerary?.endDate
      ? new Date(parsedData.itinerary.endDate).toISOString().slice(0, 16)
      : ''
  )
  const [itineraryLocation, setItineraryLocation] = useState(parsedData.itinerary?.location || '')

  // New state variables for optional fields
  const [itineraryNotes, setItineraryNotes] = useState('')
  const [itineraryLinks, setItineraryLinks] = useState<ItineraryItemLink[]>(
    parsedData.itinerary?.links ?? []
  )
  const [itineraryIsAllDay, setItineraryIsAllDay] = useState(
    parsedData.itinerary?.isAllDay ?? false
  )

  // Type-specific metadata
  const [itineraryMetadata, setItineraryMetadata] = useState<ItineraryItemMetadata | undefined>(
    parsedData.itinerary?.metadata
  )

  // Link input UI state
  const [newLinkTitle, setNewLinkTitle] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')

  // Track if this is the first render (to avoid clearing metadata on mount)
  const isFirstRender = useRef(true)

  // Update payer amount when expense amount changes
  useEffect(() => {
    if (payers.length === 1) {
      setPayers([{ ...payers[0], amount: expenseAmount }])
    }
  }, [expenseAmount])

  // Clear metadata when itinerary type changes (but not on initial mount)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (createItineraryChecked) {
      setItineraryMetadata(undefined)
    }
  }, [itineraryType])

  const handleAddPayer = () => {
    setPayers([...payers, { name: '', amount: 0 }])
  }

  const handleRemovePayer = (index: number) => {
    setPayers(payers.filter((_, i) => i !== index))
  }

  const handlePayerChange = (index: number, field: 'name' | 'amount', value: string | number) => {
    const newPayers = [...payers]
    newPayers[index] = { ...newPayers[index], [field]: value }
    setPayers(newPayers)
  }

  const handleAddParticipant = () => {
    setParticipants([...participants, { name: '', splitType: 'equal', value: 0 }])
  }

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index))
  }

  const handleParticipantChange = (
    index: number,
    field: 'name' | 'splitType' | 'value',
    value: string | number
  ) => {
    const newParticipants = [...participants]
    newParticipants[index] = { ...newParticipants[index], [field]: value }
    setParticipants(newParticipants)
  }

  const handleSubmit = async () => {
    if (!createExpenseChecked && !createItineraryChecked) {
      toast.error('Please select at least one item to create')
      return
    }

    setIsSubmitting(true)

    try {
      // Create expense if checked
      if (createExpenseChecked && parsedData.hasExpense) {
        const totalPayerAmount = payers.reduce((sum, p) => sum + Number(p.amount), 0)
        if (Math.abs(totalPayerAmount - expenseAmount) > 0.01) {
          toast.error('Payer amounts must equal the total expense amount')
          setIsSubmitting(false)
          return
        }

        // Simple implementation: equal split
        const result = await createExpense({
          tripId,
          amount: Math.round(expenseAmount * 100), // Convert to cents
          currency: expenseCurrency,
          description: expenseDescription,
          category: expenseCategory,
          payer: payers[0].name || null,
          splitType: 'equal',
          splitCount: participants.filter(p => p.name.trim()).length,
          participants: participants.map(p => p.name).filter(n => n.trim()),
          customSplits: null,
          date: expenseDate,
        })

        if (!result.success) {
          toast.error(result.error || 'Failed to create expense')
          setIsSubmitting(false)
          return
        }
      }

      // Create itinerary if checked
      if (createItineraryChecked && parsedData.hasItinerary) {
        const result = await createItineraryItem({
          tripId,
          type: UI_TO_ITEM_TYPE_MAP[itineraryType],
          title: itineraryTitle,
          description: itineraryDescription || undefined,
          notes: itineraryNotes || undefined,
          links: itineraryLinks.length > 0 ? itineraryLinks : undefined,
          startTime: new Date(itineraryStartDate).toISOString(),
          endTime: itineraryEndDate ? new Date(itineraryEndDate).toISOString() : undefined,
          isAllDay: itineraryIsAllDay,
          location: itineraryLocation || undefined,
          metadata: itineraryMetadata,
          source: 'nl',
        })

        if (!result.success) {
          toast.error(result.error || 'Failed to create itinerary item')
          setIsSubmitting(false)
          return
        }
      }

      toast.success('Items created successfully!')
      onConfirm()
    } catch (error) {
      console.error('Error creating items:', error)
      toast.error('Failed to create items')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Confirm Parsed Items
            {totalCommands > 1 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({currentIndex} of {totalCommands})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Review and edit the parsed expense and itinerary items before saving.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={parsedData.hasExpense ? 'expense' : 'itinerary'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense" disabled={!parsedData.hasExpense}>
              Expense {parsedData.hasExpense && '✓'}
            </TabsTrigger>
            <TabsTrigger value="itinerary" disabled={!parsedData.hasItinerary}>
              Itinerary {parsedData.hasItinerary && '✓'}
            </TabsTrigger>
          </TabsList>

          {/* Expense Tab */}
          <TabsContent value="expense" className="space-y-4">
            {parsedData.hasExpense && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-expense"
                    checked={createExpenseChecked}
                    onCheckedChange={checked => setCreateExpenseChecked(checked as boolean)}
                  />
                  <Label htmlFor="create-expense" className="text-sm font-medium">
                    Create this expense
                  </Label>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expense-amount">Amount</Label>
                      <Input
                        id="expense-amount"
                        type="number"
                        step="0.01"
                        value={expenseAmount}
                        onChange={e => setExpenseAmount(Number(e.target.value))}
                        disabled={!createExpenseChecked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expense-currency">Currency</Label>
                      <Select
                        value={expenseCurrency}
                        onValueChange={setExpenseCurrency}
                        disabled={!createExpenseChecked}
                      >
                        <SelectTrigger id="expense-currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expense-description">Description</Label>
                    <Input
                      id="expense-description"
                      value={expenseDescription}
                      onChange={e => setExpenseDescription(e.target.value)}
                      disabled={!createExpenseChecked}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expense-category">Category</Label>
                      <Select
                        value={expenseCategory}
                        onValueChange={setExpenseCategory}
                        disabled={!createExpenseChecked}
                      >
                        <SelectTrigger id="expense-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="accommodation">Accommodation</SelectItem>
                          <SelectItem value="activity">Activity</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expense-date">Date</Label>
                      <Input
                        id="expense-date"
                        type="date"
                        value={expenseDate}
                        onChange={e => setExpenseDate(e.target.value)}
                        disabled={!createExpenseChecked}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Payers</Label>
                    {payers.map((payer, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Name"
                          value={payer.name}
                          onChange={e => handlePayerChange(index, 'name', e.target.value)}
                          disabled={!createExpenseChecked}
                        />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={payer.amount}
                          onChange={e => handlePayerChange(index, 'amount', Number(e.target.value))}
                          disabled={!createExpenseChecked}
                        />
                        {payers.length > 1 && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemovePayer(index)}
                            disabled={!createExpenseChecked}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddPayer}
                      disabled={!createExpenseChecked}
                    >
                      Add Payer
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Participants (Split Between)</Label>
                    {participants.map((participant, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Name"
                          value={participant.name}
                          onChange={e => handleParticipantChange(index, 'name', e.target.value)}
                          disabled={!createExpenseChecked}
                        />
                        {participants.length > 1 && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveParticipant(index)}
                            disabled={!createExpenseChecked}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddParticipant}
                      disabled={!createExpenseChecked}
                    >
                      Add Participant
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Itinerary Tab */}
          <TabsContent value="itinerary" className="space-y-4">
            {parsedData.hasItinerary && (
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="create-itinerary"
                    checked={createItineraryChecked}
                    onCheckedChange={checked => setCreateItineraryChecked(checked as boolean)}
                  />
                  <Label htmlFor="create-itinerary" className="text-sm font-medium">
                    Create this itinerary item
                  </Label>
                </div>

                <Separator />

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="itinerary-type">Type</Label>
                    <Select
                      value={itineraryType}
                      onValueChange={value => setItineraryType(value as UiItineraryType)}
                      disabled={!createItineraryChecked}
                    >
                      <SelectTrigger id="itinerary-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flight">Flight</SelectItem>
                        <SelectItem value="stay">Stay</SelectItem>
                        <SelectItem value="activity">Activity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itinerary-title">Title</Label>
                    <Input
                      id="itinerary-title"
                      value={itineraryTitle}
                      onChange={e => setItineraryTitle(e.target.value)}
                      disabled={!createItineraryChecked}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itinerary-description">Description</Label>
                    <Input
                      id="itinerary-description"
                      value={itineraryDescription}
                      onChange={e => setItineraryDescription(e.target.value)}
                      disabled={!createItineraryChecked}
                    />
                  </div>

                  {/* All-Day Toggle */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-all-day"
                      checked={itineraryIsAllDay}
                      onCheckedChange={checked => setItineraryIsAllDay(!!checked)}
                      disabled={!createItineraryChecked}
                    />
                    <Label htmlFor="is-all-day" className="text-sm font-normal cursor-pointer">
                      All-day event
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="itinerary-start">Start Date/Time</Label>
                      <Input
                        id="itinerary-start"
                        type={itineraryIsAllDay ? 'date' : 'datetime-local'}
                        value={itineraryStartDate}
                        onChange={e => setItineraryStartDate(e.target.value)}
                        disabled={!createItineraryChecked}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="itinerary-end">End Date/Time (Optional)</Label>
                      <Input
                        id="itinerary-end"
                        type={itineraryIsAllDay ? 'date' : 'datetime-local'}
                        value={itineraryEndDate}
                        onChange={e => setItineraryEndDate(e.target.value)}
                        disabled={!createItineraryChecked}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="itinerary-location">Location</Label>
                    <Input
                      id="itinerary-location"
                      value={itineraryLocation}
                      onChange={e => setItineraryLocation(e.target.value)}
                      disabled={!createItineraryChecked}
                    />
                  </div>

                  {/* Accordion for Optional Fields */}
                  <Accordion type="multiple" className="w-full">
                    {/* General Optional Fields */}
                    <AccordionItem value="optional-fields">
                      <AccordionTrigger>Additional Details (Optional)</AccordionTrigger>
                      <AccordionContent className="space-y-4">
                        {/* Notes */}
                        <div className="space-y-2">
                          <Label htmlFor="itinerary-notes">Notes</Label>
                          <Textarea
                            id="itinerary-notes"
                            value={itineraryNotes}
                            onChange={e => setItineraryNotes(e.target.value)}
                            disabled={!createItineraryChecked}
                            placeholder="Additional notes or reminders..."
                            rows={3}
                          />
                        </div>

                        {/* Links */}
                        <div className="space-y-2">
                          <Label>Links & Bookings</Label>
                          {/* Display existing links */}
                          {itineraryLinks.length > 0 && (
                            <div className="space-y-2">
                              {itineraryLinks.map((link, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 border rounded-lg"
                                >
                                  <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{link.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {link.url}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setItineraryLinks(links =>
                                        links.filter((_, i) => i !== index)
                                      )
                                    }
                                    disabled={!createItineraryChecked}
                                    aria-label="Delete link"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add new link UI */}
                          <div className="grid grid-cols-[1fr,1fr,auto] gap-2">
                            <Input
                              placeholder="Link title"
                              value={newLinkTitle}
                              onChange={e => setNewLinkTitle(e.target.value)}
                              disabled={!createItineraryChecked}
                            />
                            <Input
                              placeholder="URL"
                              value={newLinkUrl}
                              onChange={e => setNewLinkUrl(e.target.value)}
                              disabled={!createItineraryChecked}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (newLinkTitle && newLinkUrl) {
                                  setItineraryLinks(links => [
                                    ...links,
                                    { title: newLinkTitle, url: newLinkUrl },
                                  ])
                                  setNewLinkTitle('')
                                  setNewLinkUrl('')
                                }
                              }}
                              disabled={!createItineraryChecked || !newLinkTitle || !newLinkUrl}
                              aria-label="Add link"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Type-Specific Metadata */}
                    <AccordionItem value="type-specific">
                      <AccordionTrigger>
                        {itineraryType === 'flight' && 'Flight Details (Optional)'}
                        {itineraryType === 'stay' && 'Accommodation Details (Optional)'}
                        {itineraryType === 'activity' && 'Activity Details (Optional)'}
                      </AccordionTrigger>
                      <AccordionContent>
                        {itineraryType === 'flight' && (
                          <TransportMetadataFields
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            metadata={(itineraryMetadata as any) || {}}
                            onChange={setItineraryMetadata}
                            disabled={!createItineraryChecked}
                          />
                        )}
                        {itineraryType === 'stay' && (
                          <AccommodationMetadataFields
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            metadata={(itineraryMetadata as any) || {}}
                            onChange={setItineraryMetadata}
                            disabled={!createItineraryChecked}
                          />
                        )}
                        {itineraryType === 'activity' && (
                          <ActivityMetadataFields
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            metadata={(itineraryMetadata as any) || {}}
                            onChange={setItineraryMetadata}
                            disabled={!createItineraryChecked}
                          />
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
