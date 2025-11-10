# TripThreads - Project Documentation

**Last Updated:** November 2025
**Version:** 0.2.0 (Phase 1-2 Complete)
**Status:** 🚧 **Active Development** - Phase 3 (Media & Stripe) Next
**Linear Project:** https://linear.app/crod/project/tripthreads-mvp-cda67386ed0a

---

## 🚀 Quick Reference

### Project Status at a Glance

| Phase       | Status      | Description                                            |
| ----------- | ----------- | ------------------------------------------------------ |
| **Phase 1** | ✅ Complete | Core foundation (Auth, Trips, Participants, Invites)   |
| **Phase 2** | ✅ Complete | Itinerary, Expenses, Multi-currency, Chat, Settlements |
| **Phase 3** | 📋 Planned  | Media/Feed, Stripe/Pro, PDF Recap                      |
| **Phase 4** | 📋 Planned  | Push Notifications, Launch Prep                        |
| **Phase 5** | 📋 Future   | Post-MVP Enhancements                                  |

### Most-Used Commands

```bash
# Development
npm run dev                 # Start all apps (web + mobile)
npm test                    # Run all tests
npm run lint                # Lint code
npm run type-check          # TypeScript check

# Database
npm run generate-types      # Generate Supabase types
supabase db reset          # Reset local database

# Deployment
git push origin development # Deploy to staging
git push origin main       # Deploy to production
```

### Key Files & Directories

```
📁 apps/web/              # Next.js web app
  ├── app/                # App router (pages)
  ├── components/         # React components
  └── lib/                # Utilities, Supabase client

📁 apps/mobile/           # Expo mobile app
  ├── app/                # Expo router
  └── lib/                # Mobile utilities

📁 packages/
  ├── core/               # Core types & utilities
  └── shared/             # Shared business logic

📁 supabase/
  ├── migrations/         # Database migrations
  └── functions/          # Edge functions

📁 docs/                  # Documentation
  ├── DATABASE.md         # 📘 Schema & migrations
  ├── TESTING.md          # 🧪 Testing strategy
  └── CICD.md             # 🚀 Deployment pipeline
```

### Need Help?

- 📘 **Database Schema** → [docs/DATABASE.md](docs/DATABASE.md)
- 🧪 **Testing Guide** → [docs/TESTING.md](docs/TESTING.md)
- 🚀 **CI/CD & Deployment** → [docs/CICD.md](docs/CICD.md)
- 🎨 **Design System** → [design-system-playful-citrus-pop.md](design-system-playful-citrus-pop.md)
- 📝 **TDD Principles** → [TDD_GUIDE.md](TDD_GUIDE.md)
- 🔐 **Sentry Integration** → [SENTRY_INTEGRATION.md](SENTRY_INTEGRATION.md)

---

## 📋 Project Overview

**TripThreads** is a collaborative trip planning platform that helps groups plan, manage, and relive trips together. It combines itinerary building, expense splitting, and media sharing with offline-first capabilities and natural language input.

**Core Value Proposition:**

> "Make memories, not spreadsheets — travel made simple"

**Key Features:**

- ✅ Natural language expense input ("Split 60€ dinner 4 ways")
- ✅ Shared expense tracking with multi-currency support and optimized settlements
- ✅ Trip chat with AI assistant
- ✅ Collaborative itinerary building
- 🚧 Offline-first architecture (read + basic write queue) - Phase 2+
- 🚧 Role-based collaboration (Owner, Participant, Viewer, Partial Joiner) - Partially implemented
- 📋 Trip media feed with photos/videos - Phase 3
- 📋 Pro tier with unlimited participants/photos and PDF recap - Phase 3

---

## 🎯 Current Implementation Status

### ✅ Fully Implemented (Phase 1-2)

#### Authentication & User Management

- ✅ Email/password authentication (Supabase Auth)
- ✅ Google OAuth integration
- ✅ User profiles with avatar support
- ✅ Password reset flows

#### Trip Management

- ✅ Create, edit, delete trips
- ✅ Trip participant management
- ✅ Trip invitations via email
- ✅ Access request system (for public trip discovery)
- ✅ Role-based permissions (Owner, Participant, Viewer)
- ✅ Partial joiner support (date-scoped visibility)

