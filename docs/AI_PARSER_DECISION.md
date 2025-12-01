# AI Parser Decision Documentation

**Date:** November 2025
**Decision:** Use OpenAI GPT-4o-mini for natural language parsing instead of client-side deterministic parser
**Status:** ✅ Implemented and Active

---

## Executive Summary

TripThreads uses **AI-based parsing** (OpenAI GPT-4o-mini) for all natural language input processing, including expense creation and itinerary item creation. A client-side deterministic parser was initially developed but is **not used in production**.

---

## Decision Context

### Original Plan (Phase 1)

The initial architecture called for a **client-side deterministic parser**:

- Technology: `chrono-node` for dates, custom tokenizer for currency/amounts
- Benefits: Fast (<10ms), free, offline-capable, deterministic
- Location: `packages/core/src/parser/`

This parser was fully implemented with comprehensive test coverage (100+ tests).

### Actual Implementation

During development, the team switched to **OpenAI GPT-4o-mini** via API:

- API Route: `/apps/web/app/api/parse-with-openai/route.ts`
- UI Integration: `ExpenseInput.tsx`, `ItineraryInput.tsx`
- LLM Prompts: `packages/core/src/parser/llm-prompts.ts`

---

## Trade-off Analysis

| Factor              | Client-Side NL Parser             | AI-Based Parser (Current)                     |
| ------------------- | --------------------------------- | --------------------------------------------- |
| **Accuracy**        | ~80% (estimated, rule-based)      | **~95% (LLM-based)** ✅                       |
| **Latency**         | <10ms (instant)                   | ~500-1000ms (API call)                        |
| **Cost**            | Free (client-side)                | ~$0.00015/parse (~$4.50/mo for 1k parses/day) |
| **Offline Support** | ✅ Yes                            | ❌ No (requires internet)                     |
| **Maintenance**     | High (add rules for each pattern) | Low (model improves over time)                |
| **Flexibility**     | Low (hardcoded patterns)          | **High (handles novel inputs)** ✅            |
| **User Experience** | Good (fast)                       | **Better (more accurate)** ✅                 |
| **Deterministic**   | ✅ Yes (same input = same output) | ❌ No (slight variations possible)            |

### Why AI Parser Won

**Primary Reasons:**

1. **Superior Accuracy** (~95% vs ~80%)
   - Handles complex splits: "Alice paid $200 for hotel, Bob owes 40%, Carol owes 30%, I'll cover the rest"
   - Understands context: "Lunch yesterday at the bistro near the Eiffel Tower €45"
   - Handles typos and variations: "Split diner 60 euro 4 way"

2. **Better User Experience**
   - Users can type naturally without learning syntax
   - Fewer parse errors = fewer manual corrections
   - Handles edge cases gracefully

3. **Lower Maintenance**
   - No need to add rules for every new pattern
   - Model improves over time without code changes
   - Fewer bug reports for "parser didn't understand me"

4. **Cost is Acceptable**
   - GPT-4o-mini is very cheap (~$0.00015 per request)
   - For 1,000 parses/day: ~$4.50/month
   - Worth it for 15% accuracy improvement

**Secondary Considerations:**

- Latency (500ms) is acceptable for non-blocking UX (preview card loads with spinner)
- Offline mode deferred to Phase 2+ (not MVP blocker)
- Internet requirement acceptable for web app MVP

---

## Current Implementation

### Expense Parsing

**File:** `apps/web/components/features/expenses/ExpenseInput.tsx`

**Flow:**

1. User types: "Split €60 dinner 4 ways"
2. Component calls: `parseWithOpenAI({ input, parserType: 'expense', model: 'gpt-4o-mini' })`
3. API route (`/api/parse-with-openai/route.ts`) sends to OpenAI with few-shot prompt
4. OpenAI returns structured JSON: `{ amount: 6000, currency: 'EUR', splitType: 'equal', splitCount: 4, ... }`
5. Preview card shows parsed values with "AI Parsed" badge
6. User confirms or edits before submission

**LLM Prompt:** `packages/core/src/parser/llm-prompts.ts:getExpenseParserPrompt()`

### Itinerary Parsing

**File:** `apps/web/components/features/itinerary/ItineraryInput.tsx`

**Flow:**

1. User types: "Flight to Paris 9am Dec 15"
2. Component calls: `parseWithOpenAI({ input, parserType: 'date', model: 'gpt-4o-mini' })`
3. API route sends to OpenAI with date parsing prompt
4. OpenAI returns: `{ type: 'flight', location: 'Paris', startDate: '2025-12-15T09:00:00Z', ... }`
5. Preview card shows parsed values
6. User confirms or edits before submission

**LLM Prompt:** `packages/core/src/parser/llm-prompts.ts:getDateParserPrompt()`

### Fuzzy Participant Matching

**Post-Processing (Client-Side):**

After AI returns participant names, client-side fuzzy matching resolves names to trip participants:

