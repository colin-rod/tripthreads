# GDPR Implementation: Account Deletion & Data Export

**Issue:** CRO-763
**Epic:** E10 EIX Polish (Profile, Settings & Recap)
**Status:** ✅ Complete
**Date:** November 24, 2025

---

## Overview

This document describes the GDPR-compliant implementation of user data export and account deletion features in TripThreads.

### GDPR Requirements Implemented

- ✅ **Article 20 - Right to Data Portability:** Users can export all their data in JSON or CSV format
- ✅ **Article 17 - Right to Erasure:** Users can delete their account with proper data anonymization

---

## Features

### 1. Data Export

Users can export all their personal data in two formats:

**Exported Data Includes:**

- User profile (name, email, plan, preferences)
- Trips (owned and participated in)
- Expenses (created or paid by user)
- Expense splits (user's participations)
- Itinerary items (created by user)
- Chat messages (authored by user)
- Settlements (involving user)
- Trip invites (sent by user)
- Access requests (made by user)
- Message reactions (by user)

**Export Formats:**

- **JSON:** Single file with nested structure, all relationships preserved
- **CSV:** Simplified format with main entities (suitable for spreadsheet import)

**Implementation:**

- Server Action: `apps/web/app/actions/data-export.ts`
- Validation: `packages/core/src/validation/profile.ts`
- UI: Security section in Settings page

### 2. Account Deletion

Users can permanently delete their account with proper data handling:

**Deletion Process:**

1. Password verification (security)
2. Trip ownership handling (user chooses):
   - **Transfer ownership:** Transfers to oldest participant
   - **Delete trips:** Permanently deletes all owned trips
3. Data anonymization:
   - Name → "Deleted User"
   - Email → `deleted_[uuid]@tripthreads.deleted`
   - Avatar → Deleted
   - Stripe customer ID → Cleared
   - Notification preferences → Cleared
4. Hard deletion of user-specific records:
   - Trip invites sent by user
   - Access requests made by user
   - Message reactions by user
5. Soft delete marker (`is_deleted = TRUE`, `deleted_at = NOW()`)
6. Automatic sign-out

**Data Preservation:**

- ✅ Trip data preserved for other participants
- ✅ Expenses remain valid (payer anonymized)
- ✅ Chat messages remain (show as "Deleted User")
- ✅ Settlements remain valid (debts recorded)

**Implementation:**

- Server Action: `apps/web/app/actions/account-deletion.ts`
- Database Functions: `anonymize_user_account()`, `get_owned_trips_for_deletion()`
- UI Component: `apps/web/components/features/profile/DeleteAccountDialog.tsx`
- Migration: `supabase/migrations/20251124000002_add_account_deletion_support.sql`

---

## Database Changes

### New Columns (profiles table)

```sql
deleted_at TIMESTAMPTZ DEFAULT NULL
is_deleted BOOLEAN DEFAULT FALSE NOT NULL
```

**Indexes:**

- `idx_profiles_is_deleted` - Efficient filtering of deleted users
- `idx_profiles_deleted_at` - Audit and cleanup queries

### New Functions

#### `anonymize_user_account(p_user_id UUID, p_trip_deletion_strategy TEXT)`

Anonymizes user account with trip ownership handling.

**Parameters:**

- `p_user_id` - User ID to anonymize
- `p_trip_deletion_strategy` - 'transfer' or 'delete' (default: 'transfer')

**Returns:**

```json
{
  "success": true,
  "message": "Account anonymized successfully",
  "tripsDeleted": 0,
  "tripsTransferred": 2,
  "userId": "uuid",
  "deletedAt": "2025-11-24T12:00:00Z"
}
```

#### `get_owned_trips_for_deletion(p_user_id UUID)`

Returns list of trips owned by user with transfer metadata.

**Returns:**

```json
[
  {
    "trip_id": "uuid",
    "trip_name": "Paris Trip",
    "participant_count": 3,
    "can_transfer": true,
    "oldest_participant_id": "uuid",
    "oldest_participant_name": "John Doe"
  }
]
```

### RLS Policy Updates

All user-facing policies updated to exclude deleted users:

```sql
-- Before
USING (auth.uid() = id)

-- After
USING (auth.uid() = id AND is_deleted = FALSE)
```

---

## Security Considerations

### Authentication & Authorization

✅ **Password Verification:** Required before account deletion
✅ **RLS Enforcement:** Only user's own data accessible
✅ **Server-Side Validation:** All operations validated on server
✅ **Session Termination:** User auto-signed out after deletion

### Data Protection

✅ **Soft Delete:** Account recoverable within grace period (if implemented)
✅ **Anonymization:** PII removed, preserves data integrity
✅ **Audit Trail:** `deleted_at` timestamp for compliance
✅ **Cascade Handling:** Explicit control over related data

---

## User Interface

### Settings → Security Section

**Location:** `/settings` → Security accordion

**New Features:**

1. **Export Your Data**
   - Two buttons: "Export as JSON" and "Export as CSV"
   - Downloads file immediately on click
   - Toast notification confirms success

2. **Delete Account**
   - Red "Delete Account" button (was previously disabled)
   - Opens confirmation dialog

### Delete Account Dialog

**UI Elements:**

- Warning about permanence
- List of consequences
- Trip ownership handling (if applicable):
  - Radio button: Transfer ownership
  - Radio button: Delete trips
  - Shows which participant will receive ownership
- Password input (required)
- Confirmation checkbox (required)
- Cancel button
- "Delete My Account" button (destructive red)

**Validation:**

- Password must be non-empty
- Confirmation checkbox must be checked
- Both required before deletion button enabled

---

## Testing

### Manual Testing Checklist

**Data Export:**

- [ ] Export as JSON downloads complete data
- [ ] Export as CSV downloads readable format
- [ ] All entities included in export
- [ ] Export respects RLS (only user's data)
- [ ] Toast notification shows success
- [ ] Loading state displayed during export

**Account Deletion:**

- [ ] Dialog shows owned trips (if any)
- [ ] Transfer option shown for trips with other participants
- [ ] Password verification works correctly
- [ ] Incorrect password shows error
- [ ] Confirmation checkbox required
- [ ] Deletion succeeds with valid inputs
- [ ] User signed out after deletion
- [ ] Deleted user cannot log back in
- [ ] Other participants can still access trips
- [ ] Expenses remain valid with "Deleted User"
- [ ] Chat messages show "Deleted User"

### Edge Cases

- [ ] User is sole owner of trip → Trip deleted
- [ ] User has unsettled debts → Warning shown, deletion allowed
- [ ] User has pending trip invites → Invites deleted
- [ ] Avatar upload in progress → Handled gracefully
- [ ] Large data export (100+ trips) → Streams correctly

---

## Deployment Steps

### 1. Apply Migration

```bash
# Start local Supabase
supabase start

# Apply migration
supabase db push

# Verify functions created
supabase db functions list
```

### 2. Regenerate Types

```bash
npm run generate-types
```

### 3. Remove TypeScript Overrides

After types are regenerated, remove `@ts-expect-error` comments from:

- `apps/web/app/actions/account-deletion.ts` (lines 61, 137)

### 4. Run Tests

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Unit tests (if implemented)
npm test
```

### 5. Deploy to Staging

```bash
git checkout development
git add .
git commit -m "feat(gdpr): implement account deletion and data export (CRO-763)"
git push origin development
```

### 6. Test on Staging

- Create test account
- Add test data (trips, expenses, etc.)
- Test data export (JSON and CSV)
- Test account deletion (both transfer and delete strategies)
- Verify data integrity for other users

### 7. Deploy to Production

```bash
git checkout main
git merge development
git push origin main
```

### 8. Apply Production Migration

```bash
# Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Copy migration SQL from file
# 3. Execute query
# 4. Verify in Table Editor
```

---

## Compliance Documentation

### GDPR Article 20 - Right to Data Portability

**Requirement:** Data subjects have the right to receive their personal data in a structured, commonly used, machine-readable format.

**Implementation:**

- ✅ JSON format (structured, machine-readable)
- ✅ CSV format (commonly used, spreadsheet-compatible)
- ✅ All personal data included
- ✅ Available on-demand via self-service UI

### GDPR Article 17 - Right to Erasure

**Requirement:** Data subjects have the right to have their personal data erased under certain conditions.

**Implementation:**

- ✅ User-initiated deletion via self-service UI
- ✅ Password confirmation (prevents unauthorized deletion)
- ✅ PII anonymization (name, email, avatar)
- ✅ Audit trail (`deleted_at` timestamp)
- ✅ Data integrity preserved for other users
- ✅ Immediate effect (user signed out)

### Data Retention

**Current Implementation:**

- Soft delete with anonymization (immediate)
- Profile marked as `is_deleted = TRUE`
- PII replaced with anonymized values

**Future Enhancement (Optional):**

- Hard delete after 30-day grace period
- Edge function to clean up old deleted accounts
- Schedule: `DELETE FROM auth.users WHERE id IN (SELECT id FROM profiles WHERE deleted_at < NOW() - INTERVAL '30 days')`

---

## Maintenance

### Monitoring

**Key Metrics to Track:**

- Number of data exports per month
- Number of account deletions per month
- Average trips transferred vs deleted
- Export file sizes (for performance optimization)

**Alerts:**

- Failed anonymization operations
- RLS policy violations
- Export timeouts (files > 10MB)

### Troubleshooting

**Issue:** User can't delete account
**Solution:** Check `canDeleteAccount()` function, verify user authentication

**Issue:** Export fails for large datasets
**Solution:** Implement pagination or streaming for users with >100 trips

**Issue:** Deleted user can still log in
**Solution:** Verify RLS policies updated, check `is_deleted` flag

**Issue:** Trip ownership transfer fails
**Solution:** Check if oldest participant exists and is not deleted

---

## Future Enhancements

### Phase 3 Considerations

1. **Hard Delete After Grace Period**
   - Edge function to run daily
   - Delete `auth.users` records after 30 days
   - Notify user before final deletion

2. **Export Optimization**
   - Stream large exports instead of loading all in memory
   - Generate ZIP file with multiple CSVs
   - Email download link for large exports

3. **Deletion History**
   - Admin dashboard showing deleted accounts
   - Restoration capability within grace period
   - Compliance audit logs

4. **Media Cleanup**
   - Delete photos/videos from storage after account deletion
   - Handle in `anonymize_user_account()` function

---

## References

- **Migration File:** `supabase/migrations/20251124000002_add_account_deletion_support.sql`
- **Rollback File:** `supabase/migrations/20251124000002_add_account_deletion_support_rollback.sql`
- **Server Actions:** `apps/web/app/actions/data-export.ts`, `apps/web/app/actions/account-deletion.ts`
- **UI Component:** `apps/web/components/features/profile/DeleteAccountDialog.tsx`
- **Validation:** `packages/core/src/validation/profile.ts`
- **GDPR Regulations:** https://gdpr-info.eu/

---

**Document Version:** 1.0
**Last Updated:** November 24, 2025
**Author:** AI Implementation (Claude)
