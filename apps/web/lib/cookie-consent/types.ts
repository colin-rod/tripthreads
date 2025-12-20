export type CookieCategory = 'necessary' | 'performance' | 'functional' | 'analytics'

export type CookieConsent = {
  necessary: true
  performance: boolean
  functional: boolean
  analytics: boolean
  timestamp: string
  version: number
}

export type CookieInfo = {
  name: string
  provider: string
  purpose: string
  category: CookieCategory
  expiry: string
}
