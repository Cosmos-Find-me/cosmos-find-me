/**
 * Anthropic Messages API helpers for the API routes
 *
 * Current Claude models always think, reject sampling parameters
 * (temperature, top_p, top_k) and may return thinking blocks before the
 * answer, so every route builds and reads requests through these helpers.
 */

import anthropicModels from './anthropic-models.json';

export type AnthropicTask = keyof typeof anthropicModels.tasks;

export const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';

interface ClaudeRequestOptions {
  messages: unknown[];
  maxTokens: number;
  /** JSON schema the answer must follow (structured outputs) */
  schema?: Record<string, unknown>;
}

/** fetch() options for a Messages API call using the task's model and effort */
export function claudeRequest(apiKey: string, task: AnthropicTask, { messages, maxTokens, schema }: ClaudeRequestOptions): RequestInit {
  const { model, effort } = anthropicModels.tasks[task];
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    },
    body: JSON.stringify({
      model,
      // Thinking tokens count toward max_tokens, so callers leave room for them
      max_tokens: maxTokens,
      messages,
      output_config: {
        effort,
        ...(schema ? { format: { type: 'json_schema', schema } } : {})
      }
    })
  };
}

interface ClaudeResponse {
  stop_reason?: string;
  stop_details?: { category?: string | null } | null;
  content?: { type: string; text?: string }[];
}

/** The answer text of a Messages API response, skipping thinking blocks */
export function readClaudeText(data: ClaudeResponse): string {
  if (data.stop_reason === 'refusal') {
    const category = data.stop_details?.category;
    throw new Error(`Claude declined the request${category ? ` (${category})` : ''}`);
  }
  const text = data.content?.find((block) => block.type === 'text')?.text;
  if (!text) {
    throw new Error(`No text in Claude response (stop reason: ${data.stop_reason})`);
  }
  return text;
}

/** Cost in dollars of a call, at the task model's per-million-token rates */
export function claudeCost(task: AnthropicTask, usage: { input_tokens?: number; output_tokens?: number } | undefined): number {
  const { model } = anthropicModels.tasks[task];
  const { input, output } = anthropicModels.models[model as keyof typeof anthropicModels.models];
  return ((usage?.input_tokens || 0) * input + (usage?.output_tokens || 0) * output) / 1_000_000;
}
