import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// App Router server client. No auth in this app, so the cookie handlers exist
// only to satisfy the @supabase/ssr contract; nothing reads or writes a session.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component where cookies are read-only.
          }
        },
      },
    },
  )
}
