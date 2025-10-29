# Supabase Database Migrations

This directory contains SQL migrations for the TripThreads database schema.

## Quick Start

```bash
# Apply all migrations (resets database)
supabase db reset

# Apply new migrations only
supabase db push

# Generate TypeScript types
npm run generate-types
```

## Directory Structure

```
supabase/
├── migrations/                 # SQL migration files
│   ├── 20250129000001_create_users_trips_participants.sql
│   ├── 20250129000001_create_users_trips_participants_rollback.sql
│   └── ...
├── seed.sql                    # Development seed data
└── config.toml                 # Supabase configuration
```

## Migrations

### 20250129000001_create_users_trips_participants.sql

**Description:** Initial database schema for users, trips, and trip participants

**Tables Created:**

- `public.users` - User profiles extending auth.users
- `public.trips` - Trip entities with metadata
- `public.trip_participants` - Many-to-many relationship with roles

**Features:**

- Row-Level Security (RLS) policies for all tables
- Automatic owner participant creation via trigger
- Updated_at timestamp auto-update
- Indexes for performance
- Check constraints for data validation

**RLS Policies:**

**users table:**

- Users can read/update/insert their own profile

**trips table:**

- Users can read trips they participate in
- Users can create trips (become owner)
- Owners can update/delete their trips

**trip_participants table:**

- Users can read participants of their trips
- Owners can add/update/remove participants
- Owners cannot remove themselves

**Triggers:**

- `on_trip_created` - Auto-creates owner participant entry
- `update_users_updated_at` - Auto-updates users.updated_at
- `update_trips_updated_at` - Auto-updates trips.updated_at

**Rollback:**

- `20250129000001_create_users_trips_participants_rollback.sql`

## Seed Data

The `seed.sql` file contains sample data for development:

**Sample Users:**

- Alice (Pro user, trip owner)
- Bob (Free user)
- Carol (Free user)

**Sample Trips:**

- Paris Adventure 2025 (Owner: Alice)
- Tokyo Experience (Owner: Bob)
- Barcelona Weekend (Owner: Alice)

**Note:** Seed data uses placeholder UUIDs. Update with real auth.users IDs:

```sql
-- After creating test users via Supabase Auth, get their UUIDs
SELECT id, email FROM auth.users;

-- Then update seed.sql with real UUIDs
```

## Creating New Migrations

### Step 1: Create Migration Files

```bash
# Use current timestamp for ordering
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Create forward migration
touch supabase/migrations/${TIMESTAMP}_your_description.sql

# Create rollback migration
touch supabase/migrations/${TIMESTAMP}_your_description_rollback.sql
```

### Step 2: Write SQL

**Forward Migration Example:**

```sql
-- Migration: Add expenses table
-- Description: Create expenses table with RLS policies
-- Date: 2025-01-29

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- Stored in cents
  currency TEXT NOT NULL DEFAULT 'EUR',
  payer_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX idx_expenses_payer_id ON public.expenses(payer_id);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Trip participants can read expenses"
  ON public.expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = expenses.trip_id
        AND trip_participants.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

**Rollback Migration Example:**

```sql
-- Rollback: Drop expenses table

DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
DROP TABLE IF EXISTS public.expenses CASCADE;
```

### Step 3: Test Migration

```bash
# Reset database (applies all migrations)
supabase db reset

# Verify schema
psql $DATABASE_URL -c "\dt public.*"

# Test RLS policies
psql $DATABASE_URL -c "SET ROLE authenticated; SELECT * FROM public.expenses;"
```

### Step 4: Generate Types

```bash
npm run generate-types
```

### Step 5: Commit

```bash
git add supabase/migrations/ packages/shared/types/
git commit -m "feat(db): add expenses table with RLS policies"
```

## Applying Migrations to Production

### Method 1: Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy migration SQL from file
3. Execute query
4. Verify in **Table Editor**

### Method 2: Supabase CLI

```bash
# Link to production project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push --linked
```

## TypeScript Types

After creating migrations, generate TypeScript types:

```bash
# Generate types
npm run generate-types

# Or manually
supabase gen types typescript --local > packages/shared/types/database.ts
```

Types are generated in `packages/shared/types/database.ts` and can be imported:

```typescript
import type { Database } from '@tripthreads/shared/types/database'

type User = Database['public']['Tables']['users']['Row']
type Trip = Database['public']['Tables']['trips']['Row']
```

## Testing RLS Policies

Test RLS policies with different user contexts:

```sql
-- Test as specific user
SET ROLE authenticated;
SET request.jwt.claims.sub = '00000000-0000-0000-0000-000000000001';

-- Try to read trips
SELECT * FROM public.trips;

-- Reset
RESET ROLE;
```

## Troubleshooting

### Migration Fails

**Syntax Error:**

```bash
# Check SQL syntax
psql $DATABASE_URL -f supabase/migrations/your_migration.sql
```

**Foreign Key Error:**

- Ensure referenced tables exist
- Check ON DELETE CASCADE behavior
- Verify column types match

**RLS Policy Conflict:**

- Check existing policies: `SELECT * FROM pg_policies WHERE tablename = 'trips';`
- Ensure policy names are unique
- Test with different user contexts

### RLS Blocks Queries

**Policy Too Restrictive:**

```sql
-- Check what policies exist
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Test policy logic
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-uuid-here';
SELECT * FROM public.your_table; -- Should return results if policy correct
```

**User Not Authenticated:**

- Ensure `auth.uid()` returns a value
- Check Supabase client initialization
- Verify JWT token is valid

### Types Out of Sync

```bash
# Regenerate types
npm run generate-types

# Restart TypeScript server in VSCode
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

## Best Practices

### DO:

- ✅ Use `IF NOT EXISTS` for idempotent migrations
- ✅ Add indexes for foreign keys and common queries
- ✅ Write RLS policies for all tables
- ✅ Test migrations locally before production
- ✅ Create rollback migrations
- ✅ Add comments for complex logic
- ✅ Use `ON DELETE CASCADE` appropriately

### DON'T:

- ❌ Edit existing migrations (create new ones)
- ❌ Skip RLS policies
- ❌ Forget to add indexes
- ❌ Run seed.sql in production
- ❌ Use `SELECT *` in RLS policies (performance)
- ❌ Reference auth.uid() without checking if user is authenticated

## Resources

- [Supabase Docs - Database](https://supabase.com/docs/guides/database)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## Getting Help

If you encounter issues:

1. Check migration syntax in SQL editor
2. Test RLS policies with different user contexts
3. Review Supabase logs in Dashboard
4. Check `CLAUDE.md` for detailed documentation
5. Create an issue in GitHub repo
