import { parseDeepLink, getRouteFromDeepLink } from '../../lib/linking/deep-link-parser'

describe('parseDeepLink', () => {
  describe('invite links', () => {
    it('parses custom scheme invite link', () => {
      const url = 'tripthreads://invite/abc123'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'invite',
        token: 'abc123',
      })
    })

    it('parses universal link invite link', () => {
      const url = 'https://tripthreads.app/invite/abc123'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'invite',
        token: 'abc123',
      })
    })

    it('parses development universal link invite link', () => {
      const url = 'https://dev.tripthreads.app/invite/abc123'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'invite',
        token: 'abc123',
      })
    })

    it('parses invite link with redirect query param', () => {
      const url = 'https://tripthreads.app/invite/abc123?redirect=/trips/xyz'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'invite',
        token: 'abc123',
        redirectPath: '/trips/xyz',
      })
    })

    it('handles invite link with trailing slash', () => {
      const url = 'https://tripthreads.app/invite/abc123/'
      const result = parseDeepLink(url)

      expect(result.type).toBe('invite')
      expect(result.token).toBe('abc123')
    })

    it('handles invite link with UUID token', () => {
      const url = 'https://tripthreads.app/invite/550e8400-e29b-41d4-a716-446655440000'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'invite',
        token: '550e8400-e29b-41d4-a716-446655440000',
      })
    })
  })

  describe('trip links', () => {
    it('parses custom scheme trip link', () => {
      const url = 'tripthreads://trips/xyz789'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'trip',
        tripId: 'xyz789',
      })
    })

    it('parses universal link trip link', () => {
      const url = 'https://tripthreads.app/trips/xyz789'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'trip',
        tripId: 'xyz789',
      })
    })

    it('parses development universal link trip link', () => {
      const url = 'https://dev.tripthreads.app/trips/xyz789'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'trip',
        tripId: 'xyz789',
      })
    })

    it('handles trip link with UUID', () => {
      const url = 'https://tripthreads.app/trips/550e8400-e29b-41d4-a716-446655440000'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'trip',
        tripId: '550e8400-e29b-41d4-a716-446655440000',
      })
    })

    it('handles trip link with trailing slash', () => {
      const url = 'https://tripthreads.app/trips/xyz789/'
      const result = parseDeepLink(url)

      expect(result.type).toBe('trip')
      expect(result.tripId).toBe('xyz789')
    })
  })

  describe('unknown links', () => {
    it('returns unknown for home page link', () => {
      const url = 'https://tripthreads.app'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'unknown',
      })
    })

    it('returns unknown for invalid path', () => {
      const url = 'https://tripthreads.app/about'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'unknown',
      })
    })

    it('returns unknown for malformed invite link', () => {
      const url = 'https://tripthreads.app/invite/'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'unknown',
      })
    })

    it('returns unknown for malformed trip link', () => {
      const url = 'https://tripthreads.app/trips/'
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'unknown',
      })
    })

    it('returns unknown for empty string', () => {
      const url = ''
      const result = parseDeepLink(url)

      expect(result).toEqual({
        type: 'unknown',
      })
    })
  })
})

describe('getRouteFromDeepLink', () => {
  it('returns invite route for invite link', () => {
    const parsedLink = {
      type: 'invite' as const,
      token: 'abc123',
    }

    const route = getRouteFromDeepLink(parsedLink)

    expect(route).toBe('/invite/abc123')
  })

  it('returns trip route for trip link', () => {
    const parsedLink = {
      type: 'trip' as const,
      tripId: 'xyz789',
    }

    const route = getRouteFromDeepLink(parsedLink)

    expect(route).toBe('/trips/xyz789')
  })

  it('returns home route for unknown link', () => {
    const parsedLink = {
      type: 'unknown' as const,
    }

    const route = getRouteFromDeepLink(parsedLink)

    expect(route).toBe('/')
  })

  it('handles UUID tokens', () => {
    const parsedLink = {
      type: 'invite' as const,
      token: '550e8400-e29b-41d4-a716-446655440000',
    }

    const route = getRouteFromDeepLink(parsedLink)

    expect(route).toBe('/invite/550e8400-e29b-41d4-a716-446655440000')
  })
})
