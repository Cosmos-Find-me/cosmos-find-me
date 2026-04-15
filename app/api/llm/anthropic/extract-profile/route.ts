import { NextRequest, NextResponse } from 'next/server';
import { getModelForTask } from '@/utils/llm/config';
import { extractText } from 'unpdf';

/**
 * Profile Extraction Endpoint
 *
 * Uses Claude Opus 4.5 to extract structured UserCMF data from resume and career goals documents.
 * Supports PDF files via base64 encoding.
 *
 * Request body:
 * {
 *   resume: { data: string (base64), type: string (mime type), name: string },
 *   careerGoals: { data: string (base64), type: string (mime type), name: string }
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   cmf: UserCMF,
 *   usage: { inputTokens, outputTokens, totalCost }
 * }
 */

interface FileData {
  data: string;      // base64 encoded content
  type: string;      // mime type (application/pdf, text/plain, etc.)
  name: string;      // original filename
}

interface ExtractProfileRequest {
  resume: FileData;
  careerGoals: FileData;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ExtractProfileRequest;
    const { resume, careerGoals } = body;

    if (!resume?.data || !careerGoals?.data) {
      return NextResponse.json(
        { success: false, error: 'Both resume and career goals documents are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'ANTHROPIC_API_KEY not configured in environment variables' },
        { status: 400 }
      );
    }

    // Extract text and build messages (PDF text extraction reduces token usage)
    const messages = await buildMessagesWithDocuments(resume, careerGoals);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'structured-outputs-2025-11-13'
      },
      body: JSON.stringify({
        model: getModelForTask('PROFILE_EXTRACTION'),
        max_tokens: 4096,
        temperature: 0.3, // Lower temperature for consistent extraction
        messages,
        output_format: {
          type: 'json_schema',
          schema: getProfileExtractionSchema()
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      console.error('Claude API error:', errorData);
      throw new Error(`Claude API error: ${response.status} - ${errorData.error?.message ?? 'Unknown error'}`);
    }

    const data = await response.json() as { content: Array<{ text?: string }>; stop_reason?: string; usage?: { input_tokens: number; output_tokens: number } };
    const responseText = data.content[0]?.text;

    if (!responseText) {
      throw new Error('No response content from Claude API');
    }

    console.log('📝 Profile extraction response length:', responseText.length, 'characters');
    console.log('⏹️  Stop reason:', data.stop_reason);

    // Parse the JSON response
    const cmfData = parseProfileResponse(responseText);

    return NextResponse.json({
      success: true,
      cmf: cmfData,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
        totalCost: calculateCost(data.usage?.input_tokens || 0, data.usage?.output_tokens || 0)
      }
    });

  } catch (error) {
    console.error('Profile extraction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract profile'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract text from a file (supports PDF and text files)
 * For PDFs, uses unpdf to extract text content - more efficient than sending images
 */
async function extractTextFromFile(file: FileData): Promise<string> {
  // Decode base64 to buffer
  const buffer = Buffer.from(file.data, 'base64');

  if (isPDF(file.type)) {
    try {
      // Use unpdf to extract text from PDF
      // unpdf requires Uint8Array, not Buffer
      console.log(`📄 Extracting text from PDF: ${file.name}`);
      const uint8Array = new Uint8Array(buffer);
      const { text } = await extractText(uint8Array, { mergePages: true });
      console.log(`   Extracted ${text.length} characters from PDF`);
      return text;
    } catch (error) {
      console.error(`Failed to extract text from PDF ${file.name}:`, error);
      throw new Error(`Failed to extract text from PDF: ${file.name}`);
    }
  } else {
    // For text files, decode as UTF-8
    return buffer.toString('utf-8');
  }
}

/**
 * Build messages array with extracted text content for Claude API
 * Text extraction from PDFs reduces token usage significantly
 */
async function buildMessagesWithDocuments(resume: FileData, careerGoals: FileData) {
  // Extract text from both documents
  const resumeText = await extractTextFromFile(resume);
  const careerGoalsText = await extractTextFromFile(careerGoals);

  // Build content with extracted text only (no PDF attachments)
  const content = [
    {
      type: 'text',
      text: `=== RESUME (${resume.name}) ===\n\n${resumeText}`
    },
    {
      type: 'text',
      text: `=== CAREER GOALS / CMF (${careerGoals.name}) ===\n\n${careerGoalsText}`
    },
    {
      type: 'text',
      text: buildExtractionPrompt()
    }
  ];

  return [{ role: 'user', content }];
}

/**
 * Check if file is a PDF
 */
function isPDF(mimeType: string): boolean {
  return mimeType === 'application/pdf' || mimeType.includes('pdf');
}

/**
 * JSON Schema for profile extraction - ensures structured output from Claude
 *
 * mustHaves and wantToHave use CMFItem format with short (display) and detailed (matching) versions
 */
function getProfileExtractionSchema() {
  // Schema for CMF items with short and detailed versions
  const cmfItemSchema = {
    type: 'object',
    properties: {
      short: {
        type: 'string',
        description: 'Short label for UI display (2-6 words, e.g., "High Velocity of Execution")'
      },
      detailed: {
        type: 'string',
        description: 'Full description with context for matching (1-2 sentences explaining what this means)'
      }
    },
    required: ['short', 'detailed'],
    additionalProperties: false
  };

  return {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The candidate\'s full name'
      },
      targetRole: {
        type: 'string',
        description: 'The specific job title or role they are seeking'
      },
      targetCompanies: {
        type: 'string',
        description: 'Description of what type of companies they want to work at'
      },
      mustHaves: {
        type: 'array',
        items: cmfItemSchema,
        description: 'Non-negotiable requirements with short labels and detailed descriptions'
      },
      wantToHave: {
        type: 'array',
        items: cmfItemSchema,
        description: 'Nice-to-have preferences with short labels and detailed descriptions'
      },
      experience: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key skills, domains, and experience areas - short labels only (2-4 words each)'
      }
    },
    required: ['name', 'targetRole', 'targetCompanies', 'mustHaves', 'wantToHave', 'experience'],
    additionalProperties: false
  };
}

