/**
 * Logo Migration Endpoint (Archived - Migration Complete)
 *
 * This endpoint was used for the one-time migration from Clearbit/Logo.dev to proxy format.
 * Migration completed on 2025-11-06 - all 474 companies across 11 users migrated successfully.
 *
 * Kept for reference and potential future migrations. Requires confirmation header to run.
 *
 * Migrates all logo URLs in the database from:
 * - Direct Logo.dev URLs -> Proxy format
 * - Clearbit URLs -> Proxy format
 * - Fallback avatars -> Real Logo.dev logos (using careerUrl domain)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

interface CompanyRecord {
  logo: string;
  careerUrl?: string;
  name?: string;
  [key: string]: unknown;
}

interface UserCompanyRow {
  user_id: string;
  companies?: CompanyRecord[];
  user_profile?: {
    baseCompanies?: CompanyRecord[];
    addedCompanies?: CompanyRecord[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  // Safety check - require confirmation header to prevent accidental runs
  const confirmHeader = request.headers.get('X-Confirm-Migration');
  if (confirmHeader !== 'true') {
    return NextResponse.json({
      status: 'archived',
      message: 'Logo migration completed on 2025-11-06',
      stats: {
        totalUsers: 13,
        usersUpdated: 11,
        companiesMigrated: 474
      },
      note: 'Migration already complete. To re-run, add header: X-Confirm-Migration: true',
      warning: 'Only re-run if you have new users with legacy logo URLs'
    }, { status: 200 });
  }

  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  // Create admin client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get all user_company_data records
    const { data: rawUserData, error: fetchError } = await supabase
      .from('user_company_data')
      .select('*');
    const allUserData = rawUserData as UserCompanyRow[] | null;

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch data', details: fetchError },
        { status: 500 }
      );
    }

    if (!allUserData || allUserData.length === 0) {
      return NextResponse.json({
        message: 'No data to migrate',
        updated: 0
      });
    }

    let totalUpdated = 0;
    const results = [];

    // Process each user's data
    for (const userData of allUserData as UserCompanyRow[]) {
      const companies = userData.companies || [];
      const userProfile = userData.user_profile || {};

      let hasChanges = false;

      const migrateCompany = (company: CompanyRecord): CompanyRecord => {
        const oldLogo = company.logo;
        const newLogo = migrateLogoURL(company.logo, company.careerUrl, company.name);
        if (oldLogo !== newLogo) hasChanges = true;
        return { ...company, logo: newLogo };
      };

      // Migrate companies array
      const migratedCompanies = companies.map(migrateCompany);
      if (migratedCompanies.some((c, i) => c.logo !== companies[i].logo)) {
        console.log(`Migrating companies for user ${userData.user_id}`);
      }

      // Migrate baseCompanies in user_profile
      const baseCompanies = userProfile.baseCompanies ?? [];
      const migratedBaseCompanies = baseCompanies.map(migrateCompany);

      // Migrate addedCompanies in user_profile
      const addedCompanies = userProfile.addedCompanies ?? [];
      const migratedAddedCompanies = addedCompanies.map(migrateCompany);

      // Update database if there are changes
      if (hasChanges) {
        const { error: updateError } = await supabase
          .from('user_company_data')
          .update({
            companies: migratedCompanies,
            user_profile: {
              ...userProfile,
              baseCompanies: migratedBaseCompanies,
              addedCompanies: migratedAddedCompanies
            }
          })
          .eq('user_id', userData.user_id);

        if (updateError) {
          console.error(`Error updating user ${userData.user_id}:`, updateError);
          results.push({
            userId: userData.user_id,
            success: false,
            error: updateError.message
          });
        } else {
          totalUpdated++;
          results.push({
            userId: userData.user_id,
            success: true,
            companiesUpdated: migratedCompanies.length + migratedBaseCompanies.length + migratedAddedCompanies.length
          });
        }
      }
    }

    return NextResponse.json({
      message: 'Migration complete',
      totalUsers: allUserData.length,
      usersUpdated: totalUpdated,
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error },
      { status: 500 }
    );
  }
}

/**
 * Migrate a single logo URL to the proxy format
 */
function migrateLogoURL(logoUrl: string, careerUrl?: string, companyName?: string): string {
  // Already using proxy format - no change needed
  if (logoUrl.includes('/api/logo')) {
    return logoUrl;
  }

  // Handle fallback avatars - try to get real logo from careerUrl domain
  if (logoUrl.includes('ui-avatars.com')) {
    const domain = extractDomainFromCareerUrl(careerUrl);
    if (domain) {
      console.log(`Converting fallback to real logo for ${companyName}: ${domain}`);
      return `/api/logo?domain=${encodeURIComponent(domain)}`;
    }
    // Keep fallback if no domain available
    return logoUrl;
  }

  // Extract domain from Logo.dev URL
  if (logoUrl.includes('img.logo.dev/')) {
    const domain = logoUrl.split('img.logo.dev/')[1]?.split('?')[0];
    if (domain) {
      return `/api/logo?domain=${encodeURIComponent(domain)}`;
    }
  }

  // Extract domain from Clearbit URL
  if (logoUrl.includes('logo.clearbit.com/')) {
    const domain = logoUrl.split('logo.clearbit.com/')[1]?.split('?')[0];
    if (domain) {
      return `/api/logo?domain=${encodeURIComponent(domain)}`;
    }
  }

  // Can't parse - return original
  return logoUrl;
}

/**
 * Extract domain from career URL
 */
function extractDomainFromCareerUrl(careerUrl?: string): string | undefined {
  if (!careerUrl) return undefined;

  try {
    const url = new URL(careerUrl);
    return url.hostname;
  } catch {
    return undefined;
  }
}
