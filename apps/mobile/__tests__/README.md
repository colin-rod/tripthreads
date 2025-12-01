# Mobile App Testing Documentation

This directory contains comprehensive tests for the TripThreads mobile application across multiple testing levels: **unit**, **component**, **integration**, and **E2E** (End-to-End).

## Test Structure

```
__tests__/
├── utils/                          # Unit tests for utility functions
│   └── formatCurrency.test.ts
├── screens/                        # Component tests for screens
│   ├── itinerary/
│   │   ├── create.test.tsx        # Itinerary create form tests
│   │   └── detail.test.tsx        # Itinerary detail/edit screen tests
│   └── expenses/
│       ├── create.test.tsx        # Expense create form tests
│       └── detail.test.tsx        # Expense detail/edit screen tests
├── integration/                    # Integration tests for business logic
│   ├── itinerary-crud.test.tsx    # Itinerary CRUD operations
│   └── expense-settlement.test.ts # Expense calculations & settlements
└── README.md                       # This file

e2e/                                # E2E tests (outside __tests__)
├── itinerary-flow.e2e.ts          # Itinerary management flows
├── expense-flow.e2e.ts            # Expense tracking flows
└── trip-management.e2e.ts         # Trip editing flows
```

## Test Levels

### 1. Unit Tests

**Purpose:** Test individual utility functions in isolation

**Location:** `__tests__/utils/`

**Files:**
- `formatCurrency.test.ts` - Tests for currency formatting utility

**Coverage:**
- ✅ USD formatting
- ✅ EUR formatting
- ✅ GBP formatting
- ✅ Edge cases (zero, large amounts, single cent)

**Run Command:**
```bash
npm test -- utils/formatCurrency
```

---

### 2. Component Tests

**Purpose:** Test React components in isolation with mocked dependencies

**Location:** `__tests__/screens/`

**Framework:** React Native Testing Library + Jest

**Mock Strategy:**
- Mock `expo-router` for navigation
- Mock `@tripthreads/core` for data queries
- Mock `useAuth` for authentication context
- Mock `useToast` for toast notifications
- Mock Supabase client

#### Itinerary Tests

**Files:**
- `screens/itinerary/create.test.tsx` - Create itinerary form
- `screens/itinerary/detail.test.tsx` - Itinerary detail/edit screen

**Coverage:**
- ✅ Form rendering and field validation
- ✅ Type selector with 6 types
- ✅ Date/time pickers
- ✅ View mode display
- ✅ Edit mode toggle
- ✅ Save and cancel flows
- ✅ Loading states
- ✅ Error handling
- ✅ Navigation

**Run Command:**
```bash
npm test -- screens/itinerary
```

#### Expense Tests

**Files:**
- `screens/expenses/create.test.tsx` - Create expense form
- `screens/expenses/detail.test.tsx` - Expense detail/edit screen

**Coverage:**
- ✅ Form rendering and validation
- ✅ Category selector (5 categories)
- ✅ Participant loading and selection
- ✅ Payer selection
- ✅ Equal split calculation
- ✅ Currency conversion (dollars ↔ cents)
- ✅ Participant split display
- ✅ Multi-currency support
- ✅ View/edit mode toggle
- ✅ Save and cancel flows
- ✅ Loading and error states

**Run Command:**
```bash
npm test -- screens/expenses
```

---

### 3. Integration Tests

**Purpose:** Test interactions between multiple functions and data flow

**Location:** `__tests__/integration/`

**Framework:** Jest with mocked Supabase client

#### Itinerary CRUD Tests

**File:** `integration/itinerary-crud.test.tsx`

**Coverage:**
- ✅ Create itinerary item
- ✅ Update itinerary item
- ✅ Delete itinerary item
- ✅ Error handling for all operations
- ✅ Full CRUD flow

**Run Command:**
```bash
npm test -- integration/itinerary-crud
```

#### Expense & Settlement Tests

**File:** `integration/expense-settlement.test.ts`

