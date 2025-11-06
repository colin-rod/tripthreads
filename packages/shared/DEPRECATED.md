# ⚠️ DEPRECATED: @tripthreads/shared

**Status:** This package is deprecated and will be removed in a future version.

**Date Deprecated:** November 2025

---

## Migration Path

All code from `@tripthreads/shared` has been migrated to better-organized packages:

### ➡️ Use `@tripthreads/core` instead

**For platform-agnostic code:**

```typescript
// ❌ OLD (deprecated)
import { formatCurrency } from '@tripthreads/shared'
import { createTripSchema } from '@tripthreads/shared/lib/validation/trip'
import { getTrips } from '@tripthreads/shared/lib/supabase/queries/trips'

// ✅ NEW (recommended)
import { formatCurrency, createTripSchema, getTrips } from '@tripthreads/core'
```

### ➡️ Use `@tripthreads/web` instead

**For browser-specific code:**

```typescript
// ❌ OLD (deprecated)
import { compressAvatar } from '@tripthreads/shared/lib/utils/avatar'

// ✅ NEW (recommended)
import { compressAvatar } from '@tripthreads/web'
```

---

## What Was Moved

### To `@tripthreads/core`

**Types:**

- `types/database.ts` - Supabase types
- `types/parser.ts` - NL parser types
- `types/invite.ts` - Invite domain types

**Utils:**

- `src/utils/currency.ts` - Currency formatting and conversion
- `utils/cn.ts` (from apps/web) - Tailwind class merging

**Validation:**

- `lib/validation/trip.ts` - Zod trip schemas
- `lib/validation/invite.ts` - Zod invite schemas
- `lib/validation/profile.ts` - Zod profile schemas

**Queries:**

- `lib/supabase/queries/trips.ts` - Trip CRUD operations
- `lib/supabase/queries/users.ts` - User profile operations
- `lib/supabase/queries/invites.ts` - Invite operations

**Parser:**

- `src/parser/llm-prompts.ts` - GPT prompts for NL parsing
- `src/parser/tokenizer.ts` - Text tokenization
- `src/parser/date.ts` - Date extraction
- `src/parser/expense.ts` - Expense parsing

**Permissions:**

- `lib/permissions/role-checks.ts` (from apps/web) - Role-based access control

### To `@tripthreads/web`

**Browser-specific utilities:**

- `lib/utils/avatar.ts` - Image compression (uses Canvas API)

---

## Why Was This Package Deprecated?

The `@tripthreads/shared` package mixed platform-agnostic and platform-specific code, which caused issues:

1. **❌ Browser code in shared packages** - Mobile apps pulled in DOM dependencies unnecessarily
2. **❌ Unclear boundaries** - Hard to tell what was platform-specific
3. **❌ Maintenance burden** - Scattered imports across codebase
4. **❌ Duplicate code** - Utilities like `cn` existed in multiple places

The new structure (`packages/core` + `packages/web`) provides:

1. **✅ Clear separation** - Core logic vs platform-specific
2. **✅ Better tree-shaking** - Only import what you need
3. **✅ Type safety** - All types from one source
4. **✅ Maintainability** - Clear package boundaries

---

## Timeline for Removal

- **November 2025:** Package deprecated, all imports migrated
- **December 2025:** Remove package from workspace
- **Q1 2026:** Final cleanup

---

## Need Help?

See the [Architecture Documentation](../../docs/ARCHITECTURE.md) for the new package structure.

For questions, check:

- [Migration Guide](../../docs/ARCHITECTURE.md#migration-notes)
- [Dependency Graph](../../docs/ARCHITECTURE.md#dependency-graph)
