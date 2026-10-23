import { useSyncExternalStore } from 'react';
import { llmService } from '../utils/llm/service';

/**
 * Whether an LLM provider is configured, kept in sync with settings changes.
 *
 * Renders false on the server (settings live in localStorage), then the real
 * value on the client without a hydration mismatch.
 */
export function useLLMConfigured(): boolean {
  return useSyncExternalStore(
    llmService.subscribe,
    () => llmService.isConfigured(),
    () => false
  );
}
