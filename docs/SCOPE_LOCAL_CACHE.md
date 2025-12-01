# Scope: Local Cache for Trips & Itinerary

**Feature:** Offline-first local caching (IndexedDB web / SQLite mobile)
**Objective:** Basic read-only offline support for trips and itinerary data
**Status:** Planning Phase
**Complexity:** High (Est. 13-21 story points)

---

## 📋 Overview

Implement local cache infrastructure to enable **offline-first** data access for trips and itinerary items. Users should be able to view their trips and itineraries without an internet connection, with seamless reconciliation when they reconnect.

### Goals

1. **Cache-first reads** - UI hydrates instantly from local cache (IndexedDB/SQLite)
2. **Background sync** - Server data refreshes cache when online
3. **Graceful offline** - No crashes when disconnected; show cached data
4. **Fresh data wins** - Server data always replaces stale cache
5. **MVP scope** - Read-only offline support (write queuing is Phase 2+)

### Non-Goals (Out of Scope for This Task)

- Offline write support (mutation queue)
- Conflict resolution UI
- Real-time sync subscriptions
- Optimistic updates for mutations
- Expense caching (future task)
- Media file caching (future task)

---

## 🎯 Success Metrics

### Acceptance Criteria

- [ ] Trips list is readable offline (shows cached trips)
- [ ] Trip detail page is readable offline (shows cached itinerary items)
- [ ] App doesn't crash when network is disconnected
- [ ] Fresh server data replaces cached data when online
- [ ] Cache respects RLS policies (user sees only their trips)
- [ ] Offline indicator shows when disconnected
- [ ] Cache invalidation works after 5 minutes (configurable)
- [ ] Tests cover offline→online transitions
- [ ] E2E tests pass for offline scenarios

### Performance Targets

- Initial page load from cache: **<100ms**
- Cache write after server fetch: **<50ms**
- Background sync duration: **<2s** (for typical user with 10 trips)
- Cache storage size: **<5MB** per user (estimated 100 trips + itineraries)

---

## 🏗️ Technical Architecture

### Data Flow

#### Current (All Online)
```
UI Component
  → Query Function (queries/trips.ts)
  → Supabase API
  → UI renders
```

#### New (Cache-First)
```
UI Component
  → Cache Service (check local cache first)
  ├─ Cache HIT → Return cached data immediately
  │              └─ Background: Fetch fresh data → Update cache
  └─ Cache MISS → Fetch from Supabase → Write to cache → Return data

Offline:
  UI Component → Cache Service → Return cached data (no network call)
```

### Technology Stack

| Platform | Technology | Purpose |
|----------|-----------|---------|
| **Web** | Dexie.js v4+ | IndexedDB wrapper with React hooks |
| **Mobile** | expo-sqlite v13+ | SQLite wrapper for React Native |
| **Shared** | TypeScript | Type-safe cache schemas |
| **Testing** | Vitest + Playwright | Unit + E2E offline tests |

### Cache Schema

#### IndexedDB (Web) - Database: `tripthreads_cache`

**Stores:**

1. **`trips`** (object store)
   ```typescript
   interface CachedTrip {
     id: string // Primary key
     data: Trip // Full trip object from Supabase
     user_id: string // Indexed (for RLS filtering)
     last_synced: number // Timestamp (Date.now())
     version: number // Optimistic locking
   }
   ```

2. **`trip_participants`** (object store)
   ```typescript
   interface CachedTripParticipant {
     id: string // Primary key
     trip_id: string // Indexed
     data: TripParticipant
     last_synced: number
   }
   ```

3. **`itinerary_items`** (object store)
   ```typescript
   interface CachedItineraryItem {
     id: string // Primary key
     trip_id: string // Indexed
     data: ItineraryItem
     last_synced: number
   }
   ```

4. **`sync_metadata`** (object store)
   ```typescript
   interface SyncMetadata {
     key: string // e.g., 'last_full_sync', 'user_id'
     value: any
     updated_at: number
   }
   ```

