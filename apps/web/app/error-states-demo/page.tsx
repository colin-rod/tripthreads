'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ErrorBoundary } from '../../components/error-boundary'
import {
  ErrorState,
  NetworkError,
  PermissionError,
  NotFoundError,
  ServerError,
} from '../../components/error-state'
import {
  EmptyState,
  EmptyTrips,
  EmptyParticipants,
  EmptyExpenses,
  EmptyPhotos,
  EmptyItinerary,
} from '../../components/empty-state'
import { Button } from '../../components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'

// Component that throws an error when triggered
function ErrorThrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('This is a test error thrown by the ErrorThrower component')
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>No Error</CardTitle>
        <CardDescription>Component is rendering normally</CardDescription>
      </CardHeader>
    </Card>
  )
}

export default function ErrorStatesDemo() {
  const [throwError, setThrowError] = useState(false)

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-2">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground">Error & Empty State Patterns</h1>
          <p className="text-lg text-muted-foreground">
            Standardized error boundaries and empty state components
          </p>
        </div>

        {/* Error Boundary */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Error Boundary</h2>
            <p className="text-muted-foreground mb-4">
              Catches JavaScript errors anywhere in the component tree
            </p>
          </div>

          <div className="flex gap-4 mb-4">
            <Button
              onClick={() => setThrowError(false)}
              variant={!throwError ? 'default' : 'outline'}
            >
              No Error
            </Button>
            <Button
              onClick={() => setThrowError(true)}
              variant={throwError ? 'destructive' : 'outline'}
            >
              Throw Error
            </Button>
          </div>

          <ErrorBoundary key={throwError ? 'error' : 'no-error'}>
            <ErrorThrower shouldThrow={throwError} />
          </ErrorBoundary>
        </section>

        {/* Error States */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Error States</h2>
            <p className="text-muted-foreground">
              Standardized error templates for common scenarios
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Network Error</h3>
                <Badge variant="error">500</Badge>
              </div>
              <NetworkError />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Permission Error</h3>
                <Badge variant="warning">403</Badge>
              </div>
              <PermissionError />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Not Found</h3>
                <Badge variant="error">404</Badge>
              </div>
              <NotFoundError />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Server Error</h3>
                <Badge variant="error">500</Badge>
              </div>
              <ServerError />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Generic Error</h3>
              <ErrorState />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Custom Error</h3>
              <ErrorState
                title="Custom Error Title"
                description="This is a custom error message with a custom action."
                actionLabel="Custom Action"
                action={() => alert('Custom action clicked!')}
              />
            </div>
          </div>
        </section>

        {/* Empty States */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Empty States</h2>
            <p className="text-muted-foreground">
              Encouraging empty states for different content types
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Empty Trips</h3>
              <EmptyTrips action={() => alert('Create trip clicked!')} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Empty Participants</h3>
              <EmptyParticipants action={() => alert('Invite participants clicked!')} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Empty Expenses</h3>
              <EmptyExpenses action={() => alert('Add expense clicked!')} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Empty Photos</h3>
              <EmptyPhotos action={() => alert('Upload photo clicked!')} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Empty Itinerary</h3>
              <EmptyItinerary action={() => alert('Add itinerary item clicked!')} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium">Generic Empty State</h3>
              <EmptyState />
            </div>
          </div>
        </section>

        {/* Usage Examples */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Usage Examples</h2>
          <Card>
            <CardHeader>
              <CardTitle>Error Boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                {`import { ErrorBoundary } from '@/components/error-boundary'

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                {`import { NetworkError, NotFoundError } from '@/components/error-state'

// Use specific error types
<NetworkError />
<NotFoundError />

// Or use generic with type
<ErrorState type="network" />
<ErrorState type="404" />`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Empty States</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                {`import { EmptyTrips, EmptyExpenses } from '@/components/empty-state'

// Use specific empty states
<EmptyTrips action={() => router.push('/trips/new')} />

// Or use generic with type
<EmptyState
  type="expenses"
  action={handleAddExpense}
/>`}
              </pre>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
