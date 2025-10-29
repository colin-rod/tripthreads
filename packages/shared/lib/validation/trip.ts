/**
 * Trip validation schemas
 *
 * Zod schemas for validating trip data on client and server.
 * Enforces business rules like date range constraints.
 */

import { z } from 'zod'

/**
 * Schema for creating a new trip
 *
 * Validates:
 * - Name: Required, 1-100 characters
 * - Description: Optional, max 500 characters
 * - Start date: Required, valid ISO 8601, not in past
 * - End date: Required, >= start_date
 * - Owner ID: Required, valid UUID
 * - Cover image: Optional, valid URL
 */
export const createTripSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Trip name is required')
      .max(100, 'Trip name must be less than 100 characters')
      .trim(),

    description: z
      .string()
      .max(500, 'Description must be less than 500 characters')
      .optional()
      .nullable(),

    start_date: z
      .string()
      .datetime('Invalid start date format')
      .refine(
        date => {
          const startDate = new Date(date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return startDate >= today
        },
        {
          message: 'Start date cannot be in the past',
        }
      ),

    end_date: z.string().datetime('Invalid end date format'),

    owner_id: z.string().uuid('Invalid owner ID'),

    cover_image_url: z.string().url('Invalid image URL').optional().nullable(),
  })
  .refine(
    data => {
      const startDate = new Date(data.start_date)
      const endDate = new Date(data.end_date)
      return endDate >= startDate
    },
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  )

/**
 * Schema for updating an existing trip
 *
 * Same as create schema but:
 * - All fields optional (partial update)
 * - owner_id cannot be changed
 * - Past start_date allowed (for existing trips)
 */
export const updateTripSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Trip name is required')
      .max(100, 'Trip name must be less than 100 characters')
      .trim()
      .optional(),

    description: z
      .string()
      .max(500, 'Description must be less than 500 characters')
      .optional()
      .nullable(),

    start_date: z.string().datetime('Invalid start date format').optional(),

    end_date: z.string().datetime('Invalid end date format').optional(),

    cover_image_url: z.string().url('Invalid image URL').optional().nullable(),
  })
  .refine(
    data => {
      // If both dates provided, validate range
      if (data.start_date && data.end_date) {
        const startDate = new Date(data.start_date)
        const endDate = new Date(data.end_date)
        return endDate >= startDate
      }
      return true
    },
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  )

/**
 * Type inference from schemas
 */
export type CreateTripInput = z.infer<typeof createTripSchema>
export type UpdateTripInput = z.infer<typeof updateTripSchema>

/**
 * Validate trip creation data
 *
 * @param data - Trip data to validate
 * @returns Validation result with data or error
 */
export function validateCreateTrip(data: unknown) {
  return createTripSchema.safeParse(data)
}

/**
 * Validate trip update data
 *
 * @param data - Trip update data to validate
 * @returns Validation result with data or error
 */
export function validateUpdateTrip(data: unknown) {
  return updateTripSchema.safeParse(data)
}
