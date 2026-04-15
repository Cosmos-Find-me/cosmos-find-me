import { createClient } from '@supabase/supabase-js'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Get user's company data and preferences
export async function GET(request: NextRequest) {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('🔧 Supabase not configured, returning no data (will use defaults)');
    return NextResponse.json({
      hasData: false,
      companyData: null,
      preferences: {
        watchlist_company_ids: [],
        removed_company_ids: [],
        view_mode: 'explore'
      }
    });
  }

  const cookieStore = await cookies()

  // Create a Supabase client configured to use cookies for auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // Server components can't set cookies, so we skip this
        },
        remove(_name: string, _options: CookieOptions) {
          // Server components can't remove cookies, so we skip this
        },
      },
    }
  )

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    console.log('🔐 No authenticated user found, returning unauthenticated status');
    return NextResponse.json({
      authenticated: false,
      hasData: false,
      companyData: null,
      preferences: {
        watchlist_company_ids: [],
        removed_company_ids: [],
        view_mode: 'explore'
      }
    });
  }

  console.log('🔐 Authenticated user found:', user.email);

  // Check if this is an admin viewing as another user
  const { searchParams } = new URL(request.url);
  const viewAsUserId = searchParams.get('viewAsUserId');

  // Fetch user profile with role included to avoid separate admin check query
  // Following async-parallel: combine profile_status, onboarding, and role in one query
  const { data: rawUserProfile } = await supabase
    .from('profiles')
    .select('profile_status, onboarding_completed_at, role')
    .eq('id', user.id)
    .single();
  const userProfile = rawUserProfile as { profile_status?: string; onboarding_completed_at?: string; role?: string } | null;

  let targetUserId = user.id;
  let isViewingAsUser = false;

  if (viewAsUserId) {
    // Check admin role from already-fetched profile (no extra query needed)
    if (userProfile?.role === 'admin') {
      console.log('🔍 Admin viewing as user:', viewAsUserId);
      targetUserId = viewAsUserId;
      isViewingAsUser = true;
    } else {
      console.warn('⚠️ Non-admin user attempted to view as another user');
    }
  }

  interface CompanyDataRow {
    user_id: string;
    updated_at?: string;
    user_profile?: {
      watchlistCompanyIds?: number[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  interface PreferencesRow {
    user_id?: string;
    watchlist_company_ids?: number[];
    removed_company_ids?: number[];
    view_mode?: string;
    updated_at?: string;
    [key: string]: unknown;
  }

  try {
    // Following async-parallel: Use Promise.all() for independent operations
    // Company data, preferences, and viewed user info can all be fetched in parallel

    // Determine which client to use for preferences (admin bypass vs regular RLS)
    const preferencesClient = (isViewingAsUser && process.env.SUPABASE_SERVICE_ROLE_KEY)
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      : supabase;

    // Start all independent queries in parallel
    const [companyResult, preferencesResult, viewedProfileResult] = await Promise.all([
      // Query 1: Company data
      supabase
        .from('user_company_data')
        .select('*')
        .eq('user_id', targetUserId),
      // Query 2: User preferences
      preferencesClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle(),
      // Query 3: Viewed user profile (only if admin viewing as user)
      isViewingAsUser
        ? supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', targetUserId)
            .single()
        : Promise.resolve({ data: null, error: null })
    ]);

    const { data: rawCompanyData, error: companyError } = companyResult;
    const companyData = rawCompanyData as CompanyDataRow[] | null;
    const { error: prefError } = preferencesResult;
    const preferences = preferencesResult.data as PreferencesRow | null;
    const viewedUserInfo = viewedProfileResult.data;

    if (companyError) {
      console.error('Error fetching company data:', companyError)
      return NextResponse.json({ hasData: false, error: companyError.message }, { status: 500 })
    }

    if (prefError) {
      console.error('Error fetching preferences:', prefError.message);
    }

    if (!companyData || companyData.length === 0) {
      return NextResponse.json({
        authenticated: true,
        hasData: false,
        userId: targetUserId, // Include target user ID for profile creation
        profileStatus: userProfile?.profile_status || 'pending',
        onboardingCompletedAt: userProfile?.onboarding_completed_at || null,
        isViewingAsUser,
        viewedUserId: isViewingAsUser ? targetUserId : undefined,
        companyData: null,
        preferences: {
          watchlist_company_ids: [],
          removed_company_ids: [],
          view_mode: 'explore'
        }
      })
    }

    const userData = companyData[0]

    // Debug: trace preferences data for sync diagnosis (#130)
    console.log('🔍 [SYNC DEBUG] Preferences from DB:', {
      userId: targetUserId,
      hasPreferences: !!preferences,
      watchlist_company_ids: preferences?.watchlist_company_ids ?? 'NO_PREFS',
      removed_company_ids: preferences?.removed_company_ids ?? 'NO_PREFS',
      view_mode: preferences?.view_mode ?? 'NO_PREFS',
      prefs_updated_at: preferences?.updated_at ?? 'NO_PREFS',
      companyData_updated_at: userData?.updated_at ?? 'NO_DATA',
      userProfile_has_watchlist: !!(userData?.user_profile?.watchlistCompanyIds),
      userProfile_watchlist: userData?.user_profile?.watchlistCompanyIds ?? 'NOT_IN_PROFILE',
    });

    const response = {
      authenticated: true,
      hasData: true,
      profileStatus: userProfile?.profile_status || 'complete', // Users with data default to complete
      onboardingCompletedAt: userProfile?.onboarding_completed_at || null,
      isViewingAsUser,
      viewedUserId: isViewingAsUser ? targetUserId : undefined,
      viewedUserInfo: isViewingAsUser ? viewedUserInfo : undefined,
      companyData: userData,
      preferences: preferences || {
        watchlist_company_ids: [],
        removed_company_ids: [],
        view_mode: 'explore'
      }
    }

    if (isViewingAsUser) {
      console.log('👀 Admin viewing as user:', {
        targetUserId,
        watchlistCount: preferences?.watchlist_company_ids?.length || 0,
        removedCount: preferences?.removed_company_ids?.length || 0
      });
    }

    // Following server-cache-lru: Add cache headers for user data
    // User data is private, should never be cached by CDN/proxies
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ hasData: false, error: 'Failed to fetch data' }, { status: 500 })
  }
}

