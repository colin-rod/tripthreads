# Testing Strategy & Guidelines

**Last Updated:** November 2025
**Status:** ✅ Phase 1-2 Implemented | 🚧 Ongoing

---

## Overview

TripThreads follows **Test-Driven Development (TDD)** methodology to ensure reliability, especially for:

- **Offline sync** (Phase 2+) - Data integrity in poor network conditions
- **Multi-currency calculations** - Accurate FX conversions and settlements
- **Natural language parsing** - Predictable, consistent parsing behavior
- **Role-based permissions** - Correct data visibility across user roles

---

## Testing Philosophy

> "Write the test first, then write the code to make it pass."

### TDD Workflow

For every feature, follow this cycle:

1. **Red** - Write a failing test that defines the desired behavior
2. **Green** - Write minimal code to pass the test
3. **Refactor** - Clean up code while keeping tests green

---

## Test Stack

### Current Setup (Phase 1-2)

✅ **Jest** - Unit and component testing

- Migrated from Vitest in Phase 2
- Configuration: `jest.config.js` (root), `jest.config.ts` (apps/web)
- Test files: `*.test.ts`, `*.test.tsx`
- Mocks: `__mocks__` directories

✅ **React Testing Library** - Component testing

- User-centric testing approach
- Queries: `getByRole`, `getByText`, `getByLabelText`
- User interactions: `userEvent` for realistic interactions

✅ **Playwright** - E2E web testing

- Configuration: `playwright.config.ts` in apps/web
- Tests: `apps/web/tests/e2e/`
- **Note:** E2E tests run in CI only (not locally due to flakiness)

✅ **Detox** - Mobile E2E testing

- Configuration: `apps/mobile/.detoxrc.js`
- Tests: `apps/mobile/e2e/`
- Platforms: iOS (iPhone 15), Android (Pixel 7 API 34)
- **Note:** Tests run in CI/CD only (GitHub Actions with matrix strategy)

---

## Test Types & Requirements

### 1. Unit Tests

**Purpose:** Test individual functions and utilities in isolation

**Coverage Required:**

- ✅ Currency/FX calculations (100% coverage - zero tolerance for errors)
- ✅ Ledger calculations (balances, settlements, debt optimization)
- ✅ Date utilities and formatters
- 🚧 NL parser tokenization (Phase 2+)
- 📋 Offline sync logic (Phase 2+)

**Example:**

```typescript
// packages/shared/__tests__/currency.test.ts
describe('convertCurrency', () => {
  it('converts EUR to USD correctly', () => {
    const result = convertCurrency(100, 'EUR', 'USD', 1.1)
    expect(result).toBe(110)
  })

  it('handles same currency conversion', () => {
    const result = convertCurrency(100, 'EUR', 'EUR', 1.0)
    expect(result).toBe(100)
  })

  it('rounds to 2 decimal places', () => {
    const result = convertCurrency(100, 'EUR', 'USD', 1.123456)
    expect(result).toBe(112.35)
  })
})
```

### 2. Component Tests

**Purpose:** Test React components in isolation with mocked dependencies

**Coverage Required:**

- ✅ Expense cards and forms
- ✅ Settlement summary and dialogs
- ✅ Itinerary item cards
- ✅ Trip participant lists
- ✅ Chat messages
- 🚧 Role-based UI visibility (ongoing)
- 📋 Offline status indicators (Phase 2+)

**Example:**

```typescript
// apps/web/tests/components/ExpenseCard.test.tsx
import { render, screen } from '@testing-library/react'
import { ExpenseCard } from '@/components/features/expenses/ExpenseCard'

describe('ExpenseCard', () => {
  const mockExpense = {
    id: '123',
    description: 'Dinner at Le Bistro',
    amount: 6000, // 60.00 in cents
    currency: 'EUR',
    payer: { id: 'user1', name: 'Alice' },
    participants: [
      { id: 'user1', share: 3000 },
      { id: 'user2', share: 3000 }
    ],
    date: '2025-10-15'
  }

  it('displays expense details', () => {
    render(<ExpenseCard expense={mockExpense} currentUserId="user1" />)

    expect(screen.getByText('Dinner at Le Bistro')).toBeInTheDocument()
    expect(screen.getByText('€60.00')).toBeInTheDocument()
    expect(screen.getByText('Alice paid')).toBeInTheDocument()
  })

  it('shows user share for participants', () => {
    render(<ExpenseCard expense={mockExpense} currentUserId="user2" />)

    expect(screen.getByText('You owe €30.00')).toBeInTheDocument()
  })

  it('respects role-based visibility', () => {
    const viewer = { id: 'user3', role: 'viewer' }
    render(<ExpenseCard expense={mockExpense} currentUser={viewer} />)

    // Viewers should not see expenses
    expect(screen.queryByText('Dinner at Le Bistro')).not.toBeInTheDocument()
  })
})
```

