import { NextRequest, NextResponse } from 'next/server';
import { getModelForTask } from '@/utils/llm/config';

interface AnalysisUserCMF {
  targetRole: string;
  mustHaves: string[];
  wantToHave?: string[];
  experience?: string[];
  targetCompanies?: string;
}

interface AnalysisRequest {
  companyName: string;
  userCMF: AnalysisUserCMF;
}

interface AnthropicContent {
  text: string;
}

interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

interface AnthropicResponse {
  content: AnthropicContent[];
  stop_reason: string;
  usage: AnthropicUsage;
}

interface AnthropicErrorResponse {
  error?: { message?: string };
}

interface CompanyData {
  connections?: string[];
  connectionTypes?: Record<string, string>;
  externalLinks?: Record<string, string>;
  [key: string]: unknown;
}

interface SearchUrlsResult {
  success: boolean;
  data?: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const { request: analysisRequest } = await request.json() as { request: AnalysisRequest };
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

    const prompt = buildAnthropicPrompt(analysisRequest);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'structured-outputs-2025-11-13'
      },
      body: JSON.stringify({
        model: getModelForTask('COMPANY_ANALYSIS'),
        max_tokens: 2048,
        temperature: 0.7,
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
              name: { type: 'string' },
              industry: { type: 'string' },
              stage: { type: 'string' },
              location: { type: 'string' },
              employees: { type: 'string' },
              remote: { type: 'string' },
              openRoles: { type: 'number' },
              matchScore: { type: 'number' },
              matchReasons: {
                type: 'array',
                items: { type: 'string' }
              },
              connections: {
                type: 'array',
                items: { type: 'string' }
              },
              description: { type: 'string' },
              websiteUrl: { type: 'string' },
              careerUrl: { type: 'string' }
            },
            required: ['name', 'industry', 'stage', 'location', 'employees', 'remote', 'openRoles', 'matchScore', 'matchReasons', 'connections', 'description', 'websiteUrl'],
            additionalProperties: false
          }
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as AnthropicErrorResponse;
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json() as AnthropicResponse;
    const responseText = data.content[0]?.text;

    if (!responseText) {
      throw new Error('No response content from Claude API');
    }

    console.log('📝 Raw Claude response text:', responseText);
    console.log('📏 Response length:', responseText.length, 'characters');
    console.log('⏹️  Stop reason:', data.stop_reason);

    // Check if response was truncated
    if (data.stop_reason === 'max_tokens') {
      console.warn('⚠️ WARNING: Claude response was truncated due to max_tokens limit');
    }

    // Parse the JSON response
    const companyData = parseAnthropicResponse(responseText) as CompanyData;

    // Generate connectionTypes if connections exist (structured outputs doesn't support dynamic object keys)
    if (companyData.connections && companyData.connections.length > 0) {
      companyData.connectionTypes = companyData.connections.reduce((acc: Record<string, string>, conn: string) => {
        acc[conn] = 'Related Company'; // Default relationship type
        return acc;
      }, {});
    }

    // Generate Google search URLs for external links
    const externalLinks = await searchCompanyUrls(analysisRequest.companyName);

    // Add external links with company data
    if (externalLinks && Object.keys(externalLinks).length > 0) {
      companyData.externalLinks = externalLinks;
    }

    return NextResponse.json({
      success: true,
      data: companyData,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalCost: calculateAnthropicCost(data.usage?.input_tokens || 0, data.usage?.output_tokens || 0)
      }
    });

  } catch (error) {
    console.error('Anthropic API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze company with Claude'
      },
      { status: 500 }
    );
  }
}

