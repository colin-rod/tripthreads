# TripThreads - Project Documentation

## 📋 Project Overview

**TripThreads** is a collaborative trip planning platform that helps groups plan, manage, and relive trips together. It combines itinerary building, expense splitting, and media sharing with offline-first capabilities and natural language input.

**Core Value Proposition:**

> "Make memories, not spreadsheets — travel made simple"

**Key Features:**

- Natural language itinerary building ("Flight to Paris Mon 9am €200")
- Shared expense tracking with multi-currency support and optimized settlements
- Offline-first architecture (read + basic write queue)
- Role-based collaboration (Owner, Participant, Viewer)
- Trip media feed with photos/videos
- Pro tier with unlimited participants/photos and PDF recap

**Linear Project:** https://linear.app/crod/project/tripthreads-mvp-cda67386ed0a

---

## 🎯 Goals

1. **Simplify group travel logistics** - Replace fragmented tools (WhatsApp, Splitwise, Google Docs) with one unified workspace
2. **Enable offline collaboration** - Let users plan and track expenses without connectivity
3. **Natural interaction** - Parse plain language for itinerary and expense input
4. **Fair settlements** - Multi-currency tracking with historical FX rates and optimized debt resolution
5. **Preserve memories** - Shared trip feed with automatic day tagging
6. **Build sustainable SaaS** - 8-10% conversion rate, €6+ ARPU, break-even by Year 1

---

## 🏗️ Tech Stack

### Frontend (Web)

- **Next.js 14+** (App Router) - SSR, PWA, routing
- **React 18+** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library (built on Radix UI)
- **IndexedDB (Dexie.js)** - Offline data cache
- **Storybook** - Component development and documentation

### Mobile

- **Expo SDK** (React Native) - Cross-platform mobile
- **Expo Router** - File-based navigation
- **NativeWind** - Tailwind for React Native
- **expo-sqlite** - Offline storage
- **Expo Push Notifications** - Push notification delivery

### Backend

- **Supabase (Postgres 15+)** - Primary database
- **Supabase Auth** - Email, Google, Apple OAuth
- **Supabase Storage** - Photo/video uploads
- **Supabase Edge Functions** (Deno) - Serverless logic
- **Row-Level Security (RLS)** - Data access control

### Natural Language Parser

- **chrono-node** - Date/time extraction
- **Custom tokenizer** - Currency, amounts, keywords
- **Client-side deterministic parsing** - No AI/ML in MVP

### Payments

- **Stripe Checkout** - Subscription management
- **Stripe Webhooks** - Lifecycle events
- **Stripe Customer Portal** - Self-service billing

### Testing

- **Jest/Vitest** - Unit testing
- **React Testing Library** - Component testing
- **Playwright** - Web E2E testing
- **Detox** - Mobile E2E testing

### DevOps & Monitoring

- **Vercel** - Web hosting and deployment
- **GitHub Actions** - CI/CD pipeline
- **Sentry** - Error monitoring
- **PostHog** - Product analytics and session replay
- **Vercel Analytics** - Web performance metrics

### Third-Party APIs

- **OpenExchangeRates** - Historical FX rates (on-demand fetching with caching)
  - Free tier: 1,000 requests/month, USD base only
  - Unlimited plan ($12/mo): 100,000 requests/month, any base currency
- **Expo Push Notifications** - Mobile push delivery
- **Web Push API (VAPID)** - Web push notifications

---

## 🧪 Test-Driven Development (TDD) Principles

### Philosophy

TripThreads follows **strict TDD methodology**:

> "Write the test first, then write the code to make it pass."

This is critical for:

- **Offline sync reliability** - Data integrity in poor network conditions
- **Multi-currency calculations** - Accurate FX conversions and settlements
- **Natural language parsing** - Predictable, consistent parsing behavior
- **Role-based permissions** - Correct data visibility across user roles

### TDD Workflow

For every feature, follow this cycle:

1. **Red** - Write a failing test that defines the desired behavior
2. **Green** - Write minimal code to pass the test
3. **Refactor** - Clean up code while keeping tests green

### Testing Requirements

#### Every Feature Must Include:

1. **Unit Tests** - Test individual functions and utilities
   - NL parser tokenization and date extraction
   - FX rate calculations and conversions
   - Debt optimization algorithms
   - Expense split calculations
   - Date/time utilities

2. **Component Tests** - Test React components in isolation
   - Itinerary item cards (flights, stays, activities)
   - Expense forms with split calculators
   - NL input preview cards
   - Role-based UI visibility
   - Offline status indicators

3. **E2E Tests** - Test complete user flows
   - Trip creation and invitation flow
   - Itinerary building with NL input
   - Expense tracking and settlement
   - Photo uploads and feed
   - Offline → online sync
   - Pro upgrade flow

4. **Integration Tests** - Test Supabase interactions
   - RLS policy enforcement
   - Auth flows (email, Google, Apple)
   - Real-time subscription updates
   - Edge Function execution
   - Storage upload/download

