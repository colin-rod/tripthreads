import { z } from 'zod'

/**
 * Validation schemas for trip invitations
 */

// Role enum validation
export const inviteRoleSchema = z.enum(['participant', 'viewer'], {
  message: 'Role must be either participant or viewer',
})

// Email validation with proper regex
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(3, 'Email must be at least 3 characters')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim()

// Token validation (32-character hex string)
export const inviteTokenSchema = z
  .string()
  .length(32, 'Invalid invite token')
  .regex(/^[a-f0-9]{32}$/, 'Invalid invite token format')

/**
 * Schema for creating a shareable link invite
 */
export const createInviteLinkSchema = z.object({
  trip_id: z.string().uuid('Invalid trip ID'),
  role: inviteRoleSchema,
})

/**
 * Schema for creating an email invite
 */
export const createEmailInviteSchema = z.object({
  trip_id: z.string().uuid('Invalid trip ID'),
  email: emailSchema,
  role: inviteRoleSchema,
})

/**
 * Schema for batch email invites (comma or newline separated)
 */
export const createBatchEmailInvitesSchema = z.object({
  trip_id: z.string().uuid('Invalid trip ID'),
  emails: z
    .string()
    .min(1, 'At least one email address is required')
    .transform(str => {
      // Split by comma or newline, trim whitespace
      return str
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0)
    })
    .pipe(
      z
        .array(emailSchema)
        .min(1, 'At least one valid email is required')
        .max(50, 'Maximum 50 emails per batch')
    ),
  role: inviteRoleSchema,
})

/**
 * Schema for accepting an invite
 */
export const acceptInviteSchema = z.object({
  token: inviteTokenSchema,
})

/**
 * Schema for revoking an invite
 */
export const revokeInviteSchema = z.object({
  invite_id: z.string().uuid('Invalid invite ID'),
})

/**
 * Schema for resending an email invite
 */
export const resendInviteSchema = z.object({
  invite_id: z.string().uuid('Invalid invite ID'),
})

// Infer TypeScript types from schemas
export type CreateInviteLinkInput = z.infer<typeof createInviteLinkSchema>
export type CreateEmailInviteInput = z.infer<typeof createEmailInviteSchema>
export type CreateBatchEmailInvitesInput = z.infer<typeof createBatchEmailInvitesSchema>
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>
export type RevokeInviteInput = z.infer<typeof revokeInviteSchema>
export type ResendInviteInput = z.infer<typeof resendInviteSchema>

/**
 * Validation functions
 */

export function validateCreateInviteLink(data: unknown) {
  return createInviteLinkSchema.safeParse(data)
}

export function validateCreateEmailInvite(data: unknown) {
  return createEmailInviteSchema.safeParse(data)
}

export function validateCreateBatchEmailInvites(data: unknown) {
  return createBatchEmailInvitesSchema.safeParse(data)
}

export function validateAcceptInvite(data: unknown) {
  return acceptInviteSchema.safeParse(data)
}

export function validateRevokeInvite(data: unknown) {
  return revokeInviteSchema.safeParse(data)
}

export function validateResendInvite(data: unknown) {
  return resendInviteSchema.safeParse(data)
}