### 3. Integration Tests

**Purpose:** Test Supabase interactions with real database (local)

**Coverage Required:**

- ✅ Auth flows (email, Google OAuth)
- ✅ RLS policy enforcement
- ✅ Trip and expense CRUD operations
- ✅ Real-time subscription updates
- 🚧 Edge Function execution (local testing)
- 📋 Storage upload/download (Phase 3)

**Example:**

```typescript
// apps/web/tests/integration/expenses.test.ts
import { createClient } from '@/lib/supabase/client'
import { createExpense } from '@/lib/supabase/mutations/expenses'

describe('Expense Integration', () => {
  let supabase: ReturnType<typeof createClient>
  let testUserId: string
  let testTripId: string

  beforeAll(async () => {
    supabase = createClient()
    // Set up test user and trip
    testUserId = 'test-user-id'
    testTripId = 'test-trip-id'
  })

  it('creates expense and enforces RLS', async () => {
    const expense = await createExpense({
      trip_id: testTripId,
      description: 'Test expense',
      amount: 5000,
      currency: 'EUR',
      payer_id: testUserId,
      date: '2025-10-15',
    })

    expect(expense).toBeDefined()
    expect(expense.description).toBe('Test expense')

    // Verify RLS: non-participant cannot see expense
    const { data, error } = await supabase.from('expenses').select().eq('id', expense.id).single()

    // Should fail if current user is not participant
    expect(error).toBeDefined()
  })
})
```

### 4. End-to-End (E2E) Tests

**Purpose:** Test complete user flows in browser/device

**Coverage Required:**

- ✅ Trip creation and invitation flow
- ✅ Expense tracking and settlement
- 🚧 Itinerary building
- 📋 Offline → online sync (Phase 2+)
- 📋 Photo uploads and feed (Phase 3)
- 📋 Pro upgrade flow (Phase 3)

**IMPORTANT:** E2E tests run in CI/CD only, not locally!

**Example:**

```typescript
// apps/web/tests/e2e/expenses.spec.ts
import { test, expect } from '@playwright/test'

test('complete expense tracking flow', async ({ page }) => {
  await page.goto('/trips/123')

  // Add expense
  await page.click('[data-testid="add-expense-button"]')
  await page.fill('[data-testid="expense-description"]', 'Lunch')
  await page.fill('[data-testid="expense-amount"]', '30')
  await page.selectOption('[data-testid="expense-currency"]', 'EUR')
  await page.click('[data-testid="save-expense"]')

  // Verify expense appears
  await expect(page.locator('[data-testid="expense-item"]')).toContainText('Lunch')
  await expect(page.locator('[data-testid="expense-item"]')).toContainText('€30.00')

  // Mark settlement as paid
  await page.click('[data-testid="settlements-tab"]')
  await page.click('[data-testid="mark-paid-button"]')
  await expect(page.locator('[data-testid="settlement-status"]')).toContainText('Settled')
})
```

### 5. Mobile E2E Tests (Detox)

**Purpose:** Test mobile-specific behaviors on iOS and Android

**Framework:** Detox 20.x + Jest
**Platforms:** iOS (iPhone 15 simulator), Android (Pixel 7 API 34 emulator)

**Test Files:**

- `apps/mobile/e2e/deep-linking.e2e.ts` - Deep link navigation and auth redirects
- `apps/mobile/e2e/photo-picker.e2e.ts` - Photo permissions and picker
- `apps/mobile/e2e/platform-specific.e2e.ts` - Platform behaviors (back button, swipe, safe areas)

**Coverage:**

- ✅ Deep linking (invite links, trip links, universal links)
- ✅ Authentication redirects via deep links
- ✅ Photo library permissions
- ✅ Android back button navigation
- ✅ iOS swipe-back gestures
- ✅ Status bar and safe area rendering

**Running Tests (NOT RECOMMENDED - flaky in local environments):**

```bash
# iOS
cd apps/mobile
npm run build:e2e:ios
npm run test:e2e:ios

# Android
npm run build:e2e:android
npm run test:e2e:android
```

