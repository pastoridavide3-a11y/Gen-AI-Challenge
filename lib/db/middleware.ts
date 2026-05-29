import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const LOGIN_PATH = '/login'

// Refreshes the Supabase session on every page request and enforces the
// public/private boundary:
//   - no session + private route  -> redirect to /login
//   - active session + /login     -> redirect to the dashboard
// API routes and static assets are excluded via the matcher in middleware.ts,
// so the CV / mentor data flows keep working untouched.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Do not run code between createServerClient and getUser — getUser refreshes
  // the token and writes the refreshed cookies onto `response`.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH

  if (!user && !isLoginPage) {
    return redirectPreservingCookies(request, LOGIN_PATH, response)
  }

  if (user && isLoginPage) {
    return redirectPreservingCookies(request, '/', response)
  }

  return response
}

// Build a redirect while carrying over any session cookies getUser may have
// refreshed onto `from`, so a token rotation isn't lost on the redirect.
function redirectPreservingCookies(
  request: NextRequest,
  pathname: string,
  from: NextResponse,
) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  const redirect = NextResponse.redirect(url)
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}
