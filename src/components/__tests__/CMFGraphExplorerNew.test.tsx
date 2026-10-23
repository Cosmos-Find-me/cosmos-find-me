/**
 * @testSuite CMFGraphExplorerNew (live explorer)
 * @description Restoring exploration state from the user profile, switching
 * profiles, and keeping the LLM indicator in sync with settings.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import type { Company, UserExplorationState } from '../../types'

// Render the graph as plain text so tests can read what it was given
vi.mock('next/dynamic', () => ({
  default: () => (props: { companies?: Company[]; selectedCompany?: Company | null; viewMode?: string; onCompanyHover?: unknown }) =>
    // Only the graph takes onCompanyHover; other dynamic components render nothing
    props.onCompanyHover ? (
      <div data-testid="graph">
        <span>mode:{props.viewMode}</span>
        <span>selected:{props.selectedCompany?.name ?? 'none'}</span>
        <span>companies:{props.companies?.map((c) => c.name).join(',')}</span>
      </div>
    ) : null,
}))

const { default: CMFGraphExplorer } = await import('../CMFGraphExplorerNew')
// tests/unit/setup.ts mocks src/data/companies with a CMF and a small company list
const { activeUserProfile, allCompanies } = (await import('../../data/companies')) as unknown as {
  activeUserProfile: UserExplorationState['cmf']
  allCompanies: Company[]
}
const { llmService } = await import('../../utils/llm/service')

const [first, second] = allCompanies
const profile = (overrides: Partial<UserExplorationState> = {}): UserExplorationState => ({
  id: 'user-1',
  name: 'Test User',
  cmf: activeUserProfile,
  baseCompanies: [first, second],
  addedCompanies: [],
  watchlistCompanyIds: [],
  removedCompanyIds: [],
  viewMode: 'explore',
  ...overrides,
})

describe('CMFGraphExplorerNew', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restores the last selected company and view mode from the profile', () => {
    render(<CMFGraphExplorer userProfile={profile({ lastSelectedCompanyId: second.id, viewMode: 'watchlist', watchlistCompanyIds: [second.id] })} />)

    expect(screen.getByText('mode:watchlist')).toBeInTheDocument()
    expect(screen.getByText(`selected:${second.name}`)).toBeInTheDocument()
  })

  it('shows the new profile when the userProfile prop changes', () => {
    const { rerender } = render(<CMFGraphExplorer userProfile={profile({ baseCompanies: [first] })} />)
    expect(screen.getByText(`companies:${first.name}`)).toBeInTheDocument()

    rerender(<CMFGraphExplorer userProfile={profile({ baseCompanies: [second], lastSelectedCompanyId: second.id })} />)

    expect(screen.getByText(`companies:${second.name}`)).toBeInTheDocument()
    expect(screen.getByText(`selected:${second.name}`)).toBeInTheDocument()
  })

  it('shows the LLM indicator when a provider is configured', () => {
    vi.spyOn(llmService, 'isConfigured').mockReturnValue(true)

    render(<CMFGraphExplorer userProfile={profile()} />)

    expect(screen.getByText(/ AI$/)).toBeInTheDocument()
  })

  it('updates the LLM indicator when settings change', () => {
    const isConfigured = vi.spyOn(llmService, 'isConfigured').mockReturnValue(false)
    render(<CMFGraphExplorer userProfile={profile()} />)
    expect(screen.queryByText(/ AI$/)).not.toBeInTheDocument()

    isConfigured.mockReturnValue(true)
    act(() => llmService.clearSettings())

    expect(screen.getByText(/ AI$/)).toBeInTheDocument()
  })
})
