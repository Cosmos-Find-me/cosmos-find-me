// @vitest-environment node
/**
 * @testSuite Supabase Session Middleware
 * @description Verifies that cookies the Supabase client reads and writes flow
 * through the Next.js request/response. Written against both the legacy
 * get/set/remove adapter and the getAll/setAll adapter so it survives
 * @supabase/ssr upgrades.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> }
type CookieAdapter = {
  get?: (name: string) => string | undefined
  set?: (name: string, value: string, options: Record<string, unknown>) => void
  remove?: (name: string, options: Record<string, unknown>) => void
  getAll?: () => { name: string; value: string }[]
  setAll?: (cookies: CookieToSet[]) => void
}

let captured: { url: string; key: string; cookies: CookieAdapter } | null = null

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((url: string, key: string, options: { cookies: CookieAdapter }) => {
    captured = { url, key, cookies: options.cookies }
    return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } }
  }),
}))

const { updateSession } = await import('../middleware')

const readCookie = (adapter: CookieAdapter, name: string) =>
  adapter.getAll ? adapter.getAll().find((c) => c.name === name)?.value : adapter.get?.(name)

const writeCookies = (adapter: CookieAdapter, cookies: CookieToSet[]) => {
  if (adapter.setAll) return adapter.setAll(cookies)
  for (const { name, value, options = {} } of cookies) {
    if (value === '' && adapter.remove) adapter.remove(name, options)
    else adapter.set?.(name, value, options)
  }
}

describe('updateSession', () => {
  beforeEach(() => {
    captured = null
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('creates the Supabase client with the public URL and anon key', async () => {
    await updateSession(new NextRequest('https://app.test/explorer'))

    expect(captured?.url).toBe('https://example.supabase.co')
    expect(captured?.key).toBe('anon-key')
  })

  it('exposes incoming request cookies to the Supabase client', async () => {
    const request = new NextRequest('https://app.test/explorer', {
      headers: { cookie: 'sb-access-token=abc123; other=1' },
    })

    await updateSession(request)

    expect(readCookie(captured!.cookies, 'sb-access-token')).toBe('abc123')
  })

  it('returns a pass-through response when no cookies change', async () => {
    const response = await updateSession(new NextRequest('https://app.test/explorer'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.cookies.getAll()).toEqual([])
  })

  it('forwards cookies written by the Supabase client onto the response', async () => {
    const request = new NextRequest('https://app.test/explorer')
    // Supabase writes cookies while the client is in use, i.e. before updateSession resolves
    const { createServerClient } = await import('@supabase/ssr')
    vi.mocked(createServerClient).mockImplementationOnce(((url: string, key: string, options: { cookies: CookieAdapter }) => {
      captured = { url, key, cookies: options.cookies }
      writeCookies(options.cookies, [{ name: 'sb-refresh', value: 'new-token', options: { path: '/' } }])
      return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } }
    }) as never)

    const response = await updateSession(request)

    expect(response.cookies.get('sb-refresh')?.value).toBe('new-token')
    expect(request.cookies.get('sb-refresh')?.value).toBe('new-token')
  })
})

describe('middleware matcher', () => {
  it('runs on pages and API routes but skips static assets', async () => {
    const { config } = await import('../../../../middleware')
    const matcher = new RegExp(`^${config.matcher[0]}$`)

    for (const path of ['/', '/explorer', '/login', '/api/user/data']) {
      expect(matcher.test(path), path).toBe(true)
    }
    for (const path of ['/_next/static/chunk.js', '/_next/image', '/favicon.ico', '/logo.svg', '/icon-192.png']) {
      expect(matcher.test(path), path).toBe(false)
    }
  })
})
