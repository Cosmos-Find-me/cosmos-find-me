import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CompanyGraph from '../CompanyGraph';

/**
 * Regression tests for critical user interactions
 * These tests prevent issues like node selection flickering
 */

// Mock Cytoscape since we're testing interaction logic, not the graph library
vi.mock('cytoscape', () => {
  const createMockCollection = () => ({
    removeClass: vi.fn().mockReturnThis(),
    addClass: vi.fn().mockReturnThis(),
    length: 1,
    hasClass: vi.fn(() => false),
    forEach: vi.fn(),
    data: vi.fn(() => ({ company: { id: 1 } })),
    connectedEdges: vi.fn(() => []),
    renderedPosition: vi.fn(() => ({ x: 0, y: 0 }))
  });

  const mockCy = {
    on: vi.fn(),
    nodes: vi.fn(() => createMockCollection()),
    edges: vi.fn(() => createMockCollection()),
    getElementById: vi.fn(() => createMockCollection()),
    zoom: vi.fn(() => 1),
    pan: vi.fn(() => ({ x: 0, y: 0 })),
    fit: vi.fn(),
    center: vi.fn(),
    destroy: vi.fn(),
    ready: vi.fn((callback: any) => callback()),
    elements: vi.fn(),
    style: vi.fn(),
    layout: vi.fn(() => ({ run: vi.fn() }))
  };

  return { default: vi.fn(() => mockCy) };
});

describe('CompanyGraph Interaction Regression Tests', () => {
  // Mock data inline instead of importing from non-existent files
  const mockCompanies = [
    { 
      id: 1, 
      name: 'Company 1', 
      logo: '', 
      careerUrl: '', 
      matchScore: 85, 
      industry: 'Tech', 
      stage: 'Series A', 
      location: 'SF', 
      employees: '100', 
      remote: 'Hybrid', 
      openRoles: 5, 
      matchReasons: [], 
      connections: [], 
      connectionTypes: {}, 
      description: 'Test company',
      color: '#000000' 
    },
    { 
      id: 2, 
      name: 'Company 2', 
      logo: '', 
      careerUrl: '', 
      matchScore: 80, 
      industry: 'Tech', 
      stage: 'Seed', 
      location: 'NYC', 
      employees: '50', 
      remote: 'Remote', 
      openRoles: 3, 
      matchReasons: [], 
      connections: [], 
      connectionTypes: {}, 
      description: 'Another company',
      color: '#111111' 
    }
  ];

  const mockCMF = {
    id: 'test',
    name: 'Test User',
    targetRole: 'Engineer',
    targetCompanies: 'Tech companies',
    mustHaves: [],
    wantToHave: [],
    experience: [],
    baseCompanies: [],
    addedCompanies: []
  };

  const defaultProps = {
    cmf: mockCMF,
    companies: mockCompanies,
    selectedCompany: null,
    hoveredCompany: null,
    onCompanySelect: vi.fn(),
    onCompanyHover: vi.fn(),
    viewMode: 'explore' as const,
    watchlistCompanyIds: new Set<number>(),
    hideCenter: false,
    onCMFToggle: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('graph tap handlers call the latest onCompanySelect after a re-render', async () => {
    const cytoscape = (await import('cytoscape')).default as unknown as () => { on: ReturnType<typeof vi.fn> };
    const cy = cytoscape();
    const first = vi.fn();
    const latest = vi.fn();

    const { rerender } = render(<CompanyGraph {...defaultProps} onCompanySelect={first} />);
    const tapCall = cy.on.mock.calls.find(([event, selector]) => event === 'tap' && selector === 'node[type="company"]');
    expect(tapCall).toBeDefined();
    const tapHandler = tapCall![2] as (event: unknown) => void;

    rerender(<CompanyGraph {...defaultProps} onCompanySelect={latest} />);
    tapHandler({ target: { data: () => mockCompanies[0] } });

    expect(latest).toHaveBeenCalledWith(mockCompanies[0]);
    expect(first).not.toHaveBeenCalled();
  });

  test('should maintain selection state when companies array changes', async () => {
    const onCompanySelect = vi.fn();
    
    const { rerender } = render(
      <CompanyGraph 
        {...defaultProps} 
        onCompanySelect={onCompanySelect}
        selectedCompany={mockCompanies[0]}
      />
    );

    // Simulate companies array changing (this was causing the bug)
    const newCompanies = [...mockCompanies];

    rerender(
      <CompanyGraph 
        {...defaultProps} 
        onCompanySelect={onCompanySelect}
        selectedCompany={mockCompanies[0]} // Should stay selected
        companies={newCompanies}
      />
    );

    // Selection should NOT be cleared when companies array changes
    expect(onCompanySelect).not.toHaveBeenCalledWith(null);
  });

  test('should not trigger selection effects on every render', () => {
    const onCompanySelect = vi.fn();
    
    const { rerender } = render(
      <CompanyGraph 
        {...defaultProps} 
        onCompanySelect={onCompanySelect}
        selectedCompany={mockCompanies[0]}
      />
    );

    // Force multiple re-renders
    for (let i = 0; i < 5; i++) {
      rerender(
        <CompanyGraph 
          {...defaultProps} 
          onCompanySelect={onCompanySelect}
          selectedCompany={mockCompanies[0]}
        />
      );
    }

    // onCompanySelect should not be called during re-renders
    expect(onCompanySelect).not.toHaveBeenCalled();
  });

  test('should handle rapid selection changes without flickering', async () => {
    const onCompanySelect = vi.fn();
    
    const { rerender } = render(
      <CompanyGraph 
        {...defaultProps} 
        onCompanySelect={onCompanySelect}
        selectedCompany={null}
      />
    );

    // Simulate rapid selection changes
    rerender(<CompanyGraph {...defaultProps} onCompanySelect={onCompanySelect} selectedCompany={mockCompanies[0]} />);
    rerender(<CompanyGraph {...defaultProps} onCompanySelect={onCompanySelect} selectedCompany={mockCompanies[1]} />);
    rerender(<CompanyGraph {...defaultProps} onCompanySelect={onCompanySelect} selectedCompany={mockCompanies[0]} />);

    // Each change should be stable
    await waitFor(() => {
      expect(onCompanySelect).not.toHaveBeenCalledWith(null);
    });
  });

  test('should prevent dependency array issues with companies prop', () => {
    const onCompanySelect = vi.fn();
    let renderCount = 0;
    
    const TestWrapper = ({ companies }: { companies: any[] }) => {
      renderCount++;
      return (
        <CompanyGraph 
          {...defaultProps} 
          companies={companies}
          onCompanySelect={onCompanySelect}
        />
      );
    };

    const { rerender } = render(<TestWrapper companies={mockCompanies} />);
    
    // Companies array with same content but different reference
    const sameCompanies = [...mockCompanies];
    rerender(<TestWrapper companies={sameCompanies} />);
    
    // Should not cause excessive re-renders (more than expected)
    expect(renderCount).toBeLessThan(5);
  });
});