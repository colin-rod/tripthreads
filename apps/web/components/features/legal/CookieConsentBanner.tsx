'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { saveCookieConsent, getCookieConsent, COOKIE_CONSENT_VERSION } from '@/lib/cookie-consent'
import type { CookieConsent } from '@/lib/cookie-consent'

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true,
    performance: false,
    functional: false,
    analytics: false,
    timestamp: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  })

  useEffect(() => {
    const existingConsent = getCookieConsent()
    if (!existingConsent) {
      setShowBanner(true)
    }
  }, [])

  const handleAcceptAll = async () => {
    const fullConsent: CookieConsent = {
      ...consent,
      performance: true,
      functional: true,
      analytics: true,
    }
    await saveCookieConsent(fullConsent)
    setShowBanner(false)
    // Reload to initialize analytics
    window.location.reload()
  }

  const handleRejectOptional = async () => {
    const minimalConsent: CookieConsent = {
      ...consent,
      performance: false,
      functional: false,
      analytics: false,
    }
    await saveCookieConsent(minimalConsent)
    setShowBanner(false)
  }

  const handleSavePreferences = async () => {
    await saveCookieConsent(consent)
    setShowBanner(false)
    // Reload to apply preferences
    window.location.reload()
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-2 border-primary shadow-lg">
      <div className="container max-w-6xl py-6 space-y-4">
        {!showDetails ? (
          // Simple mode
          <>
            <div className="flex items-start gap-4 flex-col md:flex-row">
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">We value your privacy</h3>
                <p className="text-sm text-muted-foreground">
                  We use cookies to enhance your experience, analyze site usage, and improve our
                  service. You can customize your preferences or accept all cookies.{' '}
                  <Link href="/cookies" className="text-primary hover:underline">
                    Learn more
                  </Link>
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleRejectOptional}>
                  Reject Optional
                </Button>
                <Button variant="outline" onClick={() => setShowDetails(true)}>
                  Customize
                </Button>
                <Button onClick={handleAcceptAll}>Accept All</Button>
              </div>
            </div>
          </>
        ) : (
          // Detailed mode
          <>
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Cookie Preferences</h3>

              {/* Necessary Cookies */}
              <div className="flex items-center justify-between py-3">
                <div className="flex-1 pr-8">
                  <Label className="font-medium">Strictly Necessary</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Required for authentication and core functionality. Cannot be disabled.
                  </p>
                </div>
                <Switch checked disabled aria-label="Strictly necessary cookies (always enabled)" />
              </div>

              <Separator />

              {/* Performance Cookies */}
              <div className="flex items-center justify-between py-3">
                <div className="flex-1 pr-8">
                  <Label htmlFor="performance" className="font-medium cursor-pointer">
                    Performance
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vercel Analytics for page load times and Core Web Vitals.
                  </p>
                </div>
                <Switch
                  id="performance"
                  checked={consent.performance}
                  onCheckedChange={checked => setConsent({ ...consent, performance: checked })}
                  aria-label="Performance cookies"
                />
              </div>

              <Separator />

              {/* Functional Cookies */}
              <div className="flex items-center justify-between py-3">
                <div className="flex-1 pr-8">
                  <Label htmlFor="functional" className="font-medium cursor-pointer">
                    Functional
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sentry error tracking and session replay (errors only).
                  </p>
                </div>
                <Switch
                  id="functional"
                  checked={consent.functional}
                  onCheckedChange={checked => setConsent({ ...consent, functional: checked })}
                  aria-label="Functional cookies"
                />
              </div>

              <Separator />

              {/* Analytics Cookies */}
              <div className="flex items-center justify-between py-3">
                <div className="flex-1 pr-8">
                  <Label htmlFor="analytics" className="font-medium cursor-pointer">
                    Analytics
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    PostHog for feature usage and user journeys.
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={consent.analytics}
                  onCheckedChange={checked => setConsent({ ...consent, analytics: checked })}
                  aria-label="Analytics cookies"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 flex-col md:flex-row gap-3">
              <Button variant="ghost" onClick={() => setShowDetails(false)}>
                Back
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRejectOptional}>
                  Reject Optional
                </Button>
                <Button onClick={handleSavePreferences}>Save Preferences</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
