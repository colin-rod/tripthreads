import {
  detectTripThreadMentions,
  hasTripThreadMention,
  extractCommands,
  removeTripThreadMentions,
} from '@/lib/chat/parse-mentions'

describe('parse-mentions', () => {
  describe('detectTripThreadMentions', () => {
    it('should detect single @TripThread mention', () => {
      const message = '@TripThread add dinner €60 split 4 ways'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].command).toBe('add dinner €60 split 4 ways')
      expect(mentions[0].fullMatch).toBe('@TripThread add dinner €60 split 4 ways')
      expect(mentions[0].startIndex).toBe(0)
    })

    it('should detect multiple @TripThread mentions', () => {
      const message = '@TripThread add dinner €60 @TripThread add taxi £20'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(2)
      expect(mentions[0].command).toBe('add dinner €60')
      expect(mentions[1].command).toBe('add taxi £20')
    })

    it('should handle @TripThread in middle of message', () => {
      const message = 'Hey everyone, @TripThread add lunch $50 split 3 ways'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].command).toBe('add lunch $50 split 3 ways')
      expect(mentions[0].startIndex).toBe(14)
    })

    it('should handle case-insensitive @TripThread', () => {
      const message = '@tripthread add dinner €60'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].command).toBe('add dinner €60')
    })

    it('should return empty array for no mentions', () => {
      const message = 'Just a regular message'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(0)
    })

    it('should handle @TripThread with no command', () => {
      const message = '@TripThread '
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].command).toBe('')
    })

    it('should handle newlines between commands', () => {
      const message = '@TripThread add dinner €60\n@TripThread add taxi £20'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(2)
      expect(mentions[0].command).toBe('add dinner €60')
      expect(mentions[1].command).toBe('add taxi £20')
    })

    it('should trim whitespace from commands', () => {
      const message = '@TripThread   add dinner €60   '
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].command).toBe('add dinner €60')
    })
  })

  describe('hasTripThreadMention', () => {
    it('should return true for message with @TripThread', () => {
      expect(hasTripThreadMention('@TripThread add dinner')).toBe(true)
    })

    it('should return true for case-insensitive match', () => {
      expect(hasTripThreadMention('@tripthread add dinner')).toBe(true)
      expect(hasTripThreadMention('@TRIPTHREAD add dinner')).toBe(true)
    })

    it('should return false for message without @TripThread', () => {
      expect(hasTripThreadMention('Just a regular message')).toBe(false)
    })

    it('should return false for incomplete mention', () => {
      expect(hasTripThreadMention('@Trip add dinner')).toBe(false)
      expect(hasTripThreadMention('TripThread add dinner')).toBe(false)
    })
  })

  describe('extractCommands', () => {
    it('should extract single command', () => {
      const message = '@TripThread add dinner €60 split 4 ways'
      const commands = extractCommands(message)

      expect(commands).toEqual(['add dinner €60 split 4 ways'])
    })

    it('should extract multiple commands', () => {
      const message = '@TripThread add dinner €60 @TripThread add taxi £20'
      const commands = extractCommands(message)

      expect(commands).toEqual(['add dinner €60', 'add taxi £20'])
    })

    it('should return empty array for no mentions', () => {
      const message = 'Just a regular message'
      const commands = extractCommands(message)

      expect(commands).toEqual([])
    })

    it('should handle complex real-world example', () => {
      const message =
        'Hey team! @TripThread Hotel Marriott €200 check-in Dec 15 3pm and @TripThread add taxi from airport $45'
      const commands = extractCommands(message)

      expect(commands).toEqual([
        'Hotel Marriott €200 check-in Dec 15 3pm and',
        'add taxi from airport $45',
      ])
    })
  })

  describe('removeTripThreadMentions', () => {
    it('should remove single @TripThread mention', () => {
      const message = '@TripThread add dinner €60'
      const cleaned = removeTripThreadMentions(message)

      expect(cleaned).toBe('add dinner €60')
    })

    it('should remove multiple @TripThread mentions', () => {
      const message = '@TripThread add dinner €60 @TripThread add taxi £20'
      const cleaned = removeTripThreadMentions(message)

      expect(cleaned).toBe('add dinner €60 add taxi £20')
    })

    it('should preserve regular text', () => {
      const message = 'Hey everyone, @TripThread add lunch $50'
      const cleaned = removeTripThreadMentions(message)

      expect(cleaned).toBe('Hey everyone, add lunch $50')
    })

    it('should trim result', () => {
      const message = '  @TripThread add dinner  '
      const cleaned = removeTripThreadMentions(message)

      expect(cleaned).toBe('add dinner')
    })

    it('should handle message without mentions', () => {
      const message = 'Just a regular message'
      const cleaned = removeTripThreadMentions(message)

      expect(cleaned).toBe('Just a regular message')
    })

    it('should handle case-insensitive removal', () => {
      const message = '@tripthread add dinner @TRIPTHREAD add taxi'
      const cleaned = removeTripThreadMentions(message)

      expect(cleaned).toBe('add dinner add taxi')
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle expense command', () => {
      const message = '@TripThread add dinner €60 split 4 ways'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].command).toContain('dinner')
      expect(mentions[0].command).toContain('€60')
      expect(mentions[0].command).toContain('split 4 ways')
    })

    it('should handle itinerary command', () => {
      const message = '@TripThread flight to Paris Monday 9am'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].command).toContain('flight')
      expect(mentions[0].command).toContain('Paris')
      expect(mentions[0].command).toContain('Monday 9am')
    })

    it('should handle dual command (hotel)', () => {
      const message = '@TripThread Hotel Marriott €200 check-in Dec 15 3pm'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].command).toContain('Hotel Marriott')
      expect(mentions[0].command).toContain('€200')
      expect(mentions[0].command).toContain('check-in')
    })

    it('should handle conversation with multiple commands', () => {
      const message =
        'Quick update: @TripThread add breakfast $25 split 3 ways. Also @TripThread museum visit tomorrow 2pm. See you all there!'
      const commands = extractCommands(message)

      expect(commands).toHaveLength(2)
      expect(commands[0]).toContain('breakfast')
      expect(commands[1]).toContain('museum')
    })

    it('should handle command with special characters', () => {
      const message = '@TripThread add Le Café français €45.50 split 2 ways'
      const mentions = detectTripThreadMentions(message)

      expect(mentions).toHaveLength(1)
      expect(mentions[0].command).toContain('Le Café français')
      expect(mentions[0].command).toContain('€45.50')
    })

    it('should handle multi-line message', () => {
      const message = `Hey team!

@TripThread add dinner €60 split 4 ways

Looking forward to tomorrow!

@TripThread museum visit 2pm`

      const commands = extractCommands(message)

      expect(commands).toHaveLength(2)
      expect(commands[0]).toContain('dinner')
      expect(commands[1]).toContain('museum')
    })
  })
})