**Indexes:**
- `trips.user_id` - Filter trips by user
- `trip_participants.trip_id` - Get participants for a trip
- `itinerary_items.trip_id` - Get items for a trip
- All stores: `last_synced` - Find stale data

#### SQLite (Mobile) - Similar schema with SQL tables

```sql
CREATE TABLE cached_trips (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL, -- JSON serialized
  user_id TEXT NOT NULL,
  last_synced INTEGER NOT NULL,
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_trips_user_id ON cached_trips(user_id);
CREATE INDEX idx_trips_last_synced ON cached_trips(last_synced);

-- Similar for trip_participants, itinerary_items, sync_metadata
```

---

## 🧩 Implementation Phases

### Phase 1: Foundation (3-5 days)

**Objective:** Set up cache infrastructure without breaking existing functionality

**Tasks:**

1. **Install dependencies**
   ```bash
   cd apps/web
   npm install dexie@^4.0.0 dexie-react-hooks@^1.1.7

   cd apps/mobile
   npx expo install expo-sqlite@~13.0.0
   ```

2. **Create cache initialization**
   - `apps/web/lib/offline/db.ts` - Dexie database setup
   - `apps/mobile/lib/offline/db.ts` - SQLite database setup
   - Define schema and indexes

3. **Create cache service layer**
   - `packages/shared/lib/cache/types.ts` - Shared cache interfaces
   - `apps/web/lib/cache/service.ts` - Web cache CRUD operations
   - `apps/mobile/lib/cache/service.ts` - Mobile cache CRUD operations

4. **Add network status detection**
   - `apps/web/lib/offline/network.ts` - Online/offline detection
   - `apps/mobile/lib/offline/network.ts` - React Native NetInfo

**Deliverables:**
- Cache databases initialized on app load
- Helper functions: `writeToCache()`, `readFromCache()`, `clearCache()`
- Network status hook: `useNetworkStatus()`

**Tests:**
- Cache initialization tests
- Basic CRUD operations
- Network status detection

---

### Phase 2: Read Layer Integration (3-5 days)

**Objective:** Integrate cache into existing query layer (trips only)

**Tasks:**

1. **Wrap existing trip queries**
   - Modify `packages/shared/lib/supabase/queries/trips.ts`
   - Add cache-first logic to `getUserTrips()` and `getTripById()`
   - Pattern:
     ```typescript
     async function getUserTrips(supabase, userId) {
       // 1. Try cache first
       const cached = await cache.getTrips(userId)
       if (cached && !isStale(cached)) {
         // 2. Return cached data immediately
         // 3. Background fetch to update cache
         backgroundSync(() => fetchAndUpdateCache())
         return cached
       }

       // 4. Cache miss or stale: fetch from server
       const fresh = await supabase.from('trips').select(...)
       await cache.setTrips(userId, fresh)
       return fresh
     }
     ```

2. **Implement staleness checks**
   - `apps/web/lib/cache/utils.ts` - `isStale(lastSynced, ttl)`
   - Default TTL: 5 minutes
   - Configurable per query type

3. **Add background sync**
   - `apps/web/lib/cache/sync.ts` - Background refresh logic
   - Use `requestIdleCallback()` for non-blocking updates

**Deliverables:**
- Trip list page reads from cache first
- Trip detail page reads from cache first
- Background sync updates cache when online

**Tests:**
- Cache hit/miss scenarios
- Staleness detection
- Background sync behavior

---

### Phase 3: Itinerary Items (2-3 days)

**Objective:** Extend caching to itinerary items

**Tasks:**

1. **Create itinerary queries** (if not exist)
   - `packages/shared/lib/supabase/queries/itinerary.ts`
   - `getItineraryItems(tripId)`
   - `getItineraryItemById(itemId)`

2. **Add cache layer for itinerary**
   - Cache itinerary items by `trip_id`
   - Same cache-first pattern as trips

