# First-Run Onboarding System

A comprehensive onboarding flow for new TripThreads users. Introduces the app, explains user roles, highlights key features, and seamlessly connects to the first trip creation tour.

## Features

- ✅ **Welcome Screen** - Warm welcome with value proposition
- ✅ **Role Explainer** - Clear explanation of Owner/Participant/Viewer roles
- ✅ **Feature Highlights** - Interactive carousel of key features
- ✅ **Seamless Integration** - Connects to first trip creation tour
- ✅ **Skip/Resume** - Users can skip or complete later
- ✅ **Progress Tracking** - localStorage persistence
- ✅ **Mobile Responsive** - Works on all screen sizes
- ✅ **Analytics Ready** - Built-in hooks for PostHog tracking

## Flow

```
1. Welcome Screen → 2. Role Explainer → 3. Feature Highlights → 4. First Trip Tour
     ↓ (Skip)           ↓ (Skip)              ↓ (Skip)              ↓
     ───────────────────────────────────────────────────────────────→ Completed
```

## Architecture

```
onboarding/
├── Onboarding.tsx              # Main orchestrator
├── WelcomeScreen.tsx           # Step 1: Welcome
├── RoleExplainer.tsx           # Step 2: Roles
├── FeatureHighlights.tsx       # Step 3: Features
├── index.ts                    # Module exports
└── README.md                   # This file

lib/onboarding/
├── types.ts                    # TypeScript definitions
├── config.ts                   # Onboarding configuration
└── storage.ts                  # localStorage utilities

tests/unit/onboarding/
└── storage.test.ts             # Storage tests
```

## Usage

### Automatic Onboarding (Default)

The onboarding automatically triggers for new users:

```tsx
// app/(app)/layout.tsx
import { Onboarding } from '@/components/features/onboarding'

export default function AppLayout({ children }) {
  return (
    <>
      <Onboarding autoStart={true} />
      {children}
    </>
  )
}
```

### Manual Control

```tsx
'use client'

import { useOnboarding } from '@/components/features/onboarding'

export function MyComponent() {
  const { isCompleted, restart } = useOnboarding()

  return (
    <div>
      {isCompleted ? (
        <button onClick={restart}>Restart Onboarding</button>
      ) : (
        <p>Onboarding in progress...</p>
      )}
    </div>
  )
}
```

## Step-by-Step Guide

### 1. Welcome Screen

**Purpose:** Make a great first impression and explain the value proposition.

**Content:**

- App logo with animated pulse effect
- "Welcome to TripThreads!" headline
- Value proposition: "Make memories, not spreadsheets"
- 3 key benefits: Plan Together, Split Expenses, Share Memories
- "Get Started" CTA button
- "Skip Tutorial" option

**Design:**

- Full-screen overlay with backdrop blur
- Primary-colored border on card
- Animated icon
- Progress indicator (Step 1 of 4)

### 2. Role Explainer

**Purpose:** Help users understand the three role types before creating/joining trips.

**Roles:**

**Owner (👑)**

- Full control over trip
- Can invite/remove people
- Manage expenses and settlements
- Delete trip
- Change settings

**Participant (👥)**

- Active trip member
- Add itinerary items
- Track expenses
- Upload photos
- View settlements

**Viewer (👁️)**

- Read-only access
- View trip details
- View itinerary
- View photos
- Cannot see expense details

**Design:**

- 3-column grid layout
- Icon cards with permissions list
- "Pro Tip" box with context
- Progress indicator (Step 2 of 4)

### 3. Feature Highlights

**Purpose:** Showcase what makes TripThreads special.

**Features (5 total):**

1. **Natural Language Input**
   - "Split 60€ dinner 4 ways"
   - Badge: ✨ Smart

2. **Works Offline**
   - Plan without internet
   - Badge: 📶 Reliable

3. **Multi-Currency Support**
   - Real-time exchange rates
   - Badge: 🌍 Global