**Coverage:**
- ✅ Balance calculation with single expense
- ✅ Balance calculation with multiple expenses
- ✅ Two-person settlement optimization
- ✅ Three-person settlement optimization
- ✅ Complex multi-person scenarios
- ✅ Balanced accounts (no settlements needed)
- ✅ End-to-end expense settlement flow

**Key Test Scenario:**
```typescript
// Alice pays $120 hotel, Bob pays $60 dinner, Charlie pays $30 taxi
// All expenses split equally 3 ways
// Expected balances: Alice +$50, Bob -$10, Charlie -$40
// Expected settlements: 2 optimized payments to Alice
```

**Run Command:**
```bash
npm test -- integration/expense-settlement
```

---

### 4. E2E Tests (End-to-End)

**Purpose:** Test complete user flows in a real mobile environment

**Location:** `e2e/` (root of mobile app)

**Framework:** Detox

**Important:** ⚠️ E2E tests should **ONLY** run in CI/CD, not locally (they are flaky in local development)

#### Itinerary Flow

**File:** `e2e/itinerary-flow.e2e.ts`

**Test Scenarios:**
- ✅ Navigate to create itinerary screen
- ✅ Create new itinerary item
- ✅ Validation errors for empty fields
- ✅ Open itinerary detail on tap
- ✅ Edit itinerary item
- ✅ Delete itinerary item with confirmation
- ✅ Display items grouped by date
- ✅ Show time for non-all-day events
- ✅ Show location icon for items with location

**Run Command:**
```bash
npm run test:e2e:mobile -- e2e/itinerary-flow.e2e.ts
```

#### Expense Flow

**File:** `e2e/expense-flow.e2e.ts`

**Test Scenarios:**
- ✅ Navigate to create expense screen
- ✅ Create new expense with equal split
- ✅ Validation errors for required fields
- ✅ Select specific participants for split
- ✅ Open expense detail on tap
- ✅ Edit expense
- ✅ Cancel editing without saving
- ✅ Delete expense with confirmation
- ✅ Display expenses with category icons
- ✅ Show settlement summary with optimized debts
- ✅ Display participant splits
- ✅ Multi-currency expense creation

**Run Command:**
```bash
npm run test:e2e:mobile -- e2e/expense-flow.e2e.ts
```

#### Trip Management Flow

**File:** `e2e/trip-management.e2e.ts`

**Test Scenarios:**
- ✅ Navigate to trip settings
- ✅ Display trip details in view mode
- ✅ Enter edit mode
- ✅ Edit trip name and save
- ✅ Edit trip description
- ✅ Update trip dates
- ✅ Cancel editing without saving
- ✅ Validation errors for invalid input
- ✅ Display trip participants list
- ✅ Show participant roles
- ✅ Delete trip with confirmation
- ✅ Navigation back and forth
- ✅ Loading states

**Run Command:**
```bash
npm run test:e2e:mobile -- e2e/trip-management.e2e.ts
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test -- utils/formatCurrency          # Unit tests
npm test -- screens/itinerary             # Itinerary component tests
npm test -- screens/expenses              # Expense component tests
npm test -- integration                   # All integration tests
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Watch Mode (for development)
```bash
npm test -- --watch
```

### E2E Tests (CI/CD only)
```bash
npm run test:e2e:mobile
```

---

## Test Coverage Goals

| Test Type   | Current Coverage | Goal |
|-------------|------------------|------|
| Unit        | 100%            | 100% |
| Component   | ~90%            | 90%+ |
| Integration | ~95%            | 95%+ |
| E2E         | Key flows       | Key flows |

---

## Mocking Strategy

### Consistent Mocks Across All Tests

```typescript
// expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}))

// Supabase client
jest.mock('../lib/supabase/client', () => ({
  supabase: {},
}))