// Helper function to build Anthropic prompt
function buildAnthropicPrompt(request: AnalysisRequest) {
  return `Analyze "${request.companyName}" and provide comprehensive company information based on the user's career criteria.

User's Candidate Market Fit (CMF) Criteria:
- Target Role: ${request.userCMF.targetRole}
- Must-Haves: ${request.userCMF.mustHaves.join(', ')}
${request.userCMF.wantToHave?.length ? `- Want-to-Have: ${request.userCMF.wantToHave.join(', ')}` : ''}
${request.userCMF.experience?.length ? `- Experience: ${request.userCMF.experience.join(', ')}` : ''}
${request.userCMF.targetCompanies ? `- Target Companies: ${request.userCMF.targetCompanies}` : ''}

Provide the following information:
- name: The company's official name
- industry: Primary industry (e.g., AI/ML, Fintech, Gaming, Healthcare, SaaS, etc.)
- stage: Company stage (Early Stage, Late Stage, Public, Mature)
- location: Primary headquarters location
- employees: Employee count range (e.g., ~50, 100-500, 1000-5000, 10000+)
- remote: Remote work policy (Remote-Friendly, Hybrid, In-Office)
- openRoles: Estimated number of open positions (numeric)
- matchScore: Score 0-100 based on alignment with user's CMF criteria
- matchReasons: Array of 3-4 specific reasons explaining the match score
- connections: Array of 3-5 similar/related companies in the same space
- description: 2-3 sentence description of what the company does
- websiteUrl: The company's primary website domain (e.g., "welltheory.com", "anthropic.com"). IMPORTANT: Infer the actual company website, NOT third-party platforms like notion.so, greenhouse.com, lever.co, ashbyhq.com, etc.
- careerUrl: OPTIONAL - Only provide if you are highly confident about the company's actual careers/jobs page URL (e.g., "https://anthropic.com/careers", "https://stripe.com/jobs"). Do NOT guess or use generic patterns. Do NOT include third-party job board URLs. Omit this field if uncertain.

Calculate matchScore (0-100) by evaluating:
1. Alignment with must-have criteria (weighted most heavily)
2. Fit with target role and company stage
3. Relevance to experience background
4. Match with want-to-have preferences

Be accurate and base analysis on real company information.`;
}

// Helper function to parse Anthropic response with structured outputs
function parseAnthropicResponse(responseText: string): CompanyData {
  try {
    // With structured outputs, response is guaranteed valid JSON
    const parsed = JSON.parse(responseText) as CompanyData;

    // Remove any externalLinks that Claude might have added (we generate these separately)
    if (parsed.externalLinks) {
      delete parsed.externalLinks;
    }

    return parsed;
  } catch (error) {
    console.error('❌ Failed to parse Claude response. Raw response text:', responseText);
    console.error('Parse error details:', error);

    // This should rarely happen with structured outputs
    const errorMsg = error instanceof Error ? error.message : 'Unknown parsing error';
    throw new Error(`Invalid JSON response from Claude API: ${errorMsg}. Response length: ${responseText?.length || 0} chars`);
  }
}

// Helper function to calculate costs
function calculateAnthropicCost(inputTokens: number, outputTokens: number): number {
  // Claude 3.5 Sonnet pricing
  const inputPrice = 3; // $3 per 1M tokens
  const outputPrice = 15; // $15 per 1M tokens

  const inputCost = (inputTokens / 1000000) * inputPrice;
  const outputCost = (outputTokens / 1000000) * outputPrice;
  return inputCost + outputCost;
}

// Helper function to generate search URLs for company platforms
async function searchCompanyUrls(companyName: string, websiteUrl?: string): Promise<Record<string, string> | null> {
  try {
    console.log(`🔍 Generating search URLs for ${companyName}...`);

    // Call our internal endpoint to generate Google search URLs
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/llm/perplexity/search-company-urls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ companyName, websiteUrl })
    });

    if (!response.ok) {
      console.error('URL generation failed:', response.status);
      return null;
    }

    const result = await response.json() as SearchUrlsResult;

    if (result.success && result.data) {
      console.log('✅ Generated URLs:', result.data);
      return result.data;
    }

    return null;
  } catch (error) {
    console.error('Error generating company URLs:', error);
    return null;
  }
}
