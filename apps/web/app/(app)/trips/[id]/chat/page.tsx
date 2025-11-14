/**
 * Trip Chat Page
 *
 * Real-time group chat with AI-powered expense and itinerary parsing via @TripThread bot.
 * Features:
 * - Real-time messaging with Supabase Realtime
 * - @TripThread AI integration for natural language input
 * - File attachments (photos, documents)
 * - Dual expense + itinerary creation
 * - Multi-payer and custom split support
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTripById } from '@tripthreads/core'
import { getChatMessages } from '@/app/actions/chat'
import { ChatThread } from '@/components/features/chat/ChatThread'
import { Card, CardContent } from '@/components/ui/card'

interface TripChatPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TripChatPage({ params }: TripChatPageProps) {
  const supabase = await createClient()
  const { id } = await params

  // Fetch trip data
  const trip = await getTripById(supabase, id).catch(error => {
    console.error('Error loading trip:', error)
    notFound()
    // TypeScript doesn't know notFound() never returns, so we add this to satisfy the type checker
    throw new Error('Not found')
  })

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  // Verify user is a participant
  const isParticipant = trip.trip_participants?.some(
    participant => participant.user?.id === user.id
  )

  if (!isParticipant) {
    notFound()
  }

  // Fetch chat messages
  const messagesResult = await getChatMessages(id, 100)

  if (!messagesResult.success) {
    console.error('Error loading messages:', messagesResult.error)
    notFound()
  }

  // Get trip currency (default to USD)
  const tripCurrency = 'USD' // TODO: Add currency field to trips table

  return (
    <div className="container mx-auto h-[calc(100vh-4rem)] max-w-7xl p-4">
      <Card className="h-full flex flex-col">
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ChatThread
            tripId={id}
            initialMessages={messagesResult.data || []}
            currentUserId={user.id}
            tripCurrency={tripCurrency}
          />
        </CardContent>
      </Card>
    </div>
  )
}