### Test Structure Example

```typescript
// Unit Test: NL Parser
describe('parseExpense', () => {
  it('extracts amount, currency, and split from natural language', () => {
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

  it('handles multiple currencies', () => {
    const input = "$50 taxi split 3 ways"
    const result = parseExpense(input)

    expect(result.currency).toBe('USD')
    expect(result.amount).toBe(50)
  })
})

// Component Test: ExpenseCard
describe('ExpenseCard', () => {
  const mockExpense = {
    id: '123',
    description: 'Dinner at Le Bistro',
    amount: 60,
    currency: 'EUR',
    payer: { id: 'user1', name: 'Alice' },
    participants: [
      { id: 'user1', share: 30 },
      { id: 'user2', share: 30 }
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

// E2E Test: Offline Sync
describe('Offline Expense Tracking', () => {
  it('allows adding expenses offline and syncs on reconnect', async ({ page }) => {
    await page.goto('/trips/123')

    // Go offline
    await page.context().setOffline(true)

    // Add expense
    await page.fill('[data-testid="expense-input"]', 'Split 40€ lunch 2 ways')
    await page.click('[data-testid="add-expense"]')

    // Verify local state
    await expect(page.locator('[data-testid="expense-item"]')).toContainText('€40.00')
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Offline')

    // Go online
    await page.context().setOffline(false)

    // Verify sync
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Synced')

    // Verify persistence
    await page.reload()
    await expect(page.locator('[data-testid="expense-item"]')).toContainText('€40.00')
  })
})
```

### Test Coverage Requirements

- **Minimum 80% coverage** for critical paths (NL parser, FX calculations, sync logic)
- **100% coverage** for currency/money calculations (no room for errors)
- Test edge cases: empty states, error states, loading states, offline states
- Test role-based access: Owner, Participant, Viewer, Partial Joiner
- Test multi-currency scenarios: EUR, USD, GBP, JPY, etc.

### Running Tests

```bash
# Development
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # Coverage report

# Mobile
npm run test:mobile         # Run Expo/RN tests

# E2E
npm run test:e2e            # Playwright (web)
npm run test:e2e:mobile     # Detox (mobile)

# Specific test suites
npm test -- parser          # Run parser tests only
npm test -- offline         # Run offline sync tests
```

**IMPORTANT: E2E Testing Guidelines**

- **DO NOT run E2E tests locally** - They are flaky in local development environments
- E2E tests run automatically in CI/CD pipeline (GitHub Actions)
- Focus on unit and component tests for local development
- If you need to verify E2E behavior, push to a branch and let CI run the tests

---

## 📂 Project Structure

```
tripthreads/
├── .github/
│   └── workflows/
│       └── ci.yml                  # CI/CD pipeline
├── apps/
│   ├── web/                        # Next.js web app
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── signup/
│   │   │   ├── (app)/
│   │   │   │   ├── trips/
│   │   │   │   │   ├── page.tsx           # Trip list
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx       # Trip detail (timeline view)
│   │   │   │   │       ├── expenses/
│   │   │   │   │       ├── feed/
│   │   │   │   │       └── settings/
│   │   │   │   ├── settings/
│   │   │   │   └── upgrade/
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── features/
│   │   │   │   ├── itinerary/      # Itinerary components
│   │   │   │   ├── expenses/       # Expense tracking components
│   │   │   │   ├── feed/           # Trip feed components
│   │   │   │   ├── nl-input/       # Natural language input
│   │   │   │   └── settlements/    # Settlement UI
│   │   │   └── layouts/
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts       # Supabase client setup
│   │   │   │   ├── queries.ts      # Data queries
│   │   │   │   └── mutations.ts    # Data mutations
│   │   │   ├── offline/
│   │   │   │   ├── db.ts           # IndexedDB setup (Dexie)
│   │   │   │   ├── sync.ts         # Sync engine
│   │   │   │   └── queue.ts        # Mutation queue
│   │   │   ├── parser/             # NL parser
│   │   │   ├── fx/                 # Currency utilities
│   │   │   └── utils.ts
│   │   ├── public/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── components/
│   │   │   └── e2e/
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   └── mobile/                     # Expo mobile app
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (tabs)/
│       │   │   ├── trips/
│       │   │   ├── expenses/
│       │   │   └── settings/
│       │   ├── _layout.tsx
│       │   └── +not-found.tsx
│       ├── components/
│       ├── lib/
│       │   ├── supabase/
│       │   ├── offline/
│       │   │   ├── db.ts           # SQLite setup
│       │   │   └── sync.ts
│       │   └── parser/             # Shared parser
│       ├── tests/
│       ├── app.json
│       └── package.json
├── packages/
│   ├── shared/                     # Shared code (web + mobile)
│   │   ├── types/
│   │   │   ├── database.ts         # Supabase types
│   │   │   ├── trip.ts
│   │   │   ├── expense.ts
│   │   │   └── user.ts
│   │   ├── utils/
│   │   │   ├── currency.ts         # FX calculations
│   │   │   ├── date.ts
│   │   │   └── settlements.ts      # Debt optimization
│   │   ├── parser/
│   │   │   ├── tokenizer.ts
│   │   │   ├── expense.ts
│   │   │   └── itinerary.ts
│   │   └── constants/
│   │       ├── currencies.ts
│   │       └── plans.ts            # Free/Pro tier definitions
│   └── ui/                         # Shared UI components (optional)
├── supabase/
│   ├── migrations/                 # SQL migrations
│   ├── functions/                  # Edge Functions
│   │   ├── stripe-webhook/
│   │   ├── fx-rates-sync/
│   │   └── pdf-recap/
│   ├── seed.sql                    # Seed data
│   └── config.toml
├── docs/
│   ├── API.md                      # API documentation
│   ├── ARCHITECTURE.md             # System architecture
│   ├── OFFLINE_SYNC.md             # Offline strategy details
│   ├── NL_PARSER.md                # Parser spec
│   └── DEPLOYMENT.md               # Deployment guide
├── scripts/
│   ├── seed-fx-rates.ts            # FX rate backfill
│   └── generate-types.ts           # Supabase type generation
├── .env.local                      # Local environment variables
├── .env.example
├── package.json                    # Root package.json (workspaces)
├── turbo.json                      # Turborepo config
├── CLAUDE.md                       # This file
├── PRD.md                          # Product Requirements Document
└── README.md
```

