'use client'

/**
 * Natural Language Expense Input Component
 *
 * Features:
 * - Natural language parsing with AI (OpenAI GPT-4o-mini)
 * - Preview card showing parsed values before submission
 * - Manual override for all fields
 * - Real-time validation
 * - Loading states and error handling
 */

import { useState, useEffect } from 'react'
import { parseWithOpenAI } from '@/lib/parser/openai'
import type { ParsedExpense, TripParticipant, ParticipantResolutionResult } from '@tripthreads/core'
import { formatCurrencyFromMinorUnits, matchParticipantNames } from '@tripthreads/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CheckCircle2, Edit3 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { fetchTripParticipants } from '@/app/actions/expenses'
import { ParticipantDisambiguationDialog } from './ParticipantDisambiguationDialog'
import { UnmatchedParticipantDialog } from './UnmatchedParticipantDialog'

interface ExpenseInputProps {
  tripId: string
  onSubmit: (expense: {
    amount: number
    currency: string
    description: string
    category: string | null
    payer: string | null
    splitType: 'equal' | 'custom' | 'percentage' | 'none'
    splitCount: number | null
    participants: string[] | null
    customSplits: { name: string; amount: number }[] | null
    percentageSplits?: { name: string; percentage: number }[] | null
  }) => Promise<void>
}

