# TripThreads Architecture

**Last Updated:** November 2025
**Version:** 2.0 (Post-Monorepo Refactoring)

---

## Table of Contents

1. [Overview](#overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Package Architecture](#package-architecture)
4. [Data Flow](#data-flow)
5. [Platform-Specific Implementations](#platform-specific-implementations)
6. [Dependency Graph](#dependency-graph)
7. [Design Principles](#design-principles)

---

## Overview

TripThreads is a cross-platform trip planning application built as a **monorepo** with clear separation between:

- **Platform-agnostic business logic** (`packages/core`)
- **Platform-specific utilities** (`packages/web`, `packages/mobile`)
- **Platform-specific applications** (`apps/web`, `apps/mobile`)

This architecture enables:

- ✅ **Code reuse** across web and mobile
- ✅ **Type safety** with shared TypeScript types
- ✅ **Clear boundaries** between platform-agnostic and platform-specific code
- ✅ **Independent deployment** of web and mobile apps

---

## Monorepo Structure

```
tripthreads/
├── apps/
│   ├── web/                    # Next.js web application
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # React components (web-specific)
│   │   ├── lib/                # Web-specific utilities
│   │   │   ├── supabase/       # Supabase client (SSR, browser)
│   │   │   ├── auth/           # Auth context (web)
│   │   │   ├── tour/           # Product tour (web-only)
│   │   │   └── onboarding/     # Onboarding flow (web-only)
│   │   └── package.json
│   │
│   └── mobile/                 # Expo/React Native application
│       ├── app/                # Expo Router pages
│       ├── components/         # React Native components
│       ├── lib/                # Mobile-specific utilities
│       │   ├── supabase/       # Supabase client (Expo)
│       │   ├── auth/           # Auth context (mobile)
│       │   └── linking/        # Deep linking
│       └── package.json
│
├── packages/
│   ├── core/                   # 🎯 Platform-agnostic core
│   │   ├── src/
│   │   │   ├── types/          # Shared TypeScript types
│   │   │   │   ├── database.ts # Supabase-generated types
│   │   │   │   ├── parser.ts   # NL parser types
│   │   │   │   └── invite.ts   # Invite domain types
│   │   │   │
│   │   │   ├── utils/          # Pure utility functions
│   │   │   │   ├── currency.ts # Currency formatting/conversion
│   │   │   │   └── cn.ts       # Tailwind class merging
│   │   │   │
│   │   │   ├── validation/     # Zod validation schemas
│   │   │   │   ├── trip.ts
│   │   │   │   ├── invite.ts
│   │   │   │   └── profile.ts
│   │   │   │
│   │   │   ├── queries/        # Supabase CRUD operations
│   │   │   │   ├── trips.ts
│   │   │   │   ├── users.ts
│   │   │   │   └── invites.ts
│   │   │   │
│   │   │   ├── permissions/    # Role-based access control
│   │   │   │   └── role-checks.ts
│   │   │   │
│   │   │   ├── parser/         # Natural language parser
│   │   │   │   ├── llm-prompts.ts
│   │   │   │   ├── tokenizer.ts
│   │   │   │   ├── date.ts
│   │   │   │   └── expense.ts
│   │   │   │
│   │   │   └── index.ts        # Public API exports
│   │   │
│   │   └── package.json
│   │
│   ├── web/                    # 🌐 Web-specific utilities
│   │   ├── src/
│   │   │   ├── utils/
│   │   │   │   └── avatar.ts   # Browser image compression
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared/                 # ⚠️ DEPRECATED (legacy package)
│       └── ...                 # Use @tripthreads/core instead
│
├── supabase/                   # Supabase configuration
│   ├── migrations/             # SQL migrations
│   ├── functions/              # Edge Functions
│   └── config.toml
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # This file
│   ├── ANALYTICS_EVENTS.md     # Event tracking catalog
│   ├── AUTH_SETUP.md           # Supabase auth configuration
│   ├── E2E_TESTING.md          # Playwright / Expo test plan
│   ├── GITHUB_SECRETS_SETUP.md # GitHub Actions secret management
│   ├── MOBILE_DEEP_LINKING.md  # Deep linking architecture
│   ├── MOBILE_DEEP_LINKING_INDEX.md
│   ├── MOBILE_DEEP_LINKING_QUICKSTART.md
│   ├── RLS_DATE_SCOPING.md     # Row-level security date filtering
│   ├── RLS_TESTING.md          # RLS validation checklist
│   ├── SCOPE_CRO-690.md        # Linear epic hand-off
│   ├── SCOPE_LOCAL_CACHE.md    # Supersedes the retired OFFLINE_SYNC.md
│   ├── SUPABASE_EMAIL_SETUP.md # Magic link + SMTP configuration
│   ├── SUPABASE_TYPES_GENERATION.md
│   └── wireframes/             # UX wireframes
│
├── package.json                # Root package.json (workspaces)
├── turbo.json                  # Turborepo configuration
└── tsconfig.json               # Root TypeScript config
```

**Documentation Notes:**

- `SCOPE_LOCAL_CACHE.md` is the active planning doc for offline support and replaces the legacy `OFFLINE_SYNC.md` guide.
- Natural language parser docs now live at [`../AI_PARSER_INTEGRATION.md`](../AI_PARSER_INTEGRATION.md) and [`../NLP_CLEANUP_SUMMARY.md`](../NLP_CLEANUP_SUMMARY.md); the old `NL_PARSER.md` file has been retired.
- The legacy `PRD.md` has been archived; use [`../IMPLEMENTATION_SUMMARY.md`](../IMPLEMENTATION_SUMMARY.md) for the current product overview.

---

## Package Architecture

### 📦 `packages/core` - Platform-Agnostic Core

**Purpose:** Contains all business logic, data access, validation, and utilities that work identically on web and mobile.

**Key Characteristics:**

- ✅ **No platform dependencies** (no DOM, no React Native APIs)
- ✅ **Pure functions and types**
- ✅ **Framework-agnostic** (can be used with any React framework)
- ✅ **Fully tested** (unit tests for all logic)

**What's Inside:**

```typescript
// Types
export type { Database, Trip, User } from './types/database'
export type { InviteWithDetails, TripInvite } from './types/invite'

// Utils
export { formatCurrency, cn } from './utils'

// Validation (Zod schemas)
export { createTripSchema, acceptInviteSchema } from './validation'

// Queries (Supabase CRUD)
export { getTrips, createTrip, acceptInvite } from './queries'

// Permissions
export { canEditTrip, isOwner, canViewExpenses } from './permissions'

// Parser
export { parseExpenseInput, parseDateInput } from './parser'
```

**Dependencies:**

- `@supabase/supabase-js` - For TypeScript types only
- `zod` - Schema validation
- `date-fns` - Date utilities
- `clsx`, `tailwind-merge` - CSS class utilities

**Usage:**

```typescript
// In apps/web or apps/mobile
import { createTripSchema, canEditTrip, formatCurrency } from '@tripthreads/core'
```

---

### 🌐 `packages/web` - Web-Specific Utilities

**Purpose:** Browser-only utilities that depend on Web APIs (DOM, FileReader, Canvas, etc.)

**Key Characteristics:**

- ❌ **Cannot be used in React Native** (uses browser APIs)
- ✅ **Reusable across web projects**
- ✅ **Depends on `@tripthreads/core`**

**What's Inside:**

```typescript
// Avatar utilities (browser-specific)
export { compressAvatar, generateAvatarPath, validateAvatarFile } from './utils/avatar'
```

**Dependencies:**

- `@tripthreads/core` - Core business logic
- Browser APIs: `FileReader`, `Canvas`, `Image`, `Blob`

**Usage:**

```typescript
// In apps/web only
import { compressAvatar } from '@tripthreads/web'
```

---

### 📱 `packages/mobile` - Mobile-Specific Utilities (Future)

**Purpose:** React Native-only utilities (not yet created, but planned)

**Potential Contents:**

- Native image compression (using `react-native-image-picker`)
- Deep link parsing utilities
- Platform-specific storage abstractions

---

### ⚠️ `packages/shared` - DEPRECATED

**Status:** Legacy package, being phased out.

**Migration:**

- All code has been moved to `@tripthreads/core` or `@tripthreads/web`
- **Do not add new code to this package**
- Existing imports are being migrated to `@tripthreads/core`

---

## Data Flow

### Authentication Flow

```
┌─────────────────────┐
│  User Login (Web)   │
│   apps/web/app      │
└──────────┬──────────┘
           │
           ├─> lib/auth/auth-context.tsx (web-specific)
           │
           ├─> lib/supabase/client.ts (browser client)
           │
           └─> Supabase Auth
                  │
                  └─> Success: Redirect to /trips
```

```
┌─────────────────────┐
│ User Login (Mobile) │
│  apps/mobile/app    │
└──────────┬──────────┘
           │
           ├─> lib/auth/auth-context.tsx (mobile-specific)
           │
           ├─> lib/supabase/client.ts (Expo client with SecureStore)
           │
           └─> Supabase Auth
                  │
                  └─> Success: Navigate to /(app)/trips
```

### Trip Creation Flow

```
┌─────────────────────────────────┐
│  CreateTripDialog (Web/Mobile)  │
└────────────┬────────────────────┘
             │
             ├─> Validate input with @tripthreads/core
             │   - createTripSchema.parse(data)
             │
             ├─> Call query function from @tripthreads/core
             │   - createTrip(supabase, data)
             │
             └─> Supabase
                   │
                   ├─> Insert into trips table
                   ├─> Insert into trip_participants table
                   └─> Return trip data
```

### Invite Acceptance Flow

```
┌─────────────────────────────────┐
│  /invite/[token] (Web/Mobile)   │
└────────────┬────────────────────┘
             │
             ├─> Fetch invite details from @tripthreads/core
             │   - getInviteWithDetails(supabase, token)
             │
             ├─> Validate token with @tripthreads/core
             │   - acceptInviteSchema.parse({ token })
             │
             ├─> Accept invite from @tripthreads/core
             │   - acceptInvite(supabase, token)
             │
             └─> Supabase
                   │
                   ├─> Update trip_invites (status = 'accepted')
                   ├─> Insert into trip_participants
                   └─> Return success
```

---

## Platform-Specific Implementations

### Supabase Client

**Web (`apps/web/lib/supabase/client.ts`):**

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@tripthreads/core'

export const supabase = createBrowserClient<Database>(url, key)
// Uses localStorage for session storage
```

**Mobile (`apps/mobile/lib/supabase/client.ts`):**

```typescript
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import type { Database } from '@tripthreads/core'

export const supabase = createClient<Database>(url, key, {
  auth: { storage: ExpoSecureStoreAdapter },
})
// Uses Expo SecureStore for session storage
```

### Auth Context

Both web and mobile have their own `lib/auth/auth-context.tsx` because:

- **Web:** Uses Next.js-specific redirect after OAuth
- **Mobile:** Uses Expo deep linking for OAuth callback

But both use **shared query functions** from `@tripthreads/core`.

### Avatar Upload

**Web (`apps/web`):**

```typescript
import { compressAvatar, generateAvatarPath } from '@tripthreads/web'
import { uploadAvatar } from '@tripthreads/core'

const handleUpload = async (file: File) => {
  const compressed = await compressAvatar(file) // Browser-specific
  const path = generateAvatarPath(userId)
  await uploadAvatar(supabase, compressed, path)
}
```

**Mobile (`apps/mobile`):**

```typescript
// TODO: Implement mobile-specific image compression
// using react-native-image-picker or expo-image-picker
```

---

## Dependency Graph

```
apps/web
   ├─> @tripthreads/core
   └─> @tripthreads/web
         └─> @tripthreads/core

apps/mobile
   └─> @tripthreads/core

packages/core
   ├─> @supabase/supabase-js (types only)
   ├─> zod
   ├─> date-fns
   └─> clsx, tailwind-merge

packages/web
   └─> @tripthreads/core
```

**Key Points:**

- ✅ **`core` has no platform dependencies**
- ✅ **`web` depends on `core`** (not the other way around)
- ✅ **Mobile and web never depend on each other**
- ✅ **Supabase client is passed as parameter** to query functions

---

## Design Principles

### 1. **Platform-Agnostic Core**

All business logic lives in `@tripthreads/core` and works identically on web and mobile.

**Example:**

```typescript
// ✅ GOOD - Platform-agnostic
export function canEditTrip(user: User, trip: Trip): boolean {
  return user.id === trip.owner_id
}

// ❌ BAD - Platform-specific
export function canEditTrip(user: User, trip: Trip): boolean {
  if (window.innerWidth < 768) return false // Browser-specific!
  return user.id === trip.owner_id
}
```

### 2. **Dependency Injection**

Supabase client is passed as a parameter, not imported directly.

**Example:**

```typescript
// ✅ GOOD - Client passed as parameter
export async function getTrips(supabase: SupabaseClient<Database>): Promise<Trip[]> {
  const { data } = await supabase.from('trips').select('*')
  return data
}

// ❌ BAD - Direct import
import { supabase } from '../supabase/client' // Which client? Web or mobile?
export async function getTrips(): Promise<Trip[]> {
  const { data } = await supabase.from('trips').select('*')
  return data
}
```

### 3. **Type Safety**

All types are generated from Supabase schema and exported from `@tripthreads/core`.

**Example:**

```typescript
// ✅ GOOD - Types from core
import type { Trip, User } from '@tripthreads/core'

// ❌ BAD - Duplicate type definitions
type Trip = {
  id: string
  name: string
  // ...
}
```

### 4. **Validation at Boundaries**

Use Zod schemas to validate data at application boundaries (forms, API inputs).

**Example:**

```typescript
import { createTripSchema } from '@tripthreads/core'

const handleSubmit = (data: unknown) => {
  const result = createTripSchema.safeParse(data)
  if (!result.success) {
    // Handle validation errors
    return
  }
  // result.data is now typed and validated
  await createTrip(supabase, result.data)
}
```

### 5. **Clear Package Boundaries**

- `core`: No platform dependencies
- `web`: Browser-only (DOM, Canvas, FileReader)
- `mobile`: React Native-only (Expo APIs, native modules)
- `apps/web`: Next.js-specific
- `apps/mobile`: Expo-specific

**Migration Rule:**

- If it works on **both** web and mobile → `@tripthreads/core`
- If it uses **browser APIs** → `@tripthreads/web`
- If it uses **React Native APIs** → `@tripthreads/mobile`
- If it uses **Next.js APIs** → `apps/web/lib`
- If it uses **Expo APIs** → `apps/mobile/lib`

---

## Migration Notes

### From `@tripthreads/shared` to `@tripthreads/core`

**Before:**

```typescript
import { formatCurrency } from '@tripthreads/shared'
import { cn } from '@/lib/utils'
import { canEditTrip } from '@/lib/permissions/role-checks'
```

**After:**

```typescript
import { formatCurrency, cn, canEditTrip } from '@tripthreads/core'
```

### Avatar Upload Refactoring

**Before:**

```typescript
// packages/shared/lib/utils/avatar.ts (mixed concerns)
export async function compressAvatar(file: File) { ... }
export async function uploadAvatar(supabase, file, userId) {
  const compressed = await compressAvatar(file) // Browser-specific!
  // ...
}
```

**After:**

```typescript
// packages/web/src/utils/avatar.ts (browser-specific)
export async function compressAvatar(file: File) { ... }

// packages/core/src/queries/users.ts (platform-agnostic)
export async function uploadAvatar(
  supabase: SupabaseClient,
  blob: Blob,
  path: string
) {
  // Platform-agnostic upload logic
  await supabase.storage.from('avatars').upload(path, blob)
}
```

---

## Future Enhancements

### Planned Improvements

1. **Create `packages/mobile`** for React Native-specific utilities
2. **Extract UI components** to `packages/ui` (if using universal components like Tamagui)
3. **Add E2E tests** for cross-platform flows
4. **Implement offline sync** in `@tripthreads/core`
5. **Add performance monitoring** for core functions

---

## References

- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)
- [Auth Setup Guide](./AUTH_SETUP.md)
- [Mobile Deep Linking Overview](./MOBILE_DEEP_LINKING.md)
- [Local Cache Scope (Offline Sync successor)](./SCOPE_LOCAL_CACHE.md)
- [AI Parser Integration Notes](../AI_PARSER_INTEGRATION.md)
- [Deployment Guide](../DEPLOYMENT.md)

---

**Maintained by:** Colin Rodrigues
**Last Review:** November 2025
