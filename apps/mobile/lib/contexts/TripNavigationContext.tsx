import React, { createContext, useContext, useState, type ReactNode } from 'react'

export type TripSection = 'dashboard' | 'chat' | 'expenses' | 'plan' | 'feed'

interface TripNavigationContextValue {
  currentSection: TripSection
  navigateToSection: (section: TripSection) => void
  navigateBack: () => void
}

const TripNavigationContext = createContext<TripNavigationContextValue | undefined>(undefined)

interface TripNavigationProviderProps {
  children: ReactNode
  initialSection?: TripSection
}

export function TripNavigationProvider({
  children,
  initialSection = 'dashboard',
}: TripNavigationProviderProps) {
  const [currentSection, setCurrentSection] = useState<TripSection>(initialSection)

  const navigateToSection = (section: TripSection) => {
    setCurrentSection(section)
  }

  const navigateBack = () => {
    setCurrentSection('dashboard')
  }

  return (
    <TripNavigationContext.Provider
      value={{
        currentSection,
        navigateToSection,
        navigateBack,
      }}
    >
      {children}
    </TripNavigationContext.Provider>
  )
}

export function useTripNavigation() {
  const context = useContext(TripNavigationContext)
  if (!context) {
    throw new Error('useTripNavigation must be used within a TripNavigationProvider')
  }
  return context
}
