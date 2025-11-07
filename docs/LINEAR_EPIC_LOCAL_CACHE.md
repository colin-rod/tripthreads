# Linear Epic: Local Cache for Trips & Itinerary

**Epic Title:** Offline-First Local Cache (IndexedDB/SQLite)

**Epic Description:**
Implement local cache infrastructure to enable offline-first data access for trips and itinerary items. Users should be able to view their trips and itineraries without an internet connection, with seamless reconciliation when they reconnect.

**Goals:**
- Cache-first reads (UI hydrates instantly from local cache)
- Background sync (server data refreshes cache when online)
- Graceful offline (no crashes when disconnected)
- Fresh data wins (server data always replaces stale cache)
- MVP scope: Read-only offline support (write queuing is future work)

**Status:** Backlog (Phase 2-3)
**Priority:** P1 (High)
**Estimate:** 13-21 story points total
**Timeline:** 13-20 days
**Labels:** `offline`, `cache`, `phase-2`, `infrastructure`

**Related Documents:**
- Scope: `docs/SCOPE_LOCAL_CACHE.md`
- Architecture: `docs/OFFLINE_SYNC.md` (to be created)

---

## Issues Breakdown

### Phase 1: Foundation (5 issues, 5-8 SP)

#### Issue 1.1: Set up IndexedDB cache infrastructure (Web)

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `web`, `offline`, `infrastructure`

**Description:**
Set up Dexie.js for IndexedDB management on the web app. Define cache database schema for trips, trip_participants, itinerary_items, and sync_metadata.

**Tasks:**
- [ ] Install Dexie.js (`npm install dexie@^4.0.0 dexie-react-hooks@^1.1.7`)
- [ ] Create `apps/web/lib/offline/db.ts` with Dexie database class
- [ ] Define object stores: `trips`, `trip_participants`, `itinerary_items`, `sync_metadata`
- [ ] Add indexes: `trips.user_id`, `trip_participants.trip_id`, `itinerary_items.trip_id`, `*.last_synced`
- [ ] Initialize database on app load
- [ ] Add database version migration strategy

**Acceptance Criteria:**
- [ ] Dexie database initializes without errors on app load
- [ ] All 4 object stores created with correct schema
- [ ] Indexes created for efficient queries
- [ ] Database can be opened in Chrome DevTools > Application > IndexedDB
- [ ] Unit tests for database initialization pass

**Technical Notes:**
```typescript
// Example schema
interface CachedTrip {
  id: string // Primary key
  data: Trip // Full trip object
  user_id: string // Indexed
  last_synced: number // Timestamp
  version: number
}
```

---

#### Issue 1.2: Set up SQLite cache infrastructure (Mobile)

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `mobile`, `offline`, `infrastructure`

**Description:**
Set up expo-sqlite for local data storage on mobile. Define cache database schema matching the web implementation.

**Tasks:**
- [ ] Install expo-sqlite (`npx expo install expo-sqlite@~13.0.0`)
- [ ] Create `apps/mobile/lib/offline/db.ts` with SQLite initialization
- [ ] Create tables: `cached_trips`, `cached_trip_participants`, `cached_itinerary_items`, `sync_metadata`
- [ ] Add indexes matching web implementation
- [ ] Initialize database on app load
- [ ] Add migration strategy for schema updates

**Acceptance Criteria:**
- [ ] SQLite database initializes on app launch (iOS + Android)
- [ ] All 4 tables created with correct schema
- [ ] Indexes created for efficient queries
- [ ] Database persists across app restarts
- [ ] Unit tests for database initialization pass

**Dependencies:**
- None (parallel with 1.1)

---

#### Issue 1.3: Create cache service layer (Shared)

**Priority:** P1
**Estimate:** 3 SP
**Labels:** `shared`, `offline`, `infrastructure`

**Description:**
Create a platform-agnostic cache service layer with CRUD operations for trips, participants, and itinerary items. This service will be used by both web and mobile apps.

