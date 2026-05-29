import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/db/middleware'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Run on all page routes. Exclude API routes (they keep using the anon key
  // for the CV / mentor data flows), Next.js internals, and static image files.
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
