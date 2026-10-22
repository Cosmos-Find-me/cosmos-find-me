// @vitest-environment node
/**
 * @testSuite Tailwind Build
 * @description Compiles src/styles/index.css through the project's PostCSS config
 * and checks that utilities used across app/ and src/ are generated. Catches
 * content-path, config and Tailwind major-version regressions.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, resolve } from 'path'
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
    'bg-linear-to-br',
    'from-slate-900',
    'via-blue-900',
    'to-indigo-900',
    'rounded-2xl',
    'shadow-2xl',
    'max-w-md',
    'border-white/20',
    'animate-pulse',
    // used by src/components
    'backdrop-blur-xs',
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

describe('Tailwind v4 source compatibility', () => {
  // Utilities removed in Tailwind v4 that would silently stop styling elements
  const REMOVED = /(?<![\w-])(?:[\w-]+:)*(?:(?:bg|text|border|divide|ring|placeholder)-opacity-\d+|flex-(?:shrink|grow)(?:-\d)?|overflow-ellipsis|decoration-(?:slice|clone))(?![\w-])/g

  const collect = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      if (entry === 'node_modules' || entry === '__tests__') return []
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) return collect(full)
      return /\.(tsx?|css)$/.test(entry) ? [full] : []
    })

  it('never combines transform utilities with an inline transform style', () => {
    // v3 transform utilities were overridden by inline `transform`; v4 uses the
    // separate translate/scale/rotate properties, which stack with it instead
    const TRANSFORM_UTIL = /(?<![\w-])(?:[\w-]+:)*-?(?:translate-[xyz]|scale(?:-[xyz])?|rotate|skew-[xy])-[\w./[\]-]+/
    const tags = (source: string) => {
      const found: string[] = []
      for (let i = source.indexOf('<'); i !== -1; i = source.indexOf('<', i + 1)) {
        if (!/[A-Za-z]/.test(source[i + 1] ?? '')) continue
        let depth = 0
        let j = i + 1
        for (; j < source.length; j++) {
          if (source[j] === '{') depth++
          else if (source[j] === '}') depth--
          else if (source[j] === '>' && depth === 0) break
        }
        found.push(source.slice(i, j + 1))
      }
      return found
    }

    const offenders = [...collect(join(root, 'app')), ...collect(join(root, 'src'))]
      .filter((file) => file.endsWith('.tsx'))
      .flatMap((file) =>
        tags(readFileSync(file, 'utf8'))
          .filter((tag) => /style=\{\{[^}]*\btransform\s*:/.test(tag))
          .map((tag) => tag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/))
          .filter((m): m is RegExpMatchArray => !!m && TRANSFORM_UTIL.test(m[1] ?? m[2]))
          .map((m) => `${relative(root, file)}: ${(m[1] ?? m[2]).match(TRANSFORM_UTIL)![0]}`)
      )

    expect(offenders).toEqual([])
  })

  it('uses no utilities that were removed in Tailwind v4', () => {
    const offenders = [...collect(join(root, 'app')), ...collect(join(root, 'src'))].flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(REMOVED)].map((m) => `${relative(root, file)}: ${m[0]}`)
    )

    expect(offenders).toEqual([])
  })
})
