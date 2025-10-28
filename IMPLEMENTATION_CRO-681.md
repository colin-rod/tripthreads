# CRO-681: Initialize Monorepo & CI - Implementation Guide

**Issue:** CRO-681
**Epic:** E1 - Foundations & Design System
**Phase:** P1 - Core Foundation
**Story Points:** 5

---

## 🎯 Goal

Set up a production-ready monorepo with:
- Next.js 14+ web app
- Expo mobile app
- Shared TypeScript packages
- Testing infrastructure (TDD-ready)
- CI/CD pipeline
- Code quality tools

---

## 📋 Step-by-Step Implementation

### Step 1: Initialize Turborepo

**TDD First: Write smoke test**

```bash
# Create test file before repo exists
mkdir -p __tests__
cat > __tests__/repo-structure.test.ts << 'EOF'
import { existsSync } from 'fs'
import { resolve } from 'path'

describe('Monorepo Structure', () => {
  it('should have apps/web directory', () => {
    expect(existsSync(resolve(__dirname, '../apps/web'))).toBe(true)
  })

  it('should have apps/mobile directory', () => {
    expect(existsSync(resolve(__dirname, '../apps/mobile'))).toBe(true)
  })

  it('should have packages/shared directory', () => {
    expect(existsSync(resolve(__dirname, '../packages/shared'))).toBe(true)
  })

  it('should have turbo.json config', () => {
    expect(existsSync(resolve(__dirname, '../turbo.json'))).toBe(true)
  })
})
EOF
```

**Run test (should fail):**
```bash
npm test
# ❌ FAIL - directories don't exist
```

**Now implement:**

```bash
# Initialize Turborepo
npx create-turbo@latest

# Follow prompts:
# - Name: tripthreads
# - Package manager: npm (or yarn/pnpm)
# - Include example apps: No (we'll create custom)

# Clean up generated example apps
rm -rf apps/docs apps/web

# Create proper structure
mkdir -p apps/web apps/mobile packages/shared packages/ui
```

**Run test again:**
```bash
npm test
# ✅ PASS - structure exists
```

---

### Step 2: Initialize Next.js Web App

**TDD First: Write app test**

```typescript
// apps/web/__tests__/app.test.tsx
import { render, screen } from '@testing-library/react'
import Home from '../app/page'

describe('Home Page', () => {
  it('should render welcome message', () => {
    render(<Home />)
    expect(screen.getByText(/TripThreads/i)).toBeInTheDocument()
  })

  it('should render without errors', () => {
    const { container } = render(<Home />)
    expect(container.firstChild).toBeTruthy()
  })
})
```

**Run test (should fail):**
```bash
cd apps/web
npm test
# ❌ FAIL - Home component doesn't exist
```

**Now implement:**

```bash
cd apps/web

# Initialize Next.js with TypeScript
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Answer prompts:
# - TypeScript: Yes
# - ESLint: Yes
# - Tailwind CSS: Yes
# - App Router: Yes
# - Import alias: @/*
```

Create basic homepage:

```typescript
// apps/web/app/page.tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">TripThreads</h1>
        <p className="text-xl text-gray-600">
          Make memories, not spreadsheets — travel made simple
        </p>
      </div>
    </main>
  )
}
```

Install testing dependencies:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom
```

Create Jest config:

```javascript
// apps/web/jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

module.exports = createJestConfig(customJestConfig)
```

```javascript
// apps/web/jest.setup.js
import '@testing-library/jest-dom'
```

**Run test again:**
```bash
npm test
# ✅ PASS - Home component renders
```

**Update package.json:**

```json
{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit"
  }
}
```

---

### Step 3: Initialize Expo Mobile App

**TDD First: Write app test**

```typescript
// apps/mobile/__tests__/App.test.tsx
import { render, screen } from '@testing-library/react-native'
import Index from '../app/index'

