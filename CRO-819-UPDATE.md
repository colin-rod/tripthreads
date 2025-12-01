# CRO-819 Update: AI Parser Integration Test Suite

**Date:** November 2025
**Status:** Scope Change - Pivoted from NL Parser to AI Parser Testing

---

## Updated Issue Title

**OLD:** Natural Language Parser Test Suite
**NEW:** AI Parser Integration Test Suite

---

## Updated Description

### Summary

Comprehensive test suite for AI-based natural language parsing (OpenAI GPT-4o-mini) covering expense commands, itinerary commands, API integration, error handling, and LLM prompt validation.

### Context

TripThreads uses **OpenAI GPT-4o-mini for all natural language parsing** (expenses and itinerary). The originally planned client-side deterministic parser is not used in production (archived for potential future use as offline/fallback).

**Decision Documentation:** See `docs/AI_PARSER_DECISION.md`

### Scope

Test the **actual production AI parser implementation**:

- API route: `/apps/web/app/api/parse-with-openai/route.ts`
- LLM prompts: `/packages/core/src/parser/llm-prompts.ts`
- UI integration: `ExpenseInput.tsx`, `ItineraryInput.tsx`
- Fuzzy participant matching (post-parse)

---

## Updated Acceptance Criteria

### 1. ✅ Expense Parsing Integration Tests (50+ test cases)

**Location:** `apps/web/app/api/parse-with-openai/__tests__/expense-parsing.test.ts`

**Test Coverage:**

- Simple expenses: "€60 dinner", "$100 taxi"
- Split expenses: "Split $120 dinner 4 ways"
- Named participants: "Taxi £45 split with John and Sarah"
- Complex splits: "Alice paid $200 hotel, Bob owes 40%, Carol 30%"
- Multi-currency: "100 CHF groceries", "5000¥ sushi"
- Date/time: "Lunch yesterday €25", "Dinner tomorrow $50"
- Categories: Auto-inference from descriptions
- Edge cases: Typos, ambiguous amounts, missing info

**Mocking:** Mock OpenAI API responses using `jest.mock('openai')`

---

### 2. ✅ Itinerary Parsing Integration Tests (50+ test cases)

**Location:** `apps/web/app/api/parse-with-openai/__tests__/itinerary-parsing.test.ts`

**Test Coverage:**

- **Flights** (10+ tests): "Flight AA123 to Paris 9am Dec 15", "Flight from NYC tomorrow 2pm"
- **Hotels** (10+ tests): "Marriott check-in 3pm Dec 15", "Hotel Paris Dec 15-20"
- **Activities** (10+ tests): "Eiffel Tower tour 2pm Friday", "Museum visit tomorrow afternoon"
- **Restaurants** (5+ tests): "Dinner reservation Le Jules Verne 8pm", "Lunch at bistro 12:30"
- **Transportation** (5+ tests): "Train to Amsterdam 10:30am Dec 17", "Taxi to airport 6am"
- **Date formats** (10+ tests): Absolute dates, relative dates, ranges
- **Edge cases**: Missing times, ambiguous dates, incomplete information

**Mocking:** Mock OpenAI API responses with realistic itinerary data

---

### 3. ✅ LLM Prompt Unit Tests

**Location:** `packages/core/src/parser/__tests__/llm-prompts.test.ts`

**Test Coverage:**

- Verify `getExpenseParserPrompt()` structure and few-shot examples
- Verify `getDateParserPrompt()` structure and few-shot examples
- Test prompt handles all currencies (EUR, USD, GBP, JPY, CHF, etc.)
- Test prompt includes correct JSON schema
- Test prompt handles all split types (equal, percentage, custom, by_shares)
- Test few-shot examples are valid and representative

---

### 4. ✅ API Route Tests

**Location:** `apps/web/app/api/parse-with-openai/__tests__/route.test.ts`

**Test Coverage:**

- **Auth validation:** Returns 401 if not authenticated
- **Trip membership validation:** Returns 403 if user not trip member
- **OpenAI API call:** Verifies correct parameters (model, temperature, response_format)
- **Structured JSON parsing:** Validates response schema
- **Error handling:** Network errors, API failures gracefully handled
- **Sentry logging:** Errors logged to Sentry with correct context
- **Rate limit handling:** 429 responses handled gracefully
- **Timeout handling:** Slow responses don't hang

**Mocking:** Mock Supabase auth, OpenAI API, Sentry

---

### 5. ✅ Edge Cases & Ambiguous Inputs

