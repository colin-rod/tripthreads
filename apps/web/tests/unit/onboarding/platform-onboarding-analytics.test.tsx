import { render, waitFor } from '@testing-library/react'
import { PlatformOnboardingScreen } from '@/components/features/onboarding/PlatformOnboardingScreen'
import { posthog } from '@/lib/analytics/posthog'
import { isMobile } from '@/lib/utils/platform'

jest.mock('@/lib/analytics/posthog', () => ({
  posthog: {
    capture: jest.fn(),
  },
}))

jest.mock('@/lib/utils/platform', () => ({
  isMobile: jest.fn(),
}))

describe('PlatformOnboardingScreen analytics', () => {
  const posthogCapture = posthog.capture as jest.Mock
  const isMobileMock = isMobile as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('captures platform detection event for mobile', async () => {
    isMobileMock.mockReturnValue(true)

    render(<PlatformOnboardingScreen onContinue={() => {}} onSkip={() => {}} variant="B" />)

    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('onboarding_platform_detected', {
        platform: 'mobile',
        variant: 'B',
      }),
    )
  })

  it('captures platform detection event for web', async () => {
    isMobileMock.mockReturnValue(false)

    render(<PlatformOnboardingScreen onContinue={() => {}} onSkip={() => {}} />)

    await waitFor(() =>
      expect(posthogCapture).toHaveBeenCalledWith('onboarding_platform_detected', {
        platform: 'web',
        variant: 'A',
      }),
    )
  })
})
