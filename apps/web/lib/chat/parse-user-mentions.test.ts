import { describe, it, expect } from '@jest/globals'
import {
  detectUserMentions,
  hasUserMentions,
  extractUsernames,
  mapUsernamesToIds,
  highlightMentions,
} from './parse-user-mentions'

describe('parse-user-mentions', () => {
  describe('detectUserMentions', () => {
    it('detects single @mention', () => {
      const result = detectUserMentions('@alice check this out')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        fullMatch: '@alice',
        username: 'alice',
        startIndex: 0,
        endIndex: 6,
      })
    })

    it('detects multiple @mentions', () => {
      const result = detectUserMentions('@alice and @bob lets meet')

      expect(result).toHaveLength(2)
      expect(result[0].username).toBe('alice')
      expect(result[1].username).toBe('bob')
    })

    it('detects @mentions with underscores', () => {
      const result = detectUserMentions('@alice_smith and @bob_jones')

      expect(result).toHaveLength(2)
      expect(result[0].username).toBe('alice_smith')
      expect(result[1].username).toBe('bob_jones')
    })

    it('detects @mentions with numbers', () => {
      const result = detectUserMentions('@user123 and @test456')

      expect(result).toHaveLength(2)
      expect(result[0].username).toBe('user123')
      expect(result[1].username).toBe('test456')
    })

    it('excludes @TripThread mentions (case insensitive)', () => {
      const result = detectUserMentions('@TripThread add dinner €60')
      expect(result).toHaveLength(0)

      const result2 = detectUserMentions('@tripthread add taxi £20')
      expect(result2).toHaveLength(0)

      const result3 = detectUserMentions('@TRIPTHREAD add hotel')
      expect(result3).toHaveLength(0)
    })

    it('excludes email addresses', () => {
      const result = detectUserMentions('contact alice@example.com for info')
      expect(result).toHaveLength(0)

      const result2 = detectUserMentions('email: test@test.com')
      expect(result2).toHaveLength(0)
    })

    it('detects @mentions in middle of message', () => {
      const result = detectUserMentions('hey @alice how are you?')

      expect(result).toHaveLength(1)
      expect(result[0].startIndex).toBe(4)
    })

    it('detects @mentions at end of message', () => {
      const result = detectUserMentions('thanks @bob')

      expect(result).toHaveLength(1)
      expect(result[0].username).toBe('bob')
    })

    it('ignores @ symbols not followed by valid username', () => {
      const result = detectUserMentions('@ @@ @- @.')
      expect(result).toHaveLength(0)
    })

    it('handles empty message', () => {
      const result = detectUserMentions('')
      expect(result).toHaveLength(0)
    })

    it('handles message without mentions', () => {
      const result = detectUserMentions('This is a regular message')
      expect(result).toHaveLength(0)
    })

    it('respects 30 character username limit', () => {
      // Exactly 30 characters should match
      const exactUsername = 'a'.repeat(30)
      const result = detectUserMentions(`@${exactUsername} hello`)

      expect(result).toHaveLength(1)
      expect(result[0].username).toHaveLength(30)

      // 31+ characters won't match (to prevent partial matches)
      // This is intentional - usernames should have clear boundaries
      const longUsername = 'a'.repeat(35)
      const result2 = detectUserMentions(`@${longUsername} hello`)

      expect(result2).toHaveLength(0) // Won't match - username too long
    })

    it('handles duplicate mentions', () => {
      const result = detectUserMentions('@alice check this @alice')

      expect(result).toHaveLength(2)
      expect(result[0].username).toBe('alice')
      expect(result[1].username).toBe('alice')
      expect(result[0].startIndex).not.toBe(result[1].startIndex)
    })

    it('handles mentions with punctuation after', () => {
      // Note: Single trailing dot is allowed in usernames (e.g., @alice.)
      // But other punctuation stops the match
      const result = detectUserMentions('@alice, @bob! @charlie? @dave')

      expect(result).toHaveLength(4)
      expect(result.map(r => r.username)).toEqual(['alice', 'bob', 'charlie', 'dave'])
    })

    it('detects mentions in multiline messages', () => {
      const message = `@alice
      check this out
      @bob you too`

      const result = detectUserMentions(message)

      expect(result).toHaveLength(2)
      expect(result[0].username).toBe('alice')
      expect(result[1].username).toBe('bob')
    })
  })

  describe('hasUserMentions', () => {
    it('returns true when message has mentions', () => {
      expect(hasUserMentions('@alice hello')).toBe(true)
      expect(hasUserMentions('hey @bob')).toBe(true)
    })

    it('returns false when message has no mentions', () => {
      expect(hasUserMentions('hello world')).toBe(false)
      expect(hasUserMentions('@TripThread add dinner')).toBe(false)
      expect(hasUserMentions('email test@test.com')).toBe(false)
    })

    it('returns false for empty message', () => {
      expect(hasUserMentions('')).toBe(false)
    })
  })

  describe('extractUsernames', () => {
    it('extracts unique usernames', () => {
      const result = extractUsernames('@alice check this @bob and @alice')

      expect(result).toHaveLength(2)
      expect(result).toContain('alice')
      expect(result).toContain('bob')
    })

    it('returns lowercase usernames', () => {
      const result = extractUsernames('@Alice and @BOB')

      expect(result).toEqual(['alice', 'bob'])
    })

    it('returns empty array for no mentions', () => {
      const result = extractUsernames('no mentions here')
      expect(result).toEqual([])
    })

    it('handles single mention', () => {
      const result = extractUsernames('@alice')
      expect(result).toEqual(['alice'])
    })
  })

  describe('mapUsernamesToIds', () => {
    const mockParticipants = [
      {
        id: 'user-1',
        full_name: 'Alice Smith',
        email: 'alice.smith@example.com',
      },
      {
        id: 'user-2',
        full_name: 'Bob Jones',
        email: 'bob@example.com',
      },
      {
        id: 'user-3',
        full_name: 'Charlie Brown',
        email: 'charlie.brown@test.com',
      },
    ]

    it('maps username to user ID by email prefix', () => {
      const result = mapUsernamesToIds('@alice.smith hello', mockParticipants)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('user-1')
    })

    it('maps username to user ID by email prefix (simple)', () => {
      const result = mapUsernamesToIds('@bob lets go', mockParticipants)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('user-2')
    })

    it('maps username to user ID by full name (no spaces)', () => {
      const result = mapUsernamesToIds('@alicesmith check', mockParticipants)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('user-1')
    })

    it('maps username to user ID by full name (with spaces)', () => {
      // "@charlie brown" won't match because @mention detection stops at space
      // Only "@charlie" will be detected (not a full match to "Charlie Brown")
      const result = mapUsernamesToIds('@charlie brown are you there', mockParticipants)
      expect(result).toHaveLength(0) // No match for just "charlie"

      // "@charliebrown" (concatenated) will match the user "Charlie Brown"
      const result2 = mapUsernamesToIds('@charliebrown are you there', mockParticipants)
      expect(result2).toHaveLength(1)
      expect(result2[0]).toBe('user-3')
    })

    it('maps multiple usernames to user IDs', () => {
      const result = mapUsernamesToIds('@alice.smith and @bob', mockParticipants)

      expect(result).toHaveLength(2)
      expect(result).toContain('user-1')
      expect(result).toContain('user-2')
    })

    it('ignores usernames not in participants list', () => {
      const result = mapUsernamesToIds('@alice.smith and @unknown', mockParticipants)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('user-1')
    })

    it('returns empty array for no matches', () => {
      const result = mapUsernamesToIds('@unknown1 and @unknown2', mockParticipants)

      expect(result).toEqual([])
    })

    it('handles case-insensitive matching', () => {
      const result = mapUsernamesToIds('@ALICE.SMITH and @BOB', mockParticipants)

      expect(result).toHaveLength(2)
      expect(result).toContain('user-1')
      expect(result).toContain('user-2')
    })

    it('handles duplicate mentions (returns unique IDs)', () => {
      const result = mapUsernamesToIds('@alice.smith check @alice.smith', mockParticipants)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('user-1')
    })
  })

  describe('highlightMentions', () => {
    const mockParticipants = [
      {
        id: 'user-1',
        full_name: 'Alice Smith',
        email: 'alice@example.com',
      },
      {
        id: 'user-2',
        full_name: 'Bob Jones',
        email: 'bob@example.com',
      },
    ]

    it('highlights single mention', () => {
      const result = highlightMentions('@alice hello', 'user-2', mockParticipants)

      expect(result).toContain('<span class="mention-user"')
      expect(result).toContain('data-user-id="user-1"')
      expect(result).toContain('@alice</span>')
    })

    it('highlights self mention with different class', () => {
      const result = highlightMentions('@alice hello', 'user-1', mockParticipants)

      expect(result).toContain('<span class="mention-self"')
      expect(result).toContain('data-user-id="user-1"')
    })

    it('highlights multiple mentions', () => {
      const result = highlightMentions('@alice and @bob', 'user-1', mockParticipants)

      expect(result).toContain('mention-self') // alice (current user)
      expect(result).toContain('mention-user') // bob
      expect(result).toContain('data-user-id="user-1"')
      expect(result).toContain('data-user-id="user-2"')
    })

    it('preserves message text without mentions', () => {
      const result = highlightMentions('hello world', 'user-1', mockParticipants)

      expect(result).toBe('hello world')
      expect(result).not.toContain('<span')
    })

    it('preserves text around mentions', () => {
      const result = highlightMentions('hey @alice how are you', 'user-2', mockParticipants)

      expect(result).toContain('hey ')
      expect(result).toContain(' how are you')
    })

    it('handles mentions not in participants list', () => {
      const result = highlightMentions('@alice and @unknown', 'user-2', mockParticipants)

      // Only alice should be highlighted
      expect(result.match(/<span/g)?.length).toBe(1)
      expect(result).toContain('@unknown') // not highlighted
    })

    it('returns original message if no participants', () => {
      const result = highlightMentions('@alice hello', 'user-1', [])

      expect(result).toBe('@alice hello')
      expect(result).not.toContain('<span')
    })
  })
})