**CI/CD:** Tests run automatically on PRs to `main` (both iOS and Android in parallel).

**Mocking Strategy:**

- `expo-image-picker` mocked with test images (see `e2e/mocks/`)
- Supabase uses real backend (test database with seed data)
- Permissions granted/denied via `device.grantPermissions()`

**Test Example:**

```typescript
// apps/mobile/e2e/deep-linking.e2e.ts
import { device, element, by, expect as detoxExpect, waitFor } from 'detox'

it('TC1.1: Should open invite screen from deep link', async () => {
  await device.openURL(`tripthreads://invite/${testInviteToken}`)

  await waitFor(element(by.text('Trip Invitation')))
    .toBeVisible()
    .withTimeout(5000)

  await detoxExpect(element(by.text('Accept Invitation'))).toBeVisible()
})
```

**Troubleshooting:**

- **Flaky tests locally:** Run in CI only (GitHub Actions)
- **Android emulator slow:** Ensure hardware acceleration enabled
- **iOS build failures:** Clean derived data (`rm -rf ios/build`)
- **Permission errors:** Check Detox device permissions configuration

---

## Test Coverage Requirements

### Minimum Coverage Targets

| Category                            | Target | Status               |
| ----------------------------------- | ------ | -------------------- |
| **Currency/Money Calculations**     | 100%   | ✅ Achieved          |
| **Ledger Calculations**             | 100%   | ✅ Achieved          |
| **Critical Paths** (Auth, RLS, API) | 80%+   | 🚧 70% (In Progress) |
| **UI Components**                   | 70%+   | 🚧 60% (In Progress) |
| **Overall Codebase**                | 60%+   | 🚧 55% (In Progress) |

### What to Test

✅ **Always Test:**

- Edge cases (empty states, zero amounts, null values)
- Error states (network failures, validation errors)
- Loading states (async operations)
- Offline states (Phase 2+)
- Role-based access (Owner, Participant, Viewer, Partial Joiner)
- Multi-currency scenarios (EUR, USD, GBP, JPY)

❌ **Don't Test:**

- Third-party libraries (Supabase, React, shadcn/ui)
- Simple type definitions
- Trivial getters/setters
- Auto-generated code (Supabase types)

---

## Running Tests

### Local Development

```bash
# Run all tests (unit + component)
npm test

# Watch mode (recommended during development)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- expense

# Specific test suite
npm test -- --testNamePattern="ExpenseCard"

# Update snapshots (use sparingly)
npm test -- -u
```

### Web-Specific Tests

```bash
cd apps/web

# Run web tests only
npm test

# E2E tests (DO NOT run locally - flaky!)
npm run test:e2e        # Run in CI only
npm run test:e2e:ui     # Interactive mode (CI)
npm run test:e2e:debug  # Debug mode (CI)
```

### Mobile-Specific Tests

```bash
cd apps/mobile

# Run mobile tests
npm test

# E2E tests (Phase 3)
npm run test:e2e        # Detox tests
npm run test:e2e:ios    # iOS only
npm run test:e2e:android # Android only
```

---

## Test Organization

### File Structure

```
apps/web/
├── tests/
│   ├── unit/                   # Unit tests
│   │   ├── currency.test.ts
│   │   ├── ledger.test.ts
│   │   └── utils.test.ts
│   ├── components/             # Component tests
│   │   ├── ExpenseCard.test.tsx
│   │   ├── SettlementSummary.test.tsx
│   │   └── TripParticipantList.test.tsx
│   ├── integration/            # Integration tests
│   │   ├── auth.test.ts
│   │   ├── expenses.test.ts
│   │   └── rls.test.ts
│   └── e2e/                    # E2E tests (Playwright)
│       ├── expenses.spec.ts
│       └── trips.spec.ts

packages/shared/
├── __tests__/                  # Shared unit tests
│   ├── currency.test.ts
│   ├── settlements.test.ts
│   └── date.test.ts

apps/mobile/
├── __tests__/                  # Mobile unit/component tests
└── e2e/                        # Mobile E2E tests (Detox)
```

### Naming Conventions

- **Test files:** `*.test.ts`, `*.test.tsx` (unit/component)
- **E2E files:** `*.spec.ts` (Playwright/Detox)
- **Mock files:** `__mocks__/[module-name].ts`
- **Test suites:** `describe('ComponentName', () => { ... })`
- **Test cases:** `it('does something specific', () => { ... })`

---

## Mocking Strategies

### 1. Supabase Client

```typescript
// __mocks__/supabase.ts
export const createClient = jest.fn(() => ({
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
  })),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
  },
}))
```

### 2. Next.js Router

```typescript
// __mocks__/next-router.ts
import { jest } from '@jest/globals'