describe('Home Screen', () => {
  it('should render welcome message', () => {
    render(<Index />)
    expect(screen.getByText(/TripThreads/i)).toBeTruthy()
  })

  it('should render without crashing', () => {
    const { toJSON } = render(<Index />)
    expect(toJSON()).toBeTruthy()
  })
})
```

**Run test (should fail):**
```bash
cd apps/mobile
npm test
# ❌ FAIL - App doesn't exist
```

**Now implement:**

```bash
cd apps/mobile

# Initialize Expo app with TypeScript
npx create-expo-app@latest . --template blank-typescript

# Install dependencies
npm install expo-router nativewind
npm install --save-dev tailwindcss
```

Set up Expo Router:

```typescript
// apps/mobile/app/_layout.tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return <Stack />
}
```

```typescript
// apps/mobile/app/index.tsx
import { View, Text, StyleSheet } from 'react-native'

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>TripThreads</Text>
      <Text style={styles.subtitle}>
        Make memories, not spreadsheets — travel made simple
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
  },
})
```

Install testing dependencies:

```bash
npm install --save-dev jest @testing-library/react-native @types/jest
```

Create Jest config:

```javascript
// apps/mobile/jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
}
```

```javascript
// apps/mobile/jest.setup.js
import '@testing-library/jest-native/extend-expect'
```

**Update package.json:**

```json
{
  "name": "mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  }
}
```

**Run test again:**
```bash
npm test
# ✅ PASS - App renders
```

---

### Step 4: Create Shared Packages

**TDD First: Write utility tests**

```typescript
// packages/shared/__tests__/currency.test.ts
import { formatCurrency, convertToMinorUnits } from '../src/utils/currency'

describe('Currency Utils', () => {
  describe('formatCurrency', () => {
    it('should format EUR correctly', () => {
      expect(formatCurrency(100, 'EUR')).toBe('€100.00')
    })

    it('should format USD correctly', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100.00')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0, 'EUR')).toBe('€0.00')
    })

    it('should handle negative amounts (refunds)', () => {
      expect(formatCurrency(-50, 'USD')).toBe('-$50.00')
    })
  })

  describe('convertToMinorUnits', () => {
    it('should convert dollars to cents', () => {
      expect(convertToMinorUnits(100.50)).toBe(10050)
    })

    it('should handle whole numbers', () => {
      expect(convertToMinorUnits(100)).toBe(10000)
    })

    it('should round to nearest cent', () => {
      expect(convertToMinorUnits(100.999)).toBe(10100)
    })
  })
})
```

**Run test (should fail):**
```bash
cd packages/shared
npm test
# ❌ FAIL - functions don't exist
```

**Now implement:**

```bash
cd packages/shared

# Initialize package
npm init -y
npm install --save-dev typescript @types/node jest ts-jest
```

Create package structure:

```typescript
// packages/shared/src/utils/currency.ts

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
}

/**
 * Format currency amount with symbol
 * @param amount - Amount in major units (e.g., 100.00 for $100)
 * @param currency - ISO 4217 currency code
 */
export function formatCurrency(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  const formattedAmount = Math.abs(amount).toFixed(2)

  if (amount < 0) {
    return `-${symbol}${formattedAmount}`
  }

  return `${symbol}${formattedAmount}`
}

/**
 * Convert major units to minor units (dollars to cents)
 * @param amount - Amount in major units
 * @returns Amount in minor units (cents)
 */
export function convertToMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}
```

Create index file:

```typescript
// packages/shared/src/index.ts
export * from './utils/currency'
```

Update package.json:

```json
{
  "name": "@tripthreads/shared",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

Create TypeScript config:

```json
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

Create Jest config:

```javascript
// packages/shared/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
}
```

**Run test again:**
```bash
npm test
# ✅ PASS - All currency utils work
```

---

### Step 5: Configure Turborepo

Create Turborepo config:

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "outputs": []
    },
    "test": {
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Update root package.json:

```json
{
  "name": "tripthreads",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.0.0",
    "eslint": "^8.0.0"
  }
}
```

---

### Step 6: Set Up ESLint & Prettier

Create ESLint config:

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
    es6: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
```

Create Prettier config:

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

Create .prettierignore:

```
node_modules
.next
.expo
dist
coverage
```

Install dependencies:

```bash
npm install --save-dev \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-config-prettier \
  prettier
```

---

### Step 7: Set Up Husky & lint-staged

Install dependencies:

```bash
npm install --save-dev husky lint-staged
npx husky init
```

Create pre-commit hook:

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

Add lint-staged config to root package.json:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

**Test it:**

```bash
# Make a change
echo "export const test = 'hello'" > packages/shared/src/test.ts

# Stage it
git add packages/shared/src/test.ts

# Try to commit (Husky will run lint-staged)
git commit -m "test: verify pre-commit hook"
# Should format and lint automatically
```

---

### Step 8: Set Up GitHub Actions CI

Create CI workflow:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, development]
  pull_request:
    branches: [main, development]

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build-web:
    name: Build Web
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build --filter=web
        env:
          SKIP_ENV_VALIDATION: true

  build-mobile:
    name: Build Mobile
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: cd apps/mobile && npx expo export --platform all
```

---

### Step 9: Configure Vercel

Create Vercel config:

```json
// vercel.json
{
  "buildCommand": "cd ../.. && npx turbo run build --filter=web",
  "devCommand": "cd ../.. && npx turbo run dev --filter=web",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

**Manual steps:**
1. Go to https://vercel.com
2. Import Git repository
3. Select root directory: `apps/web`
4. Framework preset: Next.js
5. Build command: `cd ../.. && npx turbo run build --filter=web`
6. Output directory: Leave default
7. Deploy

---

### Step 10: Create README and Documentation

```markdown
// README.md (root)
# TripThreads

> Make memories, not spreadsheets — travel made simple

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development servers (web + mobile)
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Type check
npm run type-check

# Build all apps
npm run build
\`\`\`

## Project Structure

\`\`\`
tripthreads/
├── apps/
│   ├── web/          # Next.js web app
│   └── mobile/       # Expo mobile app
├── packages/
│   └── shared/       # Shared TypeScript code
└── turbo.json        # Turborepo config
\`\`\`

## Tech Stack

- **Monorepo:** Turborepo
- **Web:** Next.js 14+ (App Router)
- **Mobile:** Expo with Expo Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS (web), NativeWind (mobile)
- **Testing:** Jest, React Testing Library
- **CI/CD:** GitHub Actions, Vercel

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Complete project documentation
- [TDD_GUIDE.md](./TDD_GUIDE.md) - Test-driven development guide
- [FX_RATES.md](./FX_RATES.md) - FX rate integration

## License

Proprietary - © 2025 Colin Rodrigues
\`\`\`
```

---

## ✅ Acceptance Criteria Verification

Run these commands to verify all acceptance criteria are met:

```bash
# 1. Repo bootstrapped
ls apps/web apps/mobile packages/shared
# Should show all directories

# 2. Dev command works
npm run dev
# Should start both web and mobile apps

# 3. CI builds succeed
npm run build
# Should build all apps without errors

# 4. Lint passes
npm run lint
# Should pass with zero errors

# 5. Prettier passes
npm run format
# Should format all files

# 6. Tests pass
npm run test
# Should pass all smoke tests

# 7. Vercel preview configured
git push origin development
# Should trigger Vercel preview deploy
```

---

## 🎯 Definition of Done

- [x] Turborepo initialized with proper structure
- [x] Next.js web app running on http://localhost:3000
- [x] Expo mobile app running with `npm run dev`
- [x] Shared package with working utilities
- [x] ESLint configuration working
- [x] Prettier configuration working
- [x] Husky pre-commit hooks installed
- [x] GitHub Actions CI passing
- [x] Vercel preview deploys working
- [x] All smoke tests passing
- [x] TypeScript compiling without errors
- [x] README documentation complete

---

## 📚 Next Steps

After CRO-681 is complete:

1. **CRO-682:** Set up Supabase project and SDK
2. **CRO-683:** Implement authentication (Email, Google, Apple)
3. **CRO-684:** Create database schema with migrations

---

**Estimated Time:** 4-6 hours
**Difficulty:** Medium
**Dependencies:** None (first issue in project)