export function ExpenseInput({ tripId, onSubmit }: ExpenseInputProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedResult, setParsedResult] = useState<ParsedExpense | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [tripParticipants, setTripParticipants] = useState<TripParticipant[]>([])
  const [_participantsLoading, setParticipantsLoading] = useState(true)
  const [resolutionResult, setResolutionResult] = useState<ParticipantResolutionResult | null>(null)
  const [showDisambiguationDialog, setShowDisambiguationDialog] = useState(false)
  const [showUnmatchedDialog, setShowUnmatchedDialog] = useState(false)
  const [resolvedParticipantIds, setResolvedParticipantIds] = useState<Record<string, string>>({})

  // Fetch trip participants on mount
  useEffect(() => {
    async function loadParticipants() {
      setParticipantsLoading(true)
      try {
        const result = await fetchTripParticipants(tripId)
        if (result.success && result.participants) {
          setTripParticipants(result.participants)
        } else {
          console.error('Failed to fetch trip participants:', result.error)
        }
      } catch (err) {
        console.error('Error loading trip participants:', err)
      } finally {
        setParticipantsLoading(false)
      }
    }
    loadParticipants()
  }, [tripId])

  const handleParse = async () => {
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setParsedResult(null)
    setResolutionResult(null)

    try {
      const result = await parseWithOpenAI({
        input: input.trim(),
        parserType: 'expense',
        options: {
          defaultCurrency: 'USD',
          decimalFormat: 'US',
        },
        model: 'gpt-4o-mini',
      })

      if (result.success && result.expenseResult) {
        setParsedResult(result.expenseResult)

        // Perform client-side participant name resolution
        if (result.expenseResult.participants && result.expenseResult.participants.length > 0) {
          const resolution = matchParticipantNames(
            result.expenseResult.participants,
            tripParticipants,
            {
              minConfidence: 0.6,
              autoResolveThreshold: 0.85,
            }
          )
          setResolutionResult(resolution)
        }
      } else {
        setError(result.error || 'Failed to parse expense')
      }
    } catch (err) {
      console.error('Expense parsing error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!parsedResult) return

    // Check if we have ambiguous matches that need disambiguation
    if (resolutionResult && resolutionResult.hasAmbiguous) {
      const ambiguousMatches = resolutionResult.matches.filter(m => m.isAmbiguous)
      if (ambiguousMatches.length > 0) {
        setShowDisambiguationDialog(true)
        return
      }
    }

    // Check if we have unmatched names that need manual selection
    if (resolutionResult && resolutionResult.hasUnmatched) {
      const unmatchedNames = resolutionResult.matches.filter(m => m.isUnmatched)
      if (unmatchedNames.length > 0) {
        setShowUnmatchedDialog(true)
        return
      }
    }

    setSubmitting(true)
    setError(null)

    try {
      // If we have resolved participant IDs from disambiguation, use them
      let participantsToSubmit: string[] | null = parsedResult.participants ?? null

      if (resolutionResult && Object.keys(resolvedParticipantIds).length > 0) {
        // Replace parsed names with resolved user IDs
        participantsToSubmit =
          parsedResult.participants?.map(name => {
            return resolvedParticipantIds[name] || name
          }) ?? null
      }

      await onSubmit({
        amount: parsedResult.amount,
        currency: parsedResult.currency,
        description: parsedResult.description,
        category: parsedResult.category ?? null,
        payer: parsedResult.payer ?? null,
        splitType: parsedResult.splitType,
        splitCount: parsedResult.splitCount ?? null,
        participants: participantsToSubmit,
        customSplits: parsedResult.customSplits ?? null,
        percentageSplits: parsedResult.percentageSplits ?? null,
      })

      // Reset form on success
      setInput('')
      setParsedResult(null)
      setResolutionResult(null)
      setResolvedParticipantIds({})
    } catch (err) {
      console.error('Expense submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDisambiguationConfirm = (resolvedIds: Record<string, string>) => {
    setResolvedParticipantIds(resolvedIds)
    setShowDisambiguationDialog(false)

    // Update resolution result to mark matches as resolved
    if (resolutionResult) {
      const updatedMatches = resolutionResult.matches.map(match => {
        if (resolvedIds[match.input]) {
          // Find the selected match
          const selectedMatch = match.matches.find(m => m.userId === resolvedIds[match.input])
          return {
            ...match,
            bestMatch: selectedMatch,
            isAmbiguous: false,
          }
        }
        return match
      })

      setResolutionResult({
        ...resolutionResult,
        matches: updatedMatches,
        hasAmbiguous: false,
        isFullyResolved: !updatedMatches.some(m => m.isAmbiguous || m.isUnmatched),
      })
    }

    // Auto-submit after disambiguation
    setTimeout(() => {
      handleSubmit()
    }, 100)
  }

  const handleDisambiguationCancel = () => {
    setShowDisambiguationDialog(false)
  }

  const handleUnmatchedConfirm = (resolvedIds: Record<string, string>) => {
    setResolvedParticipantIds(prev => ({ ...prev, ...resolvedIds }))
    setShowUnmatchedDialog(false)

    // Update resolution result to mark matches as resolved
    if (resolutionResult) {
      const updatedMatches = resolutionResult.matches.map(match => {
        if (resolvedIds[match.input]) {
          // Find the selected participant
          const selectedParticipant = tripParticipants.find(
            p => p.user_id === resolvedIds[match.input]
          )
          if (selectedParticipant) {
            return {
              ...match,
              bestMatch: {
                userId: selectedParticipant.user_id,
                fullName: selectedParticipant.full_name,
                confidence: 1.0, // Manual selection = 100% confidence
                matchType: 'exact' as const,
              },
              isUnmatched: false,
            }
          }
        }
        return match
      })

      setResolutionResult({
        ...resolutionResult,
        matches: updatedMatches,
        hasUnmatched: false,
        isFullyResolved: !updatedMatches.some(m => m.isAmbiguous || m.isUnmatched),
      })
    }

    // Auto-submit after manual selection
    setTimeout(() => {
      handleSubmit()
    }, 100)
  }

  const handleUnmatchedCancel = () => {
    setShowUnmatchedDialog(false)
  }

  const handleReset = () => {
    setParsedResult(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Expense</CardTitle>
          <CardDescription>
            Describe your expense in plain language (e.g., "Dinner €60 split 4 ways")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Dinner €60 split 4 ways"
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
                    Parsing...
                  </>
                ) : (
                  'Parse'
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Amount</p>
                    <p className="font-mono text-lg">
                      {formatCurrencyFromMinorUnits(parsedResult.amount, parsedResult.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{parsedResult.description}</p>
                  </div>
                </div>

                {parsedResult.category && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Category</p>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {parsedResult.category}
                    </Badge>
                  </div>
                )}

                {parsedResult.payer && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payer</p>
                    <Badge variant="outline" className="text-xs">
                      {parsedResult.payer}
                    </Badge>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Split Type</p>
                    <Badge className="text-xs capitalize">{parsedResult.splitType}</Badge>
                  </div>
                  {parsedResult.splitCount && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Split Count</p>
                      <p className="text-sm">{parsedResult.splitCount} people</p>
                    </div>
                  )}
                </div>

                {parsedResult.participants && parsedResult.participants.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Participants</p>
                    <div className="flex flex-wrap gap-1">
                      {resolutionResult
                        ? // Show resolved names with match indicators
                          resolutionResult.matches.map((match, idx) => {
                            const isResolved = match.bestMatch && match.bestMatch.confidence >= 0.85
                            const isAmbiguous = match.isAmbiguous
                            const isUnmatched = match.isUnmatched

                            return (
                              <Badge
                                key={idx}
                                variant={isResolved ? 'default' : isAmbiguous ? 'warning' : 'error'}
                                className="text-xs flex items-center gap-1"
                              >
                                {match.bestMatch?.fullName || match.input}
                                {isResolved && <CheckCircle2 className="h-3 w-3" />}
                                {isAmbiguous && <AlertCircle className="h-3 w-3" />}
                                {isUnmatched && <AlertCircle className="h-3 w-3" />}
                              </Badge>
                            )
                          })
                        : // Fallback: show original parsed names
                          parsedResult.participants.map((participant, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {participant}
                            </Badge>
                          ))}
                    </div>
                    {resolutionResult && !resolutionResult.isFullyResolved && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {resolutionResult.hasAmbiguous && (
                          <p className="flex items-center gap-1 text-yellow-600">
                            <AlertCircle className="h-3 w-3" />
                            Some names need disambiguation
                          </p>
                        )}
                        {resolutionResult.hasUnmatched && (
                          <p className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            Some names could not be matched
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {parsedResult.customSplits && parsedResult.customSplits.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Custom Splits</p>
                    <div className="space-y-1">
                      {parsedResult.customSplits.map((split, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded"
                        >
                          <Badge variant="outline" className="text-xs">
                            {split.name}
                          </Badge>
                          <span className="font-mono">
                            {formatCurrencyFromMinorUnits(split.amount, parsedResult.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                  <Button variant="outline" onClick={handleReset} disabled={submitting}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p className="font-medium">Examples:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Dinner €60 split 4 ways</li>
          <li>Alice paid $120 for hotel, split between Alice, Bob, Carol</li>
          <li>Taxi £45, Bob owes half</li>
          <li>¥2500 lunch split 3 ways</li>
        </ul>
      </div>

      {/* Disambiguation Dialog */}
      {resolutionResult && (
        <ParticipantDisambiguationDialog
          open={showDisambiguationDialog}
          onCancel={handleDisambiguationCancel}
          onConfirm={handleDisambiguationConfirm}
          ambiguousMatches={resolutionResult.matches.filter(m => m.isAmbiguous)}
        />
      )}

      {/* Unmatched Names Dialog */}
      {resolutionResult && (
        <UnmatchedParticipantDialog
          open={showUnmatchedDialog}
          onCancel={handleUnmatchedCancel}
          onConfirm={handleUnmatchedConfirm}
          unmatchedNames={resolutionResult.matches.filter(m => m.isUnmatched)}
          tripParticipants={tripParticipants}
        />
      )}
    </div>
  )
}
