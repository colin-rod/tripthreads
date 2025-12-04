'use client'

import { useEffect, useState } from 'react'

export type TripSection = 'home' | 'chat' | 'expenses' | 'plan' | 'feed' | 'settings'

export function useHashNavigation() {
  const [section, setSection] = useState<TripSection>('home')

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as TripSection
      setSection(hash || 'home')
    }

    // Set initial section
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = (newSection: TripSection) => {
    window.location.hash = newSection === 'home' ? '' : newSection
  }

  return { section, navigateTo }
}
