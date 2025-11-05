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

import { useState } from 'react'
import { parseWithOpenAI } from '@/lib/parser/openai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CheckCircle2, Edit3 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ExpenseInputProps {
  tripId: string
  onSubmit: (expense: {
    amount: number
    currency: string
    description: string
    category: string | null
    payer: string | null
    splitType: 'equal' | 'custom' | 'shares' | 'none'
    splitCount: number | null
    participants: string[] | null
    customSplits: { name: string; amount: number }[] | null
  }) => Promise<void>
}

export function ExpenseInput({ tripId: _tripId, onSubmit }: ExpenseInputProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedResult, setParsedResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleParse = async () => {
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setParsedResult(null)

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

    setSubmitting(true)
    setError(null)

    try {
      await onSubmit({
        amount: parsedResult.amount,
        currency: parsedResult.currency,
        description: parsedResult.description,
        category: parsedResult.category,
        payer: parsedResult.payer,
        splitType: parsedResult.splitType,
        splitCount: parsedResult.splitCount,
        participants: parsedResult.participants,
        customSplits: parsedResult.customSplits,
      })

      // Reset form on success
      setInput('')
      setParsedResult(null)
    } catch (err) {
      console.error('Expense submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setParsedResult(null)
    setError(null)
  }

  const formatAmount = (amount: number, currency: string) => {
    if (['JPY', 'KRW'].includes(currency)) {
      return amount.toLocaleString()
    }
    return (amount / 100).toFixed(2)
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
                      {parsedResult.currency}{' '}
                      {formatAmount(parsedResult.amount, parsedResult.currency)}
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
                      {parsedResult.participants.map((participant: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {participant}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {parsedResult.customSplits && parsedResult.customSplits.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Custom Splits</p>
                    <div className="space-y-1">
                      {parsedResult.customSplits.map((split: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded"
                        >
                          <Badge variant="outline" className="text-xs">
                            {split.name}
                          </Badge>
                          <span className="font-mono">
                            {parsedResult.currency}{' '}
                            {formatAmount(split.amount, parsedResult.currency)}
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
    </div>
  )
}
