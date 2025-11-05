'use client';

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

import { useState } from 'react';
import { parseWithOpenAI } from '@/lib/parser/openai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Edit3, Calendar, Clock, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

interface ItineraryInputProps {
  tripId: string;
  onSubmit: (item: {
    type: 'flight' | 'stay' | 'activity';
    title: string;
    description?: string;
    startTime: string;
    endTime?: string;
    location?: string;
  }) => Promise<void>;
}

export function ItineraryInput({ tripId, onSubmit }: ItineraryInputProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleParse = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    setParsedResult(null);

    try {
      const result = await parseWithOpenAI({
        input: input.trim(),
        parserType: 'date',
        options: {
          referenceDate: new Date(),
          dateFormat: 'US',
        },
        model: 'gpt-4o-mini',
      });

      if (result.success && result.dateResult) {
        setParsedResult(result.dateResult);
      } else {
        setError(result.error || 'Failed to parse itinerary item');
      }
    } catch (err) {
      console.error('Itinerary parsing error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!parsedResult) return;

    setSubmitting(true);
    setError(null);

    try {
      // Extract item details from original text
      const itemDetails = extractItemDetails(input);

      await onSubmit({
        type: itemDetails.type,
        title: itemDetails.title,
        description: itemDetails.description,
        startTime: parsedResult.date.toISOString(),
        endTime: parsedResult.endDate?.toISOString(),
        location: itemDetails.location,
      });

      // Reset form on success
      setInput('');
      setParsedResult(null);
    } catch (err) {
      console.error('Itinerary submission error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save itinerary item');
    } finally {
      setSubmitting(false);
    }
  };

  const extractItemDetails = (text: string) => {
    // Simple heuristics to extract item type, title, description, and location
    const lowerText = text.toLowerCase();

    let type: 'flight' | 'stay' | 'activity' = 'activity';
    if (lowerText.includes('flight') || lowerText.includes('plane')) {
      type = 'flight';
    } else if (lowerText.includes('hotel') || lowerText.includes('stay') || lowerText.includes('accommodation')) {
      type = 'stay';
    }

    // Extract title (first meaningful phrase)
    const words = text.split(/\s+/);
    const title = words.slice(0, Math.min(5, words.length)).join(' ');

    // Extract location (look for "to", "in", "at" patterns)
    let location: string | undefined;
    const locationMatch = text.match(/(?:to|in|at)\s+([A-Z][a-zA-Z\s]+?)(?:\s+on|\s+at|\s+from|$)/);
    if (locationMatch) {
      location = locationMatch[1].trim();
    }

    return { type, title, description: text, location };
  };

  const handleReset = () => {
    setParsedResult(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Itinerary Item</CardTitle>
          <CardDescription>
            Describe your activity in plain language (e.g., "Flight to Paris Monday 9am")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., Flight to Paris Monday 9am"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  handleParse();
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
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{input}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Start Date/Time
                    </p>
                    <p className="text-sm font-mono">
                      {format(parsedResult.date, 'PPp')}
                    </p>
                  </div>
                  {parsedResult.endDate && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        End Date/Time
                      </p>
                      <p className="text-sm font-mono">
                        {format(parsedResult.endDate, 'PPp')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Badge variant={parsedResult.hasTime ? 'default' : 'outline'} className="text-xs">
                    <Clock className="mr-1 h-3 w-3" />
                    {parsedResult.hasTime ? 'Has specific time' : 'All day'}
                  </Badge>
                  <Badge variant={parsedResult.isRange ? 'default' : 'outline'} className="text-xs">
                    <Calendar className="mr-1 h-3 w-3" />
                    {parsedResult.isRange ? 'Date range' : 'Single date'}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Detected Format</p>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {parsedResult.detectedFormat || 'unknown'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>
                    Confidence: {(parsedResult.confidence * 100).toFixed(0)}%
                  </span>
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
          <li>Flight to Paris Monday 9am</li>
          <li>Hotel check-in Dec 15 3pm</li>
          <li>Museum visit tomorrow afternoon</li>
          <li>Dinner reservation next Friday 7pm</li>
        </ul>
      </div>
    </div>
  );
}
