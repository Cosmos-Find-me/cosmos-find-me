import { NextRequest, NextResponse } from 'next/server';

/**
 * Use Perplexity API to search for company URLs on various platforms
 */
export async function POST(request: NextRequest) {
  try {
    const { companyName, websiteUrl } = await request.json() as { companyName: string; websiteUrl?: string };

    if (!companyName) {
      return NextResponse.json(
        { success: false, error: 'Company name is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ PERPLEXITY_API_KEY not configured, falling back to Google search URLs');
      return fallbackToGoogleSearch(companyName, websiteUrl);
    }

    console.log(`🔍 Using Perplexity API to search for: ${companyName}`);

    // Search for URLs on different platforms using Perplexity
    const [linkedinUrl, glassdoorUrl, crunchbaseUrl] = await Promise.all([
      searchPerplexity(apiKey, companyName, 'LinkedIn', ['linkedin.com']),
      searchPerplexity(apiKey, companyName, 'Glassdoor', ['glassdoor.com']),
      searchPerplexity(apiKey, companyName, 'Crunchbase', ['crunchbase.com'])
    ]);

    const externalLinks: Record<string, string> = {};

    if (linkedinUrl) externalLinks.linkedin = linkedinUrl;
    if (glassdoorUrl) externalLinks.glassdoor = glassdoorUrl;
    if (crunchbaseUrl) externalLinks.crunchbase = crunchbaseUrl;

    // Add website URL if provided
    if (websiteUrl) {
      externalLinks.website = websiteUrl;
    }

    console.log('✅ Found URLs via Perplexity:', externalLinks);

    return NextResponse.json({
      success: true,
      data: externalLinks
    });

  } catch (error) {
    console.error('Perplexity API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search for company URLs'
      },
      { status: 500 }
    );
  }
}

/**
 * Search for a company URL on a specific platform using Perplexity API
 */
async function searchPerplexity(
  apiKey: string,
  companyName: string,
  platformName: string,
  domainFilter: string[]
): Promise<string | null> {
  try {
    const query = `${companyName} ${platformName} company page`;

    console.log(`🔎 Searching Perplexity for: ${query} on ${domainFilter.join(', ')}`);

    const response = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query,
        max_results: 5,
        search_domain_filter: domainFilter
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      console.error(`❌ Perplexity API error for ${platformName}:`, response.status, errorData);
      return null;
    }

    const data = await response.json() as { results: Array<{ url: string }> };

    // Extract the first matching URL from results
    if (data.results && data.results.length > 0) {
      const url = data.results[0].url;
      console.log(`✓ Found ${platformName} URL:`, url);
      return url;
    }

    console.log(`⚠️ No results found for ${platformName}`);
    return null;

  } catch (error) {
    console.error(`Error searching ${platformName} via Perplexity:`, error);
    return null;
  }
}

/**
 * Fallback to Google search URLs if Perplexity API is not available
 */
function fallbackToGoogleSearch(companyName: string, websiteUrl?: string): NextResponse {
  const externalLinks: Record<string, string> = {
    linkedin: generateGoogleSearchUrl(companyName, 'LinkedIn'),
    glassdoor: generateGoogleSearchUrl(companyName, 'Glassdoor'),
    crunchbase: generateGoogleSearchUrl(companyName, 'Crunchbase')
  };

  if (websiteUrl) {
    externalLinks.website = websiteUrl;
  }

  console.log('✅ Generated Google search URLs:', externalLinks);

  return NextResponse.json({
    success: true,
    data: externalLinks
  });
}

/**
 * Generate a Google search URL for finding a company on a specific platform
 */
function generateGoogleSearchUrl(companyName: string, platformName: string): string {
  const query = `${companyName} on ${platformName}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