**Tasks:**
- [ ] Create `packages/shared/lib/cache/types.ts` with shared cache interfaces
- [ ] Create `apps/web/lib/cache/service.ts` for web (uses Dexie)
- [ ] Create `apps/mobile/lib/cache/service.ts` for mobile (uses SQLite)
- [ ] Implement: `writeTrip()`, `readTrip()`, `getUserTrips()`, `deleteTrip()`
- [ ] Implement: `writeItineraryItems()`, `readItineraryItems()`
- [ ] Implement: `clearCache()`, `getCacheStats()`
- [ ] Add user_id filtering for RLS compliance

**Acceptance Criteria:**
- [ ] All CRUD operations work for trips and itinerary items
- [ ] Cache reads filter by user_id (security requirement)
- [ ] Cache writes include last_synced timestamp
- [ ] Unit tests: 80%+ coverage on cache service
- [ ] Test: writeTrip() → readTrip() returns same data
- [ ] Test: getUserTrips() filters by user_id correctly

**Technical Notes:**
```typescript
// Shared interface
interface CacheService {
  writeTrip(trip: Trip): Promise<void>
  readTrip(tripId: string): Promise<CachedTrip | null>
  getUserTrips(userId: string): Promise<CachedTrip[]>
  clearCache(): Promise<void>
}
```

---

#### Issue 1.4: Add network status detection

**Priority:** P1
**Estimate:** 1 SP
**Labels:** `web`, `mobile`, `offline`

**Description:**
Implement network status detection to know when the app is online/offline. This will control when to fetch from server vs. cache.

**Tasks:**
- [ ] Create `apps/web/lib/offline/network.ts` using `navigator.onLine`
- [ ] Create `apps/mobile/lib/offline/network.ts` using `@react-native-community/netinfo`
- [ ] Implement `useNetworkStatus()` React hook
- [ ] Listen for online/offline events
- [ ] Trigger sync when going back online

**Acceptance Criteria:**
- [ ] `useNetworkStatus()` hook returns `{ isOnline: boolean }`
- [ ] Hook updates when network status changes
- [ ] Component tests: renders correctly when online/offline
- [ ] Mobile: Install NetInfo dependency if needed
- [ ] Test: Mock online/offline transitions work

**Technical Notes:**
```typescript
// Hook API
const { isOnline } = useNetworkStatus()

// Listen for transitions
useEffect(() => {
  if (isOnline) {
    // Trigger background sync
  }
}, [isOnline])
```

---

#### Issue 1.5: Add cache utilities and helpers

**Priority:** P1
**Estimate:** 1 SP
**Labels:** `shared`, `offline`

**Description:**
Create utility functions for cache staleness checks, TTL management, and data serialization.

**Tasks:**
- [ ] Create `apps/web/lib/cache/utils.ts`
- [ ] Implement `isStale(lastSynced: number, ttl: number): boolean`
- [ ] Implement `getCacheTTL(queryType: string): number`
- [ ] Add constants for TTL values (default: 5 minutes)
- [ ] Add `serializeTrip()` / `deserializeTrip()` if needed

**Acceptance Criteria:**
- [ ] `isStale()` correctly identifies stale data
- [ ] TTL configurable per query type
- [ ] Unit tests for staleness checks pass
- [ ] Test: Data older than TTL is considered stale

**Technical Notes:**
```typescript
const CACHE_TTL = {
  trips: 5 * 60 * 1000, // 5 minutes
  itinerary: 5 * 60 * 1000,
  expenses: 2 * 60 * 1000, // Future: 2 minutes
}

function isStale(lastSynced: number, ttl: number): boolean {
  return Date.now() - lastSynced > ttl
}
```

---

### Phase 2: Read Layer Integration (4 issues, 6-9 SP)

#### Issue 2.1: Add cache-first logic to trip queries

**Priority:** P1
**Estimate:** 3 SP
**Labels:** `web`, `mobile`, `offline`, `trips`
**Dependencies:** 1.1, 1.2, 1.3, 1.4, 1.5

**Description:**
Wrap existing trip query functions with cache-first logic. On query, check cache first, return cached data if fresh, and fetch from server in background to update cache.

**Tasks:**
- [ ] Modify `packages/shared/lib/supabase/queries/trips.ts`
- [ ] Wrap `getUserTrips()` with cache check → return cached → background sync
- [ ] Wrap `getTripById()` with cache check → return cached → background sync
- [ ] Implement `backgroundSync()` helper for non-blocking updates
- [ ] Add cache write after successful Supabase fetch
- [ ] Handle cache miss: fetch from server → write to cache → return

