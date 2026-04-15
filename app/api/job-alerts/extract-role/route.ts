import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let targetRole = '';
  try {
    const body = await request.json() as { targetRole?: string };
    targetRole = body.targetRole ?? '';

    if (!targetRole) {
      return NextResponse.json({ keyTerms: ['engineer'] });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Fallback to simple extraction
      return NextResponse.json({
        keyTerms: [extractKeyRoleFallback(targetRole)]
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'structured-outputs-2025-11-13'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Extract 1-2 VERY COMMON and BROAD search keywords for Google Alert job searches. Use only single words or 2-word phrases that are widely used.

Examples:
- "Senior Technical Product Manager" → ["Product"]
- "Group Product Manager to VP" → ["Product", "Director Product"]
- "Staff Software Engineer" → ["Engineer", "Software"]

Job role: "${targetRole}"`
        }],
        output_format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              keyTerms: {
                type: 'array',
                items: { type: 'string' },
                minItems: 1,
                maxItems: 2
              }
            },
            required: ['keyTerms'],
            additionalProperties: false
          }
        }
      })
    });

    if (!response.ok) {
      console.error('Anthropic API error:', response.status);
      return NextResponse.json({
        keyTerms: [extractKeyRoleFallback(targetRole)]
      });
    }

    const data = await response.json() as { content?: Array<{ text?: string }> };
    const responseText = data.content?.[0]?.text?.trim() ?? '';

    // With structured outputs, parse JSON response directly
    try {
      const parsed = JSON.parse(responseText) as { keyTerms?: string[] };
      const keyTerms = parsed.keyTerms ?? [];

      // Fallback if no valid terms extracted
      if (keyTerms.length === 0) {
        return NextResponse.json({
          keyTerms: [extractKeyRoleFallback(targetRole)]
        });
      }

      return NextResponse.json({ keyTerms });
    } catch (parseError) {
      console.error('Failed to parse structured output:', parseError);
      return NextResponse.json({
        keyTerms: [extractKeyRoleFallback(targetRole)]
      });
    }

  } catch (error) {
    console.error('Error extracting role:', error);
    return NextResponse.json({
      keyTerms: [extractKeyRoleFallback(targetRole)]
    });
  }
}

function extractKeyRoleFallback(targetRole: string): string {
  if (!targetRole) return 'engineer';

  // Remove common seniority prefixes
  let simplified = targetRole
    .replace(/\b(Senior|Junior|Lead|Staff|Principal|Group|Head of|VP of|Director of|Chief|Technical)\b/gi, '')
    .trim();

  // Remove content in parentheses
  simplified = simplified.replace(/\([^)]*\)/g, '').trim();

  // Remove common suffixes
  simplified = simplified
    .replace(/\b(Manager|Management|Engineer|Engineering|Developer|Development)\b/gi, '')
    .trim();

  // If we've stripped everything, extract first meaningful word
  if (!simplified) {
    const words = targetRole.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && !['Senior', 'Junior', 'Lead', 'Staff', 'Group'].includes(word)) {
        return word;
      }
    }
    return targetRole;
  }

  return simplified;
}
