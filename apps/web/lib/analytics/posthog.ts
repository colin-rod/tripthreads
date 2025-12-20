'use client'

import { useEffect, useState } from 'react'

export type PosthogCapture = (event: string, properties?: Record<string, unknown>) => void

export interface PosthogClient {
  capture: PosthogCapture
}

const noopCapture: PosthogCapture = () => {}

const noopClient: PosthogClient = {
  capture: noopCapture,
}

function resolveClient(self: PosthogClient): PosthogClient {
  if (typeof window === 'undefined') {
    return noopClient
  }

  const globalClient = (window as unknown as { posthog?: PosthogClient }).posthog

  if (globalClient && typeof globalClient.capture === 'function' && globalClient !== self) {
    return globalClient
  }

  return noopClient
}

const sharedPosthog: PosthogClient = {
  capture(event, properties) {
    const client = resolveClient(sharedPosthog)
    client.capture(event, properties)
  },
}

export function usePosthog(): PosthogClient {
  const [client, setClient] = useState<PosthogClient>(() => resolveClient(sharedPosthog))

  useEffect(() => {
    setClient(resolveClient(sharedPosthog))
  }, [])

  return client
}

export const posthog = sharedPosthog
