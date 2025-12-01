# TripThreads

> **Make memories, not spreadsheets — travel made simple**

A collaborative trip planning platform that helps groups plan, manage, and relive trips together with offline-first capabilities and natural language input.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** (LTS)
- **npm, yarn, or pnpm**
- **Supabase account** (free tier works for development)
- **Stripe account** (test mode, free) - Required for Phase 3+

### Setup Steps

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   ```bash
   # Copy the example file
   cp .env.example .env.local

   # Edit .env.local with your actual keys
   # Required for MVP:
   # - NEXT_PUBLIC_SUPABASE_URL
   # - NEXT_PUBLIC_SUPABASE_ANON_KEY
   # - SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Get Supabase credentials**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project (or use existing)
   - Go to Settings → API
   - Copy `URL`, `anon public` key, and `service_role` key to `.env.local`

4. **Start development server**

   ```bash
   # Start both web and mobile workspaces (Turbo runs each package's dev script)
   npm run dev

   # Start a single app using Turbo's filter flag
   npm run dev -- --filter=web     # Web only (http://localhost:3000)
   npm run dev -- --filter=mobile  # Mobile only (Expo)

   # Or run the package-level scripts directly
   cd apps/web && npm run dev
   cd apps/mobile && npm run start
   ```

   > ℹ️ Turbo's `--filter` flag scopes the task to a specific workspace, so only the matching package's
   > scripts run. If you prefer, you can always change into a package directory and run its local `dev`
   > or `start` script directly.

5. **Run tests**
   ```bash
   npm test              # All tests
   npm run lint          # ESLint
   npm run type-check    # TypeScript
   ```

---

## ⚙️ Environment Setup

### Development (.env.local)

**Minimum required variables:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
```

**Additional variables for complete MVP:**

- `FX_RATES_API_KEY` - For expense tracking (Phase 2)
- `STRIPE_*` keys - For Pro tier payments (Phase 3)
- `SENTRY_DSN` - For error monitoring (Phase 4)
- `NEXT_PUBLIC_POSTHOG_KEY` - For analytics (Phase 4)

See [.env.example](./.env.example) for complete list with descriptions.

### Staging (Vercel)

Set environment variables in Vercel dashboard:

1. Go to your project → Settings → Environment Variables
2. Add all required variables
3. Set preview/production scopes appropriately
4. **Never commit** `.env.local` or `.env` to git!

### Production (Vercel + Expo)

**Web (Vercel):**

- Use production Supabase project
- Use production Stripe keys (`pk_live_`, `sk_live_`)
- Enable Sentry and PostHog
- Set `NODE_ENV=production`

**Mobile (Expo):**

- Configure in `app.json` under `extra` field
- Use EAS Secrets for sensitive values
- See [apps/mobile/app.json](./apps/mobile/app.json) for example

### Security Best Practices

✅ **DO:**