#### Expense Tracking & Settlements

- ✅ Create, edit, delete expenses
- ✅ Multi-currency expense support
- ✅ FX rate lookup and caching (OpenExchangeRates)
- ✅ Expense splitting (equal, percentage, custom)
- ✅ Ledger calculation with partial joiner proration
- ✅ Optimized settlement recommendations
- ✅ Mark settlements as paid/unpaid
- ✅ Natural language expense parsing
- ✅ Fuzzy participant name matching (handles typos, partial names, accents)

#### Itinerary

- ✅ Create, edit, delete itinerary items (flights, stays, activities)
- ✅ Enhanced fields (location, booking reference, cost, URL)
- ✅ Timeline view organized by date

#### Chat & Collaboration

- ✅ Trip chat with real-time updates
- ✅ AI assistant integration (OpenAI)
- ✅ Message reactions (emoji)
- ✅ Mentions (user tagging)

#### Developer Experience

- ✅ Jest testing framework (migrated from Vitest)
- ✅ Playwright E2E tests (web)
- ✅ Sentry error monitoring
- ✅ TypeScript type generation from Supabase
- ✅ GitHub Actions CI/CD pipeline
- ✅ Vercel deployment (staging + production ready)

### 🚧 In Progress

- 🚧 Offline sync (basic read caching, write queue pending)
- 🚧 Mobile app (infrastructure complete, feature parity in progress)
- 🚧 Comprehensive E2E test coverage
- 🚧 Role-based UI visibility (partial implementation)

### 📋 Planned (Phase 3-5)

#### Phase 3: Media & Pro Features (Next)

- 📋 Photo/video uploads to trip feed
- 📋 Trip media timeline with day tagging
- 📋 Stripe integration for Pro subscriptions
- 📋 Pro tier features (unlimited participants/photos)
- 📋 PDF trip recap generation

#### Phase 4: Push & Launch

- 📋 Push notifications (web + mobile)
- 📋 Notification preferences
- 📋 Trip recap delivery
- 📋 App store submission (iOS + Android)

#### Phase 5: Post-MVP

- 📋 Advanced offline sync (full CRUD, conflict resolution)
- 📋 Receipt OCR for expense creation
- 📋 Calendar sync (Google, Apple)
- 📋 Map integration for itinerary visualization
- 📋 Trip templates and duplication

---

## 🏗️ Tech Stack

### Frontend (Web) - ✅ Implemented

- **Next.js 15+** (App Router) - SSR, PWA, routing
- **React 18+** - UI framework
- **TypeScript 5+** - Type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library (built on Radix UI)
- 🚧 **IndexedDB (Dexie.js)** - Offline data cache (Phase 2+)

### Mobile - 🚧 In Progress

- **Expo SDK 52+** (React Native) - Cross-platform mobile
- **Expo Router** - File-based navigation
- **NativeWind** - Tailwind for React Native
- 📋 **expo-sqlite** - Offline storage (Phase 2+)
- 📋 **Expo Push Notifications** - Push notification delivery (Phase 4)

### Backend - ✅ Implemented

- **Supabase (Postgres 15+)** - Primary database
- **Supabase Auth** - Email, Google OAuth (Apple pending)
- **Supabase Storage** - Photo/video uploads (Phase 3)
- **Supabase Edge Functions** (Deno) - Serverless logic
- **Row-Level Security (RLS)** - Data access control

### Natural Language Parser - ✅ Implemented

- **chrono-node** - Date/time extraction
- **Custom tokenizer** - Currency, amounts, keywords
- **Client-side deterministic parsing** - No AI/ML

### AI Integration - ✅ Implemented

- **OpenAI GPT-4** - Trip chat assistant
- **Streaming responses** - Real-time chat experience

### Payments - 📋 Planned (Phase 3)

- **Stripe Checkout** - Subscription management
- **Stripe Webhooks** - Lifecycle events
- **Stripe Customer Portal** - Self-service billing

### Testing - ✅ Implemented

- **Jest** - Unit & component testing (migrated from Vitest)
- **React Testing Library** - Component testing
- **Playwright** - Web E2E testing
- 📋 **Detox** - Mobile E2E testing (Phase 3)

