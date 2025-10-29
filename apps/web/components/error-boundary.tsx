'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to error reporting service
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you would log to Sentry or similar
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-error" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                We encountered an unexpected error. Please try again.
              </CardDescription>
            </CardHeader>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {this.state.error.message}
                </pre>
              </CardContent>
            )}
            <CardFooter>
              <Button onClick={() => window.location.reload()}>Reload page</Button>
            </CardFooter>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
