# TripThreads - Test-Driven Development Guide

## 🧪 TDD Philosophy

> **"Write the test first, then write the code to make it pass."**

Every feature in TripThreads must be developed using strict TDD methodology. This is non-negotiable for:

1. **Data Integrity** - Offline sync, currency calculations, and split logic must be bulletproof
2. **Security** - Role-based permissions and RLS policies must be tested
3. **Reliability** - Users trust us with their trip finances
4. **Maintainability** - Tests serve as living documentation

## 🔴 Red → 🟢 Green → 🔵 Refactor

### The TDD Cycle

```
1. RED: Write a failing test that defines desired behavior
   ↓
2. GREEN: Write minimal code to make the test pass
   ↓
3. REFACTOR: Clean up code while keeping tests green
   ↓
   Repeat for next feature
```

### Example: Building the NL Expense Parser

#### Step 1: RED - Write Failing Test

```typescript
// packages/shared/parser/__tests__/expense.test.ts

import { parseExpense } from '../expense'

describe('parseExpense', () => {
  it('should extract amount and currency from simple input', () => {
    const input = "60€ dinner"
    const result = parseExpense(input)

    expect(result).toEqual({
      amount: 60,
      currency: 'EUR',
      description: 'dinner',
      splitType: null,
      splitCount: null
    })
  })
})
```

