/**
 * OpenAI GPT Provider
 *
 * Implementation for OpenAI GPT API integration
 */

import { BaseLLMProvider, CompanyAnalysisRequest, LLMResponse, LLMSettings, CompanyAnalysisResponse } from '../types';

interface OpenAIErrorResponse {
  error?: { message?: string };
}

interface OpenAIMessage {
  content: string;
}

interface OpenAIChoice {
  message?: OpenAIMessage;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
  usage?: OpenAIUsage;
}

export class OpenAIProvider extends BaseLLMProvider {
  private readonly baseUrl = 'http://localhost:3002/api/openai/chat/completions';

  constructor(settings: LLMSettings) {
    super(settings);
  }

  async analyzeCompany(request: CompanyAnalysisRequest): Promise<LLMResponse> {
    try {
      const prompt = this.buildCompanyAnalysisPrompt(request);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          response_format: { type: "json_object" },
          messages: [
            {
              role: 'system',
              content: 'You are a company research assistant. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as OpenAIErrorResponse;
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message ?? 'Unknown error'}`);
      }

      const data = await response.json() as OpenAIResponse;
      const responseText = data.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error('No response content from OpenAI API');
      }

      // Parse the JSON response from GPT
      const companyData = this.parseCompanyResponse(responseText);

      return {
        success: true,
        data: companyData,
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
          totalCost: this.calculateCost(data.usage?.prompt_tokens ?? 0, data.usage?.completion_tokens ?? 0)
        }
      };

    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze company with GPT'
      };
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Note: Direct API calls from browser are blocked by CORS
      // For now, we'll validate the API key format instead
      if (!this.apiKey || !this.apiKey.startsWith('sk-')) {
        console.error('Invalid OpenAI API key format. Should start with "sk-"');
        return false;
      }

      // API key format looks correct
      return true;

      // TODO: In production, this validation should be done through a proxy server

    } catch (error) {
      console.error('OpenAI API validation error:', error);
      return false;
    }
  }

  async estimateCost(prompt: string): Promise<number> {
    // Rough estimation: ~4 chars per token
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = this.maxTokens;
    return this.calculateCost(estimatedInputTokens, estimatedOutputTokens);
  }

  private buildCompanyAnalysisPrompt(request: CompanyAnalysisRequest): string {
    return `Analyze "${request.companyName}" and provide comprehensive company information.

User's Candidate Market Fit (CMF) Criteria:
- Target Role: ${request.userCMF.targetRole}
- Must-Haves: ${request.userCMF.mustHaves.join(', ')}
${request.userCMF.wantToHave?.length ? `- Want-to-Have: ${request.userCMF.wantToHave.join(', ')}` : ''}
${request.userCMF.experience?.length ? `- Experience: ${request.userCMF.experience.join(', ')}` : ''}
${request.userCMF.targetCompanies ? `- Target Companies: ${request.userCMF.targetCompanies}` : ''}

Respond with JSON using this exact structure:

{
  "name": "Company Name",
  "industry": "Primary industry (e.g., AI/ML, Fintech, Gaming, Healthcare)",
  "stage": "Company stage (Early Stage, Late Stage, Public, Mature)",
  "location": "Primary location (e.g., San Francisco, CA)",
  "employees": "Employee range (e.g., ~500, 1000-5000, 10000+)",
  "remote": "Remote policy (Remote-Friendly, Hybrid, In-Office)",
  "openRoles": 15,
  "matchScore": 85,
  "matchReasons": [
    "Specific reason why this company matches user's criteria",
    "Another specific alignment with their requirements",
    "Additional match reason based on their experience"
  ],
  "connections": ["Company1", "Company2", "Company3"],
  "connectionTypes": {
    "Company1": "Direct Competitor",
    "Company2": "Industry Partner",
    "Company3": "Similar Stage"
  },
  "description": "Brief company description focusing on what they do and their mission"
}

Calculate matchScore (0-100) by evaluating:
1. Alignment with must-have criteria (weighted most heavily)
2. Fit with target role and company stage
3. Relevance to experience background
4. Match with want-to-have preferences

Base analysis on real company information.`;
  }

  private parseCompanyResponse(responseText: string): CompanyAnalysisResponse {
    try {
      return JSON.parse(responseText) as CompanyAnalysisResponse;
    } catch (error) {
      console.error('Failed to parse OpenAI response:', responseText);
      throw new Error('Invalid JSON response from OpenAI API');
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Dynamic pricing based on model
    let inputPrice = 2.5;
    let outputPrice = 10;

    if (this.model === 'gpt-5') {
      inputPrice = 1.25;
      outputPrice = 10;
    } else if (this.model === 'gpt-4.5-turbo') {
      inputPrice = 2.5;
      outputPrice = 10;
    } else if (this.model === 'gpt-4o-mini') {
      inputPrice = 0.15;
      outputPrice = 0.6;
    }

    const inputCost = (inputTokens / 1000000) * inputPrice;
    const outputCost = (outputTokens / 1000000) * outputPrice;
    return inputCost + outputCost;
  }
}
