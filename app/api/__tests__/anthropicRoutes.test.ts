// @vitest-environment node
/**
 * @testSuite Anthropic API routes
 * @description Every route that calls Claude must use a current model, send no
 * sampling parameters, and read the answer even when thinking comes first.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

import { POST as analyze } from '../llm/anthropic/analyze/route'
import { POST as extractCompanies } from '../llm/anthropic/extract-companies/route'
import { POST as extractProfile } from '../llm/anthropic/extract-profile/route'
import { POST as enrichCompanies } from '../llm/anthropic/enrich-companies/route'
import { POST as validate } from '../llm/anthropic/validate/route'
import { POST as extractRole } from '../job-alerts/extract-role/route'

const CURRENT_MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5']

/** Anthropic's answer: a thinking block (empty under display "omitted") then the JSON text */
const claudeReply = (json: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({
    stop_reason: 'end_turn',
    content: [
      { type: 'thinking', thinking: '', signature: 'sig' },
      { type: 'text', text: JSON.stringify(json) },
    ],
    usage: { input_tokens: 100, output_tokens: 50 },
  }),
})

let fetchMock: ReturnType<typeof vi.fn>

/** Makes Anthropic return `json`; any other URL (e.g. Perplexity) fails */
function answerWith(json: unknown) {
  fetchMock = vi.fn(async (url: string) =>
    String(url).startsWith('https://api.anthropic.com/') ? claudeReply(json) : { ok: false, status: 500, json: async () => ({}) }
  )
  global.fetch = fetchMock as unknown as typeof fetch
}

const post = (body: unknown) =>
  new NextRequest('http://localhost/api', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

/** The body of the Messages API call the route made */
function sentToClaude() {
  const call = fetchMock.mock.calls.find(([url]) => url === 'https://api.anthropic.com/v1/messages')
  expect(call, 'route should call the Messages API').toBeDefined()
  return JSON.parse(call![1].body)
}

function expectCurrentRequestShape(body: Record<string, unknown>) {
  expect(CURRENT_MODELS).toContain(body.model)
  expect(body).not.toHaveProperty('temperature')
  expect(body).not.toHaveProperty('output_format')
  expect(body.output_config).toHaveProperty('effort')
}

const cmf = {
  id: 'u',
  name: 'Ada',
  targetRole: 'Product Manager',
  targetCompanies: 'Startups',
  mustHaves: ['Remote'],
  wantToHave: ['AI'],
  experience: ['PM'],
}

describe('Anthropic routes', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('extract-companies parses the answer after the thinking block', async () => {
    answerWith({ companies: [{ name: 'Stripe', url: 'https://stripe.com' }] })

    const res = await extractCompanies(post({ text: 'Stripe is hiring' }))

    expect(await res.json()).toMatchObject({ success: true, companies: [{ name: 'Stripe', url: 'https://stripe.com' }] })
    expectCurrentRequestShape(sentToClaude())
  })

  it('analyze sends a current request', async () => {
    answerWith({
      name: 'Stripe', industry: 'Fintech', stage: 'Late', location: 'SF', employees: '8000', remote: 'Hybrid',
      openRoles: 10, matchScore: 80, matchReasons: [], connections: [], description: 'Payments', websiteUrl: 'https://stripe.com',
    })

    const res = await analyze(post({ request: { companyName: 'Stripe', userCMF: cmf } }))

    expect(await res.json()).toMatchObject({ success: true, data: { name: 'Stripe' } })
    expectCurrentRequestShape(sentToClaude())
  })

  it('enrich-companies sends a current request', async () => {
    answerWith({ enrichments: [{ id: 1, matchScore: 90, matchReasons: ['Fit'], connections: [], connectionTypes: [] }] })

    const res = await enrichCompanies(post({ cmf, companies: [{ id: 1, name: 'Stripe' }] }))

    expect(await res.json()).toMatchObject({ success: true, enrichments: [{ id: 1, matchScore: 90 }] })
    expectCurrentRequestShape(sentToClaude())
  })

  it('extract-profile sends a current request', async () => {
    answerWith({})
    const doc = (text: string) => ({ name: 'doc.txt', type: 'text/plain', data: Buffer.from(text).toString('base64') })

    await extractProfile(post({ resume: doc('My resume'), careerGoals: doc('My goals') }))

    expectCurrentRequestShape(sentToClaude())
  })

  it('job alerts use Claude, not the retired 3.5 Haiku', async () => {
    answerWith({ keyTerms: ['Product'] })

    const res = await extractRole(post({ targetRole: 'Group Product Manager' }))

    expect(await res.json()).toEqual({ keyTerms: ['Product'] })
    expectCurrentRequestShape(sentToClaude())
  })

  it('job alerts keep at most 2 terms without maxItems, which structured outputs rejects', async () => {
    answerWith({ keyTerms: ['Product', 'Director Product', 'Management'] })

    const res = await extractRole(post({ targetRole: 'Group Product Manager to VP' }))

    expect(await res.json()).toEqual({ keyTerms: ['Product', 'Director Product'] })
    expect(JSON.stringify(sentToClaude().output_config.format)).not.toContain('maxItems')
  })

  it('job alerts fall back to the local extraction when Claude declines', async () => {
    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ stop_reason: 'refusal', stop_details: { category: null }, content: [] }),
    }))
    global.fetch = fetchMock as unknown as typeof fetch

    const res = await extractRole(post({ targetRole: 'Senior Data Scientist' }))

    expect(await res.json()).toEqual({ keyTerms: ['Data Scientist'] })
  })

  it('validate checks the key against the Models API without spending tokens', async () => {
    fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'claude-haiku-5-5' }) }))
    global.fetch = fetchMock as unknown as typeof fetch

    const res = await validate()

    expect(await res.json()).toEqual({ valid: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/^https:\/\/api\.anthropic\.com\/v1\/models\/claude-/)
    expect(init.headers['x-api-key']).toBe('sk-test')
  })
})
