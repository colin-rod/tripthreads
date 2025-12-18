/**
 * User Settings Page
 *
 * Main settings page with collapsible accordion sections:
 * 1. Profile - Name, avatar, email
 * 2. Notifications - Email and push preferences
 * 3. Security - Password change, account deletion
 */

import * as React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@tripthreads/core/queries/users'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ProfileSection } from '@/components/features/profile/ProfileSection'
import { NotificationPreferencesSection } from '@/components/features/profile/NotificationPreferencesSection'
import { SecuritySection } from '@/components/features/profile/SecuritySection'

export const metadata = {
  title: 'Settings | TripThreads',
  description: 'Manage your account settings and preferences',
}

export default async function SettingsPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Get user profile
  const user = await getCurrentUser(supabase)

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container max-w-3xl py-10 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Accordion type="single" collapsible defaultValue="profile" className="space-y-4">
        {/* Profile Section */}
        <AccordionItem value="profile" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-orange-600 dark:text-orange-500"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-medium">Profile</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Update your name, avatar, and email
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-6 pb-4">
            <ProfileSection user={user} />
          </AccordionContent>
        </AccordionItem>

        {/* Notifications Section */}
        <AccordionItem value="notifications" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-green-600 dark:text-green-500"
                >
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-medium">Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure email and push notifications
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-6 pb-4">
            <NotificationPreferencesSection user={user} />
          </AccordionContent>
        </AccordionItem>

        {/* Security Section */}
        <AccordionItem value="security" className="border rounded-lg px-6">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5 text-blue-600 dark:text-blue-500"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-medium">Security</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage password and account security
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-6 pb-4">
            <SecuritySection />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
