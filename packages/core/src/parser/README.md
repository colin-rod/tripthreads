# Natural Language Parser (Archived)

**Status:** 📦 **ARCHIVED / DORMANT**
**Last Active:** Phase 1 (2025)
**Current Usage:** ❌ **NOT USED IN PRODUCTION**

---

## ⚠️ Important Notice

**This client-side deterministic parser is NOT currently used in the TripThreads application.**

The production app uses **AI-based parsing** via OpenAI GPT-4o-mini instead. See [docs/AI_PARSER_DECISION.md](../../../../docs/AI_PARSER_DECISION.md) for the full context and decision rationale.

---

## What Is This Code?

This directory contains a **fully functional client-side natural language parser** for:

- **Expense parsing** (`expense.ts`) - Extract amount, currency, split type, participants
- **Date/time parsing** (`date.ts`) - Extract dates, times, ranges using chrono-node
- **Itinerary parsing** - NOT IMPLEMENTED (was planned but never built)

### Technology Stack

- **chrono-node** - Date/time extraction library
- **Custom tokenizer** - Pattern-based currency and amount extraction
- **Deterministic rules** - No AI/ML, purely rule-based

### Test Coverage

- ✅ **75 tests** for expense parsing (`__tests__/expense.test.ts`)
- ✅ **30 tests** for date parsing (`__tests__/date.test.ts`)
- ✅ **All tests pass** (as of Phase 2)

**Note:** These tests are testing code that is not used in production.

---

## Why Is It Archived?

### Original Plan

The initial architecture (Phase 1) called for client-side deterministic parsing:

- Fast (<10ms latency)
- Free (no API costs)
- Offline-capable
- Privacy-friendly (no data sent to third parties)

### What Changed

During implementation, the team switched to **OpenAI GPT-4o-mini** for parsing:

- **Superior accuracy**: ~95% vs ~80% (estimated)
- **Better user experience**: Handles complex, novel inputs naturally
- **Lower maintenance**: No need to add rules for every pattern
- **Acceptable cost**: ~$0.00015 per parse (~$4.50/month for 1k parses/day)

### Decision

**AI parsing wins on user experience** - accuracy and flexibility outweigh the cost and latency trade-offs for MVP.

**For full analysis, see:** [docs/AI_PARSER_DECISION.md](../../../../docs/AI_PARSER_DECISION.md)

---

## Why Keep This Code?

The NL parser code is **preserved (not deleted)** for potential future use:

### 1. Offline Mode (Phase 2+)

Use deterministic parser when offline, AI when online:

```typescript
async function parseExpense(input: string) {
  if (navigator.onLine) {
    return parseWithOpenAI(input)
  } else {
    return parseExpenseDeterministic(input) // This code
  }
}
```

### 2. Fallback Strategy

If OpenAI API is down, fall back to NL parser:

```typescript
async function parseExpense(input: string) {
  try {
    return await parseWithOpenAI(input)
  } catch (error) {
    console.warn('OpenAI API unavailable, falling back to deterministic parser')
    return parseExpenseDeterministic(input)
  }
}
```

### 3. Hybrid Approach (Cost Optimization)

Detect simple patterns client-side, use AI for complex cases:

```typescript
async function parseExpense(input: string) {
  // Try simple pattern first (free, instant)
  const simpleResult = parseExpenseDeterministic(input)
  if (simpleResult.confidence > 0.9) {
    return simpleResult // 50-70% of cases
  }

  // Use AI for complex cases
  return parseWithOpenAI(input) // 30-50% of cases
}
```

### 4. Privacy/Compliance

Enterprise users may prefer data not sent to OpenAI:

```typescript
const parser = user.isPro && user.privacyMode ? parseExpenseDeterministic : parseWithOpenAI
```

---

## File Structure

```
packages/core/src/parser/
├── README.md               # This file
├── parser.ts               # Type definitions (ParsedExpense, ParsedDateTime, etc.)
├── llm-prompts.ts          # OpenAI prompts (ACTIVE - used in production)
├── expense.ts              # Deterministic expense parser (ARCHIVED)
├── date.ts                 # Deterministic date parser (ARCHIVED)
└── __tests__/
    ├── expense.test.ts     # 75 tests for expense.ts (tests archived code)
    └── date.test.ts        # 30 tests for date.ts (tests archived code)
```

---

## Active Production Code

**The following files ARE used in production:**

1. **`llm-prompts.ts`** - OpenAI few-shot prompts for expense and date parsing
2. **`parser.ts`** - TypeScript types (`ParsedExpense`, `ParsedDateTime`, etc.)

**Location of AI Parser Implementation:**

- API Route: [`apps/web/app/api/parse-with-openai/route.ts`](../../../../apps/web/app/api/parse-with-openai/route.ts)
- UI Integration: [`apps/web/components/features/expenses/ExpenseInput.tsx`](../../../../apps/web/components/features/expenses/ExpenseInput.tsx)
- UI Integration: [`apps/web/components/features/itinerary/ItineraryInput.tsx`](../../../../apps/web/components/features/itinerary/ItineraryInput.tsx)

---

## How to Re-activate This Code

If you decide to use the deterministic parser in the future:

### 1. Import the Functions

```typescript
import { parseExpense } from '@tripthreads/core/parser/expense'
import { parseDateTime } from '@tripthreads/core/parser/date'
```

### 2. Update Tests

The existing tests should still pass, but you may need to:

- Update test expectations for any schema changes
- Add new test cases for patterns not covered
- Verify confidence scoring aligns with new requirements

### 3. Implement Itinerary Parser

The itinerary parser was **never implemented**. If needed:

- Create `itinerary.ts` with `parseItinerary()` function
- Add types to `parser.ts` for `ParsedItinerary`
- Create `__tests__/itinerary.test.ts` with 50+ test cases

### 4. Update Documentation

- Update CLAUDE.md to note hybrid or deterministic approach
- Document which parser is used when
- Update AI_PARSER_DECISION.md with the change

---

## Testing

### Run Archived Tests

```bash
# All parser tests
npm test -- packages/core/src/parser

# Expense parser tests only
npm test -- expense.test.ts

# Date parser tests only
npm test -- date.test.ts
```

**Note:** These tests pass but test code not used in production.

---

## Related Documentation

- **AI Parser Decision:** [docs/AI_PARSER_DECISION.md](../../../../docs/AI_PARSER_DECISION.md) - Why we use AI parsing
- **AI Parser Testing:** [docs/AI_PARSER_TESTING.md](../../../../docs/AI_PARSER_TESTING.md) - How to test the AI parser (TBD)
- **Project Overview:** [CLAUDE.md](../../../../CLAUDE.md) - Full project documentation

---

## Maintenance Status

| Aspect                 | Status                            |
| ---------------------- | --------------------------------- |
| **Code**               | ✅ Functional (no known bugs)     |
| **Tests**              | ✅ Passing (105+ tests)           |
| **Documentation**      | ✅ Complete                       |
| **Production Usage**   | ❌ Not used                       |
| **Active Development** | ❌ Paused                         |
| **Future Plans**       | 📋 Potential offline/fallback use |

**Last Reviewed:** November 2025
**Reviewed By:** Colin Rodriguez

---

**Questions?** See [docs/AI_PARSER_DECISION.md](../../../../docs/AI_PARSER_DECISION.md) or reach out to the team.