**Acceptance Criteria:**
- [ ] `getUserTrips()` returns cached data immediately if available
- [ ] Background sync updates cache without blocking UI
- [ ] Cache miss triggers server fetch and cache write
- [ ] Stale data triggers server fetch (based on TTL)
- [ ] Offline: returns cached data, no server fetch
- [ ] Unit tests: cache hit, cache miss, stale data, offline scenarios

**Technical Notes:**
```typescript
async function getUserTrips(supabase, userId) {
  const cached = await cache.getUserTrips(userId)

  if (cached && !isStale(cached[0]?.last_synced)) {
    // Return cached data immediately
    backgroundSync(async () => {
      const fresh = await fetchFromServer()
      await cache.writeTrips(fresh)
    })
    return cached.map(c => c.data)
  }

  // Cache miss or stale
  const fresh = await fetchFromServer()
  await cache.writeTrips(fresh)
  return fresh
}
```

---

#### Issue 2.2: Add background sync engine

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `web`, `mobile`, `offline`
**Dependencies:** 2.1

**Description:**
Create a background sync engine that refreshes cache without blocking the UI. Uses `requestIdleCallback` (web) or low-priority tasks (mobile).

**Tasks:**
- [ ] Create `apps/web/lib/cache/sync.ts`
- [ ] Implement `backgroundSync(fn: () => Promise<void>)` wrapper
- [ ] Use `requestIdleCallback()` on web for non-blocking sync
- [ ] Use `setTimeout()` fallback for browsers without idle callback
- [ ] Debounce rapid online/offline transitions (wait 2s)
- [ ] Add sync queue to prevent duplicate syncs

