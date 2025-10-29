# Authentication Setup Guide

## Overview

TripThreads implements authentication using Supabase Auth with support for:

- Email/password authentication
- Google OAuth
- Session persistence (localStorage for web, SecureStore for mobile)
- Automatic token refresh
- Role-based access control via RLS policies

## Architecture

```
┌─────────────────┐
│   User Client   │
│  (Web/Mobile)   │
└────────┬────────┘
         │
         ├─ AuthProvider (React Context)
         │  └─ useAuth hook
         │
         ├─ Supabase Client
         │  ├─ auth.signUp()
         │  ├─ auth.signInWithPassword()
         │  ├─ auth.signInWithOAuth()
         │  ├─ auth.signOut()
         │  └─ auth.onAuthStateChange()
         │
         └─ Database (Postgres + RLS)
            ├─ auth.users (Supabase managed)
            └─ public.users (Your profile table)
```

## Implementation Details

### 1. Web App Authentication

**Location:** `apps/web/lib/auth/auth-context.tsx`

**Features:**

- React Context API for global auth state
- Automatic session restoration on page load
- Auth state change listeners for real-time updates
- localStorage for session persistence

**Client Configuration:** `apps/web/lib/supabase/client.ts`

```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
```

**Key Functions:**

- `signUp(email, password, fullName)` - Create new user account
- `signIn(email, password)` - Sign in with email/password
- `signInWithGoogle()` - Initiate Google OAuth flow
- `signOut()` - Sign out and clear session

### 2. Mobile App Authentication

**Location:** `apps/mobile/lib/auth/auth-context.tsx`

**Features:**

- Same interface as web for code consistency
- Expo SecureStore for token persistence (encrypted)
- Automatic session restoration
- Deep link handling for OAuth callbacks

**Client Configuration:** `apps/mobile/lib/supabase/client.ts`

```typescript
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

**Dependencies:**

- `expo-secure-store` - Encrypted token storage

### 3. Auth UI Components

#### Login Page

**Location:** `apps/web/app/(auth)/login/page.tsx`

**Features:**

- Email/password form
- Google OAuth button
- Error handling and display
- Loading states
- Link to signup page

**Flow:**

1. User enters email/password
2. Submit calls `signIn(email, password)`
3. On success: redirect to `/trips`
4. On error: display error message

#### Signup Page

**Location:** `apps/web/app/(auth)/signup/page.tsx`

**Features:**

- Full name, email, password fields
- Password validation (minimum 6 characters)
- Google OAuth button
- Success confirmation screen
- Auto-redirect after signup

**Flow:**

1. User enters full name, email, password
2. Validate password length
3. Submit calls `signUp(email, password, fullName)`
4. On success:
   - Create Supabase auth user
   - Create profile in `public.users` table
   - Show success message
   - Redirect to `/trips` after 2 seconds
5. On error: display error message

#### OAuth Callback Handler

**Location:** `apps/web/app/auth/callback/route.ts`

**Purpose:** Handle OAuth redirects from Google

**Flow:**

1. Supabase redirects to `/auth/callback?code=xxx`
2. Exchange code for session
3. Check if profile exists in `public.users`
4. If not, create profile with data from OAuth provider
5. Redirect to `/trips`

### 4. Route Protection

**Homepage:** `apps/web/app/page.tsx`

- Checks auth state on load
- Redirects authenticated users to `/trips`
- Redirects unauthenticated users to `/login`

**Trips Page:** `apps/web/app/trips/page.tsx`

- Protected route requiring authentication
- Shows loading spinner while checking auth
- Redirects to `/login` if not authenticated
- Displays user email and sign out button

### 5. User Profile Creation

When a user signs up (email or OAuth), two records are created:

1. **Supabase Auth User** (`auth.users` table)
   - Managed by Supabase
   - Contains email, password hash (if email auth), metadata
   - ID is a UUID

2. **Public User Profile** (`public.users` table)
   - Created automatically via our code
   - Linked to auth user via `id` (foreign key to `auth.users.id`)
   - Contains: full_name, avatar_url, plan, stripe_customer_id, etc.

**Email Signup:**

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName },
  },
})

// Then create profile
await supabase.from('users').insert({
  id: data.user.id,
  email: data.user.email!,
  full_name: fullName,
  plan: 'free',
})
```

**OAuth Signup:**

```typescript
// User redirects to Google, then back to /auth/callback
// In callback handler:
const { data: existingUser } = await supabase
  .from('users')
  .select('id')
  .eq('id', data.user.id)
  .single()

if (!existingUser) {
  await supabase.from('users').insert({
    id: data.user.id,
    email: data.user.email!,
    full_name: data.user.user_metadata.full_name || data.user.email!.split('@')[0],
    avatar_url: data.user.user_metadata.avatar_url,
    plan: 'free',
  })
}
```

## Configuration

### Environment Variables

**Web (.env.local):**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Mobile (app.json → extra):**

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://xxx.supabase.co",
      "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### Supabase Dashboard Configuration

#### 1. Enable Auth Providers

**Email/Password:**

- Already enabled by default
- Configure email templates (optional)
- Set up email verification (optional for MVP)

