import { NextRequest, NextResponse } from 'next/server';
import { getModelForTask } from '@/utils/llm/config';
import { processCareerUrl } from './urlProcessors';

interface ExtractedCompany {
  name: string;
  url?: string;
  careerUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { text, html } = await request.json() as { text?: string; html?: string };
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'ANTHROPIC_API_KEY not configured in environment variables'
        },
        { status: 400 }
      );
    }

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Text parameter is required'
        },
        { status: 400 }
      );
    }

    // Clean HTML by extracting only text and links (remove all styling, scripts, metadata)
    let contentToAnalyze = text;
    let extractedLinks: Array<{ text: string; url: string }> = [];

    if (html) {
      try {
        // Parse HTML and extract links
        const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          const url = match[1];
          const linkText = match[2].replace(/<[^>]*>/g, '').trim();
          if (linkText && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
            // Pre-process URL to remove useless job post URLs and clean tracking params
            const processedUrl = processCareerUrl(url);
            // Only include if URL wasn't filtered out (processedUrl !== null)
            if (processedUrl) {
              extractedLinks.push({ text: linkText, url: processedUrl });
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse HTML links:', e);
      }
    }

    // Build prompt with clean text and extracted links
    const prompt = `Extract all company names from the following text. ${extractedLinks.length > 0 ? 'I have provided hyperlinks that may contain useful information.' : ''}

Return company information with:
- name: The company name
- url: The company's main website domain (inferred from the company name and any available URLs)
- careerUrl: The direct careers/jobs page URL if a link was provided

Instructions for inferring "url" (company website):
CRITICAL: The "url" field must be the company's OWN website, NOT a third-party hosting platform.

- Use the company name as the PRIMARY signal to infer the actual company domain
- If the company name does NOT match the career page platform, infer the company's real website instead
- Examples of CORRECT inference:
  * "Teleskope" + "linkedin.com/company/teleskopeai" → url: "https://teleskope.ai" (company ≠ LinkedIn)
  * "Strella" + "www.strella.io/careers" → url: "https://strella.io" (direct URL)
  * "WellTheory" + "notion.so/Work-at-WellTheory-..." → url: "https://welltheory.com" (company ≠ Notion)
  * "Defakto Security" + "www.defakto.security/careers/" → url: "https://defakto.security" (direct URL)
  * "Notion" + "notion.so/careers" → url: "https://notion.so" (company = Notion, use their domain)
  * "Greenhouse" + "greenhouse.io/careers" → url: "https://greenhouse.io" (company = Greenhouse)

Common third-party job platforms (DON'T use as company URL unless the company name matches):
ashbyhq.com, greenhouse.io, lever.co, workable.com, notion.so, gem.com, comeet.com, linkedin.com, bamboohr.com, jobvite.com, ycombinator.com, dover.com

When you see a company name like "WellTheory", infer it would have a website like "welltheory.com" or "welltheory.co" based on typical naming patterns.

TLD Selection Guidelines - Use industry/product context if provided:
- AI/ML platforms, tech tools → Prefer .ai, .io, .com
- Healthcare, biotech, regulatory → Prefer .bio, .health, .com
- Energy, sustainability, climate → Prefer .energy, .com
- Fintech, payments, banking → Prefer .io, .com, .finance
- Developer tools, SaaS → Prefer .io, .dev, .com
- General startups → Prefer .com, .io, .co
Examples:
  * "Weave - AI regulatory submission platform" → url: "https://weave.bio" (regulatory + bio context)
  * "FleetWorks - AI logistics platform" → url: "https://fleetworks.ai" (AI platform context)
  * "Daylight - renewable energy integrations" → url: "https://daylight.energy" or "https://daylight.com" (energy context)

Instructions for "careerUrl":
IMPORTANT: Determine from context and URL patterns if a link is truly a company career page.

You will see many types of URLs that are NOT career pages:
- Job board links (LinkedIn, Glassdoor, Indeed)
- Specific job postings (single role, not company careers page)
- Email tracking redirects (long URLs with tracking parameters)
- Marketing redirects (click trackers, analytics wrappers)

ONLY include careerUrl if:
1. The URL is clearly a company's own careers/jobs page (e.g., "company.com/careers", "careers.company.com")
2. The link text or context indicates it's a careers page (e.g., "View all jobs at Company")
3. It's NOT a third-party job board or single job posting

Do NOT include careerUrl if:
- It's the company's main website without /careers path
- It's a job board URL (even if it links to company's jobs)
- It's a specific job posting (not the general careers page)
- It's a tracking/redirect URL
- You're uncertain - when in doubt, omit this field

Examples:
  * "Webflow" + link "webflow.com/careers" → careerUrl: "https://webflow.com/careers" ✓
  * "Webflow" + link "jobs.webflow.com" → careerUrl: "https://jobs.webflow.com" ✓
  * "Webflow" + link "linkedin.com/company/webflow/jobs" → careerUrl: omitted (job board) ✓
  * "Webflow" + link "webflow.com/careers/senior-engineer" → careerUrl: omitted (specific job) ✓
  * "Webflow" + link "webflow.com" → careerUrl: omitted (main site, not careers) ✓
  * "Webflow" + no links → careerUrl: omitted ✓

Rules:
- Extract only real company/organization names, not generic terms
- Omit fields you cannot confidently determine
- Return empty companies array if no companies found

Text to analyze:
${contentToAnalyze}${extractedLinks.length > 0 ? `\n\nHyperlinks found in the text (these are mostly career pages):\n${extractedLinks.map(link => `- "${link.text}" -> ${link.url}`).join('\n')}` : ''}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'structured-outputs-2025-11-13'
      },
      body: JSON.stringify({
        model: getModelForTask('COMPANY_EXTRACTION'),
        max_tokens: 2048, // Reduced from 4096 - URLs are pre-processed before sending to LLM
        temperature: 0.1, // Low temperature for consistent extraction
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        output_format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              companies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    url: { type: 'string' },
                    careerUrl: { type: 'string' }
                  },
                  required: ['name'],
                  additionalProperties: false
                }
              }
            },
            required: ['companies'],
            additionalProperties: false
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(errorData.error?.message ?? `HTTP ${response.status}`);
    }

    const data = await response.json() as { content?: Array<{ text?: string }> };
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No content in response');
    }

    // Parse the JSON response (with structured outputs, it's guaranteed valid JSON)
    let result: { companies: ExtractedCompany[] };
    try {
      result = JSON.parse(content) as { companies: ExtractedCompany[] };
    } catch (parseError) {
      console.error('Failed to parse LLM response:', content);
      throw new Error('Failed to parse company list from LLM response');
    }

    // Validate the response structure
    if (!result.companies || !Array.isArray(result.companies)) {
      throw new Error('LLM response does not contain companies array');
    }

    // Enforce company limit (25 max per batch)
    let warning: string | undefined;
    if (result.companies.length > 25) {
      warning = `Detected ${result.companies.length} companies, but only processing the first 25 to ensure optimal performance. Please paste remaining companies in a separate batch.`;
      result.companies = result.companies.slice(0, 25);
    }

    // Clean and validate each company
    const validCompanies = result.companies
      .filter(c => c && typeof c === 'object' && typeof c.name === 'string')
      .map(c => {
        const name = c.name.trim();
        const url = c.url && typeof c.url === 'string' && c.url.trim() ? c.url.trim() : undefined;

        // Process careerUrl using platform-specific logic
        let careerUrl: string | undefined;
        if (c.careerUrl && typeof c.careerUrl === 'string' && c.careerUrl.trim()) {
          const processedUrl = processCareerUrl(c.careerUrl.trim(), name);
          careerUrl = processedUrl || undefined; // Convert null to undefined
        }

        return {
          name,
          ...(url ? { url } : {}),
          ...(careerUrl ? { careerUrl } : {})
        };
      })
      .filter(c => c.name.length > 0 && c.name.length < 100);

    return NextResponse.json({
      success: true,
      companies: validCompanies,
      ...(warning ? { warning } : {})
    });

  } catch (error) {
    console.error('Extract companies API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract companies'
      },
      { status: 500 }
    );
  }
}
