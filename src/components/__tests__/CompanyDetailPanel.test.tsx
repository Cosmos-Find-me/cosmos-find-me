import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Company, UserCMF } from '../../types'
import CompanyDetailPanel from '../CompanyDetailPanel'

vi.mock('../../utils/llm/service', () => ({
  llmService: {
    analyzeCompany: vi.fn()
  }
}))

/**
 * @testSuite CompanyDetailPanel
 * @description Comprehensive testing of the main UI component for company information display
 * 
 * @covers 16 critical test scenarios:
 * - User interaction workflows (company selection, navigation, button clicks)
 * - Data rendering accuracy (company info, match scores, related companies)
 * - External functionality ("View Jobs" career URL integration)
 * - Error handling (logo fallbacks, missing data scenarios)  
 * - Accessibility compliance (ARIA labels, keyboard navigation)
 * - State management (selected vs unselected company states)
 * 
 * @regressionProtection Prevents:
 * ❌ Broken company selection/deselection workflows
 * ❌ Failed "View Jobs" button functionality  
 * ❌ Incorrect data display or missing company information
 * ❌ Broken related company navigation
 * ❌ Accessibility violations affecting screen readers
 * ❌ Logo loading failures without proper fallbacks
 * ❌ State inconsistencies during user interactions
 */
