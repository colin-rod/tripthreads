import { View, ActivityIndicator } from 'react-native'
import { Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../lib/auth/auth-context'

export default function Index() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    )
  }

  // Redirect based on authentication state
  if (user) {
    return <Redirect href="/(app)/trips" />
  } else {
    return <Redirect href="/(auth)/login" />
  }
}
