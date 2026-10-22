// @vitest-environment node
/**
 * @testSuite Tailwind Build
 * @description Compiles src/styles/index.css through the project's PostCSS config
 * and checks that utilities used across app/ and src/ are generated. Catches
 * content-path, config and Tailwind major-version regressions.
 */
import { readFileSync } from 'fs'
import { join, resolve } from 'path'
import postcss from 'postcss'
import { describe, it, expect, beforeAll } from 'vitest'

const root = resolve(__dirname, '../..')
const cssPath = join(root, 'src/styles/index.css')

const escapeClass = (cls: string) => cls.replace(/([:/.[\]%])/g, '\\$1')

let css = ''

beforeAll(async () => {
  const { default: config } = await import(join(root, 'postcss.config.js'))
  const plugins = await Promise.all(
    Object.entries(config.plugins as Record<string, object>).map(async ([name, options]) => {
      const { default: plugin } = await import(name)
      return plugin(options)
    })
  )
  const prevCwd = process.cwd()
  process.chdir(root)
  try {
    const result = await postcss(plugins).process(readFileSync(cssPath, 'utf8'), { from: cssPath })
    css = result.css
  } finally {
    process.chdir(prevCwd)
  }
}, 60_000)

describe('Tailwind build', () => {
  it.each([
    // used by app/layout.tsx and app/login/page.tsx
    'bg-gradient-to-br',
    'from-slate-900',
    'via-blue-900',
    'to-indigo-900',
    'rounded-2xl',
    'shadow-2xl',
    'max-w-md',
    'border-white/20',
    'animate-pulse',
    // used by src/components
    'backdrop-blur-sm',
    'hover:bg-gray-100',
    'w-80',
  ])('generates .%s', (cls) => {
    expect(css).toContain(`.${escapeClass(cls)}`)
  })

  it('keeps the custom overrides from index.css', () => {
    expect(css).toContain('[data-sonner-toaster]')
    expect(css).toContain('.cmf-panel')
  })

  it('applies the preflight reset', () => {
    expect(css).toMatch(/box-sizing:\s*border-box/)
  })
})
