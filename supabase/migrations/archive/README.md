# Migration Archive

## Phase 1-2 Migrations (Jan-Nov 2025)

**Archived:** 2025-12-01
**Consolidated into:** `20251201000000_baseline_schema.sql`

### Original Migration Count

- 31 forward migrations
- 13 rollback files
- 5 loose SQL fix files
- 44 total files (35 in migrations + 5 in root + 4 additional)

### Why Archived

- Production schema dumped as single baseline migration
- Eliminates historical complexity (RLS recursion fixes, table renames, search_path issues)
- Simplifies local setup for new developers
- Preserves history for reference

### Notable Migrations

- `20250129000001` - Initial schema (profiles/trips/participants)
- `20251112000002` - users → profiles rename (complex 10-step migration)
- `20251128000002` - Notification system implementation
- `20251130000001-3` - RLS recursion + search_path fixes

### Archived Files Location

- **Phase 1-2 Migrations:** `archive/2025-phase1-phase2/` (35 files)
- **Loose SQL Fixes:** `archive/2025-fixes/` (5 files)

### DO NOT apply these individually!

Use consolidated baseline instead. These are for reference only.

## How to Reference Old Migrations

If you need to understand how a feature was implemented:

1. **Check the baseline first:** `../20251201000000_baseline_schema.sql`
2. **Search archived migrations:** Files are named with timestamps `YYYYMMDDHHMMSS_description.sql`
3. **Look at git history:** `git log -- supabase/migrations/archive/`

## Migration History Summary

### Phase 1: Core Foundation (Jan 29-31, 2025)

- Initial schema setup
- RLS policies with date-scoping
- Trip participants and invites
- Partial joiner support
- Access requests

### Phase 2: Features & Fixes (Feb 6-9, 2025)

- Chat messages and reactions
- Enhanced itinerary items
- FX rates and multi-currency
- Media storage bucket
- Subscription fields

### Phase 2 Continued: Profile & Notifications (Nov 11-28, 2025)

- User → profiles table rename
- Notification preferences
- Account deletion support
- Notification logging system
- Edge function triggers

### Recent Fixes (Nov 30, 2025)

- RLS recursion with is_deleted flag
- search_path for SECURITY DEFINER functions
- Notification triggers search_path

## Future Migrations

All new migrations go in `supabase/migrations/` with timestamp format:

```
20251205120000_add_feature.sql
```

See `../README.md` for migration workflow.
