'use client'

/**
 * FeatureHighlights Component
 *
 * Carousel showcasing key features of TripThreads.
 * Highlights natural language input, offline support, multi-currency, etc.
 */

import { useState } from 'react'
import {
  MessageSquare,
  WifiOff,
  DollarSign,
  ArrowLeftRight,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FEATURES } from '@/lib/onboarding/config'

interface FeatureHighlightsProps {
  onContinue: () => void
  onBack: () => void
  onSkip: () => void
}

const iconMap = {
  MessageSquare,
  WifiOff,
  DollarSign,
  ArrowLeftRight,
  Image: ImageIcon,
}

export function FeatureHighlights({ onContinue, onBack, onSkip }: FeatureHighlightsProps) {
  const [currentFeature, setCurrentFeature] = useState(0)

  const feature = FEATURES[currentFeature]
  const Icon = iconMap[feature.icon as keyof typeof iconMap]

  const handleNext = () => {
    if (currentFeature < FEATURES.length - 1) {
      setCurrentFeature(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentFeature > 0) {
      setCurrentFeature(prev => prev - 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Key Features</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Here's what makes TripThreads special
          </p>
        </div>

        {/* Feature Card */}
        <Card className="mb-8 border-2 border-primary">
          <CardContent className="p-8 md:p-12">
            {/* Icon & Badge */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-primary/10 p-6 rounded-full">
                <Icon className="h-12 w-12 text-primary" />
              </div>
              {feature.badge && (
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {feature.badge}
                </Badge>
              )}
            </div>

            {/* Content */}
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-2xl md:text-3xl font-bold">{feature.title}</h2>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                {feature.description}
              </p>
            </div>

            {/* Carousel Navigation */}
            <div className="flex items-center justify-between max-w-md mx-auto">
              <Button
                onClick={handlePrevious}
                variant="outline"
                size="icon"
                disabled={currentFeature === 0}
                aria-label="Previous feature"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Dots */}
              <div className="flex gap-2">
                {FEATURES.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeature(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === currentFeature ? 'w-8 bg-primary' : 'w-2.5 bg-muted'
                    }`}
                    aria-label={`Go to feature ${index + 1}`}
                  />
                ))}
              </div>

              <Button
                onClick={handleNext}
                variant="outline"
                size="icon"
                disabled={currentFeature === FEATURES.length - 1}
                aria-label="Next feature"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button onClick={onBack} variant="outline" size="lg">
            Back
          </Button>
          <Button onClick={onContinue} size="lg" className="text-lg px-8">
            {currentFeature === FEATURES.length - 1 ? 'Finish' : 'Continue'}
          </Button>
          <Button onClick={onSkip} variant="ghost" size="lg">
            Skip Tutorial
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2">
          <div className="h-2 w-8 rounded-full bg-primary/40" />
          <div className="h-2 w-8 rounded-full bg-primary/40" />
          <div className="h-2 w-8 rounded-full bg-primary" />
          <div className="h-2 w-8 rounded-full bg-muted" />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-2">Step 3 of 4</p>
      </div>
    </div>
  )
}