---

## 🗄️ Data Architecture & Database Migrations

### Database Setup & Migrations

TripThreads uses **Supabase (PostgreSQL)** for the database. All schema changes are managed through SQL migration files.

#### Migration File Structure

```
supabase/
├── migrations/
│   ├── 20250129000001_create_users_trips_participants.sql
│   ├── 20250129000001_create_users_trips_participants_rollback.sql
│   └── [timestamp]_[description].sql
├── seed.sql                    # Development seed data
└── config.toml                 # Supabase configuration
```

#### Creating Migrations

**IMPORTANT:** When working on database schema changes:

1. **Create timestamped migration files** in `supabase/migrations/`
   - Format: `YYYYMMDDHHMMSS_description.sql`
   - Example: `20250129000001_create_users_trips_participants.sql`

2. **Always create a rollback migration**
   - Format: `YYYYMMDDHHMMSS_description_rollback.sql`
   - Contains SQL to undo the migration

3. **Include in migrations:**
   - Table creation with constraints
   - Indexes for performance
   - RLS (Row-Level Security) policies
   - Triggers and functions
   - Comments for documentation

4. **Migration Best Practices:**
   - Use `IF NOT EXISTS` for idempotent migrations
   - Add comments explaining complex logic
   - Test locally before committing
   - Never edit existing migrations (create new ones)
   - Document breaking changes in commit message

#### Applying Migrations

**Local Development:**

```bash
# Method 1: Using Supabase CLI (recommended)
supabase db reset              # Reset database and apply all migrations
supabase db push               # Apply new migrations

# Method 2: Direct SQL execution
psql $DATABASE_URL -f supabase/migrations/20250129000001_create_users_trips_participants.sql
```

**Production:**

```bash
# Via Supabase Dashboard
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Copy migration SQL
# 3. Execute query
# 4. Verify in Table Editor

# Via Supabase CLI (if connected to production)
supabase db push --linked
```

#### Rolling Back Migrations

```bash
# Apply rollback migration
psql $DATABASE_URL -f supabase/migrations/20250129000001_create_users_trips_participants_rollback.sql

# Or via Supabase Dashboard SQL Editor
```

#### Seeding Data

**Local Development:**

```bash
# Apply seed data
psql $DATABASE_URL -f supabase/seed.sql

# Or via Supabase CLI
supabase db reset  # Resets and seeds automatically
```

**Important Notes:**

- Seed data uses placeholder UUIDs (`00000000-0000-0000-0000-000000000001`)
- Update UUIDs with real auth.users IDs after creating test accounts
- Never run seed.sql in production

#### Generating TypeScript Types

After creating migrations, generate TypeScript types:

```bash
# Generate types from local Supabase instance
npm run generate-types

# Or from production/staging database
npm run generate-types:remote
```

**Automated Generation:**

Types are automatically generated by a GitHub Action (`.github/workflows/generate-types.yml`) when:

- Migrations are pushed to `main` or `development`
- Pull requests modify migration files

See [SUPABASE_TYPES_GENERATION.md](docs/SUPABASE_TYPES_GENERATION.md) for full documentation.

#### Migration Checklist

When creating a new migration:

