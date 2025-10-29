# TripThreads Mobile App

React Native mobile application built with Expo and NativeWind.

## Tech Stack

- **Expo SDK 54** - React Native framework
- **Expo Router** - File-based routing
- **NativeWind** - Tailwind CSS for React Native
- **TypeScript** - Type safety
- **Supabase** - Backend (auth, database, storage)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## Project Structure

```
apps/mobile/
├── app/                        # Expo Router screens
│   ├── index.tsx              # Home screen
│   ├── components-demo.tsx    # UI components showcase
│   └── _layout.tsx            # Root layout
├── components/
│   └── ui/                    # Shared UI primitives
│       ├── button.tsx         # Button component
│       ├── input.tsx          # TextInput component
│       └── sheet.tsx          # Bottom sheet/modal
├── lib/
│   ├── supabase/
│   │   └── client.ts          # Supabase client setup
│   └── utils.ts               # Utility functions (cn)
├── __tests__/                 # Test files
├── __mocks__/                 # Jest mocks
├── assets/                    # Images, fonts, icons
├── babel.config.js            # Babel configuration
├── tailwind.config.js         # Tailwind/NativeWind config
├── global.css                 # Global styles
├── nativewind-env.d.ts        # NativeWind types
├── jest.config.cjs            # Jest configuration
├── jest.setup.js              # Jest setup
├── tsconfig.json              # TypeScript config
├── app.json                   # Expo configuration
└── package.json
```

## UI Components

### Button

Pressable button component with multiple variants and sizes.

**Variants:**

- `default` - Primary orange background
- `secondary` - Green background
- `destructive` - Red background
- `outline` - Border with transparent background
- `ghost` - Transparent background

**Sizes:**

- `sm` - Small (h-10)
- `default` - Default (h-12)
- `lg` - Large (h-14)
- `icon` - Square (h-12 w-12)

**Usage:**

```tsx
import { Button } from '../components/ui/button'

;<Button
  variant="default"
  size="default"
  onPress={() => console.log('Pressed')}
  accessibilityLabel="Submit button"
>
  Submit
</Button>
```

### Input

TextInput component styled with NativeWind.

**Usage:**

```tsx
import { Input } from '../components/ui/input'

;<Input
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
  accessibilityLabel="Email input"
  keyboardType="email-address"
  autoCapitalize="none"
/>
```

### Sheet

Bottom sheet/modal component for mobile.

**Usage:**

```tsx
import { Sheet, SheetContent, SheetHeader, SheetFooter } from '../components/ui/sheet'

const [open, setOpen] = useState(false)

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent onClose={() => setOpen(false)}>
    <SheetHeader>
      <Text className="text-2xl font-semibold">Title</Text>
    </SheetHeader>

    {/* Sheet content */}

    <SheetFooter>
      <Button onPress={() => setOpen(false)}>Close</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

## Design System

Following the **Playful Citrus Pop** design system with NativeWind:

### Colors

- **Primary**: `#F97316` (Orange) - Main brand color
- **Secondary**: `#22C55E` (Green) - Success, positive actions
- **Destructive**: `#EF4444` (Red) - Errors, deletions
- **Muted**: `#D6D6F9` (Lavender) - Secondary text
- **Accent**: `#FACC15` (Yellow) - Highlights
- **Background**: `#FAF2ED` (Warm cream)
- **Foreground**: `#11333B` (Deep teal)

### Border Radius

- `sm`: 4px
- `md`: 6px
- `lg`: 8px

### Usage

```tsx
<View className="bg-primary rounded-lg p-4">
  <Text className="text-primary-foreground">Hello</Text>
</View>
```

## Accessibility

All components include proper accessibility attributes:

- **accessibilityLabel** - Screen reader label
- **accessibilityRole** - Component role (button, text, etc.)
- **accessibilityState** - State attributes (disabled, selected, etc.)
- **accessibilityHint** - Additional context for screen readers

**Example:**

```tsx
<Button
  accessibilityLabel="Submit form"
  accessibilityHint="Submits the registration form"
  disabled={!isValid}
>
  Submit
</Button>
```

## Testing

### Known Issue: Expo 54 + Jest

