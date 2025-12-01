/**
 * Tests for profile validation schemas
 */

import { describe, it, expect } from '@jest/globals'
import {
  completeProfileSchema,
  updateProfileSchema,
  changePasswordSchema,
  validateCompleteProfile,
  validateUpdateProfile,
  validateChangePassword,
} from '@tripthreads/core/validation/profile'

describe('Profile Validation', () => {
  describe('completeProfileSchema', () => {
    it('should validate a valid profile completion', () => {
      const data = {
        full_name: 'John Doe',
        notification_preferences: {
          email_trip_invites: true,
          email_expense_updates: true,
          email_trip_updates: true,
          push_trip_invites: true,
          push_expense_updates: true,
          push_trip_updates: true,
        },
      }

      const result = completeProfileSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject names shorter than 2 characters', () => {
      const data = {
        full_name: 'A',
      }

      const result = completeProfileSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 2 characters')
      }
    })

    it('should reject names longer than 50 characters', () => {
      const data = {
        full_name: 'A'.repeat(51),
      }

      const result = completeProfileSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('less than 50 characters')
      }
    })

    it('should reject names with invalid characters', () => {
      const data = {
        full_name: 'John@Doe',
      }

      const result = completeProfileSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('letters, numbers, spaces')
      }
    })

    it('should accept names with hyphens and apostrophes', () => {
      const data = {
        full_name: "Mary-Jane O'Brien",
      }

      const result = completeProfileSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should trim whitespace from names', () => {
      const data = {
        full_name: '  John Doe  ',
      }

      const result = completeProfileSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.full_name).toBe('John Doe')
      }
    })
  })

  describe('changePasswordSchema', () => {
    it('should validate a valid password change', () => {
      const data = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
        confirmPassword: 'newPassword456',
      }

      const result = changePasswordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject if current password is missing', () => {
      const data = {
        currentPassword: '',
        newPassword: 'newPassword456',
        confirmPassword: 'newPassword456',
      }

      const result = changePasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Current password is required')
      }
    })

    it('should reject passwords shorter than 8 characters', () => {
      const data = {
        currentPassword: 'oldPass',
        newPassword: 'short1',
        confirmPassword: 'short1',
      }

      const result = changePasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some((issue: { message: string }) =>
            issue.message.includes('at least 8 characters')
          )
        ).toBe(true)
      }
    })

    it('should reject passwords without letters', () => {
      const data = {
        currentPassword: 'oldPassword123',
        newPassword: '12345678',
        confirmPassword: '12345678',
      }

      const result = changePasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some((issue: { message: string }) =>
            issue.message.includes('at least one letter')
          )
        ).toBe(true)
      }
    })

    it('should reject passwords without numbers', () => {
      const data = {
        currentPassword: 'oldPassword123',
        newPassword: 'abcdefgh',
        confirmPassword: 'abcdefgh',
      }

      const result = changePasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some((issue: { message: string }) =>
            issue.message.includes('at least one number')
          )
        ).toBe(true)
      }
    })

    it('should reject if passwords do not match', () => {
      const data = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword456',
        confirmPassword: 'differentPassword789',
      }

      const result = changePasswordSchema.safeParse(data)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some((issue: { message: string }) =>
            issue.message.includes('do not match')
          )
        ).toBe(true)
      }
    })

    it('should accept passwords with letters, numbers, and special characters', () => {
      const data = {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword456@',
        confirmPassword: 'newPassword456@',
      }

      const result = changePasswordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('updateProfileSchema', () => {
    it('should allow partial updates', () => {
      const data = {
        full_name: 'John Doe',
      }

      const result = updateProfileSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty object (no updates)', () => {
      const data = {}

      const result = updateProfileSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('validation helper functions', () => {
    it('validateCompleteProfile should work correctly', () => {
      const result = validateCompleteProfile({
        full_name: 'John Doe',
      })

      expect(result.success).toBe(true)
    })

    it('validateUpdateProfile should work correctly', () => {
      const result = validateUpdateProfile({
        full_name: 'Jane Smith',
      })

      expect(result.success).toBe(true)
    })

    it('validateChangePassword should work correctly', () => {
      const result = validateChangePassword({
        currentPassword: 'oldPass123',
        newPassword: 'newPass456',
        confirmPassword: 'newPass456',
      })

      expect(result.success).toBe(true)
    })
  })
})
