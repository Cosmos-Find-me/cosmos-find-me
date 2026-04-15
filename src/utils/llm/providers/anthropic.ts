/**
 * Anthropic Claude Provider
 *
 * Implementation for Anthropic Claude API integration
 */

import { BaseLLMProvider, CompanyAnalysisRequest, LLMResponse, LLMSettings } from '../types';

interface ErrorResponse {
  error?: string;
}

interface ValidateResponse {
  valid: boolean;
}

export class AnthropicProvider extends BaseLLMProvider {
  private readonly baseUrl = '/api/llm/anthropic';

  constructor(settings: LLMSettings) {
    super(settings);
  }

  async analyzeCompany(request: CompanyAnalysisRequest): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as ErrorResponse;
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json() as LLMResponse;

    } catch (error) {
      console.error('Anthropic API error:', error);

      // Handle connection refused or network errors gracefully
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ECONNREFUSED')) {
        return {
          success: false,
          error: 'LLM backend server not available - using fallback company data'
        };
      }

      return {
        success: false,
        error: `Claude API error: ${errorMessage}`
      };
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json() as ValidateResponse;
      return result.valid;

    } catch (error) {
      console.error('API key validation error:', error);
      // Always return false when backend is not available
      return false;
    }
  }

  async estimateCost(prompt: string): Promise<number> {
    // Rough estimation: ~4 chars per token
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = this.maxTokens;
    return this.calculateCost(estimatedInputTokens, estimatedOutputTokens);
  }



  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Dynamic pricing based on model - default to Claude 4 Sonnet pricing
    let inputPrice = 3;
    let outputPrice = 15;

    if (this.model.includes('haiku')) {
      inputPrice = 1;
      outputPrice = 5;
    }

    const inputCost = (inputTokens / 1000000) * inputPrice;
    const outputCost = (outputTokens / 1000000) * outputPrice;
    return inputCost + outputCost;
  }
}
