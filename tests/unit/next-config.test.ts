// @vitest-environment node
/**
 * @testSuite Next.js Configuration
 * @description Guards the Next.js 16 conventions: request interception lives in
 * proxy.ts (middleware.ts is deprecated) and next.config.js stays Turbopack-compatible.
 */
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { describe, it, expect } from 'vitest'
// Next's own check for which local images next/image may optimize
import { hasLocalMatch } from 'next/dist/shared/lib/match-local-pattern'

const root = resolve(__dirname, '../..')

describe('Next.js configuration', () => {
  it('uses proxy.ts instead of the deprecated middleware.ts', () => {
    expect(existsSync(join(root, 'proxy.ts'))).toBe(true)
    expect(existsSync(join(root, 'middleware.ts'))).toBe(false)
  })

  it('has no custom webpack hook (Turbopack is the default bundler)', async () => {
    const { default: config } = await import(join(root, 'next.config.js'))

    expect(config.webpack).toBeUndefined()
  })

  it('keeps the PostHog reverse proxy rewrites', async () => {
    const { default: config } = await import(join(root, 'next.config.js'))
    const rewrites = await config.rewrites()

    expect(config.skipTrailingSlashRedirect).toBe(true)
    expect(rewrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' }),
      ])
    )
  })

  describe('local image patterns', () => {
    const allowed = async (src: string) => {
      const { default: config } = await import(join(root, 'next.config.js'))
      // Next 16 applies this default when localPatterns isn't set
      const patterns = config.images.localPatterns ?? [{ pathname: '**', search: '' }]
      return hasLocalMatch(patterns, src)
    }

    it('allows the logo proxy, whose URLs carry a ?domain= query', async () => {
      // Without this, Next 16 crashes the page in dev and returns 400 in production
      expect(await allowed('/api/logo?domain=anthropic.com')).toBe(true)
    })

    it('still allows other local images without a query string', async () => {
      expect(await allowed('/icons/linkedin.svg')).toBe(true)
      expect(await allowed('/_next/static/media/app-preview.png')).toBe(true)
    })

    it('keeps rejecting query strings on other local images', async () => {
      expect(await allowed('/icons/linkedin.svg?v=2')).toBe(false)
    })
  })
})