4. **Smart Settlements**
   - Optimized transactions
   - Badge: 🧮 Optimized

5. **Shared Trip Feed**
   - Photos organized by day
   - Badge: 📸 Memories

**Design:**

- Carousel with left/right navigation
- Dot indicators
- Large icon + badge
- Progress indicator (Step 3 of 4)

### 4. First Trip Tour

After onboarding completes, users are directed to create their first trip, which triggers the [First Trip Creation Tour](../tour/README.md).

## Configuration

### Onboarding Config

```typescript
// lib/onboarding/config.ts
export const ONBOARDING_CONFIG: OnboardingConfig = {
  id: 'first-run-onboarding',
  name: 'First Run Onboarding',
  canSkip: true,
  steps: ['welcome', 'roles', 'features', 'first-trip', 'completed'],
}
```

### Roles Config

```typescript
export const ROLES: RoleInfo[] = [
  {
    id: 'owner',
    title: 'Trip Owner',
    description: '...',
    permissions: [...],
    icon: 'Crown',
    color: 'text-primary',
  },
  // ... more roles
]
```

### Features Config

```typescript
export const FEATURES: FeatureHighlight[] = [
  {
    id: 'natural-language',
    title: 'Natural Language Input',
    description: '...',
    icon: 'MessageSquare',
    badge: '✨ Smart',
  },
  // ... more features
]
```

## localStorage Schema

Onboarding state is stored in localStorage:

```json
{
  "tripthreads_onboarding_state": {
    "currentStep": "roles",
    "completed": false,
    "skipped": false,
    "startedAt": "2025-10-15T10:30:00.000Z",
    "completedAt": null,
    "lastActiveAt": "2025-10-15T10:32:00.000Z"
  }
}
```

## Storage API

```typescript
// Start onboarding
startOnboarding(): OnboardingState

// Update current step
updateOnboardingStep(step: OnboardingStep): void

// Complete onboarding
completeOnboarding(): void

// Skip onboarding
skipOnboarding(): void

// Check if completed
isOnboardingCompleted(): boolean

// Check if should show
shouldShowOnboarding(): boolean

// Reset onboarding
resetOnboarding(): void
```

## Styling

The onboarding uses Tailwind CSS and the TripThreads design system:

- **Overlay**: `bg-background/95` with `backdrop-blur-sm`
- **Cards**: Primary border (`border-2 border-primary`) with shadow
- **Animations**: Pulse effect on logo, smooth transitions
- **Progress bars**: Primary for current, muted for upcoming
- **Icons**: lucide-react with design system colors

## Integration with Tour System

After completing onboarding, users are seamlessly directed to the [First Trip Creation Tour](../tour/README.md):

```typescript
// Onboarding.tsx
const handleFeaturesContinue = () => {
  handleComplete()
  // First trip tour will trigger when user visits /trips
}
```

The tour system checks if onboarding is completed before showing the tour:

```typescript
// FirstTripTourProvider.tsx
useEffect(() => {
  if (!isOnboardingCompleted()) return // Wait for onboarding

  // Show first trip tour for users with no trips
  if (!userHasTrips) {
    setShowTour(true)
  }
}, [userHasTrips])
```

## Testing

### Unit Tests

```bash
npm test -- onboarding/storage.test.ts
```

Tests cover:

- localStorage operations
- State transitions (welcome → roles → features → completed)
- Skip functionality
- Resume capability
- Edge cases

### Manual Testing

1. **Clear onboarding state:**

   ```javascript
   localStorage.removeItem('tripthreads_onboarding_state')
   ```

2. **Visit app as authenticated user**

3. **Welcome screen should appear**

4. **Test flow:**
   - Click "Get Started" → Roles screen
   - Click "Continue" → Features screen
   - Navigate carousel (5 features)
   - Click "Finish" → Onboarding completes

5. **Test skip:**
   - Clear state and reload
   - Click "Skip Tutorial" at any step
   - Onboarding should not appear again