3. **Update trip detail page**
   - Fetch itinerary from cache
   - Show cached items offline

**Deliverables:**
- Itinerary items cached and readable offline
- Trip detail page fully functional offline

**Tests:**
- Itinerary cache operations
- Trip detail offline rendering

---

### Phase 4: Offline Indicator & UX (2-3 days)

**Objective:** Provide clear offline status to users

**Tasks:**

1. **Create offline indicator component**
   - `apps/web/components/features/offline/OfflineIndicator.tsx`
   - Shows banner when offline: "You're offline. Viewing cached data."
   - Dismissible, reappears on navigation

2. **Add sync status to trips**
   - Small badge showing "Synced" or "Offline"
   - Last synced timestamp: "Updated 2 minutes ago"

3. **Offline error boundaries**
   - Graceful error handling when cache is empty offline
   - Empty state: "No trips available offline. Connect to load trips."

4. **Loading states**
   - Skeleton loaders while cache is loading
   - Differentiate: loading from cache vs. loading from server

**Deliverables:**
- Offline indicator in app layout
- Clear visual feedback for sync status
- No crashes or broken states offline

**Tests:**
- Offline indicator shows/hides correctly
- Error boundaries catch offline errors
- Loading states render properly

---

### Phase 5: Testing & Polish (3-4 days)

**Objective:** Comprehensive testing and edge case handling

**Tasks:**

1. **Unit tests (Vitest)**
   - Cache service CRUD operations
   - Staleness checks
   - Network status detection
   - Cache invalidation

2. **Component tests (React Testing Library)**
   - Trip list with cached data
   - Trip detail with cached itinerary
   - Offline indicator behavior
   - Loading states

3. **E2E tests (Playwright - Web)**
   - User goes offline → views trips → sees cached data
   - User goes online → cache updates → sees fresh data
   - User creates account → goes offline → sees empty state
   - User switches trips offline → loads from cache

4. **Mobile E2E tests (Detox)**
   - Similar scenarios for mobile

5. **Edge cases**
   - Cache corruption handling
   - Large trip lists (100+ trips)
   - Rapid online/offline switching
   - Multi-tab sync (web only)

**Deliverables:**
- 80%+ test coverage for cache layer
- All E2E offline scenarios pass
- Edge cases documented and handled

**Tests:**
- Full test suite in `apps/web/tests/offline/`
- Mobile tests in `apps/mobile/tests/offline/`

---

## 📂 Files to Create

### Web App

```
apps/web/
├── lib/
│   ├── offline/
│   │   ├── db.ts                    # Dexie database setup
│   │   ├── network.ts               # Online/offline detection
│   │   └── types.ts                 # Cache-specific types
│   └── cache/
│       ├── service.ts               # Cache CRUD operations
│       ├── sync.ts                  # Background sync logic
│       └── utils.ts                 # Staleness checks, helpers
├── components/
│   └── features/
│       └── offline/
│           ├── OfflineIndicator.tsx # Offline banner component
│           └── SyncStatus.tsx       # Sync status badge
└── tests/
    ├── offline/
    │   ├── cache-service.test.ts    # Unit tests
    │   ├── network.test.ts
    │   └── sync.test.ts
    └── e2e/
        └── offline-trips.spec.ts    # E2E offline scenarios
```

### Mobile App

```
apps/mobile/
├── lib/
│   ├── offline/
│   │   ├── db.ts                    # SQLite database setup
│   │   └── network.ts               # NetInfo integration
│   └── cache/
│       ├── service.ts               # Cache CRUD operations
│       └── sync.ts                  # Background sync logic
└── tests/
    └── offline/
        └── cache-service.test.ts
```

### Shared Packages

```
packages/shared/
├── lib/
│   └── cache/
│       ├── types.ts                 # Shared cache interfaces
│       └── constants.ts             # TTL values, config
└── tests/
    └── cache/
        └── types.test.ts
```