- Use `.env.local` for local development
- Store secrets in Vercel/EAS environment variables
- Prefix client-safe vars with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`
- Use different keys for dev/staging/production

❌ **DON'T:**

- Commit `.env.local` or `.env` to git
- Expose service role keys to client
- Use production keys in development
- Share API keys in screenshots or docs

---

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete project documentation (tech stack, architecture, workflows)
- **[TDD_GUIDE.md](./TDD_GUIDE.md)** - Test-driven development guide with examples
- **[FX_RATES.md](./FX_RATES.md)** - Foreign exchange rate integration strategy
- **[PRD](https://linear.app/crod/project/tripthreads-mvp-cda67386ed0a)** - Product Requirements Document (Linear)

---

## 🎯 Core Features (MVP)

### Phase 1: Core Foundation (8 weeks)

- ✅ Monorepo setup (Next.js web + Expo mobile)
- ✅ Supabase Auth (Email, Google, Apple OAuth)
- ✅ User roles: Owner, Participant, Viewer
- ✅ Trip management with invite system
- ✅ Basic offline sync (read + write queue)

### Phase 2: Itinerary & Ledger (6 weeks)

- 📅 Natural language itinerary builder
- 💰 Expense tracking with multi-currency support
- 🔄 Split rules: equal, by weight, by percentage
- 💱 FX rate snapshots with historical accuracy
- ⚖️ Group debt optimization

### Phase 3: Media, Pro Features & Stripe (6 weeks)

- 📸 Photo/video uploads with compression
- 🎁 Pro tier gating (unlimited participants/photos)
- 💳 Stripe integration (subscriptions)
- 👤 User settings and profile management
- 🔒 GDPR compliance (data export/deletion)

### Phase 4: Push, Recap & Launch (6 weeks)

- 🔔 Push notifications (web + mobile)
- 📄 PDF trip recap generation
- 📊 Analytics and monitoring
- ⚖️ Legal docs (ToS, Privacy Policy)
- 🚢 App Store submissions

---

## 🏗️ Tech Stack

### Frontend

- **Next.js 14+** (App Router) - Web application
- **Expo** (React Native) - Mobile apps (iOS/Android)
- **TypeScript** - Type safety throughout
- **Tailwind CSS + shadcn/ui** - Design system
- **NativeWind** - Tailwind for React Native

### Backend

- **Supabase** - Backend as a service
  - Postgres database with RLS
  - Authentication (Email, Google, Apple)
  - Storage (photos/videos)
  - Edge Functions (serverless)
- **Stripe** - Payment processing
- **exchangerate.host** - FX rates API

### Testing

- **Jest/Vitest** - Unit tests
- **React Testing Library** - Component tests
- **Playwright** - Web E2E tests
- **Detox** - Mobile E2E tests

### DevOps

- **Vercel** - Web hosting
- **Expo/EAS** - Mobile builds
- **GitHub Actions** - CI/CD
- **Sentry** - Error monitoring
- **PostHog** - Product analytics

---

## 💰 Pricing

### Free Plan

- 1 active trip at a time
- Up to 5 participants
- 100 photos max
- Basic features

### Pro Plan (€7/month or €70/year)

- Unlimited trips
- Unlimited participants
- Unlimited photos & videos
- PDF trip recap
- Priority support

---

## 🧪 Test-Driven Development

**Every feature must be built using TDD:**

1. ✅ Write failing test first
2. ✅ Write minimal code to pass
3. ✅ Refactor while keeping tests green

**Coverage requirements:**

- 80% minimum for all code
- 100% for currency calculations
- 100% for role-based permissions

See [TDD_GUIDE.md](./TDD_GUIDE.md) for complete guide with examples.

---

## 🌍 Multi-Currency Support

**Strategy: FX Rate Snapshots**

- Fetch rate from exchangerate.host when expense is created
- Store rate in `expenses.fx_rate` column
- Use stored rate for all conversions and settlements
- No daily cron job or separate `fx_rates` table needed

See [FX_RATES.md](./FX_RATES.md) for implementation details.

---

## 📂 Project Structure

```
tripthreads/
├── apps/
│   ├── web/                    # Next.js web app
│   └── mobile/                 # Expo mobile app
├── packages/
│   └── shared/                 # Shared code (types, utils, parser)
├── supabase/
│   ├── migrations/             # Database migrations
│   └── functions/              # Edge Functions
├── docs/                       # Additional documentation
├── CLAUDE.md                   # Project documentation
├── TDD_GUIDE.md                # TDD guide
├── FX_RATES.md                 # FX rate strategy
└── README.md                   # This file
```

---

## 🎯 Success Metrics

### MVP Launch (Month 1)

- 500+ trips created
- 40%+ trips with ≥2 participants
- 5%+ free-to-paid conversion
- <100ms p95 API response time

### 6 Months

- 5,000+ active trips
- 50%+ 3-month retention
- 8%+ conversion rate
- €10k+ MRR

### 12 Months

- 20,000+ active trips
- 10%+ conversion rate
- €50k+ MRR
- Break-even or profitable

---

## 🤝 Contributing

This project follows strict TDD methodology. Before submitting a PR:

- [ ] All new functions have unit tests
- [ ] All new components have component tests
- [ ] Test coverage is ≥80%
- [ ] Currency calculations have 100% coverage
- [ ] Role-based permissions are tested
- [ ] All tests pass in CI

---

## 📄 License

Proprietary - © 2025 Colin Rodrigues

---

## 🔗 Links

- **Linear Project:** https://linear.app/crod/project/tripthreads-mvp-cda67386ed0a
- **Documentation:** [CLAUDE.md](./CLAUDE.md)
- **TDD Guide:** [TDD_GUIDE.md](./TDD_GUIDE.md)

---

**Built with ❤️ and TDD**
