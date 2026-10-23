import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Test logo helper - generates consistent logo URLs for testing
const getTestLogo = (domain: string) => `https://img.logo.dev/${domain}?token=test-key`

// Mock localStorage for testing
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
}
// Browser mocks only apply to jsdom tests; files using `@vitest-environment node` skip them
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: localStorageMock,
  })

  // Mock custom storage events to prevent issues in tests
  const originalAddEventListener = window.addEventListener;
  window.addEventListener = vi.fn((event, handler, options) => {
    if (event === 'watchlist-storage-change' || event === 'storage') {
      // Don't actually add storage listeners that could cause issues in tests
      return
    }
    // Call original implementation for other events if it exists
    if (originalAddEventListener) {
      return originalAddEventListener.call(window, event, handler, options)
    }
  })

  // Mock window.open for testing
  Object.defineProperty(window, 'open', {
    writable: true,
    value: vi.fn(),
  })
}

// Mock companies.ts data to ensure consistent test data
vi.mock('../../src/data/companies', () => ({
  activeUserProfile: {
    id: 'test-user-1',
    name: 'John Smith',
    targetRole: 'Senior AI Engineer',
    targetCompanies: 'AI/ML companies with strong ethics focus',
    mustHaves: [
      'Remote-friendly culture',
      'Strong AI safety principles', 
      'High technical standards'
    ],
    wantToHave: ['Competitive salary', 'Stock options'],
    experience: ['5+ years ML experience', 'Python expertise']
  },
  allCompanies: [
    {
      id: 1,
      name: 'OpenAI',
      logo: getTestLogo('openai.com'),
      careerUrl: 'https://openai.com/careers',
      matchScore: 95,
      industry: 'AI/ML',
      stage: 'Late Stage',
      location: 'San Francisco, CA',
      employees: '~1500',
      remote: 'In-office',
      openRoles: 3,
      connections: [2, 3],
      connectionTypes: { 2: 'competitor', 3: 'partner' },
      matchReasons: [
        'Cutting-edge AI research environment',
        'Remote-friendly culture', 
        'Strong technical standards'
      ],
      color: '#10B981',
      angle: 0,
      distance: 80
    },
    {
      id: 2,
      name: 'Anthropic',
      logo: getTestLogo('anthropic.com'),
      careerUrl: 'https://anthropic.com/careers',
      matchScore: 88,
      industry: 'AI/ML',
      stage: 'Late Stage',
      location: 'San Francisco, CA',
      employees: '~500',
      remote: 'Hybrid',
      openRoles: 5,
      connections: [1, 3],
      connectionTypes: { 1: 'competitor', 3: 'partner' },
      matchReasons: [
        'AI safety principles alignment',
        'Hybrid work environment',
        'Strong ethics focus'
      ],
      color: '#F59E0B',
      angle: 120,
      distance: 100
    },
    {
      id: 3,
      name: 'Scale AI',
      logo: getTestLogo('scale.com'),
      careerUrl: 'https://scale.com/careers',
      matchScore: 82,
      industry: 'AI/ML',
      stage: 'Late Stage',
      location: 'San Francisco, CA', 
      employees: '~1000',
      remote: 'Hybrid',
      openRoles: 2,
      connections: [1, 2],
      connectionTypes: { 1: 'partner', 2: 'partner' },
      matchReasons: [
        'Data labeling platform experience',
        'ML pipeline development',
        'Technical excellence culture'
      ],
      color: '#F59E0B',
      angle: 240,
      distance: 120
    },
    {
      id: 4,
      name: 'TestCorp',
      logo: getTestLogo('testcorp.com'),
      careerUrl: 'https://testcorp.com/careers',
      matchScore: 75,
      industry: 'Technology',
      stage: 'Early Stage',
      location: 'Austin, TX',
      employees: '~200',
      remote: 'Remote',
      openRoles: 1,
      connections: [1, 2],
      connectionTypes: { 1: 'partner', 2: 'competitor' },
      matchReasons: [
        'Growing tech company',
        'Remote work opportunities',
        'Early stage potential'
      ],
      color: '#6B7280',
      angle: 300,
      distance: 140
    }
  ],
  sampleCompanies: [
    {
      id: 1,
      name: 'OpenAI',
      logo: getTestLogo('openai.com'),
      careerUrl: 'https://openai.com/careers',
      matchScore: 95,
      industry: 'AI/ML',
      stage: 'Late Stage',
      location: 'San Francisco, CA',
      employees: '~1500',
      remote: 'In-office',
      openRoles: 3,
      connections: [2, 3],
      connectionTypes: { 2: 'competitor', 3: 'partner' },
      matchReasons: [
        'Cutting-edge AI research environment',
        'Remote-friendly culture', 
        'Strong technical standards'
      ],
      color: '#10B981',
      angle: 0,
      distance: 80
    },
    {
      id: 2,
      name: 'Anthropic',
      logo: getTestLogo('anthropic.com'),
      careerUrl: 'https://anthropic.com/careers',
      matchScore: 88,
      industry: 'AI/ML',
      stage: 'Late Stage',
      location: 'San Francisco, CA',
      employees: '~500',
      remote: 'Hybrid',
      openRoles: 5,
      connections: [1, 3],
      connectionTypes: { 1: 'competitor', 3: 'partner' },
      matchReasons: [
        'AI safety principles alignment',
        'Hybrid work environment',
        'Strong ethics focus'
      ],
      color: '#F59E0B',
      angle: 120,
      distance: 100
    },
    {
      id: 3,
      name: 'Scale AI',
      logo: getTestLogo('scale.com'),
      careerUrl: 'https://scale.com/careers',
      matchScore: 82,
      industry: 'AI/ML',
      stage: 'Late Stage',
      location: 'San Francisco, CA', 
      employees: '~1000',
      remote: 'Hybrid',
      openRoles: 2,
      connections: [1, 2],
      connectionTypes: { 1: 'partner', 2: 'partner' },
      matchReasons: [
        'Data labeling platform experience',
        'ML pipeline development',
        'Technical excellence culture'
      ],
      color: '#F59E0B',
      angle: 240,
      distance: 120
    },
    {
      id: 4,
      name: 'TestCorp',
      logo: getTestLogo('testcorp.com'),
      careerUrl: 'https://testcorp.com/careers',
      matchScore: 75,
      industry: 'Technology',
      stage: 'Early Stage',
      location: 'Austin, TX',
      employees: '~200',
      remote: 'Remote',
      openRoles: 1,
      connections: [1, 2],
      connectionTypes: { 1: 'partner', 2: 'competitor' },
      matchReasons: [
        'Growing tech company',
        'Remote work opportunities',
        'Early stage potential'
      ],
      color: '#6B7280',
      angle: 300,
      distance: 140
    }
  ]
}))

