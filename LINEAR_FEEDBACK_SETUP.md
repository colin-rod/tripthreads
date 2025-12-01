# Linear Feedback Integration - Environment Variables Setup

## Overview

The feedback system now supports user-selectable categories that automatically apply both the parent "Feedback" label and a specific category label in Linear.

## Required Supabase Environment Variables

You need to configure **7 environment variables** in your Supabase project settings:

### 1. Core Configuration (Already Set)

```bash
LINEAR_API_KEY=<YOUR_LINEAR_API_KEY>
LINEAR_FEEDBACK_TEAM_ID=<YOUR_TEAM_ID>
```

### 2. Label IDs (Need to be Added)

Based on your Linear workspace, configure these label IDs:

```bash
# Parent "Feedback" label (groups all feedback issues)
LINEAR_FEEDBACK_LABEL_ID=7a4da26e-cb8e-4852-b547-678b58b75bf3

# Category labels (child labels under Feedback)
LINEAR_BUG_REPORT_LABEL_ID=0802fe04-8513-4069-b8c2-487cdde2cc2a
LINEAR_FEATURE_REQUEST_LABEL_ID=690d1f25-62bf-472d-a6e7-e122aa18bf72
LINEAR_GENERAL_LABEL_ID=81ebdc6e-c0a8-44a6-b408-49af94f95165
LINEAR_UX_ISSUE_LABEL_ID=ba1e30f2-a6d4-4887-bf00-23a1d0ee4071
```

## Label Mapping

| User Selects     | Linear Labels Applied          |
| ---------------- | ------------------------------ |
| Bug Report       | "Feedback" + "Bug Report"      |
| Feature Request  | "Feedback" + "Feature Request" |
| General Feedback | "Feedback" + "General"         |
| UX Issue         | "Feedback" + "UX Issue"        |

## Configuration Steps

### Step 1: Add Environment Variables to Supabase

1. Go to your Supabase Dashboard
2. Navigate to: **Project Settings** → **Edge Functions** → **Environment Variables**
3. Add each of the 7 variables listed above
4. Click **Save** after adding all variables

### Step 2: Deploy the Edge Function

Once all environment variables are configured, deploy the edge function:

```bash
supabase functions deploy submit-feedback
```

### Step 3: Verify Deployment

Check that the function is deployed:

```bash
supabase functions list
```

You should see `submit-feedback` in the list.

### Step 4: Test the Integration

1. Start your web app: `npm run dev`
2. Navigate to `/feedback` page
3. Fill out the form:
   - Email: Your email
   - Category: Select any category
   - Environment: Development
   - Feedback: Enter test message
4. Submit the form
5. Check Linear for the new issue

Expected result:

- Issue created in Linear
- Has both "Feedback" label and the category label you selected
- Description includes category, environment, and all metadata

## What Changed

### Frontend Changes

- ✅ Added category dropdown to web feedback form
- ✅ Added category selector to mobile feedback form
- ✅ Updated TypeScript types to include `FeedbackCategory`
- ✅ Form validation ensures category is selected

### Backend Changes

- ✅ Edge function now accepts `category` field
- ✅ Validates category is one of: `bug-report`, `feature-request`, `general`, `ux-issue`
- ✅ Applies both parent "Feedback" label and specific category label to Linear issues
- ✅ Includes category in issue description

### User Experience

Users can now:

1. Choose what type of feedback they're submitting
2. Issues are automatically categorized in Linear
3. Team can filter feedback by category without manual labeling

## Troubleshooting

### Issue: "Missing category label configuration" error

**Cause:** Not all category label IDs are configured in Supabase

**Solution:** Add all 4 category label environment variables (see Step 1 above)

### Issue: Form shows error "Category is required"

**Cause:** User didn't select a category before submitting

**Solution:** Category field defaults to "General" - this shouldn't happen unless form was modified

### Issue: Edge function logs show "undefined" for label IDs

**Cause:** Environment variables not properly saved in Supabase

**Solution:**

1. Double-check variable names (no typos)
2. Ensure values are the correct UUIDs from Linear
3. Redeploy edge function after saving variables

### Check Edge Function Logs

If submissions are failing, check the logs:

```bash
supabase functions logs submit-feedback
```

## Next Steps

After successful testing:

1. ✅ Mark environment variables as configured
2. ✅ Deploy edge function
3. ✅ Test with real feedback submission
4. 📋 Consider optional improvements:
   - Display Linear issue URL to users after submission
   - Add Sentry error tracking to edge function
   - Add unit tests for feedback functionality
   - Add rate limiting to prevent spam

## Reference

- Linear Team ID: Found via Linear API or Settings → API
- Linear Label IDs: Found via Linear API `issueLabels` query
- Edge Function: `supabase/functions/submit-feedback/index.ts`
- Web Form: `apps/web/components/features/feedback/FeedbackForm.tsx`
- Mobile Form: `apps/mobile/app/(app)/feedback.tsx`