// Save user data and preferences
export async function POST(request: Request) {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('🔧 Supabase not configured, persistence disabled (data will use localStorage)');
    return NextResponse.json({
      message: 'Data saved to localStorage (Supabase not configured)',
      success: true
    });
  }

  const cookieStore = await cookies()

  // Create auth client to verify the requesting user
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // Server components can't set cookies
        },
        remove(_name: string, _options: CookieOptions) {
          // Server components can't remove cookies
        },
      },
    }
  )

  // Get the authenticated user
  const { data: { user }, error: authError } = await authClient.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Use admin client for database operations (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  interface UserDataBody {
    userId: string
    userProfile?: unknown
    companies?: unknown[]
    preferences?: {
      watchlist_company_ids?: number[]
      removed_company_ids?: number[]
      view_mode?: string
    }
    profileStatus?: string
  }

  try {
    const body = await request.json() as UserDataBody
    const { userId, userProfile, companies, preferences, profileStatus } = body

    console.log('💾 Saving user data for user:', userId)

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Verify user owns this data or is admin
    if (userId !== user.id) {
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (currentUserProfile?.role !== 'admin') {
        console.warn(`⚠️ User ${user.email} attempted to modify data for user ${userId}`)
        return NextResponse.json({ error: 'Cannot modify another user\'s data' }, { status: 403 })
      }

      console.log(`🔑 Admin ${user.email} modifying data for user ${userId}`)
    }

    // Update profile_status if provided
    if (profileStatus) {
      const updateData: { profile_status: string; onboarding_completed_at?: string } = {
        profile_status: profileStatus
      }

      // Set onboarding_completed_at when transitioning to 'complete' or 'incomplete'
      if (profileStatus === 'complete' || profileStatus === 'incomplete') {
        updateData.onboarding_completed_at = new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (profileError) {
        console.error('Error updating profile status:', profileError)
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }

      console.log('✅ Updated profile_status to:', profileStatus)
    }

    // Update user company data
    if (userProfile && companies) {
      const { error: dataError } = await supabase
        .from('user_company_data')
        .upsert({
          user_id: userId,
          user_profile: userProfile,
          companies: companies,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (dataError) {
        console.error('Error updating company data:', dataError)
        return NextResponse.json({ error: dataError.message }, { status: 500 })
      }
    }

    // Update user preferences
    // Debug: trace what we're writing to user_preferences (#130)
    console.log('🔍 [SYNC DEBUG] POST writing preferences:', {
      userId,
      preferences: preferences ? {
        watchlist_company_ids: preferences.watchlist_company_ids,
        removed_company_ids: preferences.removed_company_ids,
        view_mode: preferences.view_mode,
      } : 'NO_PREFERENCES_IN_BODY',
    });

    if (preferences) {
      const { error: prefError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          watchlist_company_ids: preferences.watchlist_company_ids || [],
          removed_company_ids: preferences.removed_company_ids || [],
          view_mode: preferences.view_mode || 'explore',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (prefError) {
        console.error('Error updating preferences:', prefError)
        return NextResponse.json({ error: prefError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      message: 'User data saved successfully',
      success: true
    })

  } catch (error) {
    console.error('Error saving user data:', error)
    return NextResponse.json({ error: 'Failed to save user data' }, { status: 500 })
  }
}