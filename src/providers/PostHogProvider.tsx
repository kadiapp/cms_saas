"use client"
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
      const initPostHog = () => {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          person_profiles: 'identified_only'
        })
      }
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(initPostHog, { timeout: 2500 })
      } else {
        setTimeout(initPostHog, 1200)
      }
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
