// @vitest-environment node
/**
 * @testSuite Anthropic request helpers
 * @description Model selection, request shape and response parsing for the
 * current Claude models (thinking always on, no sampling parameters).
 */
import { describe, it, expect } from 'vitest'
import anthropicModels from '../anthropic-models.json'
import { claudeRequest, readClaudeText, claudeCost, ANTHROPIC_MESSAGES_URL } from '../anthropic'
import { LLM_PROVIDERS, DEFAULT_LLM_SETTINGS, getModelForTask } from '../config'

const CURRENT_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']

describe('anthropic-models.json', () => {
  it('only maps tasks to current Claude models', () => {
    for (const { model } of Object.values(anthropicModels.tasks)) {
      expect(CURRENT_MODELS).toContain(model)
    }
  })

  it('has pricing for every model a task uses', () => {
    for (const { model } of Object.values(anthropicModels.tasks)) {
      expect(anthropicModels.models).toHaveProperty(model)
    }
  })

  it('backs the model list shown in LLM settings', () => {
    const ids = LLM_PROVIDERS.anthropic.models.map((m) => m.id)

    expect(ids).toEqual(Object.keys(anthropicModels.models))
    expect(ids).toContain(DEFAULT_LLM_SETTINGS.model)
  })

  it('keeps getModelForTask working for the routes', () => {
    expect(getModelForTask('PROFILE_EXTRACTION')).toBe('claude-opus-5-5')
    expect(getModelForTask('COMPANY_EXTRACTION')).toBe('claude-sonnet-5-5')
  })
})

describe('claudeRequest', () => {
  const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false }
  const init = claudeRequest('sk-test', 'COMPANY_EXTRACTION', {
    maxTokens: 8000,
    messages: [{ role: 'user', content: 'Hi' }],
    schema,
  })
  const headers = init.headers as Record<string, string>
  const body = JSON.parse(init.body as string)

  it('posts to the Messages API with the key and API version', () => {
    expect(ANTHROPIC_MESSAGES_URL).toBe('https://api.anthropic.com/v1/messages')
    expect(init.method).toBe('POST')
    expect(headers['x-api-key']).toBe('sk-test')
    expect(headers['anthropic-version']).toBe('2023-06-01')
  })

  it("uses the task's model and effort", () => {
    expect(body.model).toBe('claude-sonnet-5-5')
    expect(body.output_config.effort).toBe(anthropicModels.tasks.COMPANY_EXTRACTION.effort)
    expect(body.max_tokens).toBe(8000)
  })

  it('sends structured output through output_config, without the old beta', () => {
    expect(body.output_config.format).toEqual({ type: 'json_schema', schema })
    expect(body).not.toHaveProperty('output_format')
    expect(headers).not.toHaveProperty('anthropic-beta')
  })

  it('never sends sampling parameters, which current models reject', () => {
    expect(body).not.toHaveProperty('temperature')
    expect(body).not.toHaveProperty('top_p')
    expect(body).not.toHaveProperty('top_k')
  })

  it('omits the format when no schema is given', () => {
    const plain = JSON.parse(claudeRequest('k', 'DEFAULT', { maxTokens: 10, messages: [] }).body as string)

    expect(plain.output_config).not.toHaveProperty('format')
  })
})

describe('readClaudeText', () => {
  it('reads the text block that follows a thinking block', () => {
    const data = {
      stop_reason: 'end_turn',
      content: [
        { type: 'thinking', thinking: '', signature: 'sig' },
        { type: 'text', text: '{"ok":true}' },
      ],
    }

    expect(readClaudeText(data)).toBe('{"ok":true}')
  })

  it('throws on a refusal instead of parsing it', () => {
    const data = {
      stop_reason: 'refusal',
      stop_details: { type: 'refusal', category: 'cyber', explanation: 'no' },
      content: [],
    }

    expect(() => readClaudeText(data)).toThrow(/declined/)
  })

  it('throws when there is no text block', () => {
    const data = { stop_reason: 'max_tokens', content: [{ type: 'thinking', thinking: '' }] }

    expect(() => readClaudeText(data)).toThrow(/No text/)
  })
})

describe('claudeCost', () => {
  it("prices tokens at the task model's rates", () => {
    const { input, output } = anthropicModels.models['claude-sonnet-5-5']

    expect(claudeCost('COMPANY_EXTRACTION', { input_tokens: 1_000_000, output_tokens: 1_000_000 })).toBe(input + output)
  })

  it('treats missing usage as zero', () => {
    expect(claudeCost('COMPANY_EXTRACTION', undefined)).toBe(0)
  })
})
