'use client'

/**
 * Natural Language Itinerary Input Component
 *
 * Features:
 * - Natural language parsing with AI (OpenAI GPT-4o-mini)
 * - Preview card showing parsed values before submission
 * - Manual override for all fields
 * - Real-time validation
 * - Loading states and error handling
 */

import { useState } from 'react'
import { parseWithOpenAI } from '@/lib/parser/openai'
import type { ParsedDateTime } from '@tripthreads/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, CheckCircle2, Edit3, Calendar, Clock, X, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'

interface ItineraryInputProps {
  tripId: string
  onSubmit: (item: {
    type: 'flight' | 'stay' | 'activity'
    title: string
    description?: string
    startTime: string
    endTime?: string
    location?: string
  }) => Promise<void>
}

export function ItineraryInput({ tripId: _tripId, onSubmit }: ItineraryInputProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedDateTime | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editedDate, setEditedDate] = useState<Date>(new Date())
  const [editedEndDate, setEditedEndDate] = useState<Date | undefined>(undefined)
  const [editedIsAllDay, setEditedIsAllDay] = useState(false)
  const [editedIsRange, setEditedIsRange] = useState(false)
  const [editedDescription, setEditedDescription] = useState('')

  const handleParse = async () => {
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setParsedResult(null)

    try {
      const result = await parseWithOpenAI({
        input: input.trim(),
        parserType: 'date',
        options: {
          referenceDate: new Date(),
          dateFormat: 'US',
        },
        model: 'gpt-4o-mini',
      })

      if (result.success && result.dateResult) {
        // Convert date strings back to Date objects (they get serialized during API response)
        const dateResult = {
          ...result.dateResult,
          date: new Date(result.dateResult.date),
          endDate: result.dateResult.endDate ? new Date(result.dateResult.endDate) : undefined,
        }
        setParsedResult(dateResult)
      } else {
        setError(result.error || 'Failed to parse itinerary item')
      }
    } catch (err) {
      console.error('Itinerary parsing error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!parsedResult && !isEditing) return

    setSubmitting(true)
    setError(null)

    try {
      let itemData

      if (isEditing) {
        // Validate edited fields
        if (!editedDescription.trim()) {
          setError('Description is required')
          setSubmitting(false)
          return
        }

        if (!editedDate || isNaN(editedDate.getTime())) {
          setError('Valid start date is required')
          setSubmitting(false)
          return
        }

        if (editedIsRange) {
          if (!editedEndDate || isNaN(editedEndDate.getTime())) {
            setError('Valid end date is required for date ranges')
            setSubmitting(false)
            return
          }

          if (editedEndDate < editedDate) {
            setError('End date must be after start date')
            setSubmitting(false)
            return
          }
        }

        // Extract item details from edited description
        const itemDetails = extractItemDetails(editedDescription)

        // If all-day mode, set time to start of day
        const startDate = editedIsAllDay
          ? new Date(editedDate.getFullYear(), editedDate.getMonth(), editedDate.getDate())
          : editedDate

        const endDate =
          editedIsRange && editedEndDate
            ? editedIsAllDay
              ? new Date(
                  editedEndDate.getFullYear(),
                  editedEndDate.getMonth(),
                  editedEndDate.getDate()
                )
              : editedEndDate
            : undefined

        itemData = {
          type: itemDetails.type,
          title: itemDetails.title,
          description: itemDetails.description,
          startTime: startDate.toISOString(),
          endTime: endDate?.toISOString(),
          location: itemDetails.location,
        }
      } else {
        // Use parsed result
        const itemDetails = extractItemDetails(input)

        itemData = {
          type: itemDetails.type,
          title: itemDetails.title,
          description: itemDetails.description,
          startTime: parsedResult!.date.toISOString(),
          endTime: parsedResult!.endDate?.toISOString(),
          location: itemDetails.location,
        }
      }

      await onSubmit(itemData)

      // Reset form on success
      setInput('')
      setParsedResult(null)
      setIsEditing(false)
    } catch (err) {
      console.error('Itinerary submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save itinerary item')
    } finally {
      setSubmitting(false)
    }
  }

  const extractItemDetails = (text: string) => {
    // Simple heuristics to extract item type, title, description, and location
    const lowerText = text.toLowerCase()

    let type: 'flight' | 'stay' | 'activity' = 'activity'
    if (lowerText.includes('flight') || lowerText.includes('plane')) {
      type = 'flight'
    } else if (
      lowerText.includes('hotel') ||
      lowerText.includes('stay') ||
      lowerText.includes('accommodation')
    ) {
      type = 'stay'
    }

    // Extract title (first meaningful phrase)
    const words = text.split(/\s+/)
    const title = words.slice(0, Math.min(5, words.length)).join(' ')

    // Extract location (look for "to", "in", "at" patterns)
    let location: string | undefined
    const locationMatch = text.match(/(?:to|in|at)\s+([A-Z][a-zA-Z\s]+?)(?:\s+on|\s+at|\s+from|$)/)
    if (locationMatch) {
      location = locationMatch[1].trim()
    }

    return { type, title, description: text, location }
  }

  const handleEdit = () => {
    if (!parsedResult) return

    // Initialize edited values from parsed result
    setIsEditing(true)
    setEditedDate(parsedResult.date)
    setEditedEndDate(parsedResult.endDate)
    setEditedIsAllDay(!parsedResult.hasTime)
    setEditedIsRange(parsedResult.isRange)
    setEditedDescription(input) // Use original input as description
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleReset = () => {
    setParsedResult(null)
    setError(null)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Itinerary Item</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <span>Describe your activity in plain language</span>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium text-xs">Examples:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      <li>Flight to Paris Monday 9am</li>
                      <li>Hotel check-in Dec 15 3pm</li>
                      <li>Museum visit tomorrow afternoon</li>
                      <li>Dinner reservation next Friday 7pm</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Flight to Paris Monday 9am"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !loading) {
                  handleParse()
                }
              }}
              disabled={loading || !!parsedResult}
              className="flex-1"
            />
            {!parsedResult ? (
              <Button onClick={handleParse} disabled={loading || !input.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add'
                )}
              </Button>
            ) : (
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Preview Card */}
          {parsedResult && (
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Preview</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    AI Parsed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  {isEditing ? (
                    <Input
                      value={editedDescription}
                      onChange={e => setEditedDescription(e.target.value)}
                      placeholder="Enter description"
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm">{input}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Start Date/Time
                    </p>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          type="date"
                          value={format(editedDate, 'yyyy-MM-dd')}
                          onChange={e => setEditedDate(new Date(e.target.value))}
                          className="text-sm"
                        />
                        {!editedIsAllDay && (
                          <Input
                            type="time"
                            value={format(editedDate, 'HH:mm')}
                            onChange={e => {
                              const [hours, minutes] = e.target.value.split(':')
                              const newDate = new Date(editedDate)
                              newDate.setHours(parseInt(hours), parseInt(minutes))
                              setEditedDate(newDate)
                            }}
                            className="text-sm"
                          />
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-mono">{format(parsedResult.date, 'PPp')}</p>
                    )}
                  </div>
                  {((isEditing && editedIsRange && editedEndDate) ||
                    (!isEditing && parsedResult.endDate)) && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        End Date/Time
                      </p>
                      {isEditing && editedEndDate ? (
                        <div className="space-y-2">
                          <Input
                            type="date"
                            value={format(editedEndDate, 'yyyy-MM-dd')}
                            onChange={e => setEditedEndDate(new Date(e.target.value))}
                            className="text-sm"
                          />
                          {!editedIsAllDay && (
                            <Input
                              type="time"
                              value={format(editedEndDate, 'HH:mm')}
                              onChange={e => {
                                const [hours, minutes] = e.target.value.split(':')
                                const newDate = new Date(editedEndDate)
                                newDate.setHours(parseInt(hours), parseInt(minutes))
                                setEditedEndDate(newDate)
                              }}
                              className="text-sm"
                            />
                          )}
                        </div>
                      ) : parsedResult.endDate ? (
                        <p className="text-sm font-mono">{format(parsedResult.endDate, 'PPp')}</p>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {isEditing ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="all-day"
                          checked={editedIsAllDay}
                          onCheckedChange={setEditedIsAllDay}
                        />
                        <Label htmlFor="all-day" className="text-sm cursor-pointer">
                          All day
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="date-range"
                          checked={editedIsRange}
                          onCheckedChange={checked => {
                            setEditedIsRange(checked)
                            if (checked && !editedEndDate) {
                              // Initialize end date to same as start date
                              setEditedEndDate(new Date(editedDate))
                            }
                          }}
                        />
                        <Label htmlFor="date-range" className="text-sm cursor-pointer">
                          Date range
                        </Label>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Badge
                        variant={parsedResult.hasTime ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {parsedResult.hasTime ? 'Has specific time' : 'All day'}
                      </Badge>
                      <Badge
                        variant={parsedResult.isRange ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        <Calendar className="mr-1 h-3 w-3" />
                        {parsedResult.isRange ? 'Date range' : 'Single date'}
                      </Badge>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Detected Format</p>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {parsedResult.detectedFormat || 'unknown'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>Confidence: {(parsedResult.confidence * 100).toFixed(0)}%</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm & Save
                      </>
                    )}
                  </Button>
                  {isEditing ? (
                    <Button variant="outline" onClick={handleCancelEdit} disabled={submitting}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={handleEdit} disabled={submitting}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