**Location:** Distributed across test files

**Test Coverage:**

- **Typos and misspellings:** "Diner €60" → "Dinner"
- **Ambiguous amounts:** "$100-120" → resolve to single amount
- **Missing currency:** "60 dinner" → use default currency
- **Ambiguous dates:** "12/15" → resolve based on dateFormat option
- **Incomplete info:** "Flight to Paris" → extract what's available
- **Multiple commands:** "Dinner €60 and taxi £20" → handle or reject
- **Invalid input:** Random text → return error with helpful message
- **Empty input:** "" → return error

---

### 6. ✅ Fuzzy Participant Matching Tests

**Location:** `apps/web/lib/utils/__tests__/fuzzy-participant-matching.test.ts`

**Test Coverage:**

- **Exact matches:** "Alice" → Alice (100% confidence)
- **Typos:** "Alic", "Alcie" → Alice (high confidence)
- **Partial names:** "Tom" → "Thomas" (if unambiguous)
- **Accents:** "Jose" → "José" (normalization)
- **Ambiguous matches:** "Tom" when "Tom" and "Tommy" exist → show disambiguation
- **Unmatched names:** "Unknown" → trigger manual selection dialog
- **Auto-resolution threshold:** Confidence >0.85 auto-resolves
- **Minimum confidence:** Below 0.6 rejected

---

### 7. ✅ Error Handling Tests

**Location:** `apps/web/app/api/parse-with-openai/__tests__/error-handling.test.ts`

**Test Coverage:**

- **OpenAI API down:** Network error → graceful error message
- **Rate limit exceeded:** 429 response → "Try again later" message
- **Invalid JSON from OpenAI:** Malformed response → retry or error
- **Timeout:** Slow response (>10s) → timeout and error
- **Invalid auth token:** Expired session → 401 redirect to login
- **Trip not found:** Invalid tripId → 404 error
- **Missing OpenAI API key:** Server config error → 500 with Sentry alert
- **Sentry error logging:** All errors logged with correct severity

**Mocking:** Mock various failure scenarios

---

### 8. ✅ Integration Tests (Full Flow)

**Location:** `apps/web/components/features/expenses/__tests__/expense-input-integration.test.ts`

**Test Coverage:**

- **Full expense creation flow:** Type input → parse → preview → submit
- **Preview card rendering:** Parsed values displayed correctly
- **"AI Parsed" badge shown:** Indicates AI parsing used
- **Edit before submit:** User can modify parsed values
- **Participant disambiguation:** Shows dialog for ambiguous matches
- **Unmatched participants:** Shows manual selection dialog
- **Form validation:** Prevents submission of invalid data
- **Success flow:** Expense created in database after submission

**Mocking:** Mock Supabase, OpenAI, use React Testing Library

---

### 9. ✅ Cost Optimization & Performance

**Location:** Various test files

**Test Coverage:**

- **API call frequency:** Verify debouncing/throttling if implemented
- **Caching strategy:** Test if common patterns cached (if implemented)
- **Performance benchmarks:** Measure average parse latency (<1000ms target)
- **Token usage:** Estimate token consumption per parse
- **Cost estimation:** Document estimated monthly cost for various usage levels

---

## Technical Approach

### Mocking Strategy

```typescript
// Mock OpenAI API
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  amount: 6000,
                  currency: 'EUR',
                  description: 'Dinner',
                  splitType: 'equal',
                  splitCount: 4,
                  confidence: 0.95,
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}))
```

### Test Fixtures

Create fixtures with realistic test data:

- `__fixtures__/expense-responses.ts` - OpenAI responses for expenses
- `__fixtures__/itinerary-responses.ts` - OpenAI responses for itinerary
- `__fixtures__/error-responses.ts` - Error scenarios

### Test Organization

```
apps/web/app/api/parse-with-openai/__tests__/
├── route.test.ts                    # API route tests
├── expense-parsing.test.ts          # 50+ expense tests
├── itinerary-parsing.test.ts        # 50+ itinerary tests
├── error-handling.test.ts           # Error scenarios
└── __fixtures__/
    ├── expense-responses.ts
    ├── itinerary-responses.ts
    └── error-responses.ts

packages/core/src/parser/__tests__/
└── llm-prompts.test.ts              # LLM prompt unit tests

apps/web/components/features/expenses/__tests__/
└── expense-input-integration.test.ts # Full flow integration

apps/web/lib/utils/__tests__/
└── fuzzy-participant-matching.test.ts # Participant matching
```

