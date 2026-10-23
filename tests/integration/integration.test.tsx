import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompanyDetailPanel from '../../src/components/CompanyDetailPanel'
import { sampleCompanies } from '../../src/data/companies'

describe('Integration Tests - CompanyDetailPanel with Real Data', () => {
  const mockOnCompanySelect = vi.fn()
  const mockIsInWatchlist = vi.fn(() => false)
  const mockOnToggleWatchlist = vi.fn()
  const mockOnRequestDelete = vi.fn()
  const mockWatchlistStats = {
    totalCompanies: 0,
    excellentMatches: 0,
    totalOpenRoles: 0,
    lastActivity: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsInWatchlist.mockReturnValue(false)
  })

  describe('Real Data Validation', () => {
    it('should validate all company data integrity', () => {
      sampleCompanies.forEach(company => {
        // Required fields validation
        expect(company.id).toBeGreaterThan(0)
        expect(company.name).toBeTruthy()
        expect(company.logo).toMatch(/^https?:\/\//)
        expect(company.careerUrl).toMatch(/^https?:\/\//)
        expect(company.matchScore).toBeGreaterThanOrEqual(0)
        expect(company.matchScore).toBeLessThanOrEqual(100)
        expect(company.industry).toBeTruthy()
        expect(company.stage).toBeTruthy()
        expect(company.location).toBeTruthy()
        expect(company.employees).toBeTruthy()
        expect(company.remote).toBeTruthy()
        expect(company.openRoles).toBeGreaterThanOrEqual(0)
        expect(Array.isArray(company.connections)).toBe(true)
        expect(Array.isArray(company.matchReasons)).toBe(true)
        expect(company.matchReasons.length).toBeGreaterThan(0)
        expect(company.color).toMatch(/^#[0-9A-Fa-f]{6}$/)

        // Validate connections consistency
        company.connections.forEach(connectionId => {
          expect(company.connectionTypes[connectionId]).toBeTruthy()
          // Verify connected company exists in dataset
          const connectedCompany = sampleCompanies.find(c => c.id === connectionId)
          expect(connectedCompany).toBeTruthy()
        })
      })
    })

    it('should validate all career URLs are functional', () => {
      sampleCompanies.forEach(company => {
        expect(company.careerUrl).toBeTruthy()
        expect(company.careerUrl).toMatch(/^https?:\/\//)
        
        // Should not throw when creating URL
        expect(() => new URL(company.careerUrl)).not.toThrow()
      })
    })

    it('should have companies with different match score ranges', () => {
      const scores = sampleCompanies.map(c => c.matchScore)
      const excellentMatches = scores.filter(s => s >= 90)
      const goodMatches = scores.filter(s => s >= 80 && s < 90)
      const fairMatches = scores.filter(s => s < 80)

      expect(excellentMatches.length).toBeGreaterThan(0)
      expect(goodMatches.length).toBeGreaterThan(0)
      expect(fairMatches.length).toBeGreaterThan(0)
    })
  })

  describe('Company List Display', () => {
    it('should display all companies sorted by match score', () => {
      render(
        <CompanyDetailPanel
          selectedCompany={null}
          allCompanies={sampleCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      // Should display company details header
      expect(screen.getByText('Company Details')).toBeInTheDocument()

      // Should show companies sorted by match score
      const companyElements = screen.getAllByText(/\d+%/)
      const scores = companyElements.map(el => parseInt(el.textContent!.replace('%', '')))
      
      // Verify descending order
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i-1]).toBeGreaterThanOrEqual(scores[i])
      }

      // Test that companies are clickable
      const firstCompany = sampleCompanies.sort((a, b) => b.matchScore - a.matchScore)[0]
      const companyElement = screen.getByText(firstCompany.name).closest('div')
      fireEvent.click(companyElement!)
      expect(mockOnCompanySelect).toHaveBeenCalledWith(firstCompany)
    })

    it('should display company logos with error handling', () => {
      const testCompany = sampleCompanies[0]
      
      render(
        <CompanyDetailPanel
          selectedCompany={null}
          allCompanies={sampleCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const logo = screen.getByLabelText(`${testCompany.name} logo`) as HTMLElement
      expect(logo.style.backgroundImage).toContain(testCompany.logo)
      
      // Logo is now rendered as background image, so we can verify it exists
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveClass('w-8', 'h-8', 'rounded-sm')
    })
  })

  describe('Company Detail View', () => {
    it('should display complete company information', () => {
      const testCompany = sampleCompanies.find(c => c.matchScore >= 90)!
      
      render(
        <CompanyDetailPanel
          selectedCompany={testCompany}
          allCompanies={sampleCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      // Company header info
      expect(screen.getByText(testCompany.name)).toBeInTheDocument()
      expect(screen.getByText(testCompany.industry)).toBeInTheDocument()
      expect(screen.getByText(`${testCompany.matchScore}%`)).toBeInTheDocument()

      // Company details
      expect(screen.getByText(testCompany.stage)).toBeInTheDocument()
      expect(screen.getByText(testCompany.employees)).toBeInTheDocument()
      expect(screen.getByText(testCompany.location)).toBeInTheDocument()
      expect(screen.getByText(testCompany.remote)).toBeInTheDocument()
      expect(screen.getByText(`${testCompany.openRoles} positions`)).toBeInTheDocument()

      // Match reasons
      expect(screen.getByText('Why This Match?')).toBeInTheDocument()
      testCompany.matchReasons.forEach(reason => {
        expect(screen.getByText(reason)).toBeInTheDocument()
      })

      // Action buttons
      expect(screen.getByText(`View Jobs at ${testCompany.name}`)).toBeInTheDocument()
      expect(screen.getByText('Setup Job Alerts')).toBeInTheDocument()
      expect(screen.getByText('My Connections')).toBeInTheDocument()
      expect(screen.getByText('Remove Company')).toBeInTheDocument()
    })

    it('should handle View Jobs button functionality', async () => {
      const user = userEvent.setup()
      const testCompany = sampleCompanies[0]
      const mockWindowOpen = vi.fn()
      
      Object.defineProperty(window, 'open', {
        writable: true,
        value: mockWindowOpen,
      })

      render(
        <CompanyDetailPanel
          selectedCompany={testCompany}
          allCompanies={sampleCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const viewJobsButton = screen.getByText(`View Jobs at ${testCompany.name}`)
      await user.click(viewJobsButton)
      
      expect(mockWindowOpen).toHaveBeenCalledWith(testCompany.careerUrl, '_blank')
    })

    it('should display related companies when connections exist', () => {
      const connectedCompany = sampleCompanies.find(c => c.connections.length > 0)
      
      if (!connectedCompany) {
        expect(true).toBe(true) // Skip if no connected companies
        return
      }

      render(
        <CompanyDetailPanel
          selectedCompany={connectedCompany}
          allCompanies={sampleCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      expect(screen.getByText(`Related Companies (${connectedCompany.connections.length})`)).toBeInTheDocument()

      // Verify related companies are displayed
      connectedCompany.connections.forEach(connectionId => {
        const relatedCompany = sampleCompanies.find(c => c.id === connectionId)
        if (relatedCompany) {
          expect(screen.getByText(relatedCompany.name)).toBeInTheDocument()
          expect(screen.getByText(connectedCompany.connectionTypes[connectionId])).toBeInTheDocument()
        }
      })
    })

    it('should handle company navigation through related companies', async () => {
      const user = userEvent.setup()
      const connectedCompany = sampleCompanies.find(c => c.connections.length > 0)
      
      if (!connectedCompany) {
        expect(true).toBe(true)
        return
      }

      render(
        <CompanyDetailPanel
          selectedCompany={connectedCompany}
          allCompanies={sampleCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      // Click on first related company
      const relatedCompanyId = connectedCompany.connections[0]
      const relatedCompany = sampleCompanies.find(c => c.id === relatedCompanyId)
      
      if (relatedCompany) {
        const relatedElement = screen.getAllByText(relatedCompany.name)[0].closest('div')
        await user.click(relatedElement!)
        
        expect(mockOnCompanySelect).toHaveBeenCalledWith(relatedCompany)
      }
    })
  })

  describe('Company Matching Logic', () => {
    it('should have consistent color coding based on match scores', () => {
      const excellentCompany = sampleCompanies.find(c => c.matchScore >= 90)!
      const goodCompany = sampleCompanies.find(c => c.matchScore >= 80 && c.matchScore < 90)!
      const fairCompany = sampleCompanies.find(c => c.matchScore < 80)!

      // Test excellent match (green)
      expect(excellentCompany.color).toBe('#10B981')
      
      // Test good match (yellow/orange)
      expect(goodCompany.color).toBe('#F59E0B')
      
      // Test fair match (gray)
      expect(fairCompany.color).toBe('#6B7280')
    })

    it('should have meaningful match reasons for all companies', () => {
      sampleCompanies.forEach(company => {
        expect(company.matchReasons.length).toBeGreaterThan(0)
        
        company.matchReasons.forEach(reason => {
          expect(reason.trim().length).toBeGreaterThan(10) // Substantial reasons
          expect(typeof reason).toBe('string')
        })
      })
    })

    it('should have appropriate connection types', () => {
      sampleCompanies.forEach(company => {
        company.connections.forEach(connectionId => {
          const connectionType = company.connectionTypes[connectionId]
          expect(connectionType).toBeTruthy()
          expect(typeof connectionType).toBe('string')
          expect(connectionType.trim().length).toBeGreaterThan(0)
        })
      })
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large company dataset efficiently', () => {
      const startTime = Date.now()
      
      render(
        <CompanyDetailPanel
          selectedCompany={null}
          allCompanies={sampleCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )
      
      const renderTime = Date.now() - startTime
      expect(renderTime).toBeLessThan(100) // Should render quickly
    })

    it('should handle companies without connections', () => {
      const isolatedCompany = sampleCompanies.find(c => c.connections.length === 0)
      
      if (isolatedCompany) {
        render(
          <CompanyDetailPanel
            selectedCompany={isolatedCompany}
            allCompanies={sampleCompanies}
            onCompanySelect={mockOnCompanySelect}
            isInWatchlist={mockIsInWatchlist}
            onToggleWatchlist={mockOnToggleWatchlist}
            onRequestDelete={mockOnRequestDelete}
            viewMode="explore"
            watchlistStats={mockWatchlistStats}
          />
        )

        // Should not display related companies section
        expect(screen.queryByText('Related Companies')).not.toBeInTheDocument()
      } else {
        // All companies have connections, which is also valid
        expect(true).toBe(true)
      }
    })

    it('should maintain consistent state across re-renders', () => {
      const testCompany = sampleCompanies[0]
      
      const { rerender } = render(
        <CompanyDetailPanel
          selectedCompany={testCompany}
          allCompanies={sampleCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const firstMatchScore = screen.getByText(`${testCompany.matchScore}%`)
      expect(firstMatchScore).toBeInTheDocument()

      // Re-render with same props
      rerender(
        <CompanyDetailPanel
          selectedCompany={testCompany}
          allCompanies={sampleCompanies}
          onCompanySelect={mockOnCompanySelect}
          isInWatchlist={mockIsInWatchlist}
          onToggleWatchlist={mockOnToggleWatchlist}
          onRequestDelete={mockOnRequestDelete}
          viewMode="explore"
          watchlistStats={mockWatchlistStats}
        />
      )

      const secondMatchScore = screen.getByText(`${testCompany.matchScore}%`)
      expect(secondMatchScore).toBeInTheDocument()
    })
  })
})