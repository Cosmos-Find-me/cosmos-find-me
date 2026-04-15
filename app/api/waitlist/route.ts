import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { trackServerEvent } from '../../../src/lib/analytics'

// Create Supabase client lazily to avoid build-time errors when env vars aren't set
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase environment variables not configured')
  }

  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json() as { email?: string }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Insert email into waitlist
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('waitlist')
      .insert([{ email: email.toLowerCase().trim() }])
      .select()
      .single()

    if (error) {
      // Handle duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This email is already on the waitlist' },
          { status: 409 }
        )
      }

      console.error('Waitlist error:', error)
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    // Analytics: Track waitlist signup (use email as distinct_id since no user yet)
    const normalizedEmail = email.toLowerCase().trim()
    await trackServerEvent('waitlist_signup', normalizedEmail, { email: normalizedEmail })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
