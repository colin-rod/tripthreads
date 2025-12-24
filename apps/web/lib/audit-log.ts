/**
 * Audit Logging Utilities
 *
 * Provides functions to create audit logs for sensitive operations.
 * Audit logs support security monitoring, compliance, and incident response.
 *
 * Automatically Logged (via database triggers):
 * - Role changes (participant → viewer → owner)
 * - Participant removals
 * - Trip deletions
 * - Expense deletions
 * - Settlement status changes
 *
 * Manually Logged (via this utility):
 * - Media deletions
 * - Bulk operations
 * - Security events (failed auth, suspicious activity)
 */

import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'role_change'
  | 'status_change'
  | 'access_granted'
  | 'access_denied'

export type AuditResourceType =
  | 'trip'
  | 'expense'
  | 'participant'
  | 'settlement'
  | 'media'
  | 'itinerary_item'
  | 'chat_message'
  | 'invite'
  | 'access_request'

export interface AuditLogEntry {
  tripId?: string
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export interface AuditLogResult {
  id: string
  created_at: string
}

/**
 * Create an audit log entry
 *
 * @param entry - Audit log entry details
 * @returns Audit log ID
 *
 * @example
 * ```typescript
 * await createAuditLog({
 *   tripId: trip.id,
 *   action: 'delete',
 *   resourceType: 'media',
 *   resourceId: photo.id,
 *   details: { filename: photo.filename, size: photo.size }
 * })
 * ```
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<AuditLogResult | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('create_audit_log', {
      p_trip_id: entry.tripId || null,
      p_action: entry.action,
      p_resource_type: entry.resourceType,
      p_resource_id: entry.resourceId || null,
      p_details: entry.details || {},
      p_ip_address: entry.ipAddress || null,
      p_user_agent: entry.userAgent || null,
    })

    if (error) {
      console.error('[Audit Log] Failed to create audit log:', error)
      return null
    }

    return {
      id: data,
      created_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[Audit Log] Unexpected error:', error)
    return null
  }
}

/**
 * Get audit logs for a trip
 *
 * @param tripId - Trip ID
 * @param options - Query options (limit, action filter, resource type filter)
 * @returns Array of audit log entries
 *
 * @example
 * ```typescript
 * const logs = await getAuditLogs(tripId, {
 *   limit: 50,
 *   action: 'delete'
 * })
 * ```
 */
export async function getAuditLogs(
  tripId: string,
  options?: {
    limit?: number
    action?: AuditAction
    resourceType?: AuditResourceType
  }
): Promise<
  Array<{
    id: string
    user_id: string | null
    action: string
    resource_type: string
    resource_id: string | null
    details: Record<string, unknown>
    created_at: string
  }>
> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })

    if (options?.action) {
      query = query.eq('action', options.action)
    }

    if (options?.resourceType) {
      query = query.eq('resource_type', options.resourceType)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Audit Log] Failed to fetch audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[Audit Log] Unexpected error:', error)
    return []
  }
}

/**
 * Get audit logs for a specific user
 *
 * @param userId - User ID
 * @param options - Query options
 * @returns Array of audit log entries
 */
export async function getUserAuditLogs(
  userId: string,
  options?: {
    limit?: number
    action?: AuditAction
  }
): Promise<
  Array<{
    id: string
    trip_id: string | null
    action: string
    resource_type: string
    resource_id: string | null
    details: Record<string, unknown>
    created_at: string
  }>
> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options?.action) {
      query = query.eq('action', options.action)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Audit Log] Failed to fetch user audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('[Audit Log] Unexpected error:', error)
    return []
  }
}

/**
 * Helper to extract IP address from request headers
 *
 * @param headers - Request headers
 * @returns IP address or null
 */
export function getIpAddress(headers: Headers): string | null {
  // Try various headers set by proxies
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Vercel-specific header
  const vercelForwarded = headers.get('x-vercel-forwarded-for')
  if (vercelForwarded) {
    return vercelForwarded.split(',')[0].trim()
  }

  return null
}

/**
 * Helper to extract user agent from request headers
 *
 * @param headers - Request headers
 * @returns User agent string or null
 */
export function getUserAgent(headers: Headers): string | null {
  return headers.get('user-agent')
}

/**
 * Log a media deletion (not covered by triggers)
 *
 * @param tripId - Trip ID
 * @param mediaId - Media file ID
 * @param details - Additional details (filename, size, etc.)
 */
export async function logMediaDeletion(
  tripId: string,
  mediaId: string,
  details: {
    filename: string
    size?: number
    contentType?: string
  }
): Promise<void> {
  await createAuditLog({
    tripId,
    action: 'delete',
    resourceType: 'media',
    resourceId: mediaId,
    details,
  })
}

/**
 * Log an access grant event (viewer → participant)
 *
 * @param tripId - Trip ID
 * @param userId - User being granted access
 * @param details - Additional details
 */
export async function logAccessGrant(
  tripId: string,
  userId: string,
  details: {
    fromRole: string
    toRole: string
    requestedBy?: string
  }
): Promise<void> {
  await createAuditLog({
    tripId,
    action: 'access_granted',
    resourceType: 'participant',
    resourceId: userId,
    details,
  })
}

/**
 * Log an access denial event
 *
 * @param tripId - Trip ID
 * @param userId - User being denied access
 * @param reason - Reason for denial
 */
export async function logAccessDenial(
  tripId: string,
  userId: string,
  reason: string
): Promise<void> {
  await createAuditLog({
    tripId,
    action: 'access_denied',
    resourceType: 'access_request',
    resourceId: userId,
    details: { reason },
  })
}

/**
 * Format audit log for display
 *
 * @param log - Audit log entry
 * @returns Human-readable description
 */
export function formatAuditLog(log: {
  action: string
  resource_type: string
  details: Record<string, unknown>
  created_at: string
}): string {
  const date = new Date(log.created_at).toLocaleString()

  switch (log.action) {
    case 'role_change':
      return `Changed role from ${log.details.old_role} to ${log.details.new_role} on ${date}`

    case 'delete':
      if (log.resource_type === 'participant') {
        return `Removed participant on ${date}`
      }
      if (log.resource_type === 'expense') {
        return `Deleted expense "${log.details.description}" on ${date}`
      }
      if (log.resource_type === 'trip') {
        return `Deleted trip "${log.details.trip_name}" on ${date}`
      }
      return `Deleted ${log.resource_type} on ${date}`

    case 'status_change':
      if (log.resource_type === 'settlement') {
        return `Changed settlement status from ${log.details.old_status} to ${log.details.new_status} on ${date}`
      }
      return `Changed ${log.resource_type} status on ${date}`

    case 'access_granted':
      return `Granted access (${log.details.fromRole} → ${log.details.toRole}) on ${date}`

    case 'access_denied':
      return `Denied access: ${log.details.reason} on ${date}`

    default:
      return `${log.action} on ${log.resource_type} at ${date}`
  }
}