---

## 📝 Files to Modify

### Existing Query Layer

1. **`packages/shared/lib/supabase/queries/trips.ts`**
   - Wrap `getUserTrips()` with cache-first logic
   - Wrap `getTripById()` with cache-first logic
   - Add cache invalidation on mutations (future)

2. **`packages/shared/lib/supabase/queries/itinerary.ts`** (create if missing)
   - Add `getItineraryItems(tripId)` with caching
   - Add `getItineraryItemById(itemId)` with caching

### UI Components

3. **`apps/web/app/(app)/trips/page.tsx`**
   - Add `useNetworkStatus()` hook
   - Show offline indicator
   - Use cached data

4. **`apps/web/app/(app)/trips/[id]/page.tsx`**
   - Load trip + itinerary from cache
   - Show sync status

5. **`apps/web/app/layout.tsx`**
   - Add `<OfflineIndicator />` to root layout
   - Initialize cache on app load

### Configuration

6. **`apps/web/package.json`**
   - Add Dexie dependencies

7. **`apps/mobile/package.json`**
   - Add expo-sqlite dependency

---

## 🧪 Testing Requirements

### Unit Tests (Vitest)

**Coverage target: 80%+**

```typescript
// apps/web/tests/offline/cache-service.test.ts
describe('CacheService', () => {
  describe('writeToCache', () => {
    it('stores trip data in IndexedDB', async () => {
      const trip = { id: '123', name: 'Paris Trip', ... }
      await cache.writeTrip(trip)

      const cached = await cache.readTrip('123')
      expect(cached.data).toEqual(trip)
      expect(cached.last_synced).toBeDefined()
    })

    it('updates existing cached trip', async () => {
      const trip = { id: '123', name: 'Paris Trip' }
      await cache.writeTrip(trip)

      const updated = { ...trip, name: 'Updated Paris Trip' }
      await cache.writeTrip(updated)

      const cached = await cache.readTrip('123')
      expect(cached.data.name).toBe('Updated Paris Trip')
      expect(cached.version).toBe(2)
    })
  })

  describe('readFromCache', () => {
    it('returns null for cache miss', async () => {
      const cached = await cache.readTrip('nonexistent')
      expect(cached).toBeNull()
    })

    it('filters trips by user_id', async () => {
      await cache.writeTrip({ id: '1', owner_id: 'user-a', ... })
      await cache.writeTrip({ id: '2', owner_id: 'user-b', ... })

      const userATrips = await cache.getUserTrips('user-a')
      expect(userATrips).toHaveLength(1)
      expect(userATrips[0].data.id).toBe('1')
    })
  })

  describe('isStale', () => {
    it('returns true if last_synced > TTL', () => {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
      expect(isStale(fiveMinutesAgo, 5 * 60 * 1000)).toBe(false)

      const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
      expect(isStale(tenMinutesAgo, 5 * 60 * 1000)).toBe(true)
    })
  })

  describe('network status', () => {
    it('detects online status', () => {
      const { result } = renderHook(() => useNetworkStatus())
      expect(result.current.isOnline).toBe(true)
    })

    it('detects offline status', () => {
      // Mock navigator.onLine = false
      Object.defineProperty(navigator, 'onLine', { value: false })

      const { result } = renderHook(() => useNetworkStatus())
      expect(result.current.isOnline).toBe(false)
    })
  })
})
```

### Component Tests (React Testing Library)