// Mock Cytoscape for component tests
vi.mock('cytoscape', () => {
  const mockNodes = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    connectedEdges: vi.fn().mockReturnValue({
      connectedNodes: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnThis(),
        removeClass: vi.fn().mockReturnThis(),
      })
    }),
    boundingBox: vi.fn().mockReturnValue({
      x1: 100, y1: 100, x2: 300, y2: 300,
      w: 200, h: 200
    }),
    length: 1,
  }

  const mockEdges = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    length: 1,
  }

  const mockElement = {
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    connectedEdges: vi.fn().mockReturnValue({
      connectedNodes: vi.fn().mockReturnValue(mockNodes)
    }),
    data: vi.fn().mockReturnValue({}),
    source: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue('source-1') }),
    target: vi.fn().mockReturnValue({ id: vi.fn().mockReturnValue('target-1') }),
    id: vi.fn().mockReturnValue('element-1'),
  }

  return {
    default: vi.fn(() => ({
      nodes: vi.fn(() => mockNodes),
      edges: vi.fn(() => mockEdges),
      on: vi.fn(),
      getElementById: vi.fn().mockReturnValue(mockElement),
      fit: vi.fn(),
      zoom: vi.fn().mockImplementation((options) => {
        if (typeof options === 'object' && options.level) {
          return options.level
        }
        return 1
      }),
      pan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
      destroy: vi.fn(),
      // Mock the core cytoscape instance for background clicks
      target: undefined,
    })),
  }
})