**Google OAuth:**

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/):
   - Create new project or select existing
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs:
     - `https://tbwbaydyyjokrsjtgerh.supabase.co/auth/v1/callback` (Supabase)
     - `http://localhost:3000/auth/callback` (local dev)
4. Copy Client ID and Client Secret to Supabase
5. Save configuration

#### 2. Configure Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:** `http://localhost:3000` (dev) / `https://tripthreads.com` (prod)

**Redirect URLs (whitelist):**

- `http://localhost:3000/**`
- `https://tripthreads.com/**`
- `https://dev.tripthreads.com/**`
- `exp://localhost:8081/**` (Expo dev)
- `tripthreads://**` (mobile deep links - for production)

#### 3. Email Templates (Optional)

Customize email templates for:

- Confirm signup
- Reset password
- Magic link
- Change email address

## Usage

### Using the Auth Hook

```typescript
'use client'

import { useAuth } from '@/lib/auth/auth-context'

export default function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return (
      <button onClick={() => signIn('user@example.com', 'password')}>
        Sign In
      </button>
    )
  }

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### Protecting Routes

**Client-side protection (React):**

```typescript
'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) return <div>Loading...</div>
  if (!user) return null // Will redirect

  return <div>Protected content</div>
}
```

**Server-side protection (API routes):**

```typescript
import { supabase } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Protected logic here
  return NextResponse.json({ data: 'Protected data' })
}
```

## Testing

### Unit Tests

**Location:** `apps/web/tests/unit/auth.test.ts`

**Coverage:**

- Email/password signup
- Email/password signin
- Google OAuth initiation
- Sign out
- Session retrieval
- Error handling

**Run tests:**

```bash
npm test --workspace=web -- auth.test
```

### Component Tests

**Login Page:** `apps/web/tests/components/login.test.tsx`
**Signup Page:** `apps/web/tests/components/signup.test.tsx`

**Coverage:**

- Form rendering
- Input validation
- Submit handling
- Error display
- Loading states
- OAuth button clicks

**Run tests:**

```bash
npm test --workspace=web -- login.test
npm test --workspace=web -- signup.test
```

### E2E Tests

**Note:** E2E tests should be run in CI/CD, not locally (flaky in dev environments)

**Test scenarios:**

1. Sign up with email/password → redirect to trips
2. Sign in with email/password → redirect to trips
3. Invalid credentials → show error
4. Sign out → redirect to login
5. Protected route without auth → redirect to login
6. Google OAuth flow → redirect to trips

## Security Considerations

### 1. RLS Policies

All database tables have Row-Level Security enabled. Users can only access data they're authorized to see.

**Example policy (trips table):**

```sql
CREATE POLICY "Users can read trips they participate in"
  ON public.trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_participants
      WHERE trip_participants.trip_id = trips.id
        AND trip_participants.user_id = auth.uid()
    )
  );
```

### 2. Token Storage

- **Web:** localStorage (accessible only via same origin)
- **Mobile:** Expo SecureStore (encrypted hardware-backed storage)

### 3. Password Requirements

- Minimum 6 characters (Supabase default)
- Consider adding: uppercase, lowercase, number, special char (future enhancement)

### 4. Rate Limiting

Supabase provides built-in rate limiting for:

- Sign up: 4 requests per hour per IP
- Sign in: 10 requests per minute per IP
- Password reset: 4 requests per hour per email

### 5. Email Verification

Currently disabled for MVP. To enable:

1. Supabase Dashboard → Authentication → Email Auth
2. Enable "Confirm email"
3. Users must click link in email before they can sign in

## Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution:** Ensure `.env.local` (web) or `app.json` extra config (mobile) contains Supabase URL and anon key.

### Issue: OAuth redirect doesn't work

**Solution:**

1. Check redirect URL is whitelisted in Supabase Dashboard
2. Verify Google OAuth credentials are correct
3. Check browser console for CORS errors

### Issue: Session not persisting after refresh

**Solution:**

1. Check localStorage is enabled in browser
2. Verify Supabase client `persistSession: true`
3. Clear browser cache and try again

### Issue: "User already registered" error on OAuth

**Solution:** This is expected if user previously signed up with email. They should sign in with email, not OAuth.

### Issue: Profile not created after signup

**Solution:**

1. Check RLS policies allow inserts to `public.users`
2. Verify foreign key constraint `id REFERENCES auth.users(id)`
3. Check for errors in browser console/network tab

## Next Steps

### Phase 2 Enhancements:

- [ ] Email verification flow
- [ ] Password reset flow
- [ ] Change password functionality
- [ ] Delete account functionality
- [ ] Two-factor authentication (2FA)
- [ ] Social login: Facebook, Apple
- [ ] Session timeout warnings
- [ ] "Remember me" option
- [ ] Login history/audit log

### Phase 3 Enhancements:

- [ ] Biometric authentication (mobile)
- [ ] Passwordless magic links
- [ ] SSO for enterprise customers
- [ ] Account linking (merge multiple auth methods)

---

**Last Updated:** October 2025
**Status:** Complete (MVP)
**Dependencies:**

- Supabase Auth
- expo-secure-store (mobile)
- React Context API
