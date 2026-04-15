import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { verifyAdminAccess, isAdminAuthError } from '../../../../src/lib/admin-auth'
import { auditLog } from '../../../../src/lib/audit-log'

interface ProfileRow {
  id: string
  email: string
  [key: string]: unknown
}

interface CompanyDataRow {
  user_id: string
  companies?: unknown[]
  company_data?: unknown[]
  user_profile?: {
    baseCompanies?: unknown[]
    addedCompanies?: unknown[]
  }
  [key: string]: unknown
}

// Get all users (admin only)
export async function GET() {
  const auth = await verifyAdminAccess()
  if (isAdminAuthError(auth)) {
    return auth.response
  }

  const { adminClient } = auth

  console.log('Fetching users from profiles table...')

  // Following async-parallel: Use Promise.all() for independent operations
  // Profiles and company data have no dependencies, fetch in parallel
  const [profilesResult, companyDataResult] = await Promise.all([
    adminClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }),
    adminClient
      .from('user_company_data')
      .select('*')
  ]);

  const { data: rawProfiles, error: profilesError } = profilesResult;
  const { data: rawCompanyData, error: companyError } = companyDataResult;
  const profiles = rawProfiles as ProfileRow[] | null;
  const companyData = rawCompanyData as CompanyDataRow[] | null;

  if (profilesError) {
    console.error('Error fetching users:', profilesError)
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  if (companyError) {
    console.error('Error fetching company data:', companyError)
    return NextResponse.json({ error: companyError.message }, { status: 500 })
  }

  console.log('Found profiles:', profiles?.length || 0)
  console.log('Found company data records:', companyData?.length || 0)

  // Manually join the data and count actual companies
  const users = profiles?.map(profile => {
    const userCompanyData = companyData?.filter(data => data.user_id === profile.id) || []

    // Count actual companies - check multiple possible column names and structures
    let companyCount = 0
    userCompanyData.forEach(record => {
      // Check 'companies' column (current schema)
      if (record.companies && Array.isArray(record.companies)) {
        companyCount += record.companies.length
      }
      // Check 'company_data' column (legacy)
      else if (record.company_data && Array.isArray(record.company_data)) {
        companyCount += record.company_data.length
      }
      // Check if user_profile contains baseCompanies/addedCompanies (UserExplorationState format)
      else if (record.user_profile) {
        const userProfile = record.user_profile
        if (userProfile.baseCompanies && Array.isArray(userProfile.baseCompanies)) {
          companyCount += userProfile.baseCompanies.length
        }
        if (userProfile.addedCompanies && Array.isArray(userProfile.addedCompanies)) {
          companyCount += userProfile.addedCompanies.length
        }
      }
    })

    const hasData = companyCount > 0 || userCompanyData.length > 0
    console.log(`User ${profile.email} (ID: ${profile.id}): ${hasData ? `${companyCount} companies` : 'NO DATA'}`)

    return {
      ...profile,
      user_company_data: userCompanyData,
      company_count: companyCount
    }
  }) || []

  // Admin data is private, should never be cached
  return NextResponse.json({ users }, {
    headers: {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    }
  })
}

// Create user invitation (admin only)
export async function POST(request: Request) {
  const auth = await verifyAdminAccess()
  if (isAdminAuthError(auth)) {
    return auth.response
  }

  const { user, adminClient } = auth

  const { email, fullName } = await request.json() as { email: string; fullName: string }

  // Check if user already exists
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('email')
    .eq('email', email)
    .single()

  if (existingProfile) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 })
  }

  // Generate invitation token
  const inviteToken = uuidv4()
  const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${inviteToken}`

  // Create the invitation
  const { error } = await adminClient
    .from('user_invitations')
    .insert({
      email,
      full_name: fullName,
      invited_by: user.id,
      invite_token: inviteToken
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Audit log
  await auditLog({
    adminClient,
    action: 'user.invitation.create',
    adminId: user.id,
    targetUserId: null,
    details: { email, fullName, inviteToken },
    request
  })

  return NextResponse.json({
    inviteLink,
    message: 'Invitation created successfully'
  })
}
