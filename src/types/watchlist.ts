/**
 * TypeScript interfaces for watchlist functionality
 * Following 2025 best practices for type-safe state management
 */

export interface WatchlistData {
  userId?: string;           // For future multi-user support
  companyIds: number[];      // Serializable array for storage
  lastUpdated: string;       // ISO timestamp
  version: number;           // For future schema migrations
}

export interface WatchlistState {
  companyIds: Set<number>;   // Runtime Set for O(1) operations
  lastUpdated: Date;
  isLoading: boolean;
  error: string | null;
}

export interface WatchlistActions {
  addToWatchlist: (companyId: number) => void;
  removeFromWatchlist: (companyId: number) => void;
  toggleWatchlist: (companyId: number) => void;
  isInWatchlist: (companyId: number) => boolean;
  clearWatchlist: () => void;
  getWatchlistStats: () => WatchlistStats;
}

export interface WatchlistStats {
  totalCompanies: number;
  excellentMatches: number;  // 90%+ match score
  totalOpenRoles: number;
  lastActivity: Date | null;
}

export type ViewMode = 'explore' | 'watchlist';

export interface ViewState {
  mode: ViewMode;
  filterCount: number;
}

// Storage-related types
export interface StorageError {
  type: 'quota_exceeded' | 'not_supported' | 'security' | 'unknown';
  message: string;
  originalError?: Error;
}

// Extended component props
export interface CMFGraphExplorerProps {
  userCMF: import('./index').UserCMF;
  companies: import('./index').Company[];
  initialWatchlist?: number[];
}

export interface CompanyDetailPanelProps {
  selectedCompany: import('./index').Company | null;
  allCompanies: import('./index').Company[];
  isInWatchlist: (companyId: number) => boolean;
  onToggleWatchlist: (companyId: number) => void;
  onCompanySelect: (company: import('./index').Company | null) => void;
  onRequestDelete: (company: import('./index').Company) => void;
  onCompanyUpdate?: (updatedCompany: import('./index').Company) => void;
  viewMode: ViewMode;
  watchlistStats: WatchlistStats;
  isMobile?: boolean;
  onBack?: () => void;
}

export interface CompanyGraphProps {
  cmf: import('./index').UserCMF;
  companies: import('./index').Company[];
  selectedCompany: import('./index').Company | null;
  hoveredCompany: import('./index').Company | null;
  onCompanySelect: (company: import('./index').Company | null) => void;
  onCompanyHover: (company: import('./index').Company | null) => void;
  watchlistCompanyIds: Set<number>;
  viewMode: ViewMode;
}