/**
 * LLM Integration Types
 * 
 * Type definitions for multi-provider LLM integration with user-configurable API keys
 */

export type LLMProvider = 'anthropic' | 'openai' | 'google' | 'none';

export interface LLMSettings {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMProviderConfig {
  name: LLMProvider;
  displayName: string;
  models: Array<{
    id: string;
    name: string;
    description: string;
    costPer1MTokens?: { input: number; output: number };
  }>;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  docsUrl: string;
}

export interface CompanyAnalysisRequest {
  companyName: string;
  userCMF: {
    targetRole: string;
    mustHaves: string[];
    wantToHave?: string[];
    experience?: string[];
    targetCompanies?: string;
  };
  isNewUser?: boolean; // Flag to indicate if user has empty CMF profile
  correctionContext?: string; // User-provided correction when LLM description was inaccurate
}

export interface CompanyAnalysisResponse {
  name: string;
  industry: string;
  stage: string;
  location: string;
  employees: string;
  remote: string;
  openRoles: number;
  matchScore: number;
  matchReasons: string[];
  connections: string[];
  connectionTypes: Record<string, string>;
  description?: string;
  careerUrl?: string;
  externalLinks?: {
    website?: string;
    linkedin?: string;
    glassdoor?: string;
    crunchbase?: string;
  };
}

export interface LLMResponse {
  success: boolean;
  data?: CompanyAnalysisResponse;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalCost?: number;
  };
}

export abstract class BaseLLMProvider {
  protected apiKey: string;
  protected model: string;
  protected maxTokens: number;
  protected temperature: number;

  constructor(settings: LLMSettings) {
    this.apiKey = settings.apiKey;
    this.model = settings.model;
    this.maxTokens = settings.maxTokens || 1500;
    this.temperature = settings.temperature || 0.7;
  }

  abstract analyzeCompany(request: CompanyAnalysisRequest): Promise<LLMResponse>;
  abstract validateApiKey(): Promise<boolean>;
  abstract estimateCost(prompt: string): Promise<number>;
}