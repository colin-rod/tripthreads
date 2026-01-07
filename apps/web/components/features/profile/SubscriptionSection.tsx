/**
 * Subscription Section
 *
 * Displays current subscription status and allows upgrade/manage subscription.
 * Phase: 3.2 (Stripe Checkout)
 */

'use client'

import * as React from 'react'
import { Crown, Sparkles, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { getStripeClient } from '@/lib/stripe/client'
import { getDisplayAmount, getPriceId, type Currency, type PlanInterval } from '@/lib/stripe/config'
import { detectCurrency } from '@/lib/stripe/utils'
import type { Database } from '@tripthreads/core'

type User = Database['public']['Tables']['profiles']['Row']

interface SubscriptionSectionProps {
  user: User
}

// Plan features
const PLAN_FEATURES = {
  monthly: [
    'Unlimited active trips',
    'Unlimited participants per trip',
    'Unlimited photos & videos',
    'PDF trip recap',
    'Priority support',
  ],
  yearly: [
    'Unlimited active trips',
    'Unlimited participants per trip',
    'Unlimited photos & videos',
    'PDF trip recap',
    'Priority support',
    '17% savings vs monthly',
  ],
  oneoff: [
    'Unlimited trips for 1 month',
    'Unlimited participants',
    'Unlimited photos & videos',
    'PDF trip recap',
  ],
}

export function SubscriptionSection({ user }: SubscriptionSectionProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  const [isPortalLoading, setIsPortalLoading] = React.useState(false)
  const [selectedPlan, setSelectedPlan] = React.useState<PlanInterval>('monthly')

  // Detect user's currency based on locale
  const [currency, setCurrency] = React.useState<Currency>('EUR')

  React.useEffect(() => {
    const locale = navigator.language || 'en-US'
    const detected = detectCurrency(locale)
    setCurrency(detected)
  }, [])

  // Check if user has active Pro subscription
  const hasActivePro =
    user.plan === 'pro' && user.plan_expires_at && new Date(user.plan_expires_at) > new Date()

  const handleCheckout = async (priceId: string) => {
    try {
      setIsLoading(true)

      // Call API to create checkout session
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      const stripe = await getStripeClient()
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    try {
      setIsPortalLoading(true)

      // Call API to create portal session
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url
    } catch (error) {
      console.error('Portal error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to open billing portal',
        variant: 'destructive',
      })
    } finally {
      setIsPortalLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      {hasActivePro ? (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10">
          <Crown className="h-4 w-4 text-green-600 dark:text-green-500" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            You have an active <strong>Pro</strong> subscription.
            {user.plan_expires_at && (
              <span className="block mt-1 text-sm text-green-700 dark:text-green-300">
                Renews on {new Date(user.plan_expires_at).toLocaleDateString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            You're on the <strong>Free</strong> plan. Upgrade to Pro for unlimited trips and
            participants!
          </AlertDescription>
        </Alert>
      )}

      {/* Plan Selection */}
      {!hasActivePro && (
        <>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Choose Your Plan</h4>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedPlan === 'monthly' ? 'default' : 'outline'}
                onClick={() => setSelectedPlan('monthly')}
                className="h-auto py-3 px-4"
              >
                <div className="text-left">
                  <div className="font-semibold">Monthly</div>
                  <div className="text-xs opacity-90">
                    {getDisplayAmount('monthly', currency)}/mo
                  </div>
                </div>
              </Button>

              <Button
                variant={selectedPlan === 'yearly' ? 'default' : 'outline'}
                onClick={() => setSelectedPlan('yearly')}
                className="h-auto py-3 px-4 relative"
              >
                <Badge className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs bg-green-500 hover:bg-green-500">
                  Save 17%
                </Badge>
                <div className="text-left">
                  <div className="font-semibold">Yearly</div>
                  <div className="text-xs opacity-90">
                    {getDisplayAmount('yearly', currency)}/yr
                  </div>
                </div>
              </Button>

              <Button
                variant={selectedPlan === 'oneoff' ? 'default' : 'outline'}
                onClick={() => setSelectedPlan('oneoff')}
                className="h-auto py-3 px-4"
              >
                <div className="text-left">
                  <div className="font-semibold">One Month</div>
                  <div className="text-xs opacity-90">{getDisplayAmount('oneoff', currency)}</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Selected Plan Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-orange-600" />
                TripThreads Pro -{' '}
                {selectedPlan === 'monthly'
                  ? 'Monthly'
                  : selectedPlan === 'yearly'
                    ? 'Yearly'
                    : 'One Month Pass'}
              </CardTitle>
              <CardDescription>
                {selectedPlan === 'monthly' && 'Unlimited trips and participants. Cancel anytime.'}
                {selectedPlan === 'yearly' &&
                  'Unlimited trips and participants. Save 17% with annual billing.'}
                {selectedPlan === 'oneoff' &&
                  'Unlock Pro features for one month. Perfect for a single trip.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {PLAN_FEATURES[selectedPlan].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleCheckout(getPriceId(selectedPlan))}
                  disabled={isLoading}
                >
                  {isLoading
                    ? 'Loading...'
                    : `Upgrade to Pro - ${getDisplayAmount(selectedPlan, currency)}`}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Secure checkout powered by Stripe
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Manage Subscription (if Pro) */}
      {hasActivePro && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Subscription</CardTitle>
            <CardDescription>View billing history and update payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleManageSubscription}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? 'Loading...' : 'Manage Subscription'}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Securely manage your subscription through Stripe
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pricing Note */}
      <p className="text-xs text-center text-muted-foreground">
        Prices shown in {currency}. Stripe will automatically detect your location and currency at
        checkout.
      </p>
    </div>
  )
}
