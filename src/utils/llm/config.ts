/**
 * LLM Provider Configurations
 * 
 * Configuration details for supported LLM providers
 */

import { LLMProviderConfig } from './types';
import anthropicModels from './anthropic-models.json';
import type { AnthropicTask } from './anthropic';

// Model IDs, effort levels and prices live in anthropic-models.json,
// which server/server.js also reads
export const ANTHROPIC_MODELS = {
  OPUS: 'claude-opus-5-5',
  SONNET: 'claude-sonnet-5-5',
  HAIKU: 'claude-haiku-5-5'
} as const;

// Default model for API calls (general purpose)
export const DEFAULT_ANTHROPIC_MODEL = ANTHROPIC_MODELS.SONNET;

/**
 * Task-based model selection
 *
 * Opus handles complex document understanding, Sonnet everyday analysis and
 * extraction, Haiku quick lookups. See anthropic-models.json.
 */
export const TASK_MODELS = Object.fromEntries(
  Object.entries(anthropicModels.tasks).map(([task, { model }]) => [task, model])
) as Record<AnthropicTask, string>;

export type TaskType = AnthropicTask;

/**
 * Get the model ID for a specific task
 */
export function getModelForTask(task: TaskType): string {
  return TASK_MODELS[task] || TASK_MODELS.DEFAULT;
}

export const LLM_PROVIDERS: Record<string, LLMProviderConfig> = {
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic Claude',
    models: Object.entries(anthropicModels.models).map(([id, { name, description, input, output }]) => ({
      id,
      name,
      description,
      costPer1MTokens: { input, output }
    })),
    apiKeyLabel: 'Anthropic API Key',
    apiKeyPlaceholder: 'sk-ant-api03-...',
    docsUrl: 'https://docs.anthropic.com/en/api/getting-started'
  },
  
  openai: {
    name: 'openai',
    displayName: 'OpenAI GPT',
    models: [
      {
        id: 'gpt-5',
        name: 'GPT-5',
        description: 'Latest breakthrough model with exceptional capabilities',
        costPer1MTokens: { input: 1.25, output: 10 }
      },
      {
        id: 'gpt-4.5-turbo',
        name: 'GPT-4.5 Turbo',
        description: 'Enhanced GPT-4 with faster response times',
        costPer1MTokens: { input: 2.5, output: 10 }
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Multimodal model with strong reasoning',
        costPer1MTokens: { input: 2.5, output: 10 }
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Affordable model for everyday tasks',
        costPer1MTokens: { input: 0.15, output: 0.6 }
      }
    ],
    apiKeyLabel: 'OpenAI API Key',
    apiKeyPlaceholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/docs/quickstart'
  },
  
  google: {
    name: 'google',
    displayName: 'Google Gemini',
    models: [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Latest high-performance model with advanced reasoning',
        costPer1MTokens: { input: 1.25, output: 5 }
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Proven model with long context and strong performance',
        costPer1MTokens: { input: 1.25, output: 5 }
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient for quick tasks',
        costPer1MTokens: { input: 0.075, output: 0.3 }
      }
    ],
    apiKeyLabel: 'Google AI API Key',
    apiKeyPlaceholder: 'AIza...',
    docsUrl: 'https://ai.google.dev/gemini-api/docs/quickstart'
  }
};

export const DEFAULT_LLM_SETTINGS = {
  provider: 'anthropic' as const,
  apiKey: 'backend-configured',
  model: DEFAULT_ANTHROPIC_MODEL,
  maxTokens: 1500,
  temperature: 0.7
};