### DevOps & Monitoring - ✅ Implemented

- **Vercel** - Web hosting and deployment
- **GitHub Actions** - CI/CD pipeline
- **Sentry** - Error monitoring (integrated Phase 1)
- 📋 **PostHog** - Product analytics (Phase 3)
- **Vercel Analytics** - Web performance metrics

### Third-Party APIs

- ✅ **OpenExchangeRates** - Historical FX rates (on-demand caching)
  - Free tier: 1,000 requests/month, USD base only
- ✅ **OpenAI API** - AI chat assistant (GPT-4)
- 📋 **Expo Push Notifications** - Mobile push delivery (Phase 4)
- 📋 **Web Push API (VAPID)** - Web push notifications (Phase 4)

---

## 🧪 Testing Strategy

### Test-Driven Development (TDD)

TripThreads follows **strict TDD methodology**:

> "Write the test first, then write the code to make it pass."

### Testing Stack

- ✅ **Jest** - Unit & component tests (migrated from Vitest in Phase 2)
- ✅ **React Testing Library** - User-centric component testing
- ✅ **Playwright** - E2E tests (run in CI only, not locally)
- 📋 **Detox** - Mobile E2E tests (Phase 3)

### Coverage Requirements

- **100% coverage** for currency/money calculations (achieved ✅)
- **100% coverage** for ledger calculations (achieved ✅)
- **80%+ coverage** for critical paths (70% - in progress 🚧)
- **70%+ coverage** for UI components (60% - in progress 🚧)

### Running Tests

```bash
# All tests (unit + component)
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (DO NOT run locally - use CI)
cd apps/web
npm run test:e2e
```

**For detailed testing guidelines, see [docs/TESTING.md](docs/TESTING.md)**

---

## 📂 Project Structure

```
tripthreads/
├── .github/
│   └── workflows/
│       ├── ci.yml                  # CI/CD pipeline
│       └── generate-types.yml      # Supabase type generation
├── apps/
│   ├── web/                        # ✅ Next.js web app
│   │   ├── app/
│   │   │   ├── (auth)/             # Auth pages (login, signup)
│   │   │   ├── (app)/              # Authenticated app
│   │   │   │   └── trips/          # Trip management
│   │   │   ├── actions/            # Server actions
│   │   │   ├── api/                # API routes
│   │   │   └── invite/             # Public invite pages
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui components
│   │   │   └── features/
│   │   │       ├── chat/           # ✅ Chat components
│   │   │       ├── expenses/       # ✅ Expense components
│   │   │       ├── invites/        # ✅ Invite system
│   │   │       ├── itinerary/      # ✅ Itinerary components
│   │   │       ├── onboarding/     # ✅ User onboarding
│   │   │       ├── profile/        # ✅ User profile
│   │   │       └── trips/          # ✅ Trip components
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts       # Supabase client
│   │   │   │   ├── server.ts       # Server-side client
│   │   │   │   └── middleware.ts   # Auth middleware
│   │   │   └── utils/
│   │   │       ├── currency.ts     # ✅ FX utilities
│   │   │       ├── ledger.ts       # ✅ Ledger calculations
│   │   │       └── parser.ts       # ✅ NL parser
│   │   ├── tests/
│   │   │   ├── unit/               # Unit tests
│   │   │   ├── components/         # Component tests
│   │   │   └── e2e/                # E2E tests (Playwright)
│   │   ├── next.config.ts
│   │   ├── jest.config.ts
│   │   └── playwright.config.ts
│   └── mobile/                     # 🚧 Expo mobile app
│       ├── app/                    # Expo router pages
│       ├── components/             # Mobile components
│       ├── lib/                    # Mobile utilities
│       └── __tests__/              # Mobile tests
├── packages/
│   ├── core/                       # ✅ Core types & utilities
│   │   └── src/
│   │       └── types/
│   │           └── database.ts     # Auto-generated Supabase types
│   ├── shared/                     # ✅ Shared business logic
│   │   ├── __tests__/              # Shared tests
│   │   ├── constants/              # Constants (currencies, etc.)
│   │   ├── lib/                    # Shared utilities
│   │   ├── src/                    # Shared source
│   │   └── types/                  # Shared types
│   └── web/                        # Web-specific shared code
├── supabase/
│   ├── migrations/                 # ✅ SQL migrations (Phase 1-2)
│   ├── functions/                  # Edge functions
│   │   ├── fx-rates-sync/          # ✅ FX rate lookup
│   │   └── send-access-request-email/ # ✅ Email notifications
│   └── config.toml                 # Supabase config
├── docs/
│   ├── DATABASE.md                 # 📘 Database schema & migrations
│   ├── TESTING.md                  # 🧪 Testing strategy
│   ├── CICD.md                     # 🚀 CI/CD pipeline
│   ├── SUPABASE_TYPES_GENERATION.md # Type generation
│   └── wireframes/                 # Design mockups
├── scripts/
│   └── rl-analyze-patterns.ts      # Analytics scripts
├── .env.example                    # Environment variables template
├── jest.config.js                  # Root Jest config
├── turbo.json                      # Turborepo config
├── CLAUDE.md                       # ✨ This file
├── README.md                       # User-facing README
├── TDD_GUIDE.md                    # TDD principles
├── SENTRY_INTEGRATION.md           # Sentry setup
└── design-system-playful-citrus-pop.md # Design system
```

