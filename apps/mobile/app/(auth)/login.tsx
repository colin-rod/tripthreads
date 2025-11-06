import { useState } from 'react'
import { View, Text, TextInput, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../lib/auth/auth-context'

export default function Login() {
  const router = useRouter()
  const params = useLocalSearchParams<{ redirect?: string }>()
  const { signIn, signInWithGoogle } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)

    const { error } = await signIn(email, password)

    setLoading(false)

    if (error) {
      Alert.alert('Login Failed', error.message)
    } else {
      // Redirect to the original destination or home
      if (params.redirect) {
        router.replace(params.redirect)
      } else {
        router.replace('/(app)/trips')
      }
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)

    const { error } = await signInWithGoogle()

    setLoading(false)

    if (error) {
      Alert.alert('Login Failed', error.message)
    } else {
      // Redirect to the original destination or home
      if (params.redirect) {
        router.replace(params.redirect)
      } else {
        router.replace('/(app)/trips')
      }
    }
  }

  return (
    <View className="flex-1 justify-center px-6 bg-background">
      <StatusBar style="auto" />

      <Text className="text-4xl font-bold text-foreground mb-2 text-center">Welcome Back</Text>
      <Text className="text-base text-muted-foreground mb-8 text-center">
        Log in to continue to TripThreads
      </Text>

      {params.redirect && (
        <View className="mb-4 p-4 bg-primary/10 rounded-lg">
          <Text className="text-sm text-primary text-center">Please log in to continue</Text>
        </View>
      )}

      <View className="space-y-4">
        <View>
          <Text className="text-sm font-medium text-foreground mb-2">Email</Text>
          <TextInput
            className="h-12 px-4 border border-border rounded-lg bg-background text-foreground"
            placeholder="you@example.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-foreground mb-2">Password</Text>
          <TextInput
            className="h-12 px-4 border border-border rounded-lg bg-background text-foreground"
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <Button
          onPress={handleLogin}
          disabled={loading}
          className="mt-2"
          accessibilityLabel="Log in"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </Button>

        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-border" />
          <Text className="mx-4 text-sm text-muted-foreground">or</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        <Button
          variant="outline"
          onPress={handleGoogleLogin}
          disabled={loading}
          accessibilityLabel="Log in with Google"
        >
          Continue with Google
        </Button>

        <View className="flex-row justify-center mt-6">
          <Text className="text-sm text-muted-foreground">Don't have an account? </Text>
          <Text
            className="text-sm text-primary font-semibold"
            onPress={() => router.push({ pathname: '/(auth)/signup', params })}
          >
            Sign up
          </Text>
        </View>
      </View>
    </View>
  )
}