- [ ] Migration file created with timestamp
- [ ] Rollback migration created
- [ ] RLS policies defined for all tables
- [ ] Indexes added for foreign keys and common queries
- [ ] Triggers/functions tested
- [ ] Comments added for documentation
- [ ] Migration tested locally with `supabase db reset`
- [ ] Seed data updated if needed
- [ ] TypeScript types regenerated
- [ ] Migration documented in CLAUDE.md (this file)
- [ ] Committed with descriptive message

#### Example Migration Workflow

```bash
# 1. Create migration files
touch supabase/migrations/20250129120000_add_expenses_table.sql
touch supabase/migrations/20250129120000_add_expenses_table_rollback.sql

# 2. Write SQL in migration file (see existing migrations for examples)

# 3. Test migration locally
supabase db reset  # Applies all migrations + seed

# 4. Generate types
npm run generate-types

# 5. Commit
git add supabase/migrations/ packages/shared/types/
git commit -m "feat(db): add expenses table with RLS policies"

# 6. Apply to production (via Supabase Dashboard)
```

#### Troubleshooting

**Migration fails:**

- Check for syntax errors in SQL
- Ensure foreign key references exist
- Verify RLS policies don't conflict
- Check for unique constraint violations

**RLS blocks queries:**

- Test policies with different user contexts
- Use `auth.uid()` in policies
- Check that user is authenticated

**Types out of sync:**

- Regenerate types: `npm run generate-types`
- Restart TypeScript server in IDE

---

### Core Entities

#### Users (`users` table)

```typescript
interface User {
  id: string // UUID (Supabase Auth)
  email: string
  full_name: string
  avatar_url?: string
  plan: 'free' | 'pro'
  plan_expires_at?: string // ISO 8601
  stripe_customer_id?: string
  created_at: string
  updated_at: string
}
```

#### Trips (`trips` table)

```typescript
interface Trip {
  id: string // UUID
  name: string
  description?: string
  start_date: string // ISO 8601
  end_date: string // ISO 8601
  owner_id: string // FK → users.id
  cover_image_url?: string
  created_at: string
  updated_at: string
}
```

#### Trip Participants (`trip_participants` table)

```typescript
interface TripParticipant {
  id: string // UUID
  trip_id: string // FK → trips.id
  user_id: string // FK → users.id
  role: 'owner' | 'participant' | 'viewer'
  joined_at: string // ISO 8601 (for partial joiners)
  invited_by: string // FK → users.id
  created_at: string
}
```

#### Itinerary Items (`itinerary_items` table)

```typescript
interface ItineraryItem {
  id: string // UUID
  trip_id: string // FK → trips.id
  type: 'flight' | 'stay' | 'activity'
  title: string
  description?: string
  start_time: string // ISO 8601
  end_time?: string // ISO 8601
  location?: string
  created_by: string // FK → users.id
  created_at: string
  updated_at: string
}
```

#### Expenses (`expenses` table)

```typescript
interface Expense {
  id: string // UUID
  trip_id: string // FK → trips.id
  description: string
  amount: number // Stored as cents/minor units
  currency: string // ISO 4217 (EUR, USD, GBP, etc.)
  category: string // 'food', 'transport', 'accommodation', 'activity', 'other'
  payer_id: string // FK → users.id
  date: string // ISO 8601
  receipt_url?: string // Supabase Storage URL
  fx_rate: number | null // FX rate snapshot (to trip base currency)
  created_by: string // FK → users.id
  created_at: string
  updated_at: string
}
```

#### Expense Participants (`expense_participants` table)

```typescript
interface ExpenseParticipant {
  id: string // UUID
  expense_id: string // FK → expenses.id
  user_id: string // FK → users.id
  share_amount: number // Cents/minor units
  share_type: 'equal' | 'percentage' | 'amount'
  share_value: number // Percentage or custom amount
  created_at: string
}
```

#### Settlements (`settlements` table)

```typescript
interface Settlement {
  id: string // UUID
  trip_id: string // FK → trips.id
  from_user_id: string // FK → users.id (owes money)
  to_user_id: string // FK → users.id (owed money)
  amount: number // Cents/minor units
  currency: string // ISO 4217
  status: 'pending' | 'settled'
  settled_at?: string // ISO 8601
  created_at: string
  updated_at: string
}
```

#### Media Files (`media_files` table)

```typescript
interface MediaFile {
  id: string // UUID
  trip_id: string // FK → trips.id
  user_id: string // FK → users.id
  type: 'photo' | 'video'
  url: string // Supabase Storage URL
  thumbnail_url?: string
  caption?: string
  date_taken: string // ISO 8601 (auto-tagged to day)
  created_at: string
}
```

#### Push Tokens (`push_tokens` table)

```typescript
interface PushToken {
  id: string // UUID
  user_id: string // FK → users.id
  token: string // Expo push token or VAPID endpoint
  platform: 'web' | 'ios' | 'android'
  created_at: string
  updated_at: string
}
```

### Data Relationships

