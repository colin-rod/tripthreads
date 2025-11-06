'use client'

/**
 * WebHero Component
 *
 * Desktop/web-optimized onboarding hero section.
 * Features large heading, value prop, and 3-column feature highlights.
 */

import { Plane, Users, DollarSign, Image as ImageIcon, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface WebHeroProps {
  onGetStarted: () => void
  onSkip: () => void
}

export function WebHero({ onGetStarted, onSkip }: WebHeroProps) {
  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onGetStarted()
    } else if (e.key === 'Escape') {
      onSkip()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-y-auto py-8"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="w-full max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 animate-ping bg-primary/20 rounded-full" />
              <div className="relative bg-primary text-primary-foreground rounded-full p-8">
                <Plane className="h-16 w-16" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Plan trips together, effortlessly
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Make memories, not spreadsheets. Collaborate on itineraries, split expenses fairly, and
            share photos—all in one place.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button onClick={onGetStarted} size="lg" className="text-lg px-10 py-6">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button onClick={onSkip} variant="ghost" size="lg" className="text-lg px-10 py-6">
              Skip Tutorial
            </Button>
          </div>
        </div>

        {/* 3-Column Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1: Collaborate */}
          <Card className="border-2 hover:border-primary transition-colors duration-200">
            <CardContent className="p-8 text-center">
              <div className="bg-primary/10 p-6 rounded-full inline-block mb-6">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Collaborate</h3>
              <p className="text-muted-foreground leading-relaxed">
                Build itineraries together. Everyone can add activities, flights, and accommodations
                in real-time.
              </p>
            </CardContent>
          </Card>

          {/* Feature 2: Split Costs */}
          <Card className="border-2 hover:border-primary transition-colors duration-200">
            <CardContent className="p-8 text-center">
              <div className="bg-secondary/10 p-6 rounded-full inline-block mb-6">
                <DollarSign className="h-12 w-12 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Split Costs</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track expenses effortlessly. Multi-currency support with automatic conversions and
                optimized settlements.
              </p>
            </CardContent>
          </Card>

          {/* Feature 3: Share Memories */}
          <Card className="border-2 hover:border-primary transition-colors duration-200">
            <CardContent className="p-8 text-center">
              <div className="bg-primary/10 p-6 rounded-full inline-block mb-6">
                <ImageIcon className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Share Memories</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload photos and videos everyone can see. Automatically organized by day for easy
                browsing.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Keyboard Hint */}
        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-muted rounded">Enter</kbd> to get started or{' '}
            <kbd className="px-2 py-1 bg-muted rounded">Esc</kbd> to skip
          </p>
        </div>
      </div>
    </div>
  )
}
