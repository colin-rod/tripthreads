/**
 * Profile validation schemas
 *
 * Zod schemas for validating user profile data.
 * Enforces display name length and format requirements.
 */

import { z } from 'zod'

/**
 * Schema for profile completion
 *
 * Validates:
 * - Display name: Required, 2-50 characters, alphanumeric + spaces
 * - Avatar: Optional, validates file type and size
 * - Notification preferences: Optional boolean flags
 */
export const completeProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9\s'-]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, and apostrophes'
    )
    .trim(),

  avatar: z
    .instanceof(File)
    .refine(file => file.size <= 5 * 1024 * 1024, 'Avatar must be less than 5MB')
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Avatar must be a JPG, PNG, or WebP image'
    )
    .optional()
    .nullable(),

  notification_preferences: z
    .object({
      email_trip_invites: z.boolean(),
      email_expense_updates: z.boolean(),
      email_trip_updates: z.boolean(),
      push_trip_invites: z.boolean(),
      push_expense_updates: z.boolean(),
      push_trip_updates: z.boolean(),
    })
    .optional(),
})

/**
 * Schema for profile updates (edit profile)
 *
 * Same as complete profile but all fields optional
 */
export const updateProfileSchema = completeProfileSchema.partial()

/**
 * Schema for password change
 *
 * Validates:
 * - Current password: Required
 * - New password: Min 8 chars, at least one letter and one number
 * - Confirm password: Must match new password
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/**
 * Type inference from schemas
 */
export type CompleteProfileInput = z.infer<typeof completeProfileSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/**
 * Validate profile completion data
 *
 * @param data - Profile data to validate
 * @returns Validation result with data or error
 */
export function validateCompleteProfile(data: unknown) {
  return completeProfileSchema.safeParse(data)
}

/**
 * Validate profile update data
 *
 * @param data - Profile update data to validate
 * @returns Validation result with data or error
 */
export function validateUpdateProfile(data: unknown) {
  return updateProfileSchema.safeParse(data)
}

/**
 * Validate password change data
 *
 * @param data - Password change data to validate
 * @returns Validation result with data or error
 */
export function validateChangePassword(data: unknown) {
  return changePasswordSchema.safeParse(data)
}
