import { Stack } from 'expo-router'
import { AuthProvider } from '../lib/auth/auth-context'
import { useDeepLink } from '../lib/linking/use-deep-link'
import { ToastProvider } from '../components/ui/toast'
import { PostHogProvider } from '../lib/analytics'
import '../global.css'

function RootLayoutNav() {
  // Initialize deep link handling
  useDeepLink()

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PostHogProvider>
        <RootLayoutNav />
        <ToastProvider />
      </PostHogProvider>
    </AuthProvider>
  )
}
