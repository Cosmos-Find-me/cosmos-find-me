import { Company, UserExplorationState, WatchlistStats } from '../types';
import { writeStateToDisk, checkDevServerAvailable, logFileWriteInstructions } from '../utils/devFileWriter';
import { getColorForScore } from '../utils/companyPositioning';
import { track } from '../lib/analytics';

/**
 * ExplorationStateManager
 * 
 * Manages all user exploration state including:
 * - Company additions and removals
 * - Watchlist management
 * - View mode and selection state
 * - State persistence and restoration
 * 
 * Serves as the single source of truth for user exploration data,
 * loading initial state from companies.ts and persisting changes.
 */
export class ExplorationStateManager {
  private currentState: UserExplorationState;
  private devServerAvailable = false;
  private profileName: string;
  private remotePersistScheduled = false;
  
  constructor(initialState: UserExplorationState, profileName = 'teeKProfile') {
    this.currentState = this.cloneState(initialState);
    this.profileName = profileName;

    // Debug: trace what state the manager is initialized with (#130)
    console.log('🔍 [SYNC DEBUG] ExplorationStateManager created:', {
      userId: this.currentState.id,
      watchlistCompanyIds: this.currentState.watchlistCompanyIds,
      removedCompanyIds: this.currentState.removedCompanyIds,
      viewMode: this.currentState.viewMode,
      baseCompaniesCount: this.currentState.baseCompanies?.length ?? 0,
      addedCompaniesCount: this.currentState.addedCompanies?.length ?? 0,
    });

    this.checkDevServer();
    this.logStateInfo();
  }

