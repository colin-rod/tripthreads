# Supabase TypeScript Types Generation

This document explains how TypeScript types are automatically generated from the Supabase database schema.

## Overview

The project uses automated type generation to keep TypeScript types in sync with the Supabase database schema. This ensures type safety across the entire application.

## Automatic Generation (GitHub Actions)

A GitHub Action automatically generates types when migrations change:

- **File**: `.github/workflows/generate-types.yml`
- **Triggers**:
  - Push to `main` or `development` with migration changes
  - Pull requests with migration changes
  - Manual workflow dispatch

### How It Works

1. **On Push** (main/development):
   - Detects changes in `supabase/migrations/**`
   - Generates types from production database
   - Commits updated types automatically with `[skip ci]`

2. **On Pull Request**:
   - Detects migration changes
   - Generates types and checks for differences
   - If types differ, posts a comment and fails the check
   - Developer must regenerate types locally and commit

### Required GitHub Secrets

Add these secrets in your GitHub repository settings:

```
SUPABASE_PROJECT_ID=<your-project-id>
SUPABASE_ACCESS_TOKEN=<your-access-token>
```

**How to get these values:**

1. **Project ID**:
   - Go to https://app.supabase.com
   - Select your project
   - Go to Settings → General
   - Copy "Reference ID"

2. **Access Token**:
   - Go to https://app.supabase.com/account/tokens
   - Click "Generate new token"
   - Give it a name (e.g., "GitHub Actions")
   - Copy the token (you won't see it again!)

## Manual Generation (Local Development)

### Generate from Local Database

```bash
# Make sure Supabase is running locally
supabase start

# Generate types
npm run generate-types
```

This runs: `supabase gen types typescript --local > packages/shared/types/database.ts`

### Generate from Remote/Production Database

```bash
# Set your project ID
export SUPABASE_PROJECT_ID=your-project-id

# Generate types
npm run generate-types:remote
```

This runs: `supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > packages/shared/types/database.ts`

**Note**: You need to be authenticated with Supabase CLI:

```bash
supabase login
```

## Workflow

### When Creating a New Migration

1. **Create migration file**:

   ```bash
   supabase migration new add_chat_messages_table
   ```

2. **Write SQL** in the migration file

3. **Apply migration locally**:

   ```bash
   supabase db reset  # or supabase db push
   ```

4. **Generate types**:

   ```bash
   npm run generate-types
   ```

5. **Commit both migration and types**:

   ```bash
   git add supabase/migrations/ packages/shared/types/database.ts
   git commit -m "feat(db): add chat_messages table"
   ```

6. **Push to GitHub**:

   ```bash
   git push origin your-branch
   ```

7. **Apply to production** (via Supabase Dashboard):
   - Go to SQL Editor
   - Copy migration SQL
   - Execute query

8. **GitHub Action runs** and updates types automatically

## Best Practices

1. **Always regenerate types** after creating/modifying migrations
2. **Commit types with migrations** in the same commit
3. **Never manually edit** `packages/shared/types/database.ts`
4. **Run type-check** before committing to catch type errors early

## Troubleshooting

### Types are out of sync

```bash
# Regenerate from local database
npm run generate-types

# Or from production
npm run generate-types:remote
```

### GitHub Action fails with "types out of sync"

This means you forgot to regenerate types after changing migrations.

**Fix:**

```bash
npm run generate-types
git add packages/shared/types/database.ts
git commit -m "chore(types): regenerate Supabase types"
git push
```

### "Cannot connect to Docker daemon"

Make sure Docker Desktop is running if using local Supabase:

```bash
# Check Supabase status
supabase status

# Start if not running
supabase start
```

### Missing SUPABASE_PROJECT_ID

For remote generation, set the environment variable:

```bash
# Add to .env.local (not committed)
SUPABASE_PROJECT_ID=your-project-id

# Or export temporarily
export SUPABASE_PROJECT_ID=your-project-id
```

## Type Usage

Generated types are available throughout the project:

```typescript
import { Database } from '@tripthreads/shared/types/database'

// Table types
type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert']
type ChatMessageUpdate = Database['public']['Tables']['chat_messages']['Update']

// Use with Supabase client
const { data } = await supabase.from('chat_messages').select('*').returns<ChatMessage[]>()
```

## Files

- **Generated types**: `packages/shared/types/database.ts`
- **GitHub Action**: `.github/workflows/generate-types.yml`
- **npm scripts**: `package.json` (generate-types, generate-types:remote)

## References

- [Supabase Generating Types Guide](https://supabase.com/docs/guides/api/rest/generating-types)
- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli/introduction)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Last Updated**: 2025-11-07