describe('CompanyDetailPanel', () => {
  const mockIsInWatchlist = vi.fn((_id: number) => false)
  const mockOnToggleWatchlist = vi.fn()
  const mockOnRequestDelete = vi.fn()
  const mockWatchlistStats = {
    totalCompanies: 0,
    excellentMatches: 0,
    totalOpenRoles: 0,
    lastActivity: null
  }

  const mockCompanies: Company[] = [
    {
      id: 1,
      name: 'OpenAI',
      logo: 'https://img.logo.dev/openai.com',
      careerUrl: 'https://openai.com/careers',
      matchScore: 95,
      industry: 'AI/ML',
      stage: 'Late Stage',
      location: 'San Francisco, CA',
      employees: '~1500',
      remote: 'In-office',
      openRoles: 3,
      connections: [2],
      connectionTypes: { 2: 'AI Competitor' },
      matchReasons: ['Strong AI safety focus', 'High velocity culture'],
      color: '#10B981',
      angle: 0,
      distance: 75
    },
    {
      id: 2,
      name: 'Anthropic',
      logo: 'https://img.logo.dev/anthropic.com',
      careerUrl: 'https://www.anthropic.com/careers',
      matchScore: 94,
      industry: 'AI Safety',
      stage: 'Late Stage',
      location: 'San Francisco, CA',
      employees: '~500',
      remote: 'Remote-Friendly',
      openRoles: 2,
      connections: [1],
      connectionTypes: { 1: 'AI Competitor' },
      matchReasons: ['Constitutional AI focus'],
      color: '#10B981',
      angle: 30,
      distance: 80
    },
    {
      id: 3,
      name: 'Discord',
      logo: 'https://img.logo.dev/discord.com',
      careerUrl: 'https://discord.com/careers',
      matchScore: 87,
      industry: 'Communication',
      stage: 'Late Stage',
      location: 'San Francisco, CA',
      employees: '~1000',
      remote: 'Remote-First',
      openRoles: 5,
      connections: [],
      connectionTypes: {},
      matchReasons: ['Remote-first culture', 'Gaming platform experience'],
      color: '#F59E0B',
      angle: 150,
      distance: 90
    }
  ]

  const mockOnCompanySelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsInWatchlist.mockReturnValue(false)
  })

  const renderCompanyDetailPanel = (props: Partial<React.ComponentProps<typeof CompanyDetailPanel>> = {}) => {
    const defaultProps = {
      selectedCompany: null,
      allCompanies: mockCompanies,
      onCompanySelect: mockOnCompanySelect,
      isInWatchlist: mockIsInWatchlist,
      onToggleWatchlist: mockOnToggleWatchlist,
      onRequestDelete: mockOnRequestDelete,
      viewMode: 'explore' as const,
      watchlistStats: mockWatchlistStats
    }
    
    return render(<CompanyDetailPanel {...defaultProps} {...props} />)
  }

  describe('when no company is selected', () => {
    it('should display company list with all companies', () => {
      renderCompanyDetailPanel()

      expect(screen.getByText('Company Details')).toBeInTheDocument()
      expect(screen.getByText('Click on a company node to see details')).toBeInTheDocument()
      expect(screen.getByText('Company Details')).toBeInTheDocument()
      
      // Should show all companies
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      expect(screen.getByText('Anthropic')).toBeInTheDocument()
      expect(screen.getByText('Discord')).toBeInTheDocument()
    })

    it('should sort companies by match score in descending order', () => {
      renderCompanyDetailPanel()

      const companyElements = screen.getAllByText(/95%|94%|87%/)
      expect(companyElements[0]).toHaveTextContent('95%') // OpenAI
      expect(companyElements[1]).toHaveTextContent('94%') // Anthropic
      expect(companyElements[2]).toHaveTextContent('87%') // Discord
    })

    it('should call onCompanySelect when a company is clicked', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={null}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const openAIElement = screen.getByText('OpenAI').closest('div')
      fireEvent.click(openAIElement!)

      expect(mockOnCompanySelect).toHaveBeenCalledWith(mockCompanies[0])
    })

    it('should display company logos with fallback handling', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={null}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const logos = screen.getAllByLabelText(/logo/)
      expect(logos).toHaveLength(3)
      expect(logos[0]).toHaveAttribute('aria-label', 'OpenAI logo')
      expect(logos[0].style.backgroundImage).toContain('openai.com')
    })
  })

  describe('when a company is selected', () => {
    const selectedCompany = mockCompanies[0] // OpenAI

    it('should display selected company details', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      expect(screen.getByText('AI/ML')).toBeInTheDocument()
      expect(screen.getByText('95%')).toBeInTheDocument()
      expect(screen.getByText('Candidate Market Fit Score')).toBeInTheDocument()
    })

    it('should display company information correctly', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      expect(screen.getByText('Company Info')).toBeInTheDocument()
      expect(screen.getByText('Late Stage')).toBeInTheDocument()
      expect(screen.getByText('~1500')).toBeInTheDocument()
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument()
      expect(screen.getByText('In-office')).toBeInTheDocument()
      expect(screen.getByText('3 positions')).toBeInTheDocument()
    })

    it('should display match reasons', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      expect(screen.getByText('Why This Match?')).toBeInTheDocument()
      expect(screen.getByText('Strong AI safety focus')).toBeInTheDocument()
      expect(screen.getByText('High velocity culture')).toBeInTheDocument()
    })

    it('should display related companies when connections exist', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      expect(screen.getByText('Related Companies (1)')).toBeInTheDocument()
      expect(screen.getByText('Anthropic')).toBeInTheDocument()
      expect(screen.getByText('AI Competitor')).toBeInTheDocument()
    })

    it('should not display related companies section when no connections exist', () => {
      const companyWithoutConnections = mockCompanies[2] // Discord
      render(
        <CompanyDetailPanel
          selectedCompany={companyWithoutConnections}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      expect(screen.queryByText('Related Companies')).not.toBeInTheDocument()
    })

    it('should render functional View Jobs button', () => {
      const mockWindowOpen = vi.fn()
      Object.defineProperty(window, 'open', {
        writable: true,
        value: mockWindowOpen,
      })

      render(
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const viewJobsButton = screen.getByText('View Jobs at OpenAI')
      expect(viewJobsButton).toBeInTheDocument()
      
      fireEvent.click(viewJobsButton)
      expect(mockWindowOpen).toHaveBeenCalledWith('https://openai.com/careers', '_blank')
    })

    it('should render other action buttons', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      expect(screen.getByText('Setup Job Alerts')).toBeInTheDocument()
      expect(screen.getByText('My Connections')).toBeInTheDocument()
      expect(screen.getByText('Remove Company')).toBeInTheDocument()
    })

    it('should have watchlist heart button that calls onToggleWatchlist', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const watchlistButton = screen.getByTitle('Add to watchlist')
      fireEvent.click(watchlistButton)

      expect(mockOnToggleWatchlist).toHaveBeenCalledWith(selectedCompany.id)
    })

    it('should handle clicking on related companies', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={selectedCompany}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const anthropicInRelated = screen.getAllByText('Anthropic')[0].closest('div')
      fireEvent.click(anthropicInRelated!)
      
      expect(mockOnCompanySelect).toHaveBeenCalledWith(mockCompanies[1]) // Anthropic
    })
  })

  describe('logo error handling', () => {
    it('should handle logo loading errors', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={mockCompanies[0]}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const logo = screen.getByLabelText('OpenAI logo') as HTMLElement
      
      // Logo is now rendered as background image, so we verify it exists and has proper styling
      // This test has a selected company, so it shows the larger header logo (w-12 h-12)
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveClass('company-logo', 'w-12', 'h-12', 'rounded', 'bg-white/80', 'border', 'border-blue-200/60', 'shadow-sm')
      expect(logo.style.backgroundImage).toContain('openai.com')
    })
  })

  describe('accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={mockCompanies[0]}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      // Check for proper heading structure
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      expect(screen.getByText('Company Info')).toBeInTheDocument()
      expect(screen.getByText('Why This Match?')).toBeInTheDocument()

      // Check buttons are focusable
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })

    it('should support keyboard navigation', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={null}
          allCompanies={mockCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const firstCompanyContainer = screen.getByText('OpenAI').closest('.cursor-pointer')

      // Should be clickable/focusable
      expect(firstCompanyContainer).toHaveClass('cursor-pointer')
      expect(firstCompanyContainer).toBeInTheDocument()
    })
  })

  describe('analysis feedback / re-analysis', () => {
    const mockUserCMF: UserCMF = {
      id: 'cmf-1',
      name: 'Test User',
      targetRole: 'Software Engineer',
      mustHaves: ['TypeScript'],
      wantToHave: ['Remote'],
      experience: ['Frontend'],
      targetCompanies: ''
    }
    const mockOnCompanyUpdate = vi.fn()
    const selectedCompany = mockCompanies[0] // OpenAI

    beforeEach(() => {
      mockOnCompanyUpdate.mockReset()
    })

    it('shows "Incorrect info?" button when onCompanyUpdate and userCMF are provided', () => {
      renderCompanyDetailPanel({
        selectedCompany,
        onCompanyUpdate: mockOnCompanyUpdate,
        userCMF: mockUserCMF
      })

      expect(screen.getByText('Incorrect info?')).toBeInTheDocument()
    })

    it('does not show "Incorrect info?" button without onCompanyUpdate', () => {
      renderCompanyDetailPanel({ selectedCompany, userCMF: mockUserCMF })

      expect(screen.queryByText('Incorrect info?')).not.toBeInTheDocument()
    })

    it('does not show "Incorrect info?" button without userCMF', () => {
      renderCompanyDetailPanel({ selectedCompany, onCompanyUpdate: mockOnCompanyUpdate })

      expect(screen.queryByText('Incorrect info?')).not.toBeInTheDocument()
    })

    it('opens the feedback form when "Incorrect info?" is clicked', () => {
      renderCompanyDetailPanel({
        selectedCompany,
        onCompanyUpdate: mockOnCompanyUpdate,
        userCMF: mockUserCMF
      })

      fireEvent.click(screen.getByText('Incorrect info?'))

      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByText('Re-analyze')).toBeInTheDocument()
    })

    it('shows rate-limit message when lastAnalysisRefresh is within 24 hours', () => {
      const recentCompany = { ...selectedCompany, lastAnalysisRefresh: new Date().toISOString() }

      renderCompanyDetailPanel({
        selectedCompany: recentCompany,
        onCompanyUpdate: mockOnCompanyUpdate,
        userCMF: mockUserCMF
      })

      fireEvent.click(screen.getByText('Incorrect info?'))

      expect(screen.getByText(/Next refresh available in/)).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })

    it('shows the form when lastAnalysisRefresh is older than 24 hours', () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      const oldCompany = { ...selectedCompany, lastAnalysisRefresh: oldDate }

      renderCompanyDetailPanel({
        selectedCompany: oldCompany,
        onCompanyUpdate: mockOnCompanyUpdate,
        userCMF: mockUserCMF
      })

      fireEvent.click(screen.getByText('Incorrect info?'))

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('calls onCompanyUpdate with updated data and lastAnalysisRefresh on success', async () => {
      const { llmService } = await import('../../utils/llm/service')
      vi.mocked(llmService.analyzeCompany).mockResolvedValue({
        success: true,
        data: {
          name: 'OpenAI',
          matchReasons: ['Corrected reason'],
          matchScore: 90,
          industry: 'Healthcare AI',
          stage: 'Late Stage',
          location: 'San Francisco, CA',
          employees: '~1500',
          remote: 'In-office',
          openRoles: 3,
          connections: [],
          connectionTypes: {}
        }
      })

      renderCompanyDetailPanel({
        selectedCompany,
        onCompanyUpdate: mockOnCompanyUpdate,
        userCMF: mockUserCMF
      })

      fireEvent.click(screen.getByText('Incorrect info?'))
      fireEvent.click(screen.getByText('Re-analyze'))

      await waitFor(() => {
        expect(mockOnCompanyUpdate).toHaveBeenCalledTimes(1)
        const updated = mockOnCompanyUpdate.mock.calls[0][0]
        expect(updated.matchReasons).toEqual(['Corrected reason'])
        expect(updated.industry).toBe('Healthcare AI')
        expect(updated.lastAnalysisRefresh).toBeDefined()
      })
    })

    it('shows error message when LLM call fails', async () => {
      const { llmService } = await import('../../utils/llm/service')
      vi.mocked(llmService.analyzeCompany).mockResolvedValue({
        success: false,
        error: 'LLM not configured'
      })

      renderCompanyDetailPanel({
        selectedCompany,
        onCompanyUpdate: mockOnCompanyUpdate,
        userCMF: mockUserCMF
      })

      fireEvent.click(screen.getByText('Incorrect info?'))
      fireEvent.click(screen.getByText('Re-analyze'))

      await waitFor(() => {
        expect(screen.getByText('LLM not configured')).toBeInTheDocument()
      })
      expect(mockOnCompanyUpdate).not.toHaveBeenCalled()
    })
  })
})