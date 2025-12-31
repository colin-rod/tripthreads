# AI Parser Deployment Checklist

## 🚀 Branch: `nlp-parse-test`

**Commit:** `6f63dbf` - feat(ai-parser): integrate OpenAI GPT-4o-mini for natural language expense and itinerary input

**GitHub PR:** https://github.com/colin-rod/tripthreads/pull/new/nlp-parse-test

---

## ✅ Pre-Deployment Checklist

### 1. Environment Variables

**Required in Production:**

```bash
OPENAI_API_KEY=sk-...your-api-key...
```

**Get your API key:**

- Go to: https://platform.openai.com/api-keys
- Create new secret key
- Copy and save securely

**Add to Vercel Environment Variables:**

1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add `OPENAI_API_KEY` with your key
3. Apply to: Production, Preview, Development (optional)

### 2. Dependencies

Already installed in `package.json`:

- ✅ `openai` (^6.8.0)
- ✅ `sonner` (toast notifications)
- ✅ `date-fns` (date formatting)
- ✅ `shadcn/ui` components (tabs, alert, etc.)

### 3. Database

**No migrations required** - AI parser uses existing tables:

- `trips`
- `trip_participants`
- `expenses` (existing table)
- `expense_participants` (existing table)
- `itinerary_items` (existing table)

**Note:** RL (reinforcement learning) tables were NOT created as that code was removed.

### 4. Code Review

**Files to Review:**

- [ ] `apps/web/app/api/parse-with-openai/route.ts` - API route
- [ ] `apps/web/components/features/expenses/ExpenseInput.tsx` - Expense UI
- [ ] `apps/web/components/features/itinerary/ItineraryInput.tsx` - Itinerary UI
- [ ] `apps/web/app/actions/expenses.ts` - Server action
- [ ] `apps/web/app/actions/itinerary.ts` - Server action
- [ ] `apps/web/app/(app)/trips/[id]/page.tsx` - Enhanced trip page

**Known Issues:**

- Minor ESLint warnings (unused imports in test files, `any` types in options)
- Non-blocking, can be fixed in follow-up PR

---

## 🧪 Testing Checklist

### Local Testing

Before deploying, test locally:

1. **Add API key to `.env.local`:**

   ```bash
   echo "OPENAI_API_KEY=sk-..." >> apps/web/.env.local
   ```

2. **Start dev server:**

   ```bash
   npm run dev
   ```

3. **Test Expense Input:**
   - Navigate to a trip: `http://localhost:3000/trips/[trip-id]`
   - Go to "Expenses" tab
   - Enter: "Dinner €60 split 4 ways"
   - Click "Parse"
   - Verify AI preview card
   - Click "Confirm & Save"
   - Should see success toast

4. **Test Itinerary Input:**
   - Go to "Timeline" tab
   - Enter: "Flight to Paris Monday 9am"
   - Click "Parse"
   - Verify AI preview card
   - Click "Confirm & Save"
   - Should see success toast

5. **Test Role-Based Access:**
   - As viewer: Should NOT see input components
   - As participant: Should see input components
   - As owner: Should see input components

### Staging Testing

After deploying to staging:

- [ ] Test expense parsing with various inputs
- [ ] Test itinerary parsing with various inputs
- [ ] Test multi-currency (EUR, USD, GBP, JPY, etc.)
- [ ] Test split types (equal, custom splits)
- [ ] Test payer detection
- [ ] Test date parsing (relative, absolute, ranges)
- [ ] Test role-based permissions
- [ ] Test on mobile devices
- [ ] Monitor API usage and costs
- [ ] Check error handling (invalid API key, rate limits, etc.)

---

## 📊 Monitoring

### OpenAI API Usage

**Monitor in OpenAI Dashboard:**

- https://platform.openai.com/usage
- Track daily/monthly usage
- Set up usage alerts

**Expected Usage:**

- Average: 100-250 tokens per parse
- Cost: ~$0.00005 per parse
- 1,000 parses/day: ~$0.05/day = ~$1.50/month
- 10,000 parses/month: ~$0.50/month

**Set Usage Limits:**

- Go to: https://platform.openai.com/account/billing/limits
- Set monthly limit (e.g., $10/month)
- Enable email alerts

### Error Monitoring

**Sentry (already configured):**

- Monitor for OpenAI API errors
- Track parsing failures
- Monitor server action errors

**Logs to Watch:**

- `[OpenAI API]` prefixed logs
- Expense creation errors
- Itinerary creation errors
- RLS policy violations

---

## 🔒 Security

### API Key Security

- ✅ API key is server-side only (never exposed to client)
- ✅ API route is in `apps/web/app/api/` (server-side)
- ✅ Server actions enforce RLS policies

### Rate Limiting

**OpenAI has built-in rate limits:**

- Tier 1 (Free): 3 RPM, 200 RPD
- Tier 2 ($5+ spent): 3,500 RPM
- Tier 3 ($50+ spent): 5,000 RPM

**If rate limited:**

- Return friendly error to user
- Implement retry with exponential backoff
- Consider caching common parses

### Input Validation

Currently basic validation. Consider adding:

- [ ] Input length limits (e.g., max 500 chars)
- [ ] Rate limiting per user (e.g., 50 parses/hour)
- [ ] Sanitize input before sending to OpenAI
- [ ] Detect and block spam/abuse

---

## 💰 Cost Management

### Current Pricing (GPT-4o-mini)

- **Input**: $0.150 / 1M tokens (~$0.00015 per 1K tokens)
- **Output**: $0.600 / 1M tokens (~$0.0006 per 1K tokens)

### Estimated Costs

