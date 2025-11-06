'use client'

/**
 * MobileSlides Component
 *
 * Mobile-optimized onboarding with 3 swipeable slides.
 * Features illustrations, progress dots, and touch gestures.
 */

import { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { Users, Calendar, DollarSign, ArrowRight, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface MobileSlidesProps {
  onComplete: () => void
  onSkip: () => void
}

const slides = [
  {
    id: 'slide-1',
    title: 'Create trips with friends',
    description:
      'Invite your travel crew and plan together. Everyone can contribute ideas and see updates in real-time.',
    icon: Users,
    illustration: '🌍',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'slide-2',
    title: 'Plan together in real-time',
    description:
      'Add flights, hotels, and activities as you go. Natural language input makes it effortless.',
    icon: Calendar,
    illustration: '📅',
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    id: 'slide-3',
    title: 'Split expenses easily',
    description:
      'Track who paid for what. We handle multi-currency and calculate fair settlements automatically.',
    icon: DollarSign,
    illustration: '💰',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
]

export function MobileSlides({ onComplete, onSkip }: MobileSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1)
    }
  }

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrevious,
    trackMouse: false, // Only touch on mobile
    preventScrollOnSwipe: true,
  })

  const slide = slides[currentSlide]
  const Icon = slide.icon
  const isLastSlide = currentSlide === slides.length - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <Button onClick={onSkip} variant="ghost" size="sm">
          Skip
        </Button>
      </div>

      {/* Swipeable content */}
      <div {...swipeHandlers} className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md border-2">
          <CardContent className="p-8">
            {/* Illustration */}
            <div className="text-center mb-8">
              <div className={cn('inline-block p-8 rounded-full mb-4', slide.bgColor)}>
                <div className="text-6xl">{slide.illustration}</div>
              </div>
              <div className={cn('inline-flex p-4 rounded-full', slide.bgColor)}>
                <Icon className={cn('h-8 w-8', slide.color)} />
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-2xl font-bold">{slide.title}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{slide.description}</p>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    index === currentSlide ? 'w-8 bg-primary' : 'w-2.5 bg-muted'
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="space-y-3">
              <Button onClick={handleNext} size="lg" className="w-full text-lg">
                {isLastSlide ? (
                  <>
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              {!isLastSlide && (
                <Button onClick={onSkip} variant="ghost" size="lg" className="w-full">
                  Skip Tutorial
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swipe Hint (only on first slide) */}
      {currentSlide === 0 && (
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">← Swipe to navigate →</p>
        </div>
      )}
    </div>
  )
}