// Auth context
jest.mock('../lib/auth/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}))

// Toast notifications
jest.mock('../hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

// Core package queries
jest.mock('@tripthreads/core', () => ({
  getItineraryItem: jest.fn(),
  createItineraryItem: jest.fn(),
  updateItineraryItem: jest.fn(),
  deleteItineraryItem: jest.fn(),
  // ... etc
}))
```

---

## Writing New Tests

### Unit Test Template

```typescript
import { functionToTest } from '../path/to/function'

describe('functionToTest', () => {
  it('should do something', () => {
    const result = functionToTest(input)
    expect(result).toBe(expected)
  })

  it('should handle edge case', () => {
    const result = functionToTest(edgeCaseInput)
    expect(result).toBe(expectedEdgeCase)
  })
})
```

### Component Test Template

```typescript
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import MyComponent from '../app/path/to/MyComponent'

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}))

const mockRouter = { push: jest.fn(), back: jest.fn() }

describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('should render component', async () => {
    render(<MyComponent />)

    await waitFor(() => {
      expect(screen.getByText('Expected Text')).toBeTruthy()
    })
  })

  it('should handle user interaction', async () => {
    render(<MyComponent />)

    fireEvent.press(screen.getByText('Button'))

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalled()
    })
  })
})
```

### Integration Test Template

```typescript
import { functionUnderTest } from '@tripthreads/core'

describe('Integration Test', () => {
  it('should perform end-to-end flow', async () => {
    // Setup
    const input = { /* test data */ }

    // Execute
    const result = await functionUnderTest(input)

    // Verify
    expect(result).toMatchObject({
      // expected structure
    })
  })
})
```

---

## Best Practices

1. **Follow TDD:** Write tests first, then implement the feature
2. **Test Behavior, Not Implementation:** Focus on what the component does, not how
3. **Use Descriptive Test Names:** `it('should show validation error when required field is empty')`
4. **Mock External Dependencies:** Don't make real API calls in tests
5. **Test Edge Cases:** Empty states, loading states, error states
6. **Keep Tests Independent:** Each test should run in isolation
7. **Use `waitFor` for Async:** Always wait for async operations to complete
8. **Clean Up:** Use `beforeEach` and `afterEach` for setup/teardown

---

## Troubleshooting

### Common Issues

**Issue:** `TypeError: Cannot read property 'push' of undefined`
**Fix:** Ensure `useRouter` is properly mocked in `beforeEach`

**Issue:** `Warning: An update to X inside a test was not wrapped in act(...)`
**Fix:** Use `waitFor` for state updates or async operations

**Issue:** `Element not found`
**Fix:** Check that you're using the correct text/testID, and wait for async renders

**Issue:** E2E tests are flaky
**Fix:** Don't run E2E tests locally - let CI/CD handle them

---

## CI/CD Integration

Tests run automatically on every push via GitHub Actions:

```yaml
# .github/workflows/ci.yml
- name: Run Mobile Tests
  run: npm test --prefix apps/mobile

- name: Run E2E Tests
  run: npm run test:e2e:mobile --prefix apps/mobile
```

**Test Results:** Viewable in GitHub Actions logs

**Coverage Reports:** Generated and uploaded to coverage service

---

## Future Test Additions

- [ ] Snapshot tests for UI regression
- [ ] Accessibility tests (screen reader, keyboard nav)
- [ ] Performance tests (render times, memory usage)
- [ ] Visual regression tests
- [ ] More edge case scenarios
- [ ] API error handling tests
- [ ] Offline sync tests (Phase 2 feature)

---

## Related Documentation

- [Main CLAUDE.md](../../CLAUDE.md) - Project documentation
- [TDD Principles](../../CLAUDE.md#-test-driven-development-tdd-principles) - Testing philosophy
- [Mobile Status](../../docs/MOBILE_STATUS.md) - Mobile development progress

---

**Last Updated:** January 2025
**Test Coverage:** Unit (100%), Component (~90%), Integration (~95%), E2E (Key Flows)
**Status:** ✅ Comprehensive testing suite complete