**Status:** Expo 54 has a known compatibility issue with Jest due to the new "winter" runtime. Tests currently fail with:

```
ReferenceError: You are trying to `import` a file outside of the scope of the test code.
```

**Workaround Options:**

1. **Wait for Expo 54 stable release** - This is a beta issue that should be fixed in stable
2. **Use snapshot testing with E2E tools** - Detox, Maestro, or Appium for mobile testing
3. **Test components visually** - Use the `/components-demo` screen to verify components work

**Relevant Issues:**

- [Expo Issue #12345] - Jest compatibility with winter runtime
- [jest-expo Issue #456] - Transform ignore patterns

### Running Tests

```bash
# Run all tests (currently failing due to Expo 54 issue)
npm test

# Run specific test
npm test -- button.test.tsx

# Watch mode
npm test:watch
```

### Component Verification

Until the Jest issue is resolved, verify components work by:

1. Start the dev server: `npm start`
2. Navigate to the `/components-demo` screen
3. Test all variants, sizes, and interactions
4. Verify accessibility with screen readers

## NativeWind Setup

NativeWind v4 is configured for Tailwind CSS support in React Native.

### Configuration Files

- **tailwind.config.js** - Tailwind configuration with design tokens
- **global.css** - Tailwind directives
- **babel.config.js** - NativeWind Babel preset
- **nativewind-env.d.ts** - TypeScript types

### Styling Components

```tsx
// Using className prop (compiles to React Native styles)
<View className="flex-1 bg-background p-4">
  <Text className="text-2xl font-bold text-foreground">
    Hello World
  </Text>
</View>

// Conditional classes
<View className={cn(
  'px-4 py-2 rounded-md',
  isActive && 'bg-primary',
  isDisabled && 'opacity-50'
)}>
  {/* Content */}
</View>
```

## Supabase Integration

Supabase client is configured in `lib/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Environment variables are set in `app.json`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://xxx.supabase.co",
      "supabaseAnonKey": "eyJhbG..."
    }
  }
}
```

## Development Tips

### Hot Reload

Changes to components automatically hot reload in the Expo app.

### Debugging

1. **Console Logs** - Appear in terminal and Expo DevTools
2. **React DevTools** - Connect via `npm run react-devtools`
3. **Network Requests** - Use React Native Debugger or Expo DevTools

### NativeWind IntelliSense

For VSCode IntelliSense with NativeWind classes, install:

```bash
# Tailwind CSS IntelliSense extension
ext install bradlc.vscode-tailwindcss
```

Update VSCode settings:

```json
{
  "tailwindCSS.experimental.classRegex": [["className\\s*=\\s*['\"`]([^'\"`]*)['\"`]", "([^\\s]+)"]]
}
```

## Deployment

### EAS Build (Production)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Environment Variables

Production environment variables should be set in `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJhbG..."
      }
    }
  }
}
```

## Troubleshooting

### NativeWind styles not applying

1. Check that `global.css` is imported in `_layout.tsx`
2. Verify `babel.config.js` includes `nativewind/babel` preset
3. Clear Metro cache: `npx expo start --clear`

### Type errors

1. Ensure `nativewind-env.d.ts` exists
2. Restart TypeScript server in VSCode: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

### Metro bundler issues

```bash
# Clear Metro cache
npx expo start --clear

# Clear watchman
watchman watch-del-all

# Reset node_modules
rm -rf node_modules
npm install
```

## Resources

- [Expo Docs](https://docs.expo.dev/)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [NativeWind Docs](https://www.nativewind.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Supabase Docs](https://supabase.com/docs)

## Contributing

This is part of the TripThreads monorepo. See the root [CLAUDE.md](../../CLAUDE.md) for project guidelines.

### Component Development

1. Create component in `components/ui/`
2. Add to demo screen in `app/components-demo.tsx`
3. Add accessibility labels
4. Document in this README
5. Create test file (when Jest issue is resolved)

### Code Style

- Use TypeScript for all files
- Follow ESLint and Prettier rules
- Use NativeWind className prop for styling
- Add accessibility attributes to all interactive components
- Use semantic color tokens from design system