  /**
   * Check if development file server is available
   */
  private async checkDevServer(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      this.devServerAvailable = await checkDevServerAvailable();
      if (this.devServerAvailable) {
        console.log('🔧 Development file server detected - automatic companies.ts updates enabled');
      } else {
        console.log('ℹ️ Development file server not available - run `node scripts/dev-server.cjs` to enable automatic file updates');
        logFileWriteInstructions(this.currentState);
      }
    }
  }

  // ===== COMPANY MANAGEMENT =====

  /**
   * Get all available companies (base + added - removed)
   */
  getAllCompanies(): Company[] {
    const allCompanies = [
      ...this.currentState.baseCompanies,
      ...this.currentState.addedCompanies
    ];

    // Ensure colors are always computed from match scores
    return allCompanies
      .filter(company => !this.currentState.removedCompanyIds.includes(company.id))
      .map(company => ({
        ...company,
        color: getColorForScore(company.matchScore || 0)
      }));
  }

  /**
   * Get companies for current view mode
   * Explore view excludes watchlisted companies for cleaner discovery
   * Watchlist view shows only watchlisted companies
   */
  getDisplayedCompanies(): Company[] {
    const allCompanies = this.getAllCompanies();

    if (this.currentState.viewMode === 'watchlist') {
      return allCompanies.filter(company =>
        this.currentState.watchlistCompanyIds.includes(company.id)
      );
    }

    // Explore mode: exclude watchlisted companies (exclusive views)
    return allCompanies.filter(company =>
      !this.currentState.watchlistCompanyIds.includes(company.id)
    );
  }

  /**
   * Add a new company to the exploration
   */
  addCompany(company: Company): Company {
    // Ensure unique ID
    const maxId = Math.max(
      ...this.currentState.baseCompanies.map(c => c.id),
      ...this.currentState.addedCompanies.map(c => c.id),
      1000 // Minimum for added companies
    );
    
    const newCompany = { ...company, id: maxId + 1 };
    this.currentState.addedCompanies.push(newCompany);
    this.persistState();
    
    console.log(`Added company: ${newCompany.name} (ID: ${newCompany.id})`);
    return newCompany;
  }

  /**
   * Update an existing company in the exploration
   */
  updateCompany(updatedCompany: Company): Company {
    // Find and update in base companies
    const baseIndex = this.currentState.baseCompanies.findIndex(c => c.id === updatedCompany.id);
    if (baseIndex !== -1) {
      this.currentState.baseCompanies[baseIndex] = { ...updatedCompany };
      this.persistState();
      console.log(`Updated base company: ${updatedCompany.name} (ID: ${updatedCompany.id})`);
      return this.currentState.baseCompanies[baseIndex];
    }
    
    // Find and update in added companies
    const addedIndex = this.currentState.addedCompanies.findIndex(c => c.id === updatedCompany.id);
    if (addedIndex !== -1) {
      this.currentState.addedCompanies[addedIndex] = { ...updatedCompany };
      this.persistState();
      console.log(`Updated added company: ${updatedCompany.name} (ID: ${updatedCompany.id})`);
      return this.currentState.addedCompanies[addedIndex];
    }
    
    // If company doesn't exist, add it as a new company
    console.log(`Company not found for update, adding as new: ${updatedCompany.name} (ID: ${updatedCompany.id})`);
    return this.addCompany(updatedCompany);
  }

  /**
   * Remove a company from exploration
   */
  removeCompany(companyId: number): void {
    // Add to removed list if not already there
    if (!this.currentState.removedCompanyIds.includes(companyId)) {
      this.currentState.removedCompanyIds.push(companyId);
    }
    
    // Remove from watchlist if present
    const watchlistIndex = this.currentState.watchlistCompanyIds.indexOf(companyId);
    if (watchlistIndex !== -1) {
      this.currentState.watchlistCompanyIds.splice(watchlistIndex, 1);
    }
    
    // Clear selection if removed company was selected
    if (this.currentState.lastSelectedCompanyId === companyId) {
      this.currentState.lastSelectedCompanyId = undefined;
    }
    
    this.persistState();

    const company = this.findCompanyById(companyId);
    console.log(`Removed company: ${company?.name || 'Unknown'} (ID: ${companyId})`);

    // Analytics: Track company removal
    track('company_removed', { company_id: companyId, company_name: company?.name });
  }

  /**
   * Check if a company has been removed
   */
  isCompanyRemoved(companyId: number): boolean {
    return this.currentState.removedCompanyIds.includes(companyId);
  }

  /**
   * Restore a removed company
   */
  restoreCompany(companyId: number): void {
    const index = this.currentState.removedCompanyIds.indexOf(companyId);
    if (index !== -1) {
      this.currentState.removedCompanyIds.splice(index, 1);
      this.persistState();
      
      const company = this.findCompanyById(companyId);
      console.log(`Restored company: ${company?.name || 'Unknown'} (ID: ${companyId})`);
    }
  }

  // ===== WATCHLIST MANAGEMENT =====

  /**
   * Check if a company is in the watchlist
   */
  isInWatchlist(companyId: number): boolean {
    return this.currentState.watchlistCompanyIds.includes(companyId);
  }

  /**
   * Toggle a company in/out of the watchlist
   */
  toggleWatchlist(companyId: number): boolean {
    const index = this.currentState.watchlistCompanyIds.indexOf(companyId);
    let isAdded: boolean;
    
    if (index === -1) {
      this.currentState.watchlistCompanyIds.push(companyId);
      isAdded = true;
    } else {
      this.currentState.watchlistCompanyIds.splice(index, 1);
      isAdded = false;
    }
    
    this.persistState();
    
    const company = this.findCompanyById(companyId);
    console.log(`${isAdded ? 'Added to' : 'Removed from'} watchlist: ${company?.name || 'Unknown'}`);
    
    return isAdded;
  }

  /**
   * Get watchlist companies
   */
  getWatchlistCompanies(): Company[] {
    return this.getAllCompanies().filter(company =>
      this.currentState.watchlistCompanyIds.includes(company.id)
    );
  }

  /**
   * Get watchlist statistics
   */
  getWatchlistStats(): WatchlistStats {
    const watchlistCompanies = this.getWatchlistCompanies();
    const excellentMatches = watchlistCompanies.filter(c => c.matchScore >= 90).length;
    const totalOpenRoles = watchlistCompanies.reduce((sum, c) => sum + c.openRoles, 0);
    
    return {
      totalCompanies: watchlistCompanies.length,
      excellentMatches,
      totalOpenRoles,
      lastActivity: watchlistCompanies.length > 0 ? new Date() : null
    };
  }

  // ===== UI STATE MANAGEMENT =====

  /**
   * Set the selected company
   */
  setSelectedCompany(companyId: number | null): void {
    this.currentState.lastSelectedCompanyId = companyId || undefined;
    // Only save selection to localStorage, not to disk to avoid HMR cycles
    localStorage.setItem('cosmos-exploration-state', JSON.stringify(this.currentState));
  }

  /**
   * Get the currently selected company
   */
  getSelectedCompany(): Company | null {
    if (!this.currentState.lastSelectedCompanyId) return null;
    
    return this.getAllCompanies().find(
      c => c.id === this.currentState.lastSelectedCompanyId
    ) || null;
  }

  /**
   * Set the view mode (explore or watchlist)
   */
  setViewMode(mode: 'explore' | 'watchlist'): void {
    this.currentState.viewMode = mode;
    this.persistState();
    console.log(`View mode changed to: ${mode}`);
  }

  /**
   * Get the current view mode
   */
  getViewMode(): 'explore' | 'watchlist' {
    return this.currentState.viewMode;
  }

  // ===== STATE ACCESS =====

  /**
   * Get the user's CMF data
   */
  getUserCMF() {
    return this.currentState.cmf;
  }

  /**
   * Update the user's CMF data
   */
  updateUserCMF(cmf: UserExplorationState['cmf']): void {
    this.currentState.cmf = { ...cmf };
    this.persistState();
    console.log('Updated user CMF:', cmf.name);
  }

  /**
   * Get complete current state (for development/debugging)
   */
  getCurrentState(): UserExplorationState {
    return this.cloneState(this.currentState);
  }

  /**
   * Get exploration statistics
   */
  getExplorationStats() {
    const allCompanies = this.getAllCompanies();
    const baseCompanies = this.currentState.baseCompanies;
    const addedCompanies = this.currentState.addedCompanies;
    const removedCount = this.currentState.removedCompanyIds.length;
    const watchlistCount = this.currentState.watchlistCompanyIds.length;

    return {
      total: allCompanies.length,
      base: baseCompanies.length,
      added: addedCompanies.length,
      removed: removedCount,
      watchlisted: watchlistCount,
      viewed: this.currentState.viewMode
    };
  }

  // ===== UTILITIES =====

  /**
   * Find a company by ID across all company sources
   */
  private findCompanyById(id: number): Company | undefined {
    return [...this.currentState.baseCompanies, ...this.currentState.addedCompanies]
      .find(company => company.id === id);
  }

  /**
   * Log current state information for development
   */
  private logStateInfo(): void {
    // Development logging commented out to reduce console noise
    // if (process.env.NODE_ENV === 'development') {
    //   console.group(`🔍 Exploration State Loaded: ${this.currentState.name}`);
    //   console.log('User ID:', this.currentState.id);
    //   console.log('View Mode:', this.currentState.viewMode);
    //   console.log('Statistics:', this.getExplorationStats());
    //   console.log('Watchlist:', this.getWatchlistStats());
    //   console.log('Selected Company:', this.getSelectedCompany()?.name || 'None');
    //   console.groupEnd();
    // }
  }

  /**
   * Persist state changes using microtask batching.
   *
   * localStorage is updated immediately (synchronous, no race conditions).
   * The remote save (database/file) is deferred to a microtask so that
   * multiple synchronous mutations (e.g. addCompany + toggleWatchlist)
   * coalesce into a single network request with the final state.
   */
  private persistState(): void {
    // Debug: trace every persist call with caller and watchlist data (#130)
    console.log('🔍 [SYNC DEBUG] persistState() called:', {
      watchlistCompanyIds: this.currentState.watchlistCompanyIds,
      removedCompanyIds: this.currentState.removedCompanyIds,
      viewMode: this.currentState.viewMode,
      userId: this.currentState.id,
      caller: new Error().stack?.split('\n')[2]?.trim() || 'unknown',
    });

    // Always save to localStorage immediately as backup
    localStorage.setItem('cosmos-exploration-state', JSON.stringify(this.currentState));

    // Batch the remote save: if a microtask is already scheduled,
    // it will pick up the latest this.currentState when it fires.
    if (!this.remotePersistScheduled) {
      this.remotePersistScheduled = true;
      queueMicrotask(() => {
        this.remotePersistScheduled = false;
        this.doRemotePersist();
      });
    }
  }

  /**
   * Perform the actual remote persist (database or file).
   * Called once per microtask batch, always reads the latest this.currentState.
   */
  private async doRemotePersist(): Promise<void> {
    try {
      const persistenceMode = this.getPersistenceMode();
      console.log(`🔧 Persistence mode: ${persistenceMode}`);

      if (persistenceMode === 'file-only') {
        await this.saveToFileOnly();
      } else {
        await this.saveDatabaseFirst();
      }
    } catch (error) {
      console.error('Failed to persist exploration state:', error);
    }
  }

  /**
   * Get persistence mode based on environment configuration
   */
  private getPersistenceMode(): 'database-first' | 'file-only' {
    if (process.env.NODE_ENV === 'production') {
      return 'database-first'; // Production always uses database
    }
    
    // Development: Check environment variable
    const devMode = process.env.NEXT_PUBLIC_DEV_PERSISTENCE_MODE || 'database-first';
    return devMode as 'database-first' | 'file-only';
  }

  /**
   * Database-first persistence with file fallback
   */
  private async saveDatabaseFirst(): Promise<void> {
    try {
      // Primary: Save to database (tests production flow)
      await this.saveToDatabase();
    } catch (databaseError) {
      console.warn('📡 Database save failed, falling back to file system');
      
      // Fallback: Save to files for development continuity
      if (process.env.NODE_ENV === 'development') {
        await this.saveToFileOnly();
      } else {
        throw databaseError; // In production, fail fast
      }
    }
  }

  /**
   * File-only persistence for rapid development iteration
   */
  private async saveToFileOnly(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      if (this.devServerAvailable) {
        try {
          const result = await writeStateToDisk(this.profileName, this.currentState);
          if (result.success) {
            console.log('💾 File-only mode: Saved to companies.ts');
          } else {
            console.warn('Failed to write to companies.ts:', result.message);
            this.fallbackToConsoleLog();
          }
        } catch (error) {
          console.error('Error writing to file:', error);
          this.fallbackToConsoleLog();
        }
      } else {
        console.log('📝 Dev server not available, using console fallback');
        this.fallbackToConsoleLog();
      }
    }
  }

  /**
   * Save user state to database via API (Production & Development)
   */
  private async saveToDatabase(): Promise<void> {
    try {
      // In test environment, skip database calls
      if (process.env.VITEST || process.env.NODE_ENV === 'test') {
        throw new Error('Database calls disabled in test environment');
      }

      // Guard: the userId must be a valid UUID, otherwise the server will
      // reject the request with 403 ("Cannot modify another user's data").
      ExplorationStateManager.validateUserId(this.currentState.id);

      const response = await fetch('/api/user/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.currentState.id,
          userProfile: this.currentState.cmf,
          companies: [
            ...this.currentState.baseCompanies,
            ...this.currentState.addedCompanies
          ],
          preferences: {
            watchlist_company_ids: this.currentState.watchlistCompanyIds,
            removed_company_ids: this.currentState.removedCompanyIds,
            view_mode: this.currentState.viewMode
          }
        })
      });

      if (response.ok) {
        console.log('💾 Successfully saved user data to database');
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Failed to save user data to database:', errorText);
        throw new Error(`Database save failed: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error saving to database:', error);
      throw error; // Re-throw for fallback handling
    }
  }

  /**
   * Fallback to console logging when file writing isn't available
   */
  private fallbackToConsoleLog(): void {
    console.group('📝 Exploration State Updated');
    console.log('Copy this back to companies.ts:');
    console.log(JSON.stringify({
      addedCompanies: this.currentState.addedCompanies,
      removedCompanyIds: this.currentState.removedCompanyIds, 
      watchlistCompanyIds: this.currentState.watchlistCompanyIds,
      lastSelectedCompanyId: this.currentState.lastSelectedCompanyId,
      viewMode: this.currentState.viewMode
    }, null, 2));
    console.groupEnd();
  }

  /**
   * Manually trigger a file write (for development)
   */
  async writeToFile(): Promise<boolean> {
    if (process.env.NODE_ENV !== 'development') {
      // Only log warnings in non-test environments to avoid cluttering test output
      if (!process.env.VITEST) {
        console.warn('File writing only available in development mode');
      }
      return false;
    }

    try {
      const result = await writeStateToDisk(this.profileName, this.currentState);
      if (result.success) {
        console.log('✅ Successfully wrote current state to companies.ts');
        return true;
      } else {
        console.error('❌ Failed to write to companies.ts:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error writing to file:', error);
      return false;
    }
  }

  /**
   * Deep clone state object
   */
  private cloneState(state: UserExplorationState): UserExplorationState {
    return JSON.parse(JSON.stringify(state)) as UserExplorationState;
  }

  /**
   * Validates that a user ID is a proper UUID (as issued by Supabase Auth).
   * Throws with a descriptive error if a generated/placeholder ID is detected.
   * This prevents silent 403 errors when saving to the database.
   */
  static validateUserId(id: string): void {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(id)) {
      throw new Error(
        `Invalid userId for database save: "${id}". ` +
        `Expected a Supabase UUID. This usually means the profile was ` +
        `constructed with a generated ID instead of the authenticated user's ID.`
      );
    }
  }
}