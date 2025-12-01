import { useState } from 'react'
import { View, Text, TextInput, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../lib/auth/auth-context'

export default function Signup() {
  const router = useRouter()
  const params = useLocalSearchParams<{ redirect?: string }>()
  const { signUp, signInWithGoogle } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, fullName)

    setLoading(false)

    if (error) {
      Alert.alert('Signup Failed', error.message)
    } else {
      Alert.alert(
        'Success!',
        'Your account has been created. Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Redirect to the original destination or home
              if (params.redirect) {
                router.replace(params.redirect)
              } else {
                router.replace('/(app)/trips')
              }
            },
          },
        ]
      )
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)

    const { error } = await signInWithGoogle()

    setLoading(false)

    if (error) {
      Alert.alert('Signup Failed', error.message)
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

      <Text className="text-4xl font-bold text-foreground mb-2 text-center">Create Account</Text>
      <Text className="text-base text-muted-foreground mb-8 text-center">
        Sign up to start planning trips together
      </Text>

      {params.redirect && (
        <View className="mb-4 p-4 bg-primary/10 rounded-lg">
          <Text className="text-sm text-primary text-center">Create an account to continue</Text>
        </View>
      )}

      <View className="space-y-4">
        <View>
          <Text className="text-sm font-medium text-foreground mb-2">Full Name</Text>
          <TextInput
            className="h-12 px-4 border border-border rounded-lg bg-background text-foreground"
            placeholder="John Doe"
            placeholderTextColor="#999"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            editable={!loading}
          />
        </View>

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
          <Text className="text-xs text-muted-foreground mt-1">Must be at least 6 characters</Text>
        </View>

        <Button
          onPress={handleSignup}
          disabled={loading}
          className="mt-2"
          accessibilityLabel="Sign up"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </Button>

        <View className="flex-row items-center my-4">
          <View className="flex-1 h-px bg-border" />
          <Text className="mx-4 text-sm text-muted-foreground">or</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        <Button
          variant="outline"
          onPress={handleGoogleSignup}
          disabled={loading}
          accessibilityLabel="Sign up with Google"
        >
          Continue with Google
        </Button>

        <View className="flex-row justify-center mt-6">
          <Text className="text-sm text-muted-foreground">Already have an account? </Text>
          <Text
            className="text-sm text-primary font-semibold"
            onPress={() => router.push({ pathname: '/(auth)/login', params })}
          >
            Log in
          </Text>
        </View>
      </View>
    </View>
  )
}
