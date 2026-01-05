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
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-md z-50 bg-card/95 backdrop-blur-sm border-2 border-primary shadow-xl rounded-lg transition-all duration-300 ease-in-out">
      <div className="px-4 py-4 md:px-5 md:py-5 space-y-3">
        {!showDetails ? (
          // Simple mode
          <>
            <div className="space-y-3">
              <h3 className="text-base md:text-lg font-semibold text-foreground">
                We value your privacy
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                We use cookies to enhance your experience, analyze site usage, and improve our
                service. You can customize your preferences or accept all cookies.{' '}
                <Link
                  href="/cookies"
                  className="text-primary hover:underline font-medium text-xs md:text-sm"
                >
                  Learn more
                </Link>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleAcceptAll} className="w-full">
                Accept All
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRejectOptional}
                  className="flex-1 text-xs md:text-sm"
                >
                  Reject
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDetails(true)}
                  className="flex-1 text-xs md:text-sm"
                >
                  Customize
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Detailed mode
          <>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <h3 className="text-base md:text-lg font-semibold text-foreground">
                Cookie Preferences
              </h3>

              {/* Necessary Cookies */}
              <div className="flex items-center justify-between py-2">
                <div className="flex-1 pr-4">
                  <Label className="font-medium text-xs md:text-sm">Strictly Necessary</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for authentication and core functionality.
                  </p>
                </div>
                <Switch checked disabled aria-label="Strictly necessary cookies (always enabled)" />
              </div>

              <Separator />

              {/* Performance Cookies */}
              <div className="flex items-center justify-between py-2">
                <div className="flex-1 pr-4">
                  <Label
                    htmlFor="performance"
                    className="font-medium cursor-pointer text-xs md:text-sm"
                  >
                    Performance
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vercel Analytics for page load times.
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
              <div className="flex items-center justify-between py-2">
                <div className="flex-1 pr-4">
                  <Label
                    htmlFor="functional"
                    className="font-medium cursor-pointer text-xs md:text-sm"
                  >
                    Functional
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sentry error tracking and session replay.
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
              <div className="flex items-center justify-between py-2">
                <div className="flex-1 pr-4">
                  <Label
                    htmlFor="analytics"
                    className="font-medium cursor-pointer text-xs md:text-sm"
                  >
                    Analytics
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    PostHog for feature usage and journeys.
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

            <div className="flex flex-col gap-2 pt-3">
              <Button onClick={handleSavePreferences} className="w-full">
                Save Preferences
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRejectOptional}
                  className="flex-1 text-xs md:text-sm"
                >
                  Reject All
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowDetails(false)}
                  className="flex-1 text-xs md:text-sm"
                >
                  Back
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