- File: `apps/web/lib/utils/fuzzy-participant-matching.ts`
- Handles typos: "Alic" → "Alice"
- Handles partial names: "Tom" → "Thomas"
- Shows disambiguation dialog for ambiguous matches
- Shows manual selection for unmatched names

This is separate from parsing (happens after AI parse completes).

---

## Status of Client-Side NL Parser

### Code Location

- **Implementation:** `packages/core/src/parser/expense.ts`, `date.ts`
- **Tests:** `packages/core/src/parser/__tests__/expense.test.ts` (75 tests), `date.test.ts` (30 tests)
- **Types:** `packages/core/src/parser/parser.ts`

### Current Status: **Archived / Dormant**

- ✅ Code is fully functional
- ✅ Tests pass (100+ test cases)
- ❌ **NOT imported or used anywhere in production**
- ❌ NOT actively maintained

### Why Keep It?

**Preserved for potential future use:**

1. **Offline Mode (Phase 2+)**
   - Use NL parser when offline, AI when online
   - Graceful degradation for PWA

2. **Fallback Strategy**
   - If OpenAI API is down, fall back to NL parser
   - Better UX than "parsing unavailable"

3. **Cost Optimization**
   - Detect simple patterns client-side: "€60 dinner"
   - Only use AI for complex cases: "Alice paid $200 for hotel, Bob owes 40%"
   - Hybrid approach could save API costs

4. **Privacy/Compliance**
   - Some users may prefer data not sent to OpenAI
   - Enterprise feature: optional client-side parsing

**No immediate plans to delete** - keeping code is low cost, provides optionality.

---

## Future Considerations

### Potential Hybrid Approach

```typescript
async function parseExpense(input: string) {
  // Try simple pattern matching first (free, instant)
  const simpleResult = tryDeterministicParse(input)
  if (simpleResult.confidence > 0.9) {
    return simpleResult
  }

  // Fall back to AI for complex cases
  return parseWithOpenAI(input)
}
```

**Benefits:**

- 50-70% of expenses could be parsed client-side (simple patterns)
- Save API costs on straightforward cases
- Maintain high accuracy for complex cases

### Offline Support (Phase 2+)

When implementing offline mode:

- Use IndexedDB/Dexie.js to queue parse requests
- Parse client-side when offline
- Re-parse with AI when online (if needed)
- Sync corrections back to device

---

## Testing Strategy

### AI Parser Tests (CRO-819 - Current Focus)

**Location:** `apps/web/app/api/parse-with-openai/__tests__/`

**Coverage:**

- 50+ expense parsing test cases
- 50+ itinerary parsing test cases
- API route tests (auth, validation, error handling)
- LLM prompt tests (structure, few-shot examples)
- Error handling (rate limits, timeouts, invalid JSON)
- Integration tests (full expense/itinerary creation flow)

**Mocking:** Use `jest.mock('openai')` to avoid real API calls in tests

### NL Parser Tests (Archived)

**Location:** `packages/core/src/parser/__tests__/`

**Status:** Tests pass but for unused code
**Maintenance:** Keep tests for potential future use, don't actively maintain

---

## Related Documentation

- **Testing Strategy:** [docs/AI_PARSER_TESTING.md](./AI_PARSER_TESTING.md)
- **LLM Prompts:** [packages/core/src/parser/llm-prompts.ts](../packages/core/src/parser/llm-prompts.ts)
- **API Route:** [apps/web/app/api/parse-with-openai/route.ts](../apps/web/app/api/parse-with-openai/route.ts)
- **NL Parser (Archived):** [packages/core/src/parser/README.md](../packages/core/src/parser/README.md)

---

## Decision Log

| Date     | Decision                                   | Rationale                                                          |
| -------- | ------------------------------------------ | ------------------------------------------------------------------ |
| Nov 2025 | Use OpenAI GPT-4o-mini for all parsing     | Superior accuracy (~95% vs ~80%), better UX, acceptable cost       |
| Nov 2025 | Keep NL parser code (archived)             | Preserve optionality for offline mode, fallback, cost optimization |
| Nov 2025 | Document decision in AI_PARSER_DECISION.md | Clarify for future contributors, avoid confusion                   |

---

## Monitoring & Metrics

**Track in Production:**

- Parse success rate (% of successful AI parses)
- Parse latency (p50, p95, p99)
- OpenAI API costs (monthly spend)
- User edit rate (% of previews edited before submission)
- Error rate (API failures, timeouts)

**Target Metrics:**

- Parse success rate: >95%
- p95 latency: <1000ms
- Monthly cost: <$10 for MVP
- User edit rate: <20% (indicates good accuracy)

**Tools:**

- Sentry: Error tracking
- Vercel Analytics: Latency monitoring
- OpenAI Dashboard: Usage/cost tracking

---

**Last Updated:** November 2025
**Owner:** Colin Rodriguez
**Status:** Active Implementation
