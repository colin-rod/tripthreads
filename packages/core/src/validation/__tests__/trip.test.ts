import { describe, expect, it } from '@jest/globals'

import { validateCreateTrip, validateUpdateTrip } from '../trip'

describe('validateCreateTrip', () => {
  const createFutureDateRange = () => {
    const start = new Date()
    start.setDate(start.getDate() + 1)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    }
  }

  it('accepts the minimal valid payload', () => {
    const { startDate, endDate } = createFutureDateRange()

    const result = validateCreateTrip({
      name: 'Weekend getaway',
      start_date: startDate,
      end_date: endDate,
      owner_id: '123e4567-e89b-12d3-a456-426614174000',
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.data).toMatchObject({
      name: 'Weekend getaway',
      start_date: startDate,
      end_date: endDate,
      owner_id: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.data.description).toBeUndefined()
    expect(result.data.cover_image_url).toBeUndefined()
  })

  it('rejects a past start date', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const result = validateCreateTrip({
      name: 'Past trip',
      start_date: yesterday.toISOString(),
      end_date: tomorrow.toISOString(),
      owner_id: '123e4567-e89b-12d3-a456-426614174000',
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    const messages = result.error.issues.map(issue => issue.message)
    expect(messages).toContain('Start date cannot be in the past')
  })

  it('rejects an end date earlier than the start date', () => {
    const { startDate } = createFutureDateRange()
    const endBeforeStart = new Date(startDate)
    endBeforeStart.setDate(endBeforeStart.getDate() - 1)

    const result = validateCreateTrip({
      name: 'Backwards trip',
      start_date: startDate,
      end_date: endBeforeStart.toISOString(),
      owner_id: '123e4567-e89b-12d3-a456-426614174000',
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    const messages = result.error.issues.map(issue => issue.message)
    expect(messages).toContain('End date must be on or after start date')
  })

  it('rejects a name longer than 100 characters', () => {
    const { startDate, endDate } = createFutureDateRange()
    const overlongName = 'a'.repeat(101)

    const result = validateCreateTrip({
      name: overlongName,
      start_date: startDate,
      end_date: endDate,
      owner_id: '123e4567-e89b-12d3-a456-426614174000',
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    const messages = result.error.issues.map(issue => issue.message)
    expect(messages).toContain('Trip name must be less than 100 characters')
  })

  it('rejects an invalid cover image url', () => {
    const { startDate, endDate } = createFutureDateRange()

    const result = validateCreateTrip({
      name: 'Invalid cover url',
      start_date: startDate,
      end_date: endDate,
      owner_id: '123e4567-e89b-12d3-a456-426614174000',
      cover_image_url: 'not-a-url',
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    const messages = result.error.issues.map(issue => issue.message)
    expect(messages).toContain('Invalid image URL')
  })
})

describe('validateUpdateTrip', () => {
  const createFutureDateRange = () => {
    const start = new Date()
    start.setDate(start.getDate() + 1)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    }
  }

  it('accepts the minimal valid payload', () => {
    const result = validateUpdateTrip({})

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    expect(result.data).toEqual({})
  })

  it('rejects an end date earlier than the start date when both are provided', () => {
    const { startDate } = createFutureDateRange()
    const endBeforeStart = new Date(startDate)
    endBeforeStart.setDate(endBeforeStart.getDate() - 1)

    const result = validateUpdateTrip({
      start_date: startDate,
      end_date: endBeforeStart.toISOString(),
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    const messages = result.error.issues.map(issue => issue.message)
    expect(messages).toContain('End date must be on or after start date')
  })

  it('rejects a name longer than 100 characters', () => {
    const overlongName = 'a'.repeat(101)

    const result = validateUpdateTrip({
      name: overlongName,
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    const messages = result.error.issues.map(issue => issue.message)
    expect(messages).toContain('Trip name must be less than 100 characters')
  })

  it('rejects an invalid cover image url', () => {
    const result = validateUpdateTrip({
      cover_image_url: 'not-a-url',
    })

    expect(result.success).toBe(false)
    if (result.success) {
      return
    }

    const messages = result.error.issues.map(issue => issue.message)
    expect(messages).toContain('Invalid image URL')
  })
})