---

## 🗄️ Database Architecture

TripThreads uses **Supabase (PostgreSQL 15+)** for the database with strict **Row-Level Security (RLS)** policies.

### Core Tables (Phase 1-2 ✅)

- ✅ `users` - User profiles and auth
- ✅ `trips` - Trip metadata with base currency
- ✅ `trip_participants` - User-trip relationships with roles
- ✅ `trip_invites` - Email-based invitations
- ✅ `access_requests` - Public trip access requests
- ✅ `itinerary_items` - Flights, stays, activities
- ✅ `expenses` - Multi-currency expenses
- ✅ `expense_participants` - Expense splits
- ✅ `settlements` - Optimized debt settlements
- ✅ `fx_rates` - Currency exchange rate cache
- ✅ `chat_messages` - Trip chat with AI
- ✅ `message_reactions` - Emoji reactions

### Planned Tables (Phase 3-4 📋)

- 📋 `media_files` - Photos/videos with day tagging
- 📋 `push_tokens` - Notification delivery
- 📋 `trip_recaps` - PDF generation metadata

### Key Features

- ✅ **RLS Policies** - All tables secured with user-context policies
- ✅ **Partial Joiner Support** - Date-scoped visibility for participants
- ✅ **Expense Proration** - Automatic adjustment for partial joiners
- ✅ **Multi-Currency** - Trip base currency with FX rate snapshots
- ✅ **Optimized Settlements** - Minimal number of transactions

**For detailed schema documentation, see [docs/DATABASE.md](docs/DATABASE.md)**

---

## 🌿 Git Workflow

### Branch Strategy

```
main (production)
└── development (staging)
    └── feature/* (feature branches)
```

**⚠️ CRITICAL RULE: Always branch from `development`, NEVER from `main`**

### Branch Purposes

- **`main`** - Production branch (✅ Ready)
  - Deploys to: `tripthreads.com` (web) 📋 Not yet live
  - Protected, requires PR approval
  - Only merge from `development`

- **`development`** - Staging branch (✅ Active)
  - Deploys to: `dev.tripthreads.com` 🚧 URL pending
  - Integration branch for all features
  - Default branch for PRs

- **`feature/*`** - Feature branches
  - Format: `feature/P{phase}-{issue}-{description}`
  - Examples: `feature/P3-45-stripe-integration`

### Development Workflow

1. **Create feature branch from `development`:**

   ```bash
   git checkout development
   git pull origin development
   git checkout -b feature/P3-45-stripe-integration
   ```

2. **Write tests first (TDD)**
3. **Implement feature**
4. **Commit with conventional commits**
5. **Push and create PR to `development`**
6. **CI runs: lint, type-check, tests, build**
7. **Merge and auto-deploy to staging**
8. **When phase complete: PR `development` → `main` for production**

### Commit Message Conventions

Format: `<type>(<scope>): <subject>`

**Types:** `feat`, `fix`, `test`, `refactor`, `docs`, `chore`