```
users
  ├── trips (as owner)
  ├── trip_participants (as participant)
  ├── expenses (as payer)
  ├── expense_participants (as participant)
  ├── media_files (as uploader)
  └── settlements (as debtor or creditor)

trips
  ├── trip_participants (many)
  ├── itinerary_items (many)
  ├── expenses (many)
  ├── media_files (many)
  └── settlements (many)

expenses
  ├── expense_participants (many)
  └── payer (one user)
```

### Row-Level Security (RLS) Policies

All tables use RLS to enforce access control:

1. **Trips:**
   - Users can only see trips they're participants in
   - Only owners can delete trips

2. **Itinerary Items:**
   - Participants see items from their join date forward
   - Viewers see all items (read-only)
   - Participants can create/edit items

3. **Expenses:**
   - Participants see expenses they're involved in
   - Owners see all expenses
   - Viewers cannot see expenses

4. **Media Files:**
   - All trip participants see all photos
   - Viewers can see photos (read-only)
   - Participants can upload photos

---

## 🌿 Git Workflow

### Branch Strategy

```
main (production)
└── development (staging)
    └── feature/* (feature branches)
```

**⚠️ CRITICAL RULE: Always branch from `development`, NEVER from `main`**

All feature branches must be created from the `development` branch. This ensures that:

- Features are integrated into staging first for testing
- Production (`main`) remains stable and only receives tested code
- The deployment pipeline works correctly (features → staging → production)

### Branch Purposes

- **`main`** - Production branch
  - Deploys to: `tripthreads.com` (web) + production mobile builds
  - Protected, requires PR approval
  - Only merge from `development`
  - **⚠️ NEVER create feature branches from `main`**

- **`development`** - Staging branch
  - Deploys to: `dev.tripthreads.com` (web) + TestFlight/Internal Testing
  - Integration branch for all features
  - Default branch for PRs
  - **✅ ALWAYS create feature branches from `development`**

- **`feature/*`** - Feature branches
  - **MUST be created from `development`** (not `main`)
  - Naming: `feature/P{phase}-{issue-number}-{short-description}`
  - Examples:
    - `feature/P1-5-supabase-auth`
    - `feature/P2-14-nl-expense-parser`
    - `feature/P3-23-stripe-integration`

### Development Workflow

1. **Create feature branch** from `development` (NOT from `main`):

   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/P1-5-supabase-auth
   ```

2. **Write tests first (TDD)**:

   ```bash
   # Create test file
   touch apps/web/tests/unit/parser.test.ts
   # Write failing tests
   npm test -- --watch
   ```

3. **Implement feature** to pass tests:

   ```bash
   # Write code in apps/web or packages/shared
   # Tests should pass
   ```

4. **Commit with conventional commits**:

   ```bash
   git add .
   git commit -m "feat(auth): add Google OAuth flow with Supabase"
   ```

5. **Push and create PR**:

   ```bash
   git push origin feature/P1-5-supabase-auth
   # Create PR on GitHub: feature/P1-5-supabase-auth → development
   ```

6. **PR Review Process**:
   - GitHub Actions runs: lint, type check, unit tests, component tests
   - Tests are informational (don't block merge, but should be fixed)
   - Link to Linear issue in PR description

7. **Merge to development**:
   - Squash and merge
   - Delete feature branch
   - Auto-deploys to staging

8. **Deploy to production**:
   - Create PR: `development` → `main`
   - Review and merge when phase is complete
   - Triggers production deployment

### Commit Message Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `chore`: Build, deps, config changes

**Scopes:**

- `auth`: Authentication
- `trips`: Trip management
- `itinerary`: Itinerary builder
- `expenses`: Expense tracking
- `parser`: NL parser
- `offline`: Offline sync
- `fx`: Currency/FX rates
- `feed`: Trip feed/media
- `mobile`: Mobile-specific
- `web`: Web-specific
- `stripe`: Payments

**Examples:**

```
feat(parser): add support for multiple currencies in NL input
fix(offline): resolve sync conflict with concurrent edits
test(expenses): add E2E tests for split calculation
refactor(fx): extract debt optimization into shared package
docs(architecture): document offline sync strategy
chore(deps): upgrade Expo SDK to v50
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions Workflows

#### Main CI Pipeline (`.github/workflows/ci.yml`)

On every push to any branch:

1. **Lint** - ESLint checks (web + mobile)
2. **Type Check** - TypeScript compilation
3. **Unit Tests** - Jest/Vitest tests
4. **Component Tests** - React Testing Library
5. **Build** - Next.js + Expo build validation

On PR to `main`:

- All above checks
- Manual deployment approval required

#### FX Rate Sync (On-Demand Strategy)

On-demand fetching via Supabase Edge Function (`fx-rates-sync`):

1. Check cache (`fx_rates` table) when expense is created
2. If rate not found, fetch from OpenExchangeRates API
3. Automatically convert from USD base (free tier) to trip's base currency
4. Store in `fx_rates` table for future use
5. If API fails, store expense with `fx_rate = null` (graceful degradation)

