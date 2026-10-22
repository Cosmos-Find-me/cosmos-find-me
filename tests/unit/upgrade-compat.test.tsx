/**
 * @testSuite Upgrade Compatibility
 * @description Characterization tests for third-party packages the app relies on.
 * They exercise the real libraries (not mocks) so a breaking upgrade fails here
 * before it fails in the browser.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'

vi.unmock('cytoscape')

const root = resolve(__dirname, '../..')

const collectTsx = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    if (entry === 'node_modules' || entry === '__tests__') return []
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return collectTsx(full)
    return /\.tsx?$/.test(entry) ? [full] : []
  })

describe('lucide-react', () => {
  it('exports every icon the app imports', async () => {
    const lucide = (await import('lucide-react')) as Record<string, unknown>
    const imported = new Set<string>()
    for (const file of [...collectTsx(join(root, 'src')), ...collectTsx(join(root, 'app'))]) {
      for (const match of readFileSync(file, 'utf8').matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g)) {
        match[1]
          .split(',')
          .map((s) => s.trim().split(/\s+as\s+/)[0])
          .filter((s) => s && !s.startsWith('type '))
          .forEach((name) => imported.add(name))
      }
    }

    expect(imported.size).toBeGreaterThan(0)
    const missing = [...imported].filter((name) => lucide[name] === undefined)
    expect(missing).toEqual([])
  })
})

describe('sonner', () => {
  it('renders the toaster with the data attributes our CSS overrides target', async () => {
    const { Toaster, toast } = await import('sonner')
    render(<Toaster position="top-center" offset="5rem" />)

    act(() => {
      toast.success('Company added')
    })

    expect(await screen.findByText('Company added')).toBeInTheDocument()
    expect(document.querySelector('[data-sonner-toaster][data-y-position="top"][data-x-position="center"]')).not.toBeNull()
  })
})

describe('cytoscape', () => {
  it('builds a headless graph with the selectors and layout the app uses', async () => {
    const { default: cytoscape } = await import('cytoscape')
    const cy = cytoscape({
      headless: true,
      styleEnabled: true,
      elements: [
        { data: { id: 'cmf-center', type: 'cmf' }, position: { x: 0, y: 0 } },
        { data: { id: 'company-1', type: 'company', matchScore: 92 }, position: { x: 100, y: 0 } },
        { data: { id: 'company-2', type: 'company', matchScore: 75 }, position: { x: -100, y: 0 } },
        { data: { id: 'edge-1', source: 'cmf-center', target: 'company-1' } },
      ],
      style: [
        { selector: 'node[type="company"]', style: { width: 40, height: 40 } },
        { selector: '.highlighted', style: { 'border-width': 4 } },
      ],
      layout: { name: 'preset' },
    })

    expect(cy.nodes('[type="company"]').length).toBe(2)
    expect(cy.getElementById('company-1').connectedEdges().length).toBe(1)

    cy.getElementById('company-1').addClass('highlighted')
    expect(cy.$('.highlighted').map((n) => n.id())).toEqual(['company-1'])
    expect(cy.getElementById('company-2').position()).toEqual({ x: -100, y: 0 })

    cy.destroy()
  })
})

describe('uuid', () => {
  it('generates RFC 4122 v4 identifiers', async () => {
    const { v4, validate, version } = await import('uuid')
    const id = v4()

    expect(validate(id)).toBe(true)
    expect(version(id)).toBe(4)
  })
})