**Scopes:** `auth`, `trips`, `expenses`, `itinerary`, `chat`, `parser`, `offline`, `fx`, `mobile`, `web`

**Examples:**

```
feat(expenses): add natural language expense parsing
fix(fx): handle missing exchange rates gracefully
test(ledger): add comprehensive settlement tests
```

---

## 🚀 CI/CD Pipeline

### GitHub Actions

**On every push:**

1. ✅ Lint (ESLint)
2. ✅ Type Check (TypeScript)
3. ✅ Unit & Component Tests (Jest)
4. ✅ Build Check (Next.js)

**On PR to `main`:** 5. ✅ E2E Tests (Playwright)

### Vercel Deployment

| Branch        | Environment | Auto-Deploy | Status    |
| ------------- | ----------- | ----------- | --------- |
| `main`        | Production  | ✅ Yes      | 📋 Ready  |
| `development` | Staging     | ✅ Yes      | ✅ Active |
| `feature/*`   | Preview     | ✅ Yes      | ✅ Active |

**For detailed CI/CD documentation, see [docs/CICD.md](docs/CICD.md)**

---

## 📊 Monitoring & Analytics

### Sentry (Error Monitoring) - ✅ Integrated

- ✅ Client-side React errors
- ✅ Server action errors
- ✅ API route errors
- ✅ FX rate lookup failures
- ✅ Supabase RLS errors
- ✅ Release tracking with Git SHA