6. **Test resume:**
   - Clear state and reload
   - Navigate to Roles screen
   - Refresh page
   - Should resume from Roles (not Welcome)

## Analytics Integration

The onboarding system includes console logging for analytics events. When PostHog is integrated:

```typescript
// Onboarding started
posthog.capture('onboarding_started')

// Step viewed
posthog.capture('onboarding_step_viewed', { step: 'roles' })

// Onboarding completed
posthog.capture('onboarding_completed')

// Onboarding skipped
posthog.capture('onboarding_skipped', { step: 'features' })
```

## Accessibility

- Full keyboard navigation support
- ARIA labels on all interactive elements
- Focus management
- Screen reader friendly
- High contrast support
- Responsive text sizing

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ⚠️ IE 11 (not supported)

## Performance

- Lightweight: ~25KB minified (excl. gzip)
- No external dependencies (besides lucide-react icons)
- Lazy-loaded screens
- Efficient DOM updates with React
- localStorage caching

## Customization

### Adding a New Step

1. Add step to `OnboardingStep` type:

   ```typescript
   export type OnboardingStep = 'welcome' | 'roles' | 'features' | 'new-step' | 'completed'
   ```

2. Create new component:

   ```tsx
   // NewStep.tsx
   export function NewStep({ onContinue, onBack, onSkip }) {
     return (/* ... */)
   }
   ```

3. Add to orchestrator:
   ```tsx
   // Onboarding.tsx
   {currentStep === 'new-step' && (
     <NewStep onContinue={...} onBack={...} onSkip={...} />
   )}
   ```

### Adding a New Feature

```typescript
// lib/onboarding/config.ts
export const FEATURES: FeatureHighlight[] = [
  // ... existing features
  {
    id: 'new-feature',
    title: 'New Feature',
    description: 'Description here',
    icon: 'IconName',
    badge: '🎉 New',
  },
]
```

### Adding a New Role

```typescript
// lib/onboarding/config.ts
export const ROLES: RoleInfo[] = [
  // ... existing roles
  {
    id: 'new-role',
    title: 'New Role',
    description: '...',
    permissions: ['...'],
    icon: 'IconName',
    color: 'text-primary',
  },
]
```

## Best Practices

1. **Keep it concise** - Users want to start using the app quickly
2. **Make it skippable** - Don't force users through onboarding
3. **Show value early** - Highlight benefits upfront
4. **Use visuals** - Icons, animations, and examples are better than text
5. **Track metrics** - Monitor completion rates and drop-off points
6. **Test mobile** - Many users will onboard on phones
7. **Update regularly** - Keep feature highlights current

## Troubleshooting

### Onboarding doesn't appear

1. Check localStorage - is `tripthreads_onboarding_state` present?
2. Clear state: `localStorage.removeItem('tripthreads_onboarding_state')`
3. Refresh page
4. Check browser console for errors

### Onboarding stuck on a step

1. Open DevTools → Application → localStorage
2. Check `currentStep` value
3. Manually update or clear state
4. Refresh page

### Styling issues

1. Ensure Tailwind CSS is configured correctly
2. Check that lucide-react icons are installed
3. Verify design system colors are defined in `globals.css`

## Future Enhancements

- [ ] **Video Tutorials** - Embed short video clips in steps
- [ ] **Interactive Demo** - Let users try features during onboarding
- [ ] **Personalization** - Customize flow based on user type (solo vs group traveler)
- [ ] **Gamification** - Add progress badges or rewards
- [ ] **A/B Testing** - Test different messaging and flows
- [ ] **Multi-language** - Internationalization support
- [ ] **Tooltips** - In-app tooltips that appear during first use

## Support

For issues or questions:

- Check this README
- Review existing onboarding implementations
- Search GitHub issues
- Ask in team chat

---

**Last Updated:** 2025-10-15
**Version:** 1.0
**Status:** ✅ Production Ready
