import { NextResponse } from 'next/server'
import { verifyAdminAccess, isAdminAuthError } from '../../../../src/lib/admin-auth'
import { auditLog } from '../../../../src/lib/audit-log'

// Import user data from JSON (admin only)
export async function POST(request: Request) {
  const auth = await verifyAdminAccess()
  if (isAdminAuthError(auth)) {
    return auth.response
  }

  const { user, adminClient } = auth

  interface UserDataBody {
    userId: string
    userData: { userProfile: unknown; companies: unknown[] }
  }

  try {
    const { userId, userData } = await request.json() as UserDataBody

    if (!userId || !userData) {
      return NextResponse.json({ error: 'Missing userId or userData' }, { status: 400 })
    }

    // Get target user's email for logging
    const { data: targetUser } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log(`📥 Admin ${user.email} importing data for user: ${targetUser.email}`)

    // userData should contain:
    // - userProfile: UserCMF object
    // - companies: Company[] array

    // Upsert user company data
    const { data, error } = await adminClient
      .from('user_company_data')
      .upsert({
        user_id: userId,
        user_profile: userData.userProfile,
        companies: userData.companies,
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ Successfully imported data for user: ${targetUser.email}`)

    // Audit log
    await auditLog({
      adminClient,
      action: 'user.data.import',
      adminId: user.id,
      targetUserId: userId,
      details: {
        email: targetUser.email,
        companyCount: userData.companies?.length || 0
      },
      request
    })

    return NextResponse.json({
      success: true,
      data,
      message: 'User data imported successfully'
    })

  } catch (error) {
    return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
  }
}
