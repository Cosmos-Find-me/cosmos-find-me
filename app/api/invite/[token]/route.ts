import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Get invitation details
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    type InvitationRow = { email: string; full_name: string | null; expires_at: string; invite_token: string; used: boolean }
    const { data: invitation, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('invite_token', token)
      .eq('used', false)
      .single<InvitationRow>()

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)

    if (now > expiresAt) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json({ error: 'Failed to verify invitation' }, { status: 500 })
  }
}