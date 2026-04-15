import { NextResponse } from 'next/server'
import { verifyAdminAccess, isAdminAuthError } from '../../../../src/lib/admin-auth'
import { auditLog } from '../../../../src/lib/audit-log'

/**
 * Admin endpoint to reset onboarding for a specific user
 * This clears their company data, preferences, and sets profile_status to 'pending'
 *
 * Usage: POST /api/admin/reset-user-onboarding
 * Body: { userId: string }
 *
 * Requires admin role
 */
export async function POST(request: Request) {
  const auth = await verifyAdminAccess()
  if (isAdminAuthError(auth)) {
    return auth.response
  }

  const { user, adminClient } = auth

  try {
    const body = await request.json() as { userId: string }
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Get target user's email for logging
    const { data: targetUser } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`🔄 Admin ${user.email} resetting onboarding for user: ${targetUser.email}`)

    // Delete user company data
    const { error: companyDataError } = await adminClient
      .from('user_company_data')
      .delete()
      .eq('user_id', userId)

    if (companyDataError) {
      console.error('Error deleting company data:', companyDataError)
      // Continue anyway - might not exist
    }

    // Delete user preferences
    const { error: preferencesError } = await adminClient
      .from('user_preferences')
      .delete()
      .eq('user_id', userId)

    if (preferencesError) {
      console.error('Error deleting preferences:', preferencesError)
      // Continue anyway - might not exist
    }

    // Reset profile_status to 'pending' and clear onboarding_completed_at
    const { error: statusError } = await adminClient
      .from('profiles')
      .update({
        profile_status: 'pending',
        onboarding_completed_at: null
      })
      .eq('id', userId)

    if (statusError) {
      console.error('Error updating profile status:', statusError)
      return NextResponse.json(
        { error: 'Failed to reset profile status' },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully reset onboarding for user: ${targetUser.email}`)

    // Audit log
    await auditLog({
      adminClient,
      action: 'user.onboarding.reset',
      adminId: user.id,
      targetUserId: userId,
      details: { email: targetUser.email },
      request
    })

    return NextResponse.json({
      success: true,
      message: `Onboarding reset for ${targetUser.email}. They will see the onboarding flow on next login.`
    })

  } catch (error) {
    console.error('Error during admin onboarding reset:', error)
    return NextResponse.json(
      { error: 'Failed to reset onboarding' },
      { status: 500 }
    )
  }
}
