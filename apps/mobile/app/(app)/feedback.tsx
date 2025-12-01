import { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as ImagePicker from 'expo-image-picker'
import { submitFeedbackToLinear } from '@tripthreads/core/utils/feedback'
import type { FeedbackEnvironment } from '@tripthreads/core/types/feedback'
import { Button } from '../../components/ui/button'
import { supabase } from '../../lib/supabase/client'
import { useAuth } from '../../lib/auth/auth-context'
import { useToast } from '../../hooks/use-toast'

const ENV_OPTIONS: FeedbackEnvironment[] = ['production', 'staging', 'development']

export default function FeedbackScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ tripId?: string }>()
  const { user } = useAuth()
  const { toast } = useToast()

  const defaultTripId = useMemo(
    () => (typeof params.tripId === 'string' ? params.tripId : ''),
    [params.tripId]
  )

  const [email, setEmail] = useState(user?.email || '')
  const [environment, setEnvironment] = useState<FeedbackEnvironment>('production')
  const [message, setMessage] = useState('')
  const [tripId, setTripId] = useState(defaultTripId)
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showThanks, setShowThanks] = useState(false)

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
  }, [user?.email])

  useEffect(() => {
    if (defaultTripId) {
      setTripId(defaultTripId)
    }
  }, [defaultTripId])

  const pickScreenshot = async () => {
    setShowThanks(false)
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      toast({
        title: 'Permission needed',
        description: 'Please allow photo access to attach a screenshot.',
        variant: 'destructive',
      })
      return
    }

    setUploadingImage(true)

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.7,
      })

      if (!result.canceled && result.assets?.length && result.assets[0].base64) {
        const asset = result.assets[0]
        const mimeType = asset.mimeType || 'image/jpeg'
        setScreenshotDataUrl(`data:${mimeType};base64,${asset.base64}`)
      }
    } catch (error) {
      console.error('Image picker error', error)
      toast({ title: 'Could not open photos', variant: 'destructive' })
    } finally {
      setUploadingImage(false)
    }
  }

  const submitFeedback = async () => {
    if (!email || !message) {
      toast({
        title: 'Missing details',
        description: 'Email and feedback are required.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      setShowThanks(false)

      await submitFeedbackToLinear(supabase, {
        email,
        environment,
        message,
        tripId: tripId || undefined,
        screenshotDataUrl: screenshotDataUrl || undefined,
        platform: 'mobile',
      })

      toast({ title: 'Thank you for your feedback' })
      setShowThanks(true)
      setMessage('')
      setScreenshotDataUrl(null)
    } catch (error) {
      console.error('Feedback submission failed', error)
      toast({
        title: 'Unable to send feedback',
        description: error instanceof Error ? error.message : 'Please try again shortly.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="auto" />
      <ScrollView contentContainerClassName="p-6 pb-12" className="flex-1">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <Text className="text-primary">← Back</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-semibold text-foreground mb-2">Share feedback</Text>
        <Text className="text-base text-muted-foreground mb-6">
          Tell us what happened and include a screenshot if you can. We&apos;ll create a Linear
          ticket for the team.
        </Text>

        <View className="space-y-4">
          <View className="space-y-2">
            <Text className="text-sm font-medium text-foreground">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              className="h-12 px-4 border border-border rounded-lg bg-background text-foreground"
              placeholder="you@example.com"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="space-y-2">
            <Text className="text-sm font-medium text-foreground">Environment</Text>
            <View className="flex-row gap-2">
              {ENV_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setEnvironment(option)}
                  className={`flex-1 border rounded-lg px-3 py-2 ${
                    environment === option ? 'border-primary bg-primary/10' : 'border-border'
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${environment === option ? 'text-primary' : 'text-foreground'}`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="space-y-2">
            <Text className="text-sm font-medium text-foreground">Trip ID (optional)</Text>
            <TextInput
              value={tripId}
              onChangeText={setTripId}
              placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
              placeholderTextColor="#9ca3af"
              className="h-12 px-4 border border-border rounded-lg bg-background text-foreground"
            />
          </View>

          <View className="space-y-2">
            <Text className="text-sm font-medium text-foreground">Feedback</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
              placeholder="What happened? What did you expect?"
              placeholderTextColor="#9ca3af"
              className="min-h-[140px] px-4 py-3 border border-border rounded-lg bg-background text-foreground"
            />
          </View>

          <View className="space-y-3">
            <Text className="text-sm font-medium text-foreground">Screenshot (optional)</Text>
            <Button variant="outline" onPress={pickScreenshot} disabled={uploadingImage}>
              {uploadingImage
                ? 'Opening photos…'
                : screenshotDataUrl
                  ? 'Replace screenshot'
                  : 'Add screenshot'}
            </Button>
            {screenshotDataUrl && (
              <View className="border border-dashed border-border rounded-lg overflow-hidden bg-muted/30">
                <Image
                  source={{ uri: screenshotDataUrl }}
                  style={{ height: 200, width: '100%' }}
                  resizeMode="contain"
                />
                <Button variant="ghost" onPress={() => setScreenshotDataUrl(null)}>
                  Remove screenshot
                </Button>
              </View>
            )}
          </View>

          <Button onPress={submitFeedback} disabled={submitting}>
            {submitting ? (
              <View className="flex-row items-center justify-center gap-2">
                <ActivityIndicator color="#fff" />
                <Text className="text-white">Sending…</Text>
              </View>
            ) : (
              'Send feedback'
            )}
          </Button>

          {showThanks && (
            <View className="p-3 rounded-lg bg-primary/10 border border-primary/30">
              <Text className="text-primary font-medium">Thank you for your feedback!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}