```typescript
// apps/web/tests/components/TripCard.test.tsx
describe('TripCard with offline cache', () => {
  it('renders cached trip data when offline', async () => {
    // Seed cache
    await cache.writeTrip({ id: '123', name: 'Paris Trip', ... })

    // Go offline
    mockNetworkStatus({ isOnline: false })

    render(<TripCard tripId="123" />)

    await waitFor(() => {
      expect(screen.getByText('Paris Trip')).toBeInTheDocument()
    })
  })

  it('shows offline indicator when offline', async () => {
    mockNetworkStatus({ isOnline: false })

    render(<OfflineIndicator />)

    expect(screen.getByText(/You're offline/i)).toBeInTheDocument()
  })

  it('refreshes data when going back online', async () => {
    const { rerender } = render(<TripCard tripId="123" />)

    // Start offline
    mockNetworkStatus({ isOnline: false })
    rerender(<TripCard tripId="123" />)

    // Go online
    mockNetworkStatus({ isOnline: true })
    rerender(<TripCard tripId="123" />)

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('trips')
    })
  })
})
```

### E2E Tests (Playwright - Web)

```typescript
// apps/web/tests/e2e/offline-trips.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Offline Trip Viewing', () => {
  test('loads trips from cache when offline', async ({ page, context }) => {
    // 1. Login and load trips while online
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForURL('/trips')
    await expect(page.locator('[data-testid="trip-card"]')).toHaveCount(3)

    // 2. Go offline
    await context.setOffline(true)

    // 3. Navigate away and back
    await page.goto('/settings')
    await page.goto('/trips')

    // 4. Verify cached trips still display
    await expect(page.locator('[data-testid="trip-card"]')).toHaveCount(3)
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
  })

  test('shows empty state when cache is empty offline', async ({ page, context }) => {
    // 1. Clear cache
    await page.evaluate(() => indexedDB.deleteDatabase('tripthreads_cache'))

    // 2. Go offline
    await context.setOffline(true)

    // 3. Try to load trips
    await page.goto('/trips')

    // 4. Verify empty state
    await expect(page.locator('text=No trips available offline')).toBeVisible()
  })

  test('syncs fresh data when reconnecting', async ({ page, context }) => {
    // 1. Load trips while online
    await page.goto('/trips')
    const initialCount = await page.locator('[data-testid="trip-card"]').count()

    // 2. Go offline
    await context.setOffline(true)
    await page.reload()

    // 3. Verify cached data
    await expect(page.locator('[data-testid="trip-card"]')).toHaveCount(initialCount)

    // 4. Mock server adding a new trip (in real scenario, another user adds it)

    // 5. Go back online
    await context.setOffline(false)

    // 6. Wait for background sync
    await page.waitForTimeout(2000) // Wait for sync

    // 7. Verify new trip appears
    await expect(page.locator('[data-testid="trip-card"]')).toHaveCount(initialCount + 1)
  })

  test('trip detail page works offline', async ({ page, context }) => {
    // 1. Load trip detail while online
    await page.goto('/trips/123')
    await expect(page.locator('h1')).toContainText('Paris Trip')
    await expect(page.locator('[data-testid="itinerary-item"]')).toHaveCount(5)

    // 2. Go offline
    await context.setOffline(true)

    // 3. Navigate away and back
    await page.goto('/trips')
    await page.click('[data-testid="trip-card"]:first-child')

    // 4. Verify cached trip detail
    await expect(page.locator('h1')).toContainText('Paris Trip')
    await expect(page.locator('[data-testid="itinerary-item"]')).toHaveCount(5)
  })
})
```

### Mobile E2E Tests (Detox)

Similar scenarios for mobile using Detox framework.

---

## ⚠️ Risks & Considerations

### Technical Risks

| Risk | Mitigation | Priority |
|------|-----------|----------|
| **Cache-server data divergence** | Implement version tracking; force refresh on critical actions | High |
| **IndexedDB quota limits** (web) | Monitor storage usage; purge old trips after 30 days | Medium |
| **Cache corruption** | Wrap all cache ops in try-catch; fallback to server on error | High |
| **Multi-tab sync issues** (web) | Use BroadcastChannel API to sync cache across tabs | Medium |
| **RLS policy bypass** | Always filter cached data by user_id; never trust cache alone | Critical |
| **Stale data UX** | Show "Last updated X ago" timestamp; allow manual refresh | Low |

