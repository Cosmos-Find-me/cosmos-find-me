import { describe, it, expect } from 'vitest'
import { generateEnhancedMockData, determineCompanyStage, generateMatchReasons } from '../mockCompanyData'
import type { CompanyPreview } from '../companyValidation'
import type { UserCMF } from '../../types'

const preview = (overrides: Partial<CompanyPreview> = {}): CompanyPreview =>
  ({ name: 'Acme', industry: 'AI/ML', confidence: 'high', ...overrides }) as CompanyPreview

const emptyCMF = { id: 'u', name: 'User', targetRole: '', targetCompanies: '', mustHaves: [], wantToHave: [], experience: [] } as UserCMF

const fullCMF = {
  ...emptyCMF,
  targetRole: 'Product Manager',
  targetCompanies: 'AI/ML startups',
  mustHaves: ['Remote-friendly'],
  experience: ['AI/ML'],
} as UserCMF

describe('determineCompanyStage', () => {
  it('marks well-known big tech as Public', () => {
    expect(determineCompanyStage(preview({ name: 'Google' }))).toBe('Public')
  })

  it('marks high-confidence AI companies as Early Stage', () => {
    expect(determineCompanyStage(preview({ name: 'Acme', industry: 'AI' }))).toBe('Early Stage')
  })

  it('defaults to Late Stage', () => {
    expect(determineCompanyStage(preview({ industry: 'Fintech' }))).toBe('Late Stage')
    expect(determineCompanyStage(preview({ confidence: 'low', name: 'Google' }))).toBe('Late Stage')
  })
})

describe('generateMatchReasons', () => {
  it('gives exploration reasons for an empty CMF', () => {
    const reasons = generateMatchReasons(preview(), emptyCMF, true)

    expect(reasons[0]).toBe('Excellent reputation in the AI/ML sector')
    expect(reasons).toHaveLength(4)
  })

  it('personalises reasons from the CMF', () => {
    const reasons = generateMatchReasons(preview(), fullCMF, false)

    expect(reasons).toContain('Strong alignment with your Product Manager background')
    expect(reasons).toContain('Company culture aligns with your requirement: Remote-friendly')
    expect(reasons).toContain('Your AI/ML experience is highly valued here')
    expect(reasons.length).toBeLessThanOrEqual(4)
  })
})

describe('generateEnhancedMockData', () => {
  it('keeps scores in the encouraging 70-85 range for new users', () => {
    for (let i = 0; i < 50; i++) {
      const { matchScore } = generateEnhancedMockData(preview(), emptyCMF)
      expect(matchScore).toBeGreaterThanOrEqual(70)
      expect(matchScore).toBeLessThanOrEqual(85)
    }
  })

  it('clamps personalised scores to 60-95', () => {
    for (let i = 0; i < 50; i++) {
      const { matchScore } = generateEnhancedMockData(preview(), fullCMF)
      expect(matchScore).toBeGreaterThanOrEqual(60)
      expect(matchScore).toBeLessThanOrEqual(95)
    }
  })

  it('fills defaults and links from the preview', () => {
    const data = generateEnhancedMockData(preview({ industry: undefined, domain: 'acme.com' }), emptyCMF)

    expect(data).toMatchObject({
      name: 'Acme',
      industry: 'Technology',
      location: 'San Francisco, CA',
      employees: '~500',
      remote: 'Remote-Friendly',
      connections: [],
      externalLinks: { website: 'https://acme.com' },
    })
    expect(data.openRoles).toBeGreaterThanOrEqual(5)
    expect(data.openRoles).toBeLessThan(20)
  })
})
