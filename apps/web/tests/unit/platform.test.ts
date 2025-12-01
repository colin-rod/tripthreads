/**
 * Platform Detection Tests
 */

import { isMobile, isTablet, isDesktop, getPlatform, isTouchDevice } from '@/lib/utils/platform'

// Mock window and navigator
const mockWindow = (userAgent: string, innerWidth: number) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value: userAgent,
    configurable: true,
  })
  Object.defineProperty(window, 'innerWidth', {
    value: innerWidth,
    configurable: true,
  })
}

describe('Platform Detection', () => {
  beforeEach(() => {
    // Reset to default desktop
    mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 1920)
  })

  describe('isMobile', () => {
    it('detects iPhone user agent', () => {
      mockWindow('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', 375)
      expect(isMobile()).toBe(true)
    })

    it('detects Android user agent', () => {
      mockWindow('Mozilla/5.0 (Linux; Android 11; Pixel 5)', 412)
      expect(isMobile()).toBe(true)
    })

    it('detects mobile by screen width', () => {
      mockWindow('Mozilla/5.0 (Windows NT 10.0)', 375) // Mobile width, desktop UA
      expect(isMobile()).toBe(true)
    })

    it('returns false for desktop', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 1920)
      expect(isMobile()).toBe(false)
    })

    it('treats small windows as mobile', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 500)
      expect(isMobile()).toBe(true)
    })
  })

  describe('isTablet', () => {
    it('detects iPad user agent', () => {
      mockWindow('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)', 1024)
      expect(isTablet()).toBe(true)
    })

    it('detects tablet by screen width', () => {
      mockWindow('Mozilla/5.0 (Windows NT 10.0)', 800) // Tablet width
      expect(isTablet()).toBe(true)
    })

    it('returns false for mobile', () => {
      mockWindow('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', 375)
      expect(isTablet()).toBe(false)
    })

    it('returns false for desktop', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 1920)
      expect(isTablet()).toBe(false)
    })
  })

  describe('isDesktop', () => {
    it('detects desktop environment', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 1920)
      expect(isDesktop()).toBe(true)
    })

    it('returns false for mobile', () => {
      mockWindow('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', 375)
      expect(isDesktop()).toBe(false)
    })

    it('returns false for tablet', () => {
      mockWindow('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)', 1024)
      expect(isDesktop()).toBe(false)
    })
  })

  describe('getPlatform', () => {
    it('returns "mobile" for mobile devices', () => {
      mockWindow('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', 375)
      expect(getPlatform()).toBe('mobile')
    })

    it('returns "tablet" for tablets', () => {
      mockWindow('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)', 1024)
      expect(getPlatform()).toBe('tablet')
    })

    it('returns "desktop" for desktop', () => {
      mockWindow('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 1920)
      expect(getPlatform()).toBe('desktop')
    })
  })

  describe('isTouchDevice', () => {
    it('detects touch support via ontouchstart', () => {
      window.ontouchstart = () => {}
      expect(isTouchDevice()).toBe(true)
      delete window.ontouchstart
    })

    it('detects touch support via maxTouchPoints', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      })
      expect(isTouchDevice()).toBe(true)
    })

    it('returns false for non-touch devices', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
      })
      expect(isTouchDevice()).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('handles undefined window', () => {
      // Simulate SSR
      const originalWindow = global.window
      // @ts-expect-error - testing SSR scenario
      delete global.window

      expect(isMobile()).toBe(false)
      expect(isTablet()).toBe(false)
      expect(isTouchDevice()).toBe(false)

      // Restore
      global.window = originalWindow
    })

    it('handles boundary width values', () => {
      // Exactly 768px (tablet threshold)
      mockWindow('Mozilla/5.0 (Windows NT 10.0)', 768)
      expect(isMobile()).toBe(false)
      expect(isTablet()).toBe(true)

      // Exactly 1024px (desktop threshold)
      mockWindow('Mozilla/5.0 (Windows NT 10.0)', 1024)
      expect(isTablet()).toBe(false)
      expect(isDesktop()).toBe(true)
    })
  })
})