---

## Success Metrics

### Test Coverage

- ✅ 100+ total test cases (50+ expense, 50+ itinerary, 20+ other)
- ✅ All API routes covered (auth, validation, error handling)
- ✅ All LLM prompts validated (structure, examples, schema)
- ✅ All error scenarios tested (network, rate limit, timeout)

### Quality Metrics

- ✅ All tests pass in CI
- ✅ Tests use mocked OpenAI (no real API calls)
- ✅ Tests run in <10 seconds (fast feedback loop)
- ✅ 100% coverage of AI parser integration code

### Documentation

- ✅ `docs/AI_PARSER_DECISION.md` - Decision rationale
- ✅ `docs/AI_PARSER_TESTING.md` - Testing strategy
- ✅ `packages/core/src/parser/README.md` - NL parser archived status
- ✅ CLAUDE.md updated to reflect AI parsing

---

## Dependencies

### Blocked By

- None (all dependencies resolved)

### Blocks

- None (testing task doesn't block other work)

### Related Issues

- CRO-801: Itinerary Builder (uses AI parsing)
- CRO-847: Expense Natural Language Input (uses AI parsing)
- CRO-846: Date/Time Natural Language Parsing (uses AI parsing)

---

## Estimated Effort

**Original Estimate:** 16-22 hours (for NL parser tests)
**Updated Estimate:** 12-16 hours (for AI parser integration tests)

**Breakdown:**

- API route tests: 3-4 hours
- Expense parsing tests (50+): 3-4 hours
- Itinerary parsing tests (50+): 3-4 hours
- LLM prompt tests: 1-2 hours
- Error handling tests: 1-2 hours
- Integration tests: 2-3 hours
- Documentation: 1-2 hours

---

## Implementation Notes

### Phase 1: Setup & Mocking (2-3 hours)

- Set up test file structure
- Create OpenAI mocks
- Create test fixtures
- Configure Jest for API route testing

### Phase 2: Core Tests (6-8 hours)

- Implement API route tests
- Implement 50+ expense tests
- Implement 50+ itinerary tests
- Implement LLM prompt tests

### Phase 3: Edge Cases & Integration (3-4 hours)

- Error handling tests
- Fuzzy matching tests
- Full integration tests
- Performance tests

### Phase 4: Documentation (1-2 hours)

- Create AI_PARSER_TESTING.md
- Update TESTING.md
- Add inline documentation

---

## Deliverables

1. ✅ Test suite with 100+ test cases
2. ✅ All 9 acceptance criteria met
3. ✅ CI/CD integration (tests run on every PR)
4. ✅ Documentation (AI_PARSER_DECISION.md, AI_PARSER_TESTING.md)
5. ✅ Test fixtures for easy expansion
6. ✅ Mocking strategy documented

---

## Notes

- **Client-side NL parser preserved:** Code and tests remain in codebase for potential future use (offline mode, fallback, cost optimization)
- **No real API calls in tests:** All OpenAI calls mocked to avoid costs and ensure test reliability
- **TDD principles maintained:** Tests document expected behavior and catch regressions

---

**Status:** Ready to implement
**Priority:** Medium (testing task for existing functionality)
**Assignee:** TBD
**Sprint:** Phase 2/3 transition

---

## Copy-Paste for Linear

**Title:** AI Parser Integration Test Suite

**Description:**

Comprehensive test suite for AI-based natural language parsing (OpenAI GPT-4o-mini) covering expense commands, itinerary commands, API integration, error handling, and LLM prompt validation.

Context: TripThreads uses OpenAI GPT-4o-mini for all NL parsing. The client-side deterministic parser is archived. See `docs/AI_PARSER_DECISION.md`.

**Acceptance Criteria:**

1. 50+ expense parsing integration tests (API route, OpenAI mocked)
2. 50+ itinerary parsing integration tests (API route, OpenAI mocked)
3. LLM prompt unit tests (structure, schema, few-shot examples)
4. API route tests (auth, validation, error handling, Sentry)
5. Edge cases & ambiguous inputs handled
6. Fuzzy participant matching tests (post-parse name resolution)
7. Error handling tests (network, rate limit, timeout, invalid JSON)
8. Integration tests (full expense/itinerary creation flow)
9. Cost optimization & performance tests

**Estimate:** 12-16 hours

**Labels:** testing, ai, parser, phase-2

**Linked Issues:** CRO-801, CRO-847, CRO-846