### Privacy & Security

1. **Local cache respects RLS**
   - Filter all cache reads by `user_id`
   - Clear cache on logout
   - Never cache sensitive data (passwords, tokens)

2. **Cache encryption** (future)
   - Consider encrypting IndexedDB on web (Web Crypto API)
   - Use SQLCipher for mobile (future enhancement)

3. **Data retention**
   - Auto-purge trips older than 30 days
   - Provide "Clear cache" option in settings

### Performance Considerations

1. **Cache size limits**
   - IndexedDB: ~50MB typical limit (browser-dependent)
   - SQLite: No hard limit, but monitor app size
   - Strategy: Prioritize recent trips, paginate old trips

2. **Background sync strategy**
   - Use `requestIdleCallback()` to avoid blocking UI
   - Debounce rapid online/offline switches (wait 2s before syncing)
   - Only sync visible data (don't prefetch all trips)

3. **Cache invalidation**
   - TTL-based: Default 5 minutes
   - Event-based: Invalidate on mutation (future)
   - Manual: "Pull to refresh" gesture

---

## 🔄 Future Enhancements (Out of Scope)

These are explicitly **NOT** included in this task but documented for future reference:

1. **Offline write support**
   - Mutation queue for CREATE/UPDATE/DELETE operations
   - Optimistic UI updates
   - Conflict resolution on sync

2. **Real-time sync**
   - Supabase Realtime subscriptions
   - Live updates when other users edit trips

3. **Differential sync**
   - Only fetch changed records (delta sync)
   - Use `updated_at` timestamps to optimize

4. **Advanced conflict resolution**
   - Last-write-wins (LWW)
   - Operational Transformation (OT)
   - UI for manual conflict resolution

5. **Expense caching**
   - Cache expense data for offline viewing
   - Cache settlements and FX rates

6. **Media caching**
   - Cache photo thumbnails for offline feed
   - Service Worker for progressive image loading (web)

7. **Prefetching**
   - Predictive caching based on user behavior
   - Background sync all trips on WiFi

---

## 📅 Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Foundation | 3-5 days | None |
| Phase 2: Read Layer | 3-5 days | Phase 1 |
| Phase 3: Itinerary | 2-3 days | Phase 2 |
| Phase 4: UX Polish | 2-3 days | Phase 3 |
| Phase 5: Testing | 3-4 days | Phase 4 |
| **Total** | **13-20 days** | |

**Story Points:** 13-21 SP (depending on team velocity)

---

## ✅ Definition of Done

- [ ] IndexedDB (web) and SQLite (mobile) initialized with schema
- [ ] Trip list loads from cache first, syncs in background
- [ ] Trip detail loads from cache first, syncs in background
- [ ] Itinerary items cached and readable offline
- [ ] Offline indicator shows when disconnected
- [ ] No crashes or errors when offline
- [ ] Fresh server data replaces cache when online
- [ ] Cache invalidation works (5-minute TTL)
- [ ] RLS policies respected (user sees only their trips)
- [ ] Unit tests: 80%+ coverage on cache layer
- [ ] Component tests: TripCard, TripDetail, OfflineIndicator
- [ ] E2E tests: Offline→Online transitions pass
- [ ] Code review approved
- [ ] Documentation updated (OFFLINE_SYNC.md)
- [ ] Deployed to staging and tested

---

## 📚 References

- **CLAUDE.md** - Project documentation and TDD requirements
- **PRD.md** - Offline strategy (Section 4)
- **OFFLINE_SYNC.md** - Detailed sync strategy (to be created)
- **Dexie.js Docs** - https://dexie.org/
- **expo-sqlite** - https://docs.expo.dev/versions/latest/sdk/sqlite/
- **Playwright Offline Testing** - https://playwright.dev/docs/network#offline

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Author:** Claude (AI Assistant)
**Status:** Ready for Implementation
