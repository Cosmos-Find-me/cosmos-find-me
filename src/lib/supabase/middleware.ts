import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh an expired session here: the API routes can't write cookies, and a
  // refresh token only works once, so a refresh there would be lost. getSession()
  // only calls the Auth server when the token has expired. The proxy doesn't
  // gate anything on the result; routes still verify the user with getUser().
  // (getClaims() would call the Auth server on every request until the project
  // moves to asymmetric JWT signing keys.)
  await supabase.auth.getSession()

  return response
}
