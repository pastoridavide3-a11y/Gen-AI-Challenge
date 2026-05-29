import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Used by client components that need the auth
// session directly (the login form's signInWithPassword and the logout button).
// Reads/writes the same session cookies that the server client and middleware
// use, so a login here is immediately visible to server components.
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
