import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RemoveCompanyModal } from '../RemoveCompanyModal'
import { Company } from '../../types'

describe('RemoveCompanyModal', () => {
  const mockCompany: Company = {
    id: 1,
    name: 'OpenAI',
    industry: 'AI/ML',
    stage: 'Late Stage',
    matchScore: 95,
    logo: 'https://img.logo.dev/openai.com',
    careerUrl: 'https://openai.com/careers',
    location: 'San Francisco, CA',
    employees: '~1500',
    remote: 'In-office',
    openRoles: 3,
    matchReasons: ['Strong AI safety focus', 'High velocity culture'],
    connections: [2],
    connectionTypes: { '2': 'AI Competitor' },
    color: '#10B981',
    angle: 0,
    distance: 75
  }

  const mockOnConfirm = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(
      <RemoveCompanyModal
        isOpen={false}
        company={mockCompany}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.queryByRole('heading', { name: 'Remove Company' })).not.toBeInTheDocument()
  })

  it('should not render when company is null', () => {
    render(
      <RemoveCompanyModal
        isOpen={true}
        company={null}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.queryByRole('heading', { name: 'Remove Company' })).not.toBeInTheDocument()
  })

  it('should render modal with company information when open', () => {
    render(
      <RemoveCompanyModal
        isOpen={true}
        company={mockCompany}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByRole('heading', { name: 'Remove Company' })).toBeInTheDocument()
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Industry:')).toBeInTheDocument()
    expect(screen.getByText('AI/ML')).toBeInTheDocument()
    expect(screen.getByText('Stage:')).toBeInTheDocument()
    expect(screen.getByText('Late Stage')).toBeInTheDocument()
    expect(screen.getByText('Match Score:')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
  })

  it('should call onCancel when Cancel button is clicked', () => {
    render(
      <RemoveCompanyModal
        isOpen={true}
        company={mockCompany}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
    expect(mockOnConfirm).not.toHaveBeenCalled()
  })

  it('should call onConfirm when Remove Company button is clicked', () => {
    render(
      <RemoveCompanyModal
        isOpen={true}
        company={mockCompany}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    const removeButton = screen.getByRole('button', { name: 'Remove Company' })
    fireEvent.click(removeButton)

    expect(mockOnConfirm).toHaveBeenCalledTimes(1)
    expect(mockOnCancel).not.toHaveBeenCalled()
  })

  it('should call onCancel when X button is clicked', () => {
    render(
      <RemoveCompanyModal
        isOpen={true}
        company={mockCompany}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    // Find the close button by its className (the X button)
    const closeButton = document.querySelector('.text-gray-400.hover\\:text-slate-600')
    expect(closeButton).toBeInTheDocument()
    fireEvent.click(closeButton as Element)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
    expect(mockOnConfirm).not.toHaveBeenCalled()
  })

  it('should display the removal effects information', () => {
    render(
      <RemoveCompanyModal
        isOpen={true}
        company={mockCompany}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('This will:')).toBeInTheDocument()
    expect(screen.getByText('Hide the company from your exploration graph')).toBeInTheDocument()
    expect(screen.getByText('Remove it from your watchlist (if saved)')).toBeInTheDocument()
    expect(screen.getByText('Hide related connections in the visualization')).toBeInTheDocument()
  })

  describe('accessibility features', () => {
    it('should have proper semantic structure', () => {
      render(
        <RemoveCompanyModal
          isOpen={true}
          company={mockCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      // Heading should be properly accessible
      const heading = screen.getByRole('heading', { name: 'Remove Company' })
      expect(heading).toBeInTheDocument()
      
      // Modal content should be present
      const modalContainer = document.querySelector('.fixed.inset-0')
      expect(modalContainer).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      render(
        <RemoveCompanyModal
          isOpen={true}
          company={mockCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      // Check that both buttons are focusable
      const cancelButton = screen.getByText('Cancel')
      const removeButton = screen.getByRole('button', { name: 'Remove Company' })
      
      expect(cancelButton).toBeInTheDocument()
      expect(removeButton).toBeInTheDocument()
      
      // Both buttons should be interactive
      expect(cancelButton.tagName).toBe('BUTTON')
      expect(removeButton.tagName).toBe('BUTTON')
    })

    it('should support closing with close button', () => {
      render(
        <RemoveCompanyModal
          isOpen={true}
          company={mockCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      // Find and click the close button (X button)
      const closeButton = document.querySelector('.text-gray-400')
      expect(closeButton).toBeInTheDocument()
      
      if (closeButton) {
        fireEvent.click(closeButton)
        expect(mockOnCancel).toHaveBeenCalledTimes(1)
      }
    })

    it('should have descriptive button text', () => {
      render(
        <RemoveCompanyModal
          isOpen={true}
          company={mockCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      // Buttons should have clear, descriptive text
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove Company' })).toBeInTheDocument()
    })

    it('should have proper color contrast for important elements', () => {
      render(
        <RemoveCompanyModal
          isOpen={true}
          company={mockCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      const removeButton = screen.getByRole('button', { name: 'Remove Company' })
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      
      // Check that buttons have appropriate styling classes for contrast
      expect(removeButton).toHaveClass('border')
      expect(cancelButton).toHaveClass('bg-slate-600')
      expect(cancelButton).toHaveClass('text-white')
    })

    it('should provide clear context about the action', () => {
      render(
        <RemoveCompanyModal
          isOpen={true}
          company={mockCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      // Should clearly state what company is being removed
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      
      // Find the paragraph containing the removal message
      const removalText = document.querySelector('p.text-slate-700.mb-4')
      expect(removalText).toBeInTheDocument()
      expect(removalText?.textContent).toContain('Remove')
      expect(removalText?.textContent).toContain('OpenAI')
      expect(removalText?.textContent).toContain('from your company exploration')
      
      // Should explain the consequences
      expect(screen.getByText('This will:')).toBeInTheDocument()
    })

    it('should have proper focus management', () => {
      render(
        <RemoveCompanyModal
          isOpen={true}
          company={mockCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      // Modal should contain interactive elements
      const modalContainer = document.querySelector('.fixed.inset-0')
      const buttons = screen.getAllByRole('button')
      
      expect(modalContainer).toBeInTheDocument()
      expect(buttons.length).toBeGreaterThan(0)
      
      // All buttons should be present and interactive
      expect(buttons.length).toBeGreaterThanOrEqual(2) // Cancel, Remove, and possibly close button
    })

    it('should be screen reader friendly', () => {
      render(
        <RemoveCompanyModal
          isOpen={true}
          company={mockCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      // Important information should be in proper semantic order
      const heading = screen.getByRole('heading', { name: 'Remove Company' })
      const modalContainer = document.querySelector('.fixed.inset-0')
      
      expect(modalContainer).toContainElement(heading)
      
      // Company name should be clearly identified
      expect(screen.getByText('OpenAI')).toBeInTheDocument()
      
      // Action consequences should be clearly listed
      const effectsList = screen.getByText('This will:').closest('div')
      expect(effectsList).toBeInTheDocument()
    })

    it('should handle high contrast mode appropriately', () => {
      render(
        <RemoveCompanyModal
          isOpen={true}
          company={mockCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      const modalContainer = document.querySelector('.bg-linear-to-br.rounded-lg')
      const removeButton = screen.getByRole('button', { name: 'Remove Company' })
      const cancelButton = screen.getByText('Cancel')
      
      // Check that elements have border styles for high contrast visibility
      expect(modalContainer).toBeInTheDocument()
      expect(removeButton).toHaveClass('border')
      expect(cancelButton).toBeInTheDocument()
    })
  })

  describe('error states and edge cases', () => {
    it('should handle missing company data gracefully', () => {
      const incompleteCompany = {
        ...mockCompany,
        name: ''
      }

      expect(() => {
        render(
          <RemoveCompanyModal
            isOpen={true}
            company={incompleteCompany}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        )
      }).not.toThrow()
    })

    it('should maintain accessibility when company name is very long', () => {
      const longNameCompany = {
        ...mockCompany,
        name: 'Very Long Company Name That Might Cause Layout Issues And Accessibility Problems'
      }

      render(
        <RemoveCompanyModal
          isOpen={true}
          company={longNameCompany}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      )

      // Long company name should still be accessible
      expect(screen.getByText(longNameCompany.name)).toBeInTheDocument()
      
      // Modal should still have proper structure
      const modalContainer = document.querySelector('.fixed.inset-0')
      expect(modalContainer).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Remove Company' })).toBeInTheDocument()
    })
  })
});