**Acceptance Criteria:**
- [ ] Background sync doesn't block UI rendering
- [ ] Rapid online/offline switches don't trigger multiple syncs
- [ ] Sync errors are caught and logged (don't crash app)
- [ ] Unit tests: background sync executes asynchronously
- [ ] Test: Sync debouncing works correctly

---

#### Issue 2.3: Update trip list page to use cache

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `web`, `mobile`, `trips`, `ui`
**Dependencies:** 2.1, 2.2

**Description:**
Update the trip list page to load from cache first, then sync in background. Add loading states and offline indicators.

**Tasks:**
- [ ] Update `apps/web/app/(app)/trips/page.tsx` to use cached queries
- [ ] Update mobile trip list screen similarly
- [ ] Add `useNetworkStatus()` hook to component
- [ ] Show skeleton loaders while cache loads
- [ ] Differentiate: "Loading from cache" vs "Syncing from server"
- [ ] Test offline: trip list shows cached trips

**Acceptance Criteria:**
- [ ] Trip list loads instantly from cache (<100ms)
- [ ] Background sync indicator shows when syncing
- [ ] Offline: trips display from cache, no errors
- [ ] Cache miss: shows loading state, fetches from server
- [ ] Component tests: renders with cached data
- [ ] E2E test: Go offline → trip list still displays

---

#### Issue 2.4: Update trip detail page to use cache

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `web`, `mobile`, `trips`, `ui`
**Dependencies:** 2.1, 2.2

**Description:**
Update the trip detail page to load trip data and participants from cache first, then sync in background.

**Tasks:**
- [ ] Update `apps/web/app/(app)/trips/[id]/page.tsx` to use cached queries
- [ ] Update mobile trip detail screen similarly
- [ ] Add loading states for cache load
- [ ] Show "Last synced X ago" timestamp
- [ ] Add "Pull to refresh" gesture to force sync
- [ ] Test offline: trip detail shows cached data

**Acceptance Criteria:**
- [ ] Trip detail loads instantly from cache
- [ ] Participants list loads from cache
- [ ] Last synced timestamp displayed
- [ ] Pull to refresh triggers manual sync (if online)
- [ ] Offline: shows cached trip, no crashes
- [ ] Component tests: renders with cached data
- [ ] E2E test: Navigate to trip detail offline → shows cached data

---

### Phase 3: Itinerary Caching (3 issues, 4-6 SP)

#### Issue 3.1: Create itinerary query functions

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `shared`, `itinerary`, `queries`
**Dependencies:** None (can be done in parallel with Phase 2)

**Description:**
Create query functions for itinerary items in the shared package. These will be wrapped with cache logic later.

**Tasks:**
- [ ] Create `packages/shared/lib/supabase/queries/itinerary.ts`
- [ ] Implement `getItineraryItems(tripId: string)`
- [ ] Implement `getItineraryItemById(itemId: string)`
- [ ] Add sorting by start_time
- [ ] Add filtering by type (flight, stay, activity)
- [ ] Write unit tests for query functions

**Acceptance Criteria:**
- [ ] `getItineraryItems()` returns all items for a trip
- [ ] Items sorted by start_time (chronological)
- [ ] `getItineraryItemById()` returns single item
- [ ] Unit tests: 80%+ coverage
- [ ] Test: Returns empty array for trip with no items

---

#### Issue 3.2: Add cache-first logic to itinerary queries

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `web`, `mobile`, `offline`, `itinerary`
**Dependencies:** 3.1, 2.1

**Description:**
Wrap itinerary query functions with cache-first logic, matching the pattern used for trips.

**Tasks:**
- [ ] Wrap `getItineraryItems()` with cache check
- [ ] Wrap `getItineraryItemById()` with cache check
- [ ] Add cache writes after Supabase fetch
- [ ] Implement background sync for itinerary
- [ ] Handle cache by trip_id (all items for a trip)

**Acceptance Criteria:**
- [ ] Itinerary items load from cache first
- [ ] Background sync updates itinerary cache
- [ ] Offline: returns cached itinerary items
- [ ] Cache indexed by trip_id for fast lookup
- [ ] Unit tests: cache hit/miss scenarios

---

#### Issue 3.3: Update trip detail page with cached itinerary

**Priority:** P1
**Estimate:** 1 SP
**Labels:** `web`, `mobile`, `itinerary`, `ui`
**Dependencies:** 3.2

**Description:**
Update the trip detail page to display cached itinerary items. Show itinerary timeline with cached data when offline.

**Tasks:**
- [ ] Update trip detail page to fetch itinerary from cache
- [ ] Display itinerary items in timeline view
- [ ] Show loading state while cache loads
- [ ] Add "Last synced" indicator for itinerary section
- [ ] Test offline: itinerary displays from cache

**Acceptance Criteria:**
- [ ] Itinerary items display instantly from cache
- [ ] Offline: full itinerary visible (flights, stays, activities)
- [ ] Timeline view renders with cached data
- [ ] Component tests: renders itinerary from cache
- [ ] E2E test: View trip detail offline → see full itinerary

---

### Phase 4: Offline UX & Indicators (3 issues, 3-5 SP)

#### Issue 4.1: Create offline indicator component

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `web`, `mobile`, `ui`, `offline`
**Dependencies:** 1.4

**Description:**
Create an offline indicator component that shows a banner when the app is offline, informing users they're viewing cached data.

**Tasks:**
- [ ] Create `apps/web/components/features/offline/OfflineIndicator.tsx`
- [ ] Create mobile equivalent component
- [ ] Show banner when offline: "You're offline. Viewing cached data."
- [ ] Make dismissible but reappear on navigation
- [ ] Style with warning color (yellow/orange)
- [ ] Position at top of viewport (sticky)

**Acceptance Criteria:**
- [ ] Banner appears when `useNetworkStatus()` returns offline
- [ ] Banner disappears when back online
- [ ] Dismissible with X button
- [ ] Reappears on page navigation while offline
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Component tests: shows/hides based on network status

**Design:**
```
┌────────────────────────────────────────┐
│ ⚠️ You're offline. Viewing cached data. │ [X]
└────────────────────────────────────────┘
```

---

#### Issue 4.2: Add sync status indicators

**Priority:** P2
**Estimate:** 1 SP
**Labels:** `web`, `mobile`, `ui`, `offline`
**Dependencies:** 2.2

**Description:**
Add sync status indicators to show when data is syncing in the background. Display "Last synced X ago" timestamps.

**Tasks:**
- [ ] Create `apps/web/components/features/offline/SyncStatus.tsx`
- [ ] Show "Syncing..." indicator during background sync
- [ ] Show "Last synced 2m ago" after successful sync
- [ ] Add manual "Refresh" button to force sync
- [ ] Use relative time format (e.g., "2m ago", "1h ago")

**Acceptance Criteria:**
- [ ] "Syncing..." shows during background sync
- [ ] "Last synced" timestamp updates after sync completes
- [ ] Manual refresh button triggers immediate sync (if online)
- [ ] Timestamp uses relative format
- [ ] Component tests: sync status updates correctly

**Design:**
```
Trips                              🔄 Syncing...
Trips                              ✓ Synced 2m ago
```

---

#### Issue 4.3: Add offline error boundaries and empty states

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `web`, `mobile`, `ui`, `offline`
**Dependencies:** 4.1

**Description:**
Create error boundaries to gracefully handle cases where cache is empty and user is offline. Show helpful empty states.

**Tasks:**
- [ ] Create offline error boundary component
- [ ] Catch cache errors and show fallback UI
- [ ] Empty state: "No trips available offline"
- [ ] Empty state: "Connect to internet to load trips"
- [ ] Add retry button (checks if back online)
- [ ] Log cache errors to Sentry

**Acceptance Criteria:**
- [ ] Cache errors don't crash the app
- [ ] Empty cache + offline = clear empty state message
- [ ] Retry button checks network and fetches if online
- [ ] Errors logged to Sentry for monitoring
- [ ] Component tests: error boundary catches errors
- [ ] E2E test: New user goes offline → sees empty state

**Design:**
```
┌─────────────────────────────────┐
│                                 │
│         📭                      │
│    No trips available offline   │
│                                 │
│  Connect to the internet to     │
│  load your trips.               │
│                                 │
│      [ Retry ]                  │
│                                 │
└─────────────────────────────────┘
```

---

### Phase 5: Testing & Polish (5 issues, 5-8 SP)

#### Issue 5.1: Write unit tests for cache layer

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `testing`, `offline`
**Dependencies:** All Phase 1-3 issues

**Description:**
Write comprehensive unit tests for the cache layer. Achieve 80%+ coverage requirement.

**Tasks:**
- [ ] Create `apps/web/tests/offline/cache-service.test.ts`
- [ ] Test: writeTrip() → readTrip() returns same data
- [ ] Test: getUserTrips() filters by user_id
- [ ] Test: clearCache() removes all data
- [ ] Test: isStale() correctly identifies stale data
- [ ] Test: Cache handles missing data gracefully
- [ ] Achieve 80%+ coverage on cache service

**Acceptance Criteria:**
- [ ] All cache CRUD operations covered
- [ ] Edge cases tested (null, undefined, empty arrays)
- [ ] Error cases tested (cache corruption, quota exceeded)
- [ ] 80%+ code coverage on cache layer
- [ ] Tests run in CI/CD pipeline
- [ ] All tests pass locally and in CI

---

#### Issue 5.2: Write component tests for offline UI

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `testing`, `ui`, `offline`
**Dependencies:** Phase 4 issues

**Description:**
Write component tests for offline indicator, sync status, and cached data rendering.

**Tasks:**
- [ ] Test: TripCard renders with cached data
- [ ] Test: OfflineIndicator shows when offline
- [ ] Test: SyncStatus updates during sync
- [ ] Test: Empty state shows when cache is empty offline
- [ ] Test: Error boundary catches cache errors
- [ ] Use React Testing Library

**Acceptance Criteria:**
- [ ] All offline UI components have tests
- [ ] Tests mock network status (online/offline)
- [ ] Tests mock cache reads/writes
- [ ] Tests cover loading, success, error, empty states
- [ ] All component tests pass

---

#### Issue 5.3: Write E2E tests for offline scenarios (Web)

**Priority:** P1
**Estimate:** 3 SP
**Labels:** `testing`, `e2e`, `web`, `offline`
**Dependencies:** All Phase 1-4 issues

**Description:**
Write comprehensive E2E tests using Playwright for offline trip viewing scenarios on web.

**Tasks:**
- [ ] Create `apps/web/tests/e2e/offline-trips.spec.ts`
- [ ] Test: Load trips online → go offline → navigate → see cached trips
- [ ] Test: New user offline → see empty state
- [ ] Test: Go offline → view trip detail → see cached itinerary
- [ ] Test: Offline → online transition → cache updates
- [ ] Test: Multi-tab sync (web only)

**Acceptance Criteria:**
- [ ] All offline scenarios covered in E2E tests
- [ ] Tests use Playwright's `context.setOffline(true)`
- [ ] Tests verify IndexedDB state
- [ ] Tests verify UI matches cached data
- [ ] All E2E tests pass in CI/CD
- [ ] Tests run in headless mode for CI

**Note:** Per CLAUDE.md, E2E tests run in CI/CD, not locally (flaky in local dev).

---

#### Issue 5.4: Write E2E tests for offline scenarios (Mobile)

**Priority:** P1
**Estimate:** 2 SP
**Labels:** `testing`, `e2e`, `mobile`, `offline`
**Dependencies:** All Phase 1-4 issues

**Description:**
Write E2E tests using Detox for offline scenarios on mobile (iOS + Android).

**Tasks:**
- [ ] Create mobile E2E tests for offline scenarios
- [ ] Test: Load trips → airplane mode → see cached trips
- [ ] Test: Offline trip detail navigation
- [ ] Test: Offline → online transition
- [ ] Run on iOS simulator and Android emulator

**Acceptance Criteria:**
- [ ] Mobile E2E tests cover offline scenarios
- [ ] Tests run on both iOS and Android
- [ ] Tests verify SQLite state
- [ ] All tests pass in CI/CD

---

#### Issue 5.5: Documentation and polish

**Priority:** P2
**Estimate:** 1 SP
**Labels:** `documentation`, `polish`
**Dependencies:** All previous issues

**Description:**
Write detailed documentation for the offline cache implementation and polish any rough edges.

**Tasks:**
- [ ] Create `docs/OFFLINE_SYNC.md` with architecture details
- [ ] Document cache schema and TTL strategy
- [ ] Document troubleshooting guide
- [ ] Update `CLAUDE.md` with offline implementation notes
- [ ] Add JSDoc comments to cache functions
- [ ] Code review and refactoring

**Acceptance Criteria:**
- [ ] `OFFLINE_SYNC.md` created with complete architecture
- [ ] All cache functions have JSDoc comments
- [ ] Code review completed and approved
- [ ] Refactoring completed (DRY, clean code)
- [ ] Documentation reviewed and merged

---

## Summary

**Total Issues:** 20 issues across 5 phases
**Total Estimate:** 23-36 story points
**Timeline:** 3-4 weeks (13-20 days)

**Phase Breakdown:**
- Phase 1: Foundation (5 issues, 5-8 SP) → 3-5 days
- Phase 2: Read Layer (4 issues, 6-9 SP) → 3-5 days
- Phase 3: Itinerary (3 issues, 4-6 SP) → 2-3 days
- Phase 4: Offline UX (3 issues, 3-5 SP) → 2-3 days
- Phase 5: Testing (5 issues, 5-8 SP) → 3-4 days

**Priority Distribution:**
- P1 (High): 18 issues
- P2 (Medium): 2 issues

**Labels Used:**
- `offline`, `cache`, `infrastructure`, `web`, `mobile`, `shared`
- `trips`, `itinerary`, `queries`, `ui`
- `testing`, `e2e`, `documentation`
- `phase-2`, `phase-3` (for later implementation)

---

## How to Import to Linear

### Option 1: Manual Creation (Recommended)

1. **Create Epic** in Linear:
   - Title: "Offline-First Local Cache (IndexedDB/SQLite)"
   - Copy description from top of this document
   - Set to "Backlog" status
   - Add labels: `offline`, `cache`, `phase-2`, `infrastructure`

2. **Create Issues** one by one:
   - Use issue titles as-is
   - Copy task lists to descriptions
   - Set story points
   - Add labels
   - Link to epic
   - Set dependencies (use "Blocked by" in Linear)

### Option 2: CSV Import

1. Convert this to CSV format (let me know if you want me to generate this)
2. Import via Linear's CSV import feature
3. Manually link dependencies and epic

### Option 3: Linear API Script

If you have a Linear API key, I can generate a script to automate the import.

---

**Next Steps:**
1. Review this breakdown
2. Decide when to schedule (Phase 2-3 after core features)
3. Import to Linear when ready
4. Adjust story points based on your team's velocity
