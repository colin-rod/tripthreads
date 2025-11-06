/**
 * Trip Detail Page with AI Parser Integration
 *
 * Enhanced version with natural language input for expenses and itinerary.
 * Features:
 * - Trip header with name, dates, description
 * - Owner and participants list
 * - AI-powered expense input (OpenAI GPT-4o-mini)
 * - AI-powered itinerary input (OpenAI GPT-4o-mini)
 * - Edit/Delete buttons (owner only)
 * - Tabs for Timeline, Expenses, Feed, Settings (future)
 */

import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { Calendar, MapPin, Users, DollarSign, Route } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getTripById, isTripOwner } from '@tripthreads/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TripActions } from '@/components/features/trips/TripActions'
import { InviteButton } from '@/components/features/trips/InviteButton'
import { PendingInvitesList } from '@/components/features/invites/PendingInvitesList'
import { ExpenseInputWrapper } from '@/components/features/expenses/ExpenseInputWrapper'
import { ItineraryInputWrapper } from '@/components/features/itinerary/ItineraryInputWrapper'
import { ParticipantsList } from '@/components/features/trips/ParticipantsList'

interface TripDetailPageProps {
  params: {
    id: string
  }
}

type TripWithRelations = NonNullable<Awaited<ReturnType<typeof getTripById>>>
type TripParticipant = TripWithRelations['trip_participants'] extends (infer P)[] ? P : never

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const supabase = await createClient()

  let trip!: TripWithRelations
  let isOwner = false

  try {
    trip = await getTripById(supabase, params.id)
    isOwner = await isTripOwner(supabase, params.id)
  } catch (error) {
    console.error('Error loading trip:', error)
    notFound()
  }

  const startDate = new Date(trip.start_date)
  const endDate = new Date(trip.end_date)

  // Get user's role
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tripParticipants = (trip.trip_participants ?? []) as TripParticipant[]
  const userParticipant = tripParticipants.find(participant => participant.user?.id === user?.id)
  const canEdit = userParticipant?.role !== 'viewer'

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Trip Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{trip.name}</h1>
                {isOwner && <Badge variant="outline">Owner</Badge>}
                {userParticipant?.role === 'viewer' && <Badge variant="secondary">Viewer</Badge>}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>
                    {trip.trip_participants.length}{' '}
                    {trip.trip_participants.length === 1 ? 'person' : 'people'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <InviteButton tripId={trip.id} isOwner={isOwner} />
              {isOwner && <TripActions trip={trip} />}
            </div>
          </div>
        </CardHeader>

        {trip.description && (
          <CardContent>
            <p className="text-muted-foreground">{trip.description}</p>
          </CardContent>
        )}
      </Card>

      {/* Cover Image (if exists) */}
      {trip.cover_image_url && (
        <Card className="mb-6 overflow-hidden">
          <div className="relative aspect-video">
            <img
              src={trip.cover_image_url}
              alt={trip.name}
              className="object-cover w-full h-full"
            />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Participants Sidebar */}
        <div className="lg:col-span-1">
          <ParticipantsList participants={tripParticipants} />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Invitations List (owners only) */}
          <PendingInvitesList tripId={trip.id} isOwner={isOwner} />

          {/* Tabs for Timeline, Expenses, etc. */}
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="timeline">
                <Route className="h-4 w-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="expenses">
                <DollarSign className="h-4 w-4 mr-2" />
                Expenses
              </TabsTrigger>
              <TabsTrigger value="feed">
                <MapPin className="h-4 w-4 mr-2" />
                Feed
              </TabsTrigger>
            </TabsList>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-6 mt-6">
              {/* AI Itinerary Input (Participants only) */}
              {canEdit && <ItineraryInputWrapper tripId={trip.id} />}

              {/* Itinerary List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Itinerary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No itinerary items yet</p>
                    <p className="text-sm mt-1">
                      {canEdit
                        ? 'Add activities, flights, and accommodations using natural language above'
                        : 'Only participants can add itinerary items'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-6 mt-6">
              {/* AI Expense Input (Participants only, hidden from viewers) */}
              {canEdit && <ExpenseInputWrapper tripId={trip.id} />}

              {/* Expenses List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No expenses yet</p>
                    <p className="text-sm mt-1">
                      {canEdit
                        ? 'Add expenses using natural language above'
                        : userParticipant?.role === 'viewer'
                          ? 'Viewers cannot see expenses'
                          : 'Start tracking expenses for this trip'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Feed Tab */}
            <TabsContent value="feed" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trip Feed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No photos or updates yet</p>
                    <p className="text-sm mt-1">Share photos and memories from your trip</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