**Benefits over daily cron:**

- Lower API usage (only fetch currencies actually needed)
- Stays within free tier limits (1,000 requests/month)
- Simpler infrastructure (no scheduled jobs to maintain)
- Lazy loading builds cache organically
- Works with USD-only free tier via automatic conversion

### Vercel Deployment (Web)

- **Auto-deploys** from GitHub
- **`main` branch** → Production (`tripthreads.com`)
- **`development` branch** → Staging (`dev.tripthreads.com`)
- **Feature branches** → Preview deployments

### Expo/EAS Deployment (Mobile)

- **`main` branch** → Production builds (App Store, Play Store)
- **`development` branch** → Internal testing (TestFlight, Internal Testing)
- **On-demand builds** for feature branches

### Environment Variables

Required in Vercel and local `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY> # Server-side only

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# FX Rates API
FX_RATES_API_KEY=xxx # exchangerate.host

# Linear (optional, for automation)
LINEAR_API_KEY=lin_api_xxx

# Analytics & Monitoring
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx # For source maps

# Push Notifications
EXPO_PUSH_KEY=xxx # Expo push notification key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx # Web push (VAPID)
VAPID_PRIVATE_KEY=xxx # Server-side only
```

Required in Expo (mobile):

```bash
# .env for Expo
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

---

## 📊 Monitoring & Analytics

### PostHog (Product Analytics & Session Replay)

**Events to Track:**

- User auth: `signup`, `login`, `logout`
- Trip management: `trip_created`, `trip_deleted`, `invite_sent`, `invite_accepted`
- Itinerary: `item_added_nl`, `item_added_manual`, `item_edited`, `item_deleted`
- Expenses: `expense_added_nl`, `expense_added_manual`, `settlement_created`, `settlement_marked_paid`
- Media: `photo_uploaded`, `video_uploaded`, `feed_viewed`
- Offline: `went_offline`, `sync_completed`, `sync_failed`
- Monetization: `upgrade_viewed`, `checkout_started`, `subscription_completed`

**Session Recordings:**

- Enable for all Pro users
- Sample 10% of Free users
- Privacy: Mask sensitive data (emails, amounts)

### Sentry (Error Monitoring)

**Error Tracking:**

- Client-side errors (web + mobile)
- API errors (Supabase, Stripe)
- Offline sync failures
- Payment processing errors

**Performance Monitoring:**

- Page load times
- API response times
- Offline sync duration
- FX rate fetch latency

**Release Tracking:**

- Tag releases with Git commit SHA
- Link errors to specific deployments

### Vercel Analytics (Web Performance)

- Core Web Vitals (LCP, FID, CLS)
- Real User Monitoring (RUM)
- Geographic performance breakdown

---

## 🎨 Design System

**Active Design System:** **Playful Citrus Pop**

See [design-system-playful-citrus-pop.md](design-system-playful-citrus-pop.md) for the complete design system specification.

### Color Palette (Summary)

**Primary Colors:**

- `--primary`: `#F97316` (Orange 500) - Primary actions, brand identity, adventure/energy
- `--primary-foreground`: `#FFFFFF` - Text on primary
- `--secondary`: `#22C55E` (Green 500) - Success, positive actions, collaboration
- `--destructive`: `#EF4444` (Red 500) - Errors, deletions

**Neutral Colors:**

- `--background`: `#FAF2ED` (Warm cream, light mode), `#1A1A1A` (Dark mode)
- `--foreground`: `#11333B` (Deep teal, light mode), `#F5F5F5` (Dark mode)
- `--muted`: `#D6D6F9` (Light lavender, light mode), `#2E2E2E` (Dark mode)
- `--border`: `#E8DFD5` (Warm tan, light mode), `#3F3F3F` (Dark mode)

**Semantic Colors:**

- `--success`: `#22C55E` (Green 500)
- `--warning`: `#FACC15` (Yellow 400)
- `--error`: `#EF4444` (Red 500)
- `--info`: `#3F84F8` (Blue 500)

### Typography

