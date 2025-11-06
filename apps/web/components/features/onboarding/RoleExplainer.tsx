'use client'

/**
 * RoleExplainer Component
 *
 * Explains the three user roles: Owner, Participant, and Viewer.
 * Helps users understand permissions before they create or join trips.
 */

import { Crown, Users, Eye, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLES } from '@/lib/onboarding/config'

interface RoleExplainerProps {
  onContinue: () => void
  onBack: () => void
  onSkip: () => void
}

const iconMap = {
  Crown,
  Users,
  Eye,
}

export function RoleExplainer({ onContinue, onBack, onSkip }: RoleExplainerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm overflow-y-auto py-8">
      <div className="w-full max-w-5xl mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Understanding Roles</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every trip has different types of members. Here's what each role can do:
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {ROLES.map(role => {
            const Icon = iconMap[role.icon as keyof typeof iconMap]

            return (
              <Card
                key={role.id}
                className="border-2 hover:border-primary transition-colors duration-200"
              >
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-3">
                    <div className="bg-primary/10 p-4 rounded-full">
                      <Icon className={`h-8 w-8 ${role.color}`} />
                    </div>
                  </div>
                  <CardTitle className="text-xl">{role.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">{role.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {role.permissions.map((permission, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                        <span>{permission}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tip Box */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground rounded-full p-2 shrink-0">💡</div>
              <div>
                <h3 className="font-semibold mb-1">Pro Tip</h3>
                <p className="text-sm text-muted-foreground">
                  When you create a trip, you're the <strong>Owner</strong>. You can invite friends
                  as <strong>Participants</strong> (to help plan and split costs) or{' '}
                  <strong>Viewers</strong> (to keep them in the loop).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button onClick={onBack} variant="outline" size="lg">
            Back
          </Button>
          <Button onClick={onContinue} size="lg" className="text-lg px-8">
            Continue
          </Button>
          <Button onClick={onSkip} variant="ghost" size="lg">
            Skip Tutorial
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center gap-2">
          <div className="h-2 w-8 rounded-full bg-primary/40" />
          <div className="h-2 w-8 rounded-full bg-primary" />
          <div className="h-2 w-8 rounded-full bg-muted" />
          <div className="h-2 w-8 rounded-full bg-muted" />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-2">Step 2 of 4</p>
      </div>
    </div>
  )
}
