import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Lightweight endpoint that returns only updated_at timestamps.
// Used by useDataSync hook to detect stale data without fetching the full payload.
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({
      companyDataUpdatedAt: null,
      preferencesUpdatedAt: null,
    })
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(_name: string, _value: string, _options: CookieOptions) {},
        remove(_name: string, _options: CookieOptions) {},
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  try {
    type UpdatedAt = { updated_at: string }
    const [companyResult, preferencesResult] = await Promise.all([
      supabase
        .from('user_company_data')
        .select('updated_at')
        .eq('user_id', user.id)
        .maybeSingle<UpdatedAt>(),
      supabase
        .from('user_preferences')
        .select('updated_at')
        .eq('user_id', user.id)
        .maybeSingle<UpdatedAt>(),
    ])

    return NextResponse.json({
      companyDataUpdatedAt: companyResult.data?.updated_at ?? null,
      preferencesUpdatedAt: preferencesResult.data?.updated_at ?? null,
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Version check error:', error)
    return NextResponse.json(
      { error: 'Failed to check version' },
      { status: 500 }
    )
  }
}