- **Font Family:** `Inter` (system fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI"`)
- **Headings:** `font-semibold` (600 weight)
- **Body:** `font-normal` (400 weight)
- **Scale:** Tailwind default scale (text-sm, text-base, text-lg, text-xl, etc.)

### Spacing

- Base unit: `4px` (Tailwind default)
- Scale: `0`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`

### Border Radius

- `--radius-sm`: `0.25rem` (4px)
- `--radius-md`: `0.375rem` (6px)
- `--radius-lg`: `0.5rem` (8px)
- `--radius-xl`: `0.75rem` (12px)
- `--radius-full`: `9999px` (fully rounded)

### Shadows

- `shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- `shadow`: `0 2px 4px 0 rgb(0 0 0 / 0.08)`
- `shadow-md`: `0 4px 8px 0 rgb(0 0 0 / 0.1)`
- `shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / 0.15)`

---

## 📖 Reference Documents

### PRD (Product Requirements Document)

See the complete PRD provided by the user (version 2.0, October 2025).

**Key Sections:**

1. Mission & Target Users
2. MVP Scope (Phases 1-4)
3. User Roles & Permissions
4. Offline Strategy
5. Pro Tier Features & Pricing
6. Tech Architecture
7. Data Model
8. UX Flow Highlights
9. KPIs / Success Metrics
10. Roadmap (60 issues, ~240 story points)

### Linear Project

**Project URL:** https://linear.app/crod/project/tripthreads-mvp-cda67386ed0a

**Phases:**

1. **Phase 1:** Core Foundation (8 weeks, 16 issues, ~55 SP)
2. **Phase 2:** Itinerary & Ledger (6 weeks, 9 issues, ~38 SP)
3. **Phase 3:** Media, Pro Features & Stripe (6 weeks, 18 issues, ~62 SP)
4. **Phase 4:** Push, Recap & Launch (6 weeks, 15 issues, ~52 SP)
5. **Phase 5:** Post-MVP Enhancements (Future, 9 issues, ~52 SP)

### Additional Documentation

- **ARCHITECTURE.md** - System design, data flow, and component architecture
- **OFFLINE_SYNC.md** - Offline-first strategy, conflict resolution, and sync logic
- **NL_PARSER.md** - Natural language parser specification and examples
- **API.md** - Supabase queries, mutations, and Edge Function APIs
- **DEPLOYMENT.md** - Deployment procedures, environment setup, and rollback

---

## 🏁 Getting Started

### Prerequisites

- **Node.js 20+** (LTS)
- **npm, yarn, or pnpm**
- **Git**
- **Supabase CLI** (`npm install -g supabase`)
- **Expo CLI** (`npm install -g expo-cli`)

### Initial Setup

```bash
# Clone repository (if not already)
git clone https://github.com/your-org/tripthreads.git
cd tripthreads

# Install dependencies (monorepo)
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase, Stripe, and API keys

# Start Supabase locally
supabase start

# Generate TypeScript types from Supabase schema
npm run generate-types

# Run database migrations
supabase db push

# Seed development data
npm run seed
```

### Development Commands

```bash
# Start all apps (web + mobile)
npm run dev

# Start web only
npm run dev:web

# Start mobile only
npm run dev:mobile

# Build
npm run build              # Build all apps
npm run build:web          # Build web only
npm run build:mobile       # Build mobile only

# Testing
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:e2e           # E2E tests (web)
npm run test:e2e:mobile    # E2E tests (mobile)

# Linting & Type Checking
npm run lint               # ESLint
npm run type-check         # TypeScript
npm run format             # Prettier

# Database
npm run db:push            # Push migrations
npm run db:reset           # Reset database
npm run generate-types     # Generate Supabase types
npm run seed               # Seed data

# Storybook (component library)
npm run storybook          # Start Storybook dev server
npm run build-storybook    # Build static Storybook

# Mobile
npm run ios                # Run iOS simulator
npm run android            # Run Android emulator
npm run mobile:tunnel      # Expo tunnel (for testing on device)
```

---

## 📝 Issue Tracking

All work is tracked in Linear with:

- **Priority labels** (P0-P4)
- **Phase labels** (P1, P2, P3, P4, P5)
- **Dependencies** between issues
- **Acceptance criteria** in descriptions
- **Story point estimates** (Fibonacci scale)

### Priority System

- **P0 (Critical)** - Blockers, security issues
- **P1 (High)** - Core MVP features
- **P2 (Medium)** - Important but not blocking
- **P3 (Low)** - Nice-to-have for MVP
- **P4 (Future)** - Post-MVP enhancements

### Issue Workflow

1. **Triage** - Issue created, needs prioritization
2. **Backlog** - Prioritized, not yet started
3. **In Progress** - Actively being worked on
4. **In Review** - PR open, awaiting review
5. **Done** - Merged and deployed to staging
6. **Released** - Deployed to production

---

## 🎯 Success Metrics

From the PRD, success is measured by:

### MVP Launch Success (First Month)

| Metric                       | Target |
| ---------------------------- | ------ |
| Trips created                | 500+   |
| Trips with ≥2 participants   | 40%+   |
| Free-to-paid conversion rate | 5%+    |
| p95 API response time        | <100ms |
| Critical security issues     | 0      |

### 6-Month Success

| Metric                 | Target |
| ---------------------- | ------ |
| Active trips           | 5,000+ |
| 3-month retention rate | 50%+   |
| Conversion rate        | 8%+    |
| MRR                    | €10k+  |
| App store rating       | 4.5+   |

### 12-Month Success

| Metric          | Target                 |
| --------------- | ---------------------- |
| Active trips    | 20,000                 |
| Engagement rate | 60%+                   |
| Conversion rate | 10%+                   |
| MRR             | €50k+                  |
| Profitability   | Break-even or positive |

### Engagement KPIs

| Metric                           | Target |
| -------------------------------- | ------ |
| Trips with ≥2 participants       | ≥60%   |
| Average itinerary items per trip | ≥3     |
| Average expenses per trip        | ≥5     |
| DAU/MAU ratio (stickiness)       | ≥30%   |
| Users who reuse within 3 months  | ≥50%   |

### Quality KPIs

| Metric                      | Target |
| --------------------------- | ------ |
| Error rate (Sentry)         | <2%    |
| Lighthouse score (web)      | ≥90    |
| Average page load time      | <3s    |
| Offline sync success rate   | ≥95%   |
| Payment processing failures | <1%    |

---

## 🔮 Future Enhancements (Phase 5 & Beyond)

### Post-MVP (Phase 5)

- **Advanced Offline:** Full CRUD offline, UI conflict resolution
- **Real-Time Chat:** Trip chat with threads & mentions
- **Task Lists:** Assignments with due dates
- **Decision Polls:** Group voting on activities
- **AI Trip Optimizer:** Route suggestions, time management
- **Receipt OCR:** Auto-expense creation from photos
- **Email Parsing:** Forward booking confirmations to auto-create itinerary items

### Future Ideas (Post-P5)

- **AI Photo Tagging:** Automatic categorization and search
- **Calendar Sync:** Google Calendar, Apple Calendar integration
- **Booking Affiliates:** Booking.com, Airbnb links (revenue share)
- **Map Integration:** Route visualization with Google Maps/Mapbox
- **White-Label Offering:** For travel agencies
- **Trip Templates:** Duplicate trips, community-contributed itineraries
- **Public Trip Sharing:** Opt-in discovery feed
- **Travel Guides:** Curated destination recommendations
- **Print Book:** Physical trip recap photo book (€10 add-on)

---

## 🤝 Contributing

This is Colin's project, built with AI pair programming (Claude). The workflow is documented for:

- Collaboration with AI (Claude Code)
- Potential future contributors
- Portfolio demonstration of best practices

### Code Review Checklist

Before merging a PR:

- [ ] All tests pass (unit, component, E2E)
- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no warnings
- [ ] Offline sync tested (disconnect → edit → reconnect)
- [ ] Role-based permissions tested (Owner, Participant, Viewer)
- [ ] Mobile tested on iOS and Android
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] Accessibility validated (ARIA, keyboard nav, screen reader)
- [ ] No console.log or debug code
- [ ] Supabase RLS policies tested
- [ ] Multi-currency scenarios tested (if applicable)

