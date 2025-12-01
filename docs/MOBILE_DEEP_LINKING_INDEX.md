# Mobile Deep Linking Documentation Index

## Overview

This directory contains comprehensive documentation on implementing deep linking for the TripThreads mobile app using Expo Router.

**Current Status:** Deep linking is NOT configured. This documentation provides the complete analysis and implementation guide.

---

## Documents

### 1. MOBILE_DEEP_LINKING_QUICKSTART.md

**For:** Developers who want a quick overview and common code patterns

Contains:

- Current state summary
- Files to create (checklist)
- Implementation order (6 steps)
- Key code patterns with examples
- Shared functions available
- URL scheme formats
- Common pitfalls
- Testing checklist

**Start here if:** You're implementing the feature

---

### 2. MOBILE_DEEP_LINKING.md

**For:** Complete technical reference and implementation guide

Contains:

- Current mobile app configuration (detailed)
- Current routing structure
- Web app patterns (reference)
- Shared utilities available (complete API reference)
- What needs to be added (detailed specifications)
- App.json configuration (exact format)
- Route structure needed (file structure)
- Root layout enhancement code
- Invite acceptance screen code
- Trip detail screen code
- Auth routes setup
- URL scheme patterns
- Implementation checklist (4 phases)
- Key differences: Web vs Mobile
- Critical implementation notes
- Future enhancements

**Start here if:** You need detailed technical specifications

---

## Quick Navigation

### I Want To...

**Understand what needs to be done**
→ Read: MOBILE_DEEP_LINKING_QUICKSTART.md (first 2 sections)

**See all the code that needs to be written**
→ Read: MOBILE_DEEP_LINKING.md (sections 5.1-5.6)

**Know which files to create and modify**
→ Read: MOBILE_DEEP_LINKING.md (section 11)

**Understand the full architecture**
→ Read: MOBILE_DEEP_LINKING.md (sections 3-4)

**Start implementing**
→ Follow: MOBILE_DEEP_LINKING_QUICKSTART.md (Implementation Order section)

**Reference specific code patterns**
→ See: MOBILE_DEEP_LINKING_QUICKSTART.md (Key Code Patterns section)

**Understand the testing strategy**
→ Read: MOBILE_DEEP_LINKING.md (section 7, phase 4)

---

## Current State Summary

### Installed & Ready

- Expo Router v6.0.13 (file-based routing)
- expo-linking v8.0.8 (deep link handling)
- URL scheme: "tripthreads://" defined in app.json
- Supabase Auth with expo-secure-store
- Shared query functions in packages/shared

### Missing & Needs Implementation

- Deep linking configuration in app.json
- Dynamic route screens ([token], [id])
- Link event handlers in root layout
- Auth route structure (auth group)
- App route structure (app group with tabs)
- Invite acceptance screen
- Trip detail screen
- Associated domains (iOS) / Intent filters (Android)

---

## Implementation Phases

### Phase 1: Core Deep Linking (Week 1) - ESSENTIAL

- [ ] Update app.json
- [ ] Create route groups
- [ ] Create dynamic route screens
- [ ] Enhance root layout
- [ ] Local testing

### Phase 2: Auth Routes (Week 1-2) - IMPORTANT

- [ ] Login screen
- [ ] Signup screen
- [ ] OAuth handling
- [ ] Protected routes

### Phase 3: Navigation (Week 2) - IMPORTANT

- [ ] Trips list
- [ ] Settings screen
- [ ] Tab navigation
- [ ] UI polish

### Phase 4: Testing & Deploy (Week 3) - IMPORTANT

- [ ] EAS builds (iOS & Android)
- [ ] Associated domains setup
- [ ] Intent filters setup
- [ ] End-to-end testing

---

## Key Files to Create

### Route Group Layouts

```
apps/mobile/app/(auth)/_layout.tsx      # Auth group
apps/mobile/app/(app)/_layout.tsx       # App group with tabs
```

### Dynamic Route Screens (Deep Link Targets)

```
apps/mobile/app/invite/[token].tsx      # Invite acceptance
apps/mobile/app/(app)/trips/[id].tsx    # Trip detail
```

### Other Screens

```
apps/mobile/app/(auth)/login.tsx        # Login
apps/mobile/app/(auth)/signup.tsx       # Signup
apps/mobile/app/(app)/trips/index.tsx   # Trips list
apps/mobile/app/(app)/settings.tsx      # Settings
```