**Run test:** ❌ FAIL (function doesn't exist)

#### Step 2: GREEN - Make Test Pass

```typescript
// packages/shared/parser/expense.ts

export interface ExpenseParseResult {
  amount: number | null
  currency: string | null
  description: string
  splitType: 'equal' | 'percentage' | 'amount' | null
  splitCount: number | null
}

export function parseExpense(input: string): ExpenseParseResult {
  // Regex to match amount and currency
  const amountRegex = /(\d+(?:\.\d{2})?)\s*([€$£¥]|EUR|USD|GBP|JPY)/i
  const match = input.match(amountRegex)

  if (!match) {
    return {
      amount: null,
      currency: null,
      description: input.trim(),
      splitType: null,
      splitCount: null
    }
  }

  const amount = parseFloat(match[1])
  const currencySymbol = match[2]

  // Map symbols to ISO codes
  const currencyMap: Record<string, string> = {
    '€': 'EUR',
    '$': 'USD',
    '£': 'GBP',
    '¥': 'JPY'
  }

  const currency = currencyMap[currencySymbol] || currencySymbol.toUpperCase()

  // Extract description (remove amount/currency)
  const description = input.replace(amountRegex, '').trim()

  return {
    amount,
    currency,
    description,
    splitType: null,
    splitCount: null
  }
}
```

**Run test:** ✅ PASS

#### Step 3: REFACTOR - Add More Tests

```typescript
describe('parseExpense', () => {
  it('should extract amount and currency from simple input', () => {
    const input = "60€ dinner"
    const result = parseExpense(input)

    expect(result).toEqual({
      amount: 60,
      currency: 'EUR',
      description: 'dinner',
      splitType: null,
      splitCount: null
    })
  })

  it('should handle split instructions', () => {
    const input = "Split 60€ dinner 4 ways"
    const result = parseExpense(input)

    expect(result).toEqual({
      amount: 60,
      currency: 'EUR',
      description: 'dinner',
      splitType: 'equal',
      splitCount: 4
    })
  })

  it('should handle different currency symbols', () => {
    expect(parseExpense("$50 taxi").currency).toBe('USD')
    expect(parseExpense("£30 lunch").currency).toBe('GBP')
    expect(parseExpense("¥1000 sushi").currency).toBe('JPY')
  })

  it('should handle ISO currency codes', () => {
    expect(parseExpense("50 USD coffee").currency).toBe('USD')
    expect(parseExpense("30 GBP tea").currency).toBe('GBP')
  })

  it('should return null for invalid input', () => {
    const result = parseExpense("invalid text")
    expect(result.amount).toBeNull()
    expect(result.currency).toBeNull()
  })
})
```

**Run tests:** ✅ ALL PASS (after implementing split logic)

---

## 📋 Testing Checklist

Before implementing ANY feature, ask:

- [ ] What is the expected behavior?
- [ ] What are the edge cases?
- [ ] What should happen on error?
- [ ] What are the security implications?
- [ ] What offline scenarios exist?

---

## 🎯 Test Coverage Requirements

### Unit Tests (80% minimum coverage)

**Test these in isolation:**

- ✅ Currency calculations and conversions
- ✅ Debt optimization algorithms
- ✅ Split calculations (equal, percentage, custom)
- ✅ Date/time utilities
- ✅ NL parser tokenization
- ✅ Data validation functions
- ✅ Formatting utilities (currency, dates)

**Example: Currency Conversion**

```typescript
// packages/shared/utils/__tests__/currency.test.ts

import { convertCurrency, getFxRate } from '../currency'

describe('convertCurrency', () => {
  it('should convert EUR to USD using provided rate', () => {
    const result = convertCurrency(100, 'EUR', 'USD', 1.1)
    expect(result).toBe(110)
  })

  it('should handle same currency conversion', () => {
    const result = convertCurrency(100, 'EUR', 'EUR', 1.0)
    expect(result).toBe(100)
  })

  it('should round to 2 decimal places', () => {
    const result = convertCurrency(33.33, 'EUR', 'USD', 1.1)
    expect(result).toBe(36.66)
  })
})

describe('getFxRate', () => {
  it('should return 1 for same currency', () => {
    const rate = getFxRate('EUR', 'EUR')
    expect(rate).toBe(1)
  })

  it('should throw error for invalid currency', () => {
    expect(() => getFxRate('INVALID', 'USD')).toThrow('Invalid currency code')
  })
})
```

### Component Tests (100% of components)

**Test React components:**

- ✅ Rendering with different props
- ✅ User interactions (clicks, form inputs)
- ✅ Conditional rendering (role-based visibility)
- ✅ Loading/error/empty states
- ✅ Accessibility (ARIA, keyboard nav)

**Example: ExpenseCard Component**

```typescript
// apps/web/components/features/expenses/__tests__/ExpenseCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react'
import { ExpenseCard } from '../ExpenseCard'

describe('ExpenseCard', () => {
  const mockExpense = {
    id: '123',
    description: 'Dinner at Le Bistro',
    amount: 6000, // Stored in cents
    currency: 'EUR',
    payer: { id: 'user1', name: 'Alice' },
    participants: [
      { id: 'user1', share: 3000 },
      { id: 'user2', share: 3000 }
    ],
    date: '2025-10-15T19:30:00Z',
    receiptUrl: null
  }

  it('renders expense details correctly', () => {
    render(<ExpenseCard expense={mockExpense} currentUserId="user1" />)

    expect(screen.getByText('Dinner at Le Bistro')).toBeInTheDocument()
    expect(screen.getByText('€60.00')).toBeInTheDocument()
    expect(screen.getByText('Alice paid')).toBeInTheDocument()
  })

  it('shows correct share for participant', () => {
    render(<ExpenseCard expense={mockExpense} currentUserId="user2" />)

    expect(screen.getByText('You owe €30.00')).toBeInTheDocument()
  })

  it('shows "You paid" for payer', () => {
    render(<ExpenseCard expense={mockExpense} currentUserId="user1" />)

    expect(screen.getByText('You paid')).toBeInTheDocument()
    expect(screen.getByText('Others owe you €30.00')).toBeInTheDocument()
  })

  it('hides expense for viewers', () => {
    const viewer = { id: 'user3', role: 'viewer' }
    const { container } = render(
      <ExpenseCard expense={mockExpense} currentUser={viewer} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('calls onEdit when edit button clicked', () => {
    const handleEdit = jest.fn()
    render(
      <ExpenseCard
        expense={mockExpense}
        currentUserId="user1"
        onEdit={handleEdit}
      />
    )

    fireEvent.click(screen.getByLabelText('Edit expense'))
    expect(handleEdit).toHaveBeenCalledWith(mockExpense)
  })

  it('shows receipt indicator when receipt exists', () => {
    const expenseWithReceipt = {
      ...mockExpense,
      receiptUrl: 'https://storage.supabase.co/receipts/123.jpg'
    }

    render(<ExpenseCard expense={expenseWithReceipt} currentUserId="user1" />)
    expect(screen.getByLabelText('Has receipt')).toBeInTheDocument()
  })

  it('is keyboard accessible', () => {
    render(<ExpenseCard expense={mockExpense} currentUserId="user1" />)

    const card = screen.getByRole('article')
    expect(card).toHaveAttribute('tabIndex', '0')
  })
})
```

### Integration Tests (Critical flows)

**Test Supabase interactions:**

- ✅ Auth flows (signup, login, OAuth)
- ✅ CRUD operations with RLS
- ✅ Real-time subscriptions
- ✅ Storage uploads/downloads
- ✅ Edge Function execution

**Example: Trip Creation with RLS**

```typescript
// apps/web/lib/supabase/__tests__/trips.integration.test.ts

import { createClient } from '@supabase/supabase-js'
import { createTrip, getTripById } from '../mutations'

describe('Trip Mutations (Integration)', () => {
  let supabase: any
  let testUserId: string

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // For testing only
    )

    // Create test user
    const { data } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'testpass123'
    })
    testUserId = data.user.id
  })

  afterAll(async () => {
    // Cleanup: delete test user and associated data
    await supabase.from('trips').delete().eq('owner_id', testUserId)
    await supabase.auth.admin.deleteUser(testUserId)
  })

  it('should create trip with owner as participant', async () => {
    const tripData = {
      name: 'Test Trip to Paris',
      startDate: '2025-11-01',
      endDate: '2025-11-07'
    }

    const trip = await createTrip(tripData, testUserId)

    expect(trip.id).toBeDefined()
    expect(trip.name).toBe('Test Trip to Paris')
    expect(trip.owner_id).toBe(testUserId)

    // Verify participant entry created
    const { data: participants } = await supabase
      .from('trip_participants')
      .select('*')
      .eq('trip_id', trip.id)

    expect(participants).toHaveLength(1)
    expect(participants[0].user_id).toBe(testUserId)
    expect(participants[0].role).toBe('owner')
  })

  it('should enforce RLS - user cannot access other users trips', async () => {
    // Create second user
    const { data: user2 } = await supabase.auth.signUp({
      email: 'user2@example.com',
      password: 'testpass123'
    })

    // User 1 creates trip
    const trip = await createTrip(
      { name: 'Private Trip', startDate: '2025-12-01', endDate: '2025-12-05' },
      testUserId
    )

    // User 2 tries to access
    const result = await getTripById(trip.id, user2.user.id)

    expect(result).toBeNull() // RLS should block access
  })
})
```

### E2E Tests (Critical user journeys)

**Test complete flows:**

- ✅ User signup → Create trip → Invite participant
- ✅ Add expense → Split → View balance
- ✅ Add itinerary item via NL → View timeline
- ✅ Upload photo → View in feed
- ✅ Go offline → Add expense → Sync on reconnect
- ✅ Free user hits limit → Upgrade to Pro

**Example: Offline Expense Flow**

```typescript
// apps/web/tests/e2e/offline-expense.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Offline Expense Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'testpass123')
    await page.click('button[type="submit"]')

    // Navigate to trip
    await page.goto('/trips/test-trip-id')
    await expect(page.locator('h1')).toContainText('Trip to Paris')
  })

  test('should allow adding expense offline and sync on reconnect', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true)
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Offline')

    // Add expense via NL input
    await page.fill('[data-testid="expense-input"]', 'Split 40€ lunch 2 ways')
    await page.click('[data-testid="add-expense"]')

    // Verify local state
    await expect(page.locator('[data-testid="expense-item"]').first()).toContainText('€40.00')
    await expect(page.locator('[data-testid="expense-item"]').first()).toContainText('lunch')
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('1 pending')

    // Go online
    await context.setOffline(false)

    // Wait for sync
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Synced', {
      timeout: 10000
    })

    // Verify persistence
    await page.reload()
    await expect(page.locator('[data-testid="expense-item"]').first()).toContainText('€40.00')
  })

  test('should handle sync failures gracefully', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true)

    // Add multiple expenses
    await page.fill('[data-testid="expense-input"]', '20€ coffee')
    await page.click('[data-testid="add-expense"]')
    await page.fill('[data-testid="expense-input"]', '50€ dinner')
    await page.click('[data-testid="add-expense"]')

    // Simulate network error on reconnect (mock API to return 500)
    await page.route('**/api/expenses', route => route.abort('failed'))

    // Go online
    await context.setOffline(false)

    // Should show error toast
    await expect(page.locator('[role="alert"]')).toContainText('Failed to sync')

    // Should show retry option
    await expect(page.locator('[data-testid="retry-sync"]')).toBeVisible()

    // Unblock API
    await page.unroute('**/api/expenses')

    // Retry sync
    await page.click('[data-testid="retry-sync"]')

    // Should succeed
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Synced')
  })
})
```

---

## 🏗️ Test Structure

### Folder Organization

```
apps/web/
├── components/
│   └── features/
│       └── expenses/
│           ├── ExpenseCard.tsx
│           └── __tests__/
│               └── ExpenseCard.test.tsx
├── lib/
│   ├── supabase/
│   │   ├── mutations.ts
│   │   └── __tests__/
│   │       ├── mutations.test.ts
│   │       └── mutations.integration.test.ts
│   └── parser/
│       ├── expense.ts
│       └── __tests__/
│           └── expense.test.ts
└── tests/
    └── e2e/
        ├── auth.spec.ts
        ├── offline-expense.spec.ts
        └── upgrade-flow.spec.ts
```

### Naming Conventions

- **Unit tests:** `filename.test.ts`
- **Integration tests:** `filename.integration.test.ts`
- **E2E tests:** `feature.spec.ts`
- **Test files:** Co-located with source in `__tests__/` folder

---

## 🎭 Mocking Strategy

### When to Mock

- ✅ External APIs (Stripe, exchangerate.host)
- ✅ Supabase in unit tests (use real DB in integration tests)
- ✅ Browser APIs (localStorage, IndexedDB) in Node tests
- ✅ Date/time (use `jest.useFakeTimers()`)

### When NOT to Mock

- ❌ Pure functions (test them directly)
- ❌ Supabase in integration tests (use test database)
- ❌ Simple utilities (no need to mock)

### Example: Mocking FX Rate API

```typescript
// packages/shared/utils/__tests__/fx.test.ts

import { fetchFxRate } from '../fx'

// Mock fetch globally
global.fetch = jest.fn()

describe('fetchFxRate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch rate from exchangerate.host', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { USD: 1.1 }
      })
    })

    const rate = await fetchFxRate('EUR', 'USD', '2025-10-28')

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.exchangerate.host/2025-10-28?base=EUR&symbols=USD'
    )
    expect(rate).toBe(1.1)
  })

  it('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    await expect(fetchFxRate('EUR', 'USD', '2025-10-28')).rejects.toThrow(
      'Failed to fetch FX rate'
    )
  })

  it('should cache successful responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, rates: { USD: 1.1 } })
    })

    await fetchFxRate('EUR', 'USD', '2025-10-28')
    await fetchFxRate('EUR', 'USD', '2025-10-28') // Second call

    // Should only call API once (cached)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
```

---

## 🔐 Testing Security & Permissions

### Role-Based Access Tests

```typescript
describe('Expense Visibility (RLS)', () => {
  it('should show expense to participants involved', async () => {
    const expense = createExpense({
      amount: 5000,
      participants: ['user1', 'user2']
    })

    const result = await getExpenseAsUser(expense.id, 'user1')
    expect(result).toBeDefined()
  })

  it('should hide expense from participants not involved', async () => {
    const expense = createExpense({
      amount: 5000,
      participants: ['user1', 'user2']
    })

    const result = await getExpenseAsUser(expense.id, 'user3')
    expect(result).toBeNull()
  })

  it('should show all expenses to trip owner', async () => {
    const trip = createTrip({ ownerId: 'owner1' })
    const expense = createExpense({
      tripId: trip.id,
      participants: ['user1', 'user2'] // Owner not involved
    })

    const result = await getExpenseAsUser(expense.id, 'owner1')
    expect(result).toBeDefined() // Owner sees all
  })

  it('should prevent viewers from seeing expenses', async () => {
    const expense = createExpense()
    const result = await getExpenseAsViewer(expense.id, 'viewer1')
    expect(result).toBeNull()
  })
})
```

---

## 🚀 Running Tests

### Commands

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm test -- --watch

# Coverage report
npm test -- --coverage

# Run specific test file
npm test -- expense.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should convert currency"

# E2E tests (web)
npm run test:e2e

# E2E tests (mobile)
npm run test:e2e:mobile

# Integration tests only
npm test -- --testPathPattern=integration
```

### CI/CD Integration

Tests run automatically on:

- ✅ Every push to any branch
- ✅ Every PR
- ✅ Before deployment to production

**GitHub Actions Workflow:**

```yaml
# .github/workflows/ci.yml

name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage
      - run: npm run build
```

---

## 📊 Coverage Requirements

### Minimum Coverage Thresholds

```json
// package.json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      },
      // Critical paths require 100%
      "./packages/shared/utils/currency.ts": {
        "branches": 100,
        "functions": 100,
        "lines": 100,
        "statements": 100
      },
      "./packages/shared/utils/settlements.ts": {
        "branches": 100,
        "functions": 100,
        "lines": 100,
        "statements": 100
      }
    }
  }
}
```

---

## ✅ TDD Checklist (Before Merging PR)

- [ ] All new functions have unit tests
- [ ] All new components have component tests
- [ ] All new user flows have E2E tests (if critical)
- [ ] Test coverage is ≥80% overall
- [ ] Currency/money calculations have 100% coverage
- [ ] Role-based permissions are tested
- [ ] Offline scenarios are tested (if applicable)
- [ ] Error states are tested
- [ ] Edge cases are covered (empty, null, invalid input)
- [ ] All tests pass locally
- [ ] All tests pass in CI
- [ ] No skipped tests (`.skip`) in PR

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright](https://playwright.dev/)
- [Detox](https://wix.github.io/Detox/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [TDD with React](https://www.freecodecamp.org/news/test-driven-development-with-react/)

---

**Remember: If it's not tested, it's broken.**

Write tests first. Your future self will thank you.