export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  pathname: '/trips/123',
  query: { id: '123' },
  asPath: '/trips/123',
}))
```

### 3. Server Actions

```typescript
// apps/web/tests/setup.ts
jest.mock('@/app/actions/expenses', () => ({
  createExpenseAction: jest.fn().mockResolvedValue({ success: true, data: mockExpense }),
}))
```

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:

- ✅ Every push to any branch
- ✅ Every pull request
- ✅ Before deployment to staging/production

**Pipeline Steps:**

1. Lint (ESLint)
2. Type check (TypeScript)
3. Unit tests (Jest)
4. Component tests (Jest + React Testing Library)
5. Build validation (Next.js)
6. E2E tests (Playwright) - **Only on PR to main**

See [CICD.md](CICD.md) for full pipeline documentation.

---

## Best Practices

### ✅ Do's

- **Write tests first** (TDD approach)
- **Test behavior, not implementation** (use user-centric queries)
- **Use meaningful test descriptions** (`it('calculates settlement correctly when...', ...)`)
- **Mock external dependencies** (Supabase, APIs, file system)
- **Test edge cases** (null, undefined, empty, zero, negative numbers)
- **Use `data-testid` sparingly** (prefer semantic queries like `getByRole`)
- **Keep tests isolated** (no shared state between tests)
- **Use `beforeEach` for setup** (not `beforeAll` for mutable state)

### ❌ Don'ts

- **Don't test implementation details** (internal state, private functions)
- **Don't use `.only` or `.skip` in committed code** (CI will fail)
- **Don't mock what you don't own** (React, Next.js internals)
- **Don't write brittle tests** (avoid snapshot testing for large components)
- **Don't ignore flaky tests** (fix or remove them)
- **Don't run E2E tests locally** (they're flaky in local env)

---

## Debugging Tests

### Common Issues

**1. Tests pass locally but fail in CI**

- Check for timezone differences (`process.env.TZ = 'UTC'` in setup)
- Verify mocks are properly scoped
- Check for race conditions in async tests

**2. Flaky tests**

- Add `await waitFor()` for async operations
- Increase timeouts for slow operations
- Check for shared state between tests
- Use `jest.useFakeTimers()` for time-dependent code

**3. Mock not working**

- Ensure mock is in correct `__mocks__` directory
- Call `jest.mock()` before importing module
- Clear mocks between tests: `jest.clearAllMocks()`

### Debugging Commands

```bash
# Run single test in debug mode
node --inspect-brk node_modules/.bin/jest expense.test.ts

# Verbose output
npm test -- --verbose

# Show console.log output
npm test -- --silent=false

# Run tests serially (not parallel)
npm test -- --runInBand
```

---

## Future Testing Improvements

### Phase 2+

🚧 **In Progress:**

- Offline sync integration tests
- NL parser comprehensive test suite
- React Hook testing utilities

### Phase 3

📋 **Planned:**

- Visual regression testing (Percy or Chromatic)
- Performance testing (Lighthouse CI)
- Mobile E2E tests (Detox)
- API contract testing (Pact or similar)

### Phase 4+

📋 **Potential:**

- Load testing (k6 or Artillery)
- Security testing (OWASP ZAP)
- Accessibility testing (axe-core)
- Mutation testing (Stryker)

---

## Test Maintenance

### Regular Housekeeping

- **Weekly:** Review test coverage reports
- **Monthly:** Audit and remove obsolete tests
- **Quarterly:** Update testing dependencies
- **Ongoing:** Fix flaky tests immediately

### When to Update Tests

- ✅ When requirements change (update test first, then code)
- ✅ When bugs are found (add regression test before fix)
- ✅ When refactoring (tests should still pass)
- ✅ When adding new features (write tests first)

---

**For more documentation:**

- [DATABASE.md](DATABASE.md) - Database schema and migrations
- [CICD.md](CICD.md) - CI/CD pipeline details
- [CLAUDE.md](../CLAUDE.md) - Main project documentation
- [TDD_GUIDE.md](../TDD_GUIDE.md) - Detailed TDD principles and examples