/**
 * Build the extraction prompt
 * Note: The output format is enforced by structured outputs (JSON schema)
 */
function buildExtractionPrompt(): string {
  return `Based on the resume and career goals documents above, extract the candidate's profile information.

## INSTRUCTIONS

Analyze both documents carefully and extract:

1. **Name**: The candidate's full name
2. **Target Role**: The specific job title or role they are seeking (e.g., "Senior Product Manager", "Software Engineering Lead")
3. **Target Companies**: What type of companies they want to work at (e.g., "Series B-C startups in AI/ML", "Late-stage tech companies")
4. **Must-Haves**: Non-negotiable requirements (extract 3-5 items minimum)
   - Each item needs TWO versions:
     - "short": A brief label for UI display (2-6 words)
     - "detailed": Full description with context (1-2 sentences)
   - Example: { "short": "High Velocity of Execution", "detailed": "A dynamic pace of work where we move and learn quickly, with a tangible sense of progress and clear visibility of results and outcomes" }
5. **Want-to-Haves**: Nice-to-have preferences (extract 3-5 items minimum)
   - Same format as Must-Haves: both "short" and "detailed" versions
6. **Experience**: Key skills, domains, and experience areas from the resume (extract 5-10 items)
   - Simple short labels only (2-4 words each, e.g., "AI/ML Products", "Data Pipelines")

## IMPORTANT NOTES

- Extract actual information from the documents - do NOT use placeholder or generic values
- If a career goals document explicitly lists must-haves and want-to-haves, use those directly
- The "short" version is for display in the UI - keep it concise
- The "detailed" version is for company matching - include full context
- For experience, focus on key skills, technologies, industries, and notable achievements
- Be specific in your extractions`;
}

/**
 * CMF Item with short (display) and detailed (matching) versions
 */
interface CMFItem {
  short: string;
  detailed: string;
}

/**
 * Parse and validate the profile extraction response
 * With structured outputs, the response is guaranteed to be valid JSON matching our schema
 */
function parseProfileResponse(responseText: string): {
  name: string;
  targetRole: string;
  targetCompanies: string;
  mustHaves: CMFItem[];
  wantToHave: CMFItem[];
  experience: string[];
} {
  try {
    // With structured outputs, response is guaranteed valid JSON
    const parsed = JSON.parse(responseText) as { name: string; targetRole: string; targetCompanies: string; mustHaves: CMFItem[]; wantToHave: CMFItem[]; experience: string[] };

    // Log extraction results
    console.log('✅ Profile extracted:', {
      name: parsed.name,
      targetRole: parsed.targetRole,
      mustHavesCount: parsed.mustHaves?.length || 0,
      wantToHaveCount: parsed.wantToHave?.length || 0,
      experienceCount: parsed.experience?.length || 0
    });

    // Log sample items for debugging
    if (parsed.mustHaves?.length > 0) {
      console.log('   Sample must-have:', parsed.mustHaves[0]);
    }

    return {
      name: parsed.name,
      targetRole: parsed.targetRole,
      targetCompanies: parsed.targetCompanies,
      mustHaves: parsed.mustHaves,
      wantToHave: parsed.wantToHave,
      experience: parsed.experience
    };
  } catch (error) {
    // This should rarely happen with structured outputs
    console.error('Failed to parse profile extraction response:', error);
    console.error('Raw response:', responseText);
    throw new Error(`Failed to parse profile extraction response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

/**
 * Calculate API cost for Opus 4.5
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  // Claude Opus 4.5 pricing: $5/1M input, $25/1M output
  const inputPrice = 5;
  const outputPrice = 25;

  const inputCost = (inputTokens / 1000000) * inputPrice;
  const outputCost = (outputTokens / 1000000) * outputPrice;
  return inputCost + outputCost;
}
