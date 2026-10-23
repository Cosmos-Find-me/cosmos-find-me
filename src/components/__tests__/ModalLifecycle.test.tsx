/**
 * @testSuite Modal open/close lifecycle
 * @description Every modal must start fresh when reopened, and must not leak
 * work from a previous open (object URLs, stale async responses).
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import type { Company, UserCMF } from '../../types'

const llmSettings = vi.hoisted(() => ({
  current: { provider: 'anthropic', model: '', apiKey: 'saved-key', maxTokens: 1500, temperature: 0.7 } as Record<string, unknown>,
}))

vi.mock('../../utils/llm/service', () => ({
  llmService: {
    isConfigured: () => true,
    getSettings: () => ({ ...llmSettings.current }),
    updateSettings: vi.fn(),
    validateApiKey: vi.fn(),
    extractCompanies: vi.fn(),
    analyzeCompany: vi.fn(),
  },
}))

vi.mock('../../utils/ocrService', () => ({
  extractTextFromImage: vi.fn(),
  validateImageFile: () => null,
}))

const { PasteCompanyListModal } = await import('../PasteCompanyListModal')
const { ScreenshotCompanyImportModal } = await import('../ScreenshotCompanyImportModal')
const { default: AddCompanyModal } = await import('../AddCompanyModal')
const { default: LLMSettingsModal } = await import('../LLMSettingsModal')
const { default: JobAlertsModal } = await import('../JobAlertsModal')

const noop = () => {}
const asyncNoop = async () => {}

/** Renders a modal open, lets the test mutate it, then closes and reopens it */
function reopen(ui: (isOpen: boolean) => React.ReactElement) {
  const utils = render(ui(true))
  return {
    ...utils,
    closeAndReopen: () => {
      utils.rerender(ui(false))
      utils.rerender(ui(true))
    },
  }
}

describe('PasteCompanyListModal', () => {
  const ui = (isOpen: boolean) => (
    <PasteCompanyListModal isOpen={isOpen} onClose={noop} onImportCompanies={asyncNoop} existingCompanies={[]} viewMode="explore" />
  )

  it('starts with an empty paste area when reopened', () => {
    const { container, closeAndReopen } = reopen(ui)
    const editable = container.ownerDocument.querySelector('[contenteditable]')!

    fireEvent.paste(editable, {
      clipboardData: { getData: (type: string) => (type === 'text/plain' ? 'Stripe, Figma' : '') },
    })
    expect(screen.getByText('13 characters')).toBeInTheDocument()

    closeAndReopen()

    expect(screen.getByText('0 characters')).toBeInTheDocument()
  })
})

describe('ScreenshotCompanyImportModal', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview-1')
    URL.revokeObjectURL = vi.fn()
  })

  const ui = (isOpen: boolean) => (
    <ScreenshotCompanyImportModal isOpen={isOpen} onClose={noop} onImportCompanies={asyncNoop} existingCompanies={[]} viewMode="explore" />
  )

  it('clears the selected image and releases its object URL on close', () => {
    const { closeAndReopen } = reopen(ui)
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!

    fireEvent.change(input, { target: { files: [new File(['png'], 'shot.png', { type: 'image/png' })] } })
    expect(screen.getByAltText('Screenshot preview')).toBeInTheDocument()

    closeAndReopen()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
    expect(screen.queryByAltText('Screenshot preview')).not.toBeInTheDocument()
  })
})

describe('AddCompanyModal', () => {
  const cmf = { id: 'u', name: 'User', targetRole: '', targetCompanies: '', mustHaves: [], wantToHave: [], experience: [] } as UserCMF
  const ui = (isOpen: boolean) => (
    <AddCompanyModal isOpen={isOpen} onClose={noop} onAddCompany={asyncNoop} userCMF={cmf} existingCompanies={[]} />
  )

  it('focuses the input and suggests popular companies when opened', async () => {
    render(ui(true))

    // getPopularCompanies picks at random, so check the count rather than names
    await waitFor(() => expect(screen.getAllByAltText(/ logo$/)).toHaveLength(4))
    expect(document.activeElement).toBe(screen.getByPlaceholderText('e.g., Airbnb, Figma, Linear'))
  })

  it('clears the company name when reopened', () => {
    const { closeAndReopen } = reopen(ui)
    const input = () => screen.getByPlaceholderText('e.g., Airbnb, Figma, Linear') as HTMLInputElement

    fireEvent.change(input(), { target: { value: 'Figma' } })
    expect(input().value).toBe('Figma')

    closeAndReopen()

    expect(input().value).toBe('')
  })
})

describe('LLMSettingsModal', () => {
  const ui = (isOpen: boolean) => <LLMSettingsModal isOpen={isOpen} onClose={noop} />

  it('fills in the default model for a saved provider without one', () => {
    render(ui(true))

    const modelSelect = screen.getByRole('combobox') as HTMLSelectElement
    expect(modelSelect.value).not.toBe('')
  })

  it('discards unsaved edits when reopened', () => {
    const { closeAndReopen } = reopen(ui)
    const maxTokens = () => screen.getByDisplayValue(/^\d+$/) as HTMLInputElement

    fireEvent.change(maxTokens(), { target: { value: '4000' } })
    expect(maxTokens().value).toBe('4000')

    closeAndReopen()

    expect(maxTokens().value).toBe('1500')
  })
})

describe('JobAlertsModal', () => {
  const company = (name: string) => ({ id: 1, name, careerUrl: `https://${name.toLowerCase()}.com/careers` }) as Company

  it('ignores a stale response when the company changes while loading', async () => {
    const pending: Array<(terms: string[]) => void> = []
    global.fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          pending.push((keyTerms) => resolve({ ok: true, json: async () => ({ keyTerms }) } as Response))
        })
    ) as unknown as typeof fetch

    const { rerender } = render(<JobAlertsModal isOpen onClose={noop} company={company('Stripe')} targetRole="PM" />)
    rerender(<JobAlertsModal isOpen onClose={noop} company={company('Figma')} targetRole="PM" />)

    // Figma's response arrives first, then Stripe's stale one
    await act(async () => pending[1](['figma-term']))
    await act(async () => pending[0](['stripe-term']))

    await waitFor(() => expect(screen.getByText(/site:figma\.com\/careers intitle:figma-term/)).toBeInTheDocument())
    expect(screen.queryByText(/stripe/)).not.toBeInTheDocument()
  })
})
