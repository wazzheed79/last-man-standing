import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client.
 * Uses real NEXT_PUBLIC_* env vars at runtime.
 * During static prerender (when env may be absent), falls back to placeholders
 * so createBrowserClient does not throw and break the build.
 */
export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://placeholder.supabase.co'
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

  return createBrowserClient(url, key)
}
