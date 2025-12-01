'use client'

/**
 * WelcomeScreen Component
 *
 * First screen of the onboarding flow.
 * Welcomes new users and introduces TripThreads.
 */

import { Plane, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface WelcomeScreenProps {
  onContinue: () => void
  onSkip: () => void
}

export function WelcomeScreen({ onContinue, onSkip }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 border-2 border-primary shadow-2xl">
        <CardContent className="p-8 md:p-12">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping bg-primary/20 rounded-full" />
              <div className="relative bg-primary text-primary-foreground rounded-full p-6">
                <Plane className="h-12 w-12" />
              </div>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Welcome to TripThreads!
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              Make memories, not spreadsheets. Plan trips, split expenses, and share adventures with
              your travel crew.
            </p>
          </div>

          {/* Key Benefits */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl mb-2">✈️</div>
              <h3 className="font-semibold mb-1">Plan Together</h3>
              <p className="text-sm text-muted-foreground">Collaborative itinerary building</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="font-semibold mb-1">Split Expenses</h3>
              <p className="text-sm text-muted-foreground">Fair settlements, no awkwardness</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-3xl mb-2">📸</div>
              <h3 className="font-semibold mb-1">Share Memories</h3>
              <p className="text-sm text-muted-foreground">Photos and stories in one place</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onContinue} size="lg" className="text-lg px-8">
              <Sparkles className="mr-2 h-5 w-5" />
              Get Started
            </Button>
            <Button onClick={onSkip} variant="ghost" size="lg" className="text-lg">
              Skip Tutorial
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center gap-2 mt-8">
            <div className="h-2 w-8 rounded-full bg-primary" />
            <div className="h-2 w-8 rounded-full bg-muted" />
            <div className="h-2 w-8 rounded-full bg-muted" />
            <div className="h-2 w-8 rounded-full bg-muted" />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-2">Step 1 of 4</p>
        </CardContent>
      </Card>
    </div>
  )
}
