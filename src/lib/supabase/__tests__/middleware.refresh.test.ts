// @vitest-environment node
/**
 * @testSuite Supabase Session Refresh
 * @description Runs updateSession against the real @supabase/ssr client, with only
 * the Auth server stubbed. The proxy must refresh an expired session and hand the
 * new cookies to both the browser and the route handling the request, because the
 * API routes cannot write cookies themselves and refresh tokens are single-use.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { updateSession } from '../middleware'

const SUPABASE_URL = 'https://example.supabase.co'
const COOKIE = 'sb-example-auth-token'

const base64url = (value: string) => Buffer.from(value).toString('base64url')
const fakeJwt = (exp: number) =>
  `${base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64url(
    JSON.stringify({ sub: 'user-1', role: 'authenticated', exp })
  )}.signature`

const now = () => Math.floor(Date.now() / 1000)
const user = { id: 'user-1', aud: 'authenticated', role: 'authenticated', email: 'user@test.dev' }

const session = (accessToken: string, refreshToken: string, expiresAt: number) => ({
  access_token: accessToken,
  refresh_token: refreshToken,
  token_type: 'bearer',
  expires_in: expiresAt - now(),
  expires_at: expiresAt,
  user,
})

const sessionCookie = (value: object) => `base64-${base64url(JSON.stringify(value))}`

const readSession = (cookieValue: string | undefined) =>
  cookieValue ? JSON.parse(Buffer.from(cookieValue.replace(/^base64-/, ''), 'base64url').toString()) : null

// Cookies the route handler will see, as Next forwards them from the proxy
const forwardedCookie = (response: Response, name: string) => {
  const header = response.headers.get('x-middleware-request-cookie') ?? ''
  return header
    .split('; ')
    .map((pair) => pair.split('='))
    .find(([key]) => key === name)?.[1]
}

const authCalls = () => vi.mocked(fetch).mock.calls.map(([url]) => String(url))

describe('updateSession session refresh', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    const refreshed = session(fakeJwt(now() + 3600), 'refresh-2', now() + 3600)
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(refreshed), { status: 200, headers: { 'content-type': 'application/json' } }))
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refreshes an expired session and sends the new tokens to the browser and the route', async () => {
    const expired = session(fakeJwt(now() - 60), 'refresh-1', now() - 60)
    const request = new NextRequest('https://app.test/api/user/data', {
      headers: { cookie: `${COOKIE}=${sessionCookie(expired)}` },
    })

    const response = await updateSession(request)

    expect(authCalls()).toEqual([`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`])
    expect(readSession(response.cookies.get(COOKIE)?.value)?.refresh_token).toBe('refresh-2')
    expect(readSession(forwardedCookie(response, COOKIE))?.refresh_token).toBe('refresh-2')
  })

  it('leaves a valid session alone without calling the Auth server', async () => {
    const valid = session(fakeJwt(now() + 3000), 'refresh-1', now() + 3000)
    const request = new NextRequest('https://app.test/api/logo?domain=example.com', {
      headers: { cookie: `${COOKIE}=${sessionCookie(valid)}` },
    })

    const response = await updateSession(request)

    expect(authCalls()).toEqual([])
    expect(response.cookies.getAll()).toEqual([])
  })

  it('does nothing for signed-out visitors', async () => {
    const response = await updateSession(new NextRequest('https://app.test/login'))

    expect(authCalls()).toEqual([])
    expect(response.cookies.getAll()).toEqual([])
  })
})
