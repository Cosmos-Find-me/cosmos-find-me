/**
 * @testSuite Supabase Client Factories
 * @description Exercises the real @supabase/ssr and @supabase/supabase-js packages
 * so API changes in either surface as test failures rather than runtime errors.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createClientComponentClient,
  createServerClient,
  createServerComponentClient,
} from '../supabase'

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

describe('Supabase client factories', () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string>> = {}

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
    vi.restoreAllMocks()
  })

  const setEnv = () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
  }

  it('return null when environment variables are missing', () => {
    expect(createClientComponentClient()).toBeNull()
    expect(createServerClient()).toBeNull()
    expect(createServerComponentClient({ cookies: () => ({ getAll: () => [] }) })).toBeNull()
  })

  it('createClientComponentClient returns a browser client with auth and query APIs', () => {
    setEnv()
    const client = createClientComponentClient()

    expect(typeof client?.auth.getSession).toBe('function')
    expect(typeof client?.auth.signInWithPassword).toBe('function')
    expect(typeof client?.from).toBe('function')
  })

  it('createServerClient returns a service-role client with admin APIs', () => {
    setEnv()
    const client = createServerClient()

    expect(typeof client?.auth.admin.listUsers).toBe('function')
    expect(typeof client?.from).toBe('function')
  })

  it('createServerComponentClient reads cookies from the provided store', async () => {
    setEnv()
    const getAll = vi.fn(() => [])
    const client = createServerComponentClient({ cookies: () => ({ getAll }) })

    await client?.auth.getSession()

    expect(getAll).toHaveBeenCalled()
  })
})