### Configuration

```
apps/mobile/app.json                    # MODIFY: Add linking
apps/mobile/app/_layout.tsx             # MODIFY: Add handlers
```

---

## Key Implementation Points

### 1. Auth Flow Is Async

- Auth context loads tokens from secure storage
- Happens after initial render
- Root layout needs fallback component
- Deep link navigation must wait for auth to load

### 2. Dynamic Routes Use Brackets

```tsx
// File: apps/mobile/app/invite/[token].tsx
const { token } = useLocalSearchParams<{ token: string }>()

// File: apps/mobile/app/(app)/trips/[id].tsx
const { id } = useLocalSearchParams<{ id: string }>()
```

### 3. Route Groups Organize Navigation

```
(auth)  → Auth screens (login, signup, public pages)
(app)   → Main app screens (tabs: trips, expenses, feed, settings)
invite  → Public invite acceptance (accessible without auth)
```

### 4. Shared Functions Are Ready

- `getInviteWithDetails()` - Get invite data
- `acceptInvite()` - Join trip
- `getTripById()` - Get trip details
- `getUserTrips()` - Get all user's trips

All work with mobile's Supabase client setup!

---

## Testing Strategy

### Local Testing

```
npm run dev:mobile
# Test with custom scheme: tripthreads://invite/test123
```

### Device Testing

```
# Build for iOS
eas build --platform ios --profile preview

# Build for Android
eas build --platform android --profile preview
```

### URL Scheme Testing

1. Custom scheme: `tripthreads://invite/abc123`
2. HTTPS: `https://tripthreads.app/invite/abc123`
3. Fallback: If app not installed, opens web version

---

## Architecture Diagram

```
User clicks invite link
     ↓
Link (http/custom scheme)
     ↓
App opens to invite/[token]
     ↓
useAuth() loads from SecureStore
     ↓
If authenticated:
  → Show invite details
  → User accepts
  → acceptInvite() called
  → router.push to (app)/trips/[id]
     ↓
Trip screen loads trip data
     ↓
Display trip with itinerary, expenses, photos
```

---

## Reference Links

### Documentation

- [MOBILE_DEEP_LINKING.md](./MOBILE_DEEP_LINKING.md) - Full technical guide
- [MOBILE_DEEP_LINKING_QUICKSTART.md](./MOBILE_DEEP_LINKING_QUICKSTART.md) - Quick reference

### External Resources

- [Expo Router Deep Linking](https://expo.dev/docs/router/linking/)
- [Expo Linking API](https://docs.expo.dev/versions/latest/sdk/linking/)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)

### Source Code References

- Web invite page: `apps/web/app/invite/[token]/page.tsx`
- Invite queries: `packages/shared/lib/supabase/queries/invites.ts`
- Trip queries: `packages/shared/lib/supabase/queries/trips.ts`
- Mobile auth context: `apps/mobile/lib/auth/auth-context.tsx`
- Mobile Supabase client: `apps/mobile/lib/supabase/client.ts`

---

## FAQ

**Q: Can I use the same deep linking on web and mobile?**
A: Similar patterns, but different frameworks (Next.js vs Expo Router). See Web vs Mobile comparison in MOBILE_DEEP_LINKING.md.

**Q: How do I test deep links locally?**
A: Use custom scheme `tripthreads://invite/test123` with local testing. HTTPS testing requires deployed app.

**Q: Do I need to update both iOS and Android separately?**
A: Yes, EAS build handles it, but you need to configure associatedDomains (iOS) and intentFilters (Android) in app.json.

**Q: Can users share trips without the app installed?**
A: Yes! HTTPS links fallback to web version. App links only work if app is installed.

**Q: What if auth isn't loaded when the link opens?**
A: Root layout has fallback component. Auth will load from storage, then screen will render properly.

---

## Next Steps

1. **Read** MOBILE_DEEP_LINKING_QUICKSTART.md (5 min)
2. **Review** MOBILE_DEEP_LINKING.md sections 5-6 (10 min)
3. **Start** with Phase 1 implementation (app.json + route groups)
4. **Create** invite/[token].tsx screen
5. **Test** locally with custom scheme
6. **Build** with EAS for iOS/Android

---

**Last Updated:** November 6, 2025
**Status:** Analysis Complete - Ready for Implementation
**Estimated Implementation Time:** 2-3 weeks