| Usage Level | Parses/Month | Est. Cost/Month |
| ----------- | ------------ | --------------- |
| Low (Beta)  | 1,000        | $0.05           |
| Medium      | 10,000       | $0.50           |
| High        | 100,000      | $5.00           |
| Very High   | 1M           | $50.00          |

### Cost Optimization

If costs become an issue:

1. **Implement caching:**
   - Cache common parses (e.g., "Dinner €60 split 4 ways")
   - Store in Redis or similar
   - 1-hour TTL

2. **Fallback to regex:**
   - Try regex parser first
   - Use OpenAI only if regex fails
   - Regex parsers are in `packages/shared/src/parser/`

3. **Batch processing:**
   - Not applicable for real-time parsing

4. **Switch to cheaper model:**
   - GPT-3.5-turbo is cheaper but less accurate
   - Not recommended for production

---

## 🚢 Deployment Steps

### Step 1: Create Pull Request

```bash
# Already pushed to branch
gh pr create --base main --head nlp-parse-test \
  --title "feat(ai-parser): integrate OpenAI GPT-4o-mini for natural language parsing" \
  --body "$(cat <<'EOF'
## Summary
Complete integration of OpenAI GPT-4o-mini parser for natural language expense and itinerary input.

## Changes
- ✅ OpenAI parser API endpoint
- ✅ Expense and itinerary input components
- ✅ Server actions for database operations
- ✅ Enhanced trip detail page with tabs
- ✅ Role-based access control
- ✅ Toast notifications
- ✅ Cleanup of experimental code

## Testing
- [x] Local testing completed
- [ ] Staging testing pending
- [ ] E2E tests (will run in CI)

## Documentation
- AI_PARSER_INTEGRATION.md
- NLP_CLEANUP_SUMMARY.md
- DEPLOYMENT_CHECKLIST.md

## Cost
~$0.00005 per parse (very affordable)

## Next Steps
1. Add OPENAI_API_KEY to Vercel
2. Test on staging
3. Monitor usage and costs
4. Fix ESLint warnings (follow-up PR)
EOF
)"
```

### Step 2: Configure Vercel

1. **Add Environment Variable:**
   - Vercel Dashboard → tripthreads → Settings → Environment Variables
   - Name: `OPENAI_API_KEY`
   - Value: `sk-...your-key...`
   - Environments: Production, Preview

2. **Deploy Preview:**
   - PR will auto-deploy to preview URL
   - Test on preview before merging

### Step 3: Merge to Main

```bash
# After PR approval and testing
gh pr merge --squash --delete-branch
```

### Step 4: Monitor Deployment

1. **Vercel Deployment:**
   - Watch deployment logs
   - Verify successful build
   - Check production URL

2. **OpenAI Usage:**
   - https://platform.openai.com/usage
   - Monitor first few hours/days

3. **Error Monitoring:**
   - Check Sentry for any errors
   - Monitor Vercel function logs

---

## 🐛 Rollback Plan

If issues arise:

### Option 1: Revert PR

```bash
git revert 6f63dbf
git push origin main
```

### Option 2: Feature Flag

Add feature flag to disable AI parser:

```typescript
// In .env
ENABLE_AI_PARSER = false

// In components
if (process.env.NEXT_PUBLIC_ENABLE_AI_PARSER === 'true') {
  // Show AI parser
} else {
  // Show manual form
}
```

### Option 3: Switch to Backup

The regex-based parsers are still in codebase:

- `packages/shared/src/parser/date.ts`
- `packages/shared/src/parser/expense.ts`

Can quickly switch to those if needed.

---

## 📝 Post-Deployment Tasks

After successful deployment:

1. **Monitor for 24 hours:**
   - [ ] Check error rates
   - [ ] Monitor API costs
   - [ ] Review user feedback

2. **Fix ESLint warnings:**
   - [ ] Remove unused imports
   - [ ] Replace `any` types with proper types
   - [ ] Fix test file issues

3. **Optimize if needed:**
   - [ ] Add caching for common parses
   - [ ] Implement rate limiting per user
   - [ ] Add input validation

4. **Enhance features:**
   - [ ] Add expense and itinerary list displays
   - [ ] Implement edit/delete functionality
   - [ ] Add expense settlement calculations
   - [ ] Create visual timeline for itinerary

5. **Documentation:**
   - [ ] Update user-facing documentation
   - [ ] Add to onboarding/tutorial
   - [ ] Create video demo

---

## 🎯 Success Metrics

Track these metrics post-deployment:

| Metric              | Target                            | Check At        |
| ------------------- | --------------------------------- | --------------- |
| Parser success rate | >90%                              | 24h, 1 week     |
| Average parse time  | <2s                               | 24h, 1 week     |
| User adoption       | >50% of expense/itinerary entries | 1 week, 1 month |
| API cost            | <$10/month                        | Weekly          |
| Error rate          | <2%                               | Daily           |
| User satisfaction   | Positive feedback                 | Ongoing         |

---

## 🆘 Support

**If you encounter issues:**

1. **Check logs:**
   - Vercel function logs
   - Browser console
   - Sentry errors

2. **Verify environment:**
   - OPENAI_API_KEY is set
   - API key is valid
   - OpenAI account has credit

3. **Test API directly:**

   ```bash
   curl https://tripthreads.app/api/parse-with-openai \
     -H "Content-Type: application/json" \
     -d '{"input":"Dinner €60 split 4 ways","parserType":"expense"}'
   ```

4. **Contact support:**
   - OpenAI: https://help.openai.com/
   - Vercel: https://vercel.com/support

---

**Deployment Owner:** Colin Rodrigues
**Date Prepared:** 2025-11-05
**Status:** ✅ Ready for deployment
