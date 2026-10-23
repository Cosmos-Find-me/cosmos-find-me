import { NextResponse } from 'next/server';
import { getModelForTask } from '@/utils/llm/config';
import { ANTHROPIC_VERSION } from '@/utils/llm/anthropic';

export async function POST() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ valid: false, error: 'API key not configured' });
    }

    // Looking up a model checks the key (and that the model is available) without spending tokens
    const response = await fetch(`https://api.anthropic.com/v1/models/${getModelForTask('API_VALIDATION')}`, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      }
    });

    return NextResponse.json({ valid: response.ok });

  } catch (error) {
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