---

## 📚 Resources

### Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Expo Docs](https://docs.expo.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev/)
- [Detox](https://wix.github.io/Detox/)

### Tools

- [Linear (Project Management)](https://linear.app/crod)
- [GitHub (Code)](https://github.com/your-org/tripthreads)
- [Vercel (Web Hosting)](https://vercel.com)
- [Supabase Dashboard](https://app.supabase.com)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [PostHog (Analytics)](https://posthog.com)
- [Sentry (Monitoring)](https://sentry.io)

---

## 🚨 Risks & Mitigation

### Technical Risks

| Risk                        | Mitigation                                           |
| --------------------------- | ---------------------------------------------------- |
| Offline sync complexity     | Start with basic queue, defer conflict resolution    |
| Mobile app store approval   | Follow guidelines strictly, have legal docs ready    |
| Supabase scaling issues     | Monitor usage, plan for migration if needed          |
| FX rate API limits/downtime | Daily caching, backup provider (e.g., Fixer.io)      |
| Stripe webhook failures     | Idempotency keys, retry logic, manual reconciliation |

### Product Risks

| Risk                  | Mitigation                                         |
| --------------------- | -------------------------------------------------- |
| Low conversion rate   | A/B test paywall triggers, improve onboarding      |
| Complex UX            | Extensive user testing, progressive disclosure     |
| Competing products    | Focus on offline + NL input as differentiators     |
| User retention issues | Build habit loops, push notifications, trip recaps |

### Business Risks

| Risk              | Mitigation                                                 |
| ----------------- | ---------------------------------------------------------- |
| Slow user growth  | Product Hunt launch, travel influencer partnerships        |
| High churn rate   | Improve retention features, offer annual discount          |
| Cost overruns     | Monitor infra costs closely, optimize Supabase/Stripe fees |
| Regulatory issues | GDPR compliance, data export/deletion, legal review        |

---

## 📞 Support

For issues or questions:

- **Linear:** Track bugs and features
- **GitHub Issues:** Technical problems
- **GitHub Discussions:** Questions and ideas

---

**Last Updated:** October 2025
**Version:** 1.0 (MVP Pre-Development)
**Status:** In Development
**Linear Project:** https://linear.app/crod/project/tripthreads-mvp-cda67386ed0a
