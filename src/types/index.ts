/**
 * CMF Item with short (display) and detailed (matching) versions
 * - short: Condensed label for UI display (e.g., "High Velocity of Execution")
 * - detailed: Full context for API matching (e.g., "High Velocity of Execution: A dynamic pace...")
 */
export interface CMFItem {
  short: string;
  detailed: string;
}

/**
 * Helper to get display text from a CMF item (handles both string and CMFItem formats)
 */
export function getCMFDisplayText(item: string | CMFItem): string {
  return typeof item === 'string' ? item : item.short;
}

/**
 * Helper to get detailed text from a CMF item (handles both string and CMFItem formats)
 */
export function getCMFDetailedText(item: string | CMFItem): string {
  return typeof item === 'string' ? item : item.detailed;
}

/**
 * Helper to get combined text from a CMF item for LLM matching
 * Format: "Short Label: Full detailed description..."
 * This gives LLMs both the concise label and full context
 */
export function getCMFCombinedText(item: string | CMFItem): string {
  if (typeof item === 'string') {
    return item;
  }
  return `${item.short}: ${item.detailed}`;
}

export interface UserCMF {
  id: string;
  name: string;
  mustHaves: (string | CMFItem)[];
  wantToHave: (string | CMFItem)[];
  experience: string[];  // Experience stays as simple strings (short labels)
  targetRole: string;
  targetCompanies: string;
}

export interface Company {
  id: number;
  name: string;
  logo: string;
  careerUrl: string;
  matchScore: number;
  industry: string;
  stage: string;
  location: string;
  employees: string;
  remote: string;
  openRoles: number;
  connections: number[];
  connectionTypes: Record<number, string>;
  matchReasons: string[];
  color: string;
  angle?: number;
  distance?: number;
  // View-specific positions for exclusive Explore/Watchlist views
  explorePosition?: { angle: number; distance: number };
  watchlistPosition?: { angle: number; distance: number };
  externalLinks?: {
    website?: string;
    linkedin?: string;
    glassdoor?: string;
    crunchbase?: string;
  };
}

export interface GraphData {
  nodes: Array<{
    data: {
      id: string;
      label: string;
      type: 'cmf' | 'company' | 'company-label' | 'company-name-label' | 'company-percent-label' | 'zone-excellent' | 'zone-good' | 'zone-fair';
      company?: Company;
      cmf?: UserCMF;
    };
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    data: {
      id: string;
      source: string;
      target: string;
      relationship: string;
    };
  }>;
}

export interface UserExplorationState {
  id: string;
  name: string;
  cmf: UserCMF;
  baseCompanies: Company[];           // Original dataset
  addedCompanies: Company[];          // Manually added companies
  removedCompanyIds: number[];        // IDs of removed companies
  watchlistCompanyIds: number[];      // IDs of watchlisted companies
  lastSelectedCompanyId?: number;     // Last selected company
  viewMode: 'explore' | 'watchlist';  // Current view mode
  _warning?: string;                  // Optional warning from file-processing/discovery pipeline
}

// CMF Component Props
export interface CMFGraphExplorerProps {
  userCMF: UserCMF;
  companies: Company[];
}

export interface CompanyGraphProps {
  cmf: UserCMF;
  companies: Company[];
  selectedCompany: Company | null;
  hoveredCompany: Company | null;
  onCompanySelect: (company: Company | null) => void;
  onCompanyHover: (company: Company | null) => void;
  onCMFToggle?: () => void;
  watchlistCompanyIds?: Set<number>;
  viewMode?: import('./watchlist').ViewMode;
  hideCenter?: boolean; // Hide center node when modals are open
  fadingCompanyIds?: Set<number>; // Companies that are fading out (added to watchlist)
}

export interface CompanyDetailPanelProps {
  selectedCompany: Company | null;
  allCompanies: Company[];
  onCompanySelect: (company: Company) => void;
  isInWatchlist?: (companyId: number) => boolean;
  onToggleWatchlist?: (companyId: number) => void;
  viewMode?: import('./watchlist').ViewMode;
  watchlistStats?: import('./watchlist').WatchlistStats;
}

// Export watchlist types
export * from './watchlist';

// Export LLM types
export * from '../utils/llm/types';