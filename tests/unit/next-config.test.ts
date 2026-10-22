// @vitest-environment node
/**
 * @testSuite Next.js Configuration
 * @description Guards the Next.js 16 conventions: request interception lives in
 * proxy.ts (middleware.ts is deprecated) and next.config.js stays Turbopack-compatible.
 */
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { describe, it, expect } from 'vitest'

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
})