**Dashboard:** [Sentry Dashboard](https://sentry.io)

### PostHog (Product Analytics) - 📋 Planned (Phase 3)

- User behavior tracking
- Funnel analysis
- Session recordings (Pro users + 10% Free)

### Vercel Analytics - ✅ Enabled

- Core Web Vitals monitoring
- Real User Monitoring (RUM)
- Geographic performance breakdown

---

## 🎨 Design System

**Active Design System:** **Playful Citrus Pop**

### Quick Reference

**Primary Colors:**

- Primary: `#F97316` (Orange 500) - Adventure, energy
- Secondary: `#22C55E` (Green 500) - Success, collaboration
- Destructive: `#EF4444` (Red 500) - Errors

**Typography:**

- Font: `Inter` with system fallback
- Headings: `font-semibold` (600)
- Body: `font-normal` (400)

**For complete design system, see [design-system-playful-citrus-pop.md](design-system-playful-citrus-pop.md)**

---

## 📖 Reference Documents

### Core Documentation

- **[docs/DATABASE.md](docs/DATABASE.md)** - Complete schema, migrations, RLS policies
- **[docs/TESTING.md](docs/TESTING.md)** - Testing strategy, examples, best practices
- **[docs/CICD.md](docs/CICD.md)** - Deployment pipeline, environments, rollback

### Additional Documentation

- **[TDD_GUIDE.md](TDD_GUIDE.md)** - Test-Driven Development principles
- **[SENTRY_INTEGRATION.md](SENTRY_INTEGRATION.md)** - Error monitoring setup
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Step-by-step deployment procedures
- **[design-system-playful-citrus-pop.md](design-system-playful-citrus-pop.md)** - UI/UX design system

### Linear Project

**Project URL:** https://linear.app/crod/project/tripthreads-mvp-cda67386ed0a

**Phases:**

1. ✅ **Phase 1:** Core Foundation (8 weeks, 16 issues, ~55 SP) - **Complete**
2. ✅ **Phase 2:** Itinerary & Ledger (6 weeks, 9 issues, ~38 SP) - **Complete**
3. 📋 **Phase 3:** Media, Pro Features & Stripe (6 weeks, 18 issues, ~62 SP)
4. 📋 **Phase 4:** Push, Recap & Launch (6 weeks, 15 issues, ~52 SP)
5. 📋 **Phase 5:** Post-MVP Enhancements (Future, 9 issues, ~52 SP)

---

## 🏁 Getting Started

### Prerequisites

- **Node.js 20+** (LTS)
- **npm 10+**
- **Git**
- **Supabase CLI** (`npm install -g supabase`)
- 📋 **Expo CLI** (`npm install -g expo-cli`) - For mobile development

### Initial Setup

```bash
# Clone repository
git clone https://github.com/colin-rod/tripthreads.git
cd tripthreads

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start local Supabase
supabase start

# Generate TypeScript types
npm run generate-types

# Run database migrations
supabase db push

# Start development server
npm run dev
```

### Development Commands

```bash
# Development
npm run dev                 # Start all apps
npm test                    # Run tests
npm run test:watch          # Watch mode
npm run lint                # Lint code
npm run type-check          # TypeScript check
npm run format              # Format code

# Database
npm run generate-types      # Generate Supabase types
supabase db push           # Apply migrations
supabase db reset          # Reset database

# Build
npm run build              # Build for production
```

---

## 🎯 Success Metrics

### MVP Launch Success (First Month)

| Metric                     | Target | Status          |
| -------------------------- | ------ | --------------- |
| Trips created              | 500+   | 📋 Not launched |
| Trips with ≥2 participants | 40%+   | 📋 Not launched |
| Free-to-paid conversion    | 5%+    | 📋 Phase 3      |
| p95 API response time      | <100ms | 🚧 Monitoring   |
| Critical security issues   | 0      | ✅ 0 current    |

### 6-Month Success

| Metric                 | Target |
| ---------------------- | ------ |
| Active trips           | 5,000+ |
| 3-month retention rate | 50%+   |
| Conversion rate        | 8%+    |
| MRR                    | €10k+  |
| App store rating       | 4.5+   |

---

## 🔮 Future Enhancements

### Phase 3 (Next) - Media & Pro

- 📋 Photo/video uploads and trip feed
- 📋 Stripe integration and Pro subscriptions
- 📋 PDF trip recap generation
- 📋 Pro tier limits enforcement

### Phase 4 - Launch Prep

- 📋 Push notifications (web + mobile)
- 📋 App store submission
- 📋 Marketing website
- 📋 Email campaigns

### Phase 5+ - Post-MVP

- 📋 Advanced offline sync with conflict resolution
- 📋 Receipt OCR for expense creation
- 📋 Calendar sync (Google, Apple)
- 📋 Map integration for itinerary
- 📋 Trip templates and duplication
- 📋 Real-time presence indicators

---

## 🤝 Contributing

This is Colin's project, built with AI pair programming (Claude). The workflow is documented for:

- Collaboration with AI (Claude Code)
- Potential future contributors
- Portfolio demonstration of best practices

### Code Review Checklist

Before merging a PR:

- [ ] All CI checks pass (lint, type-check, tests, build)
- [ ] TypeScript compiles without errors
- [ ] Test coverage meets minimums
- [ ] Database migrations tested locally
- [ ] RLS policies tested with different user roles
- [ ] No `console.log` or debug code
- [ ] Commit messages follow conventions
- [ ] Documentation updated if needed

---

## 📚 Resources

### Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Expo Docs](https://docs.expo.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tools

- [Linear (Project Management)](https://linear.app/crod)
- [GitHub (Code)](https://github.com/colin-rod/tripthreads)
- [Vercel (Hosting)](https://vercel.com)
- [Supabase Dashboard](https://app.supabase.com)
- [Sentry (Monitoring)](https://sentry.io)

---

## 🚨 Known Issues & Risks

### Current Issues

- 🚧 E2E tests are flaky in local environment (run in CI only)
- 🚧 Mobile app feature parity with web (in progress)
- 🚧 Offline sync not yet implemented (Phase 2+)

### Technical Risks

| Risk                      | Mitigation                                        |
| ------------------------- | ------------------------------------------------- |
| Offline sync complexity   | Start with basic queue, defer conflict resolution |
| Supabase scaling          | Monitor usage, plan for optimization              |
| FX API rate limits        | Daily caching, graceful degradation               |
| Mobile app store approval | Follow guidelines strictly, legal docs ready      |

---

## 📞 Support

For issues or questions:

- **Linear:** Track bugs and features
- **GitHub Issues:** Technical problems
- **GitHub Discussions:** Questions and ideas

---

**Version:** 0.2.0 (Phase 1-2 Complete)
**Last Updated:** November 2025
**Next Phase:** Phase 3 - Media & Stripe Integration
**Linear Project:** https://linear.app/crod/project/tripthreads-mvp-cda67386ed0a

---

_Built with ❤️ by Colin Rodriguez with AI pair programming (Claude)_
