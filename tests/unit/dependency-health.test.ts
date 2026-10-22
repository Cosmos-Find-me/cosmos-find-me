/**
 * @testSuite Dependency Health
 * @description Guards against dependency drift: test scripts that hide failures,
 * type packages that don't match their runtime, and runtime deps nobody imports.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { describe, it, expect } from 'vitest'

const root = resolve(__dirname, '../..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const installedVersion = (name: string): string =>
  JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8')).version

const major = (version: string) => Number(version.split('.')[0])

const SOURCE_DIRS = ['app', 'src', 'scripts', 'evals', 'tests', 'config']
const SOURCE_FILES = ['middleware.ts', 'proxy.ts', 'next.config.js', 'vite.config.ts']
const SOURCE_EXT = /\.(ts|tsx|js|jsx|cjs|mjs)$/

const collectSources = (dir: string): string[] => {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries.flatMap((entry) => {
    if (entry === 'node_modules' || entry.startsWith('.')) return []
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return collectSources(full)
    return SOURCE_EXT.test(entry) ? [full] : []
  })
}

const allSource = [
  ...SOURCE_DIRS.flatMap((d) => collectSources(join(root, d))),
  ...SOURCE_FILES.map((f) => join(root, f)).filter((f) => {
    try {
      return statSync(f).isFile()
    } catch {
      return false
    }
  }),
]
  .filter((f) => !f.endsWith('dependency-health.test.ts'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

const isImported = (name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
  return new RegExp(`(from\\s+|import\\s*\\(|require\\s*\\()\\s*['"]${escaped}(/[^'"]*)?['"]`).test(
    allSource
  )
}

describe('Dependency Health', () => {
  it('npm test does not swallow test failures', () => {
    expect(pkg.scripts.test).not.toMatch(/\|\|\s*exit 0/)
  })

  it.each(['@types/react', '@types/react-dom'])('%s major matches the installed react major', (types) => {
    expect(major(installedVersion(types))).toBe(major(installedVersion('react')))
  })

  it('every runtime dependency is imported somewhere', () => {
    // Required by Next.js itself rather than imported by app code
    const implicit = new Set(['react-dom'])
    const unused = Object.keys(pkg.dependencies).filter(
      (name) => !implicit.has(name) && !isImported(name)
    )
    expect(unused).toEqual([])
  })
})
