import { UserExplorationState } from '../types';
import type { Company } from '../types';
import { activeUserProfile } from '../data/companies';

/**
 * Migration utility for legacy localStorage state
 * 
 * Helps migrate existing watchlist and removed companies data
 * from localStorage to the new companies.ts format.
 */

export interface LegacyMigrationResult {
  success: boolean;
  migratedState?: Partial<UserExplorationState>;
  hasLegacyData: boolean;
  migrationSummary: string;
  codeToAdd?: string;
}

/**
 * Check if there's legacy localStorage data that can be migrated
 */
export const hasLegacyState = (): boolean => {
  try {
    const watchlistData = localStorage.getItem('cosmos-watchlist');
    const removedData = localStorage.getItem('cosmos-removed-companies');
    const customCompaniesData = localStorage.getItem('cosmos-custom-companies');
    
    return !!(watchlistData || removedData || customCompaniesData);
  } catch (error) {
    console.error('Error checking for legacy state:', error);
    return false;
  }
};

/**
 * Migrate legacy localStorage state to companies.ts format
 */
export const migrateLegacyState = (): LegacyMigrationResult => {
  try {
    const watchlistData = localStorage.getItem('cosmos-watchlist');
    const removedData = localStorage.getItem('cosmos-removed-companies');
    const customCompaniesData = localStorage.getItem('cosmos-custom-companies');
    
    if (!watchlistData && !removedData && !customCompaniesData) {
      return {
        success: true,
        hasLegacyData: false,
        migrationSummary: 'No legacy data found to migrate.'
      };
    }

    // Parse legacy data
    const watchlistIds = watchlistData ? JSON.parse(watchlistData) as number[] : [];
    const removedIds = removedData ? JSON.parse(removedData) as number[] : [];
    const customCompanies = customCompaniesData ? JSON.parse(customCompaniesData) as Company[] : [];
    
    // Convert Sets to Arrays if needed
    const watchlistArray: number[] = Array.isArray(watchlistIds) ? watchlistIds : Array.from(watchlistIds) as number[];
    const removedArray: number[] = Array.isArray(removedIds) ? removedIds : Array.from(removedIds) as number[];
    
    // Create migrated state
    const migratedState: Partial<UserExplorationState> = {
      watchlistCompanyIds: watchlistArray,
      removedCompanyIds: removedArray,
      addedCompanies: Array.isArray(customCompanies) ? customCompanies : []
    };
    
    // Generate code snippet for companies.ts
    const codeToAdd = generateCompaniesCodeSnippet(migratedState);
    
    // Create migration summary
    const summary = createMigrationSummary(watchlistArray, removedArray, customCompanies);
    
    console.group('🔄 Legacy State Migration');
    console.log('Found legacy data:');
    console.log('- Watchlist companies:', watchlistArray.length);
    console.log('- Removed companies:', removedArray.length);
    console.log('- Custom companies:', customCompanies.length);
    console.log('\n📋 Code to add to companies.ts:');
    console.log(codeToAdd);
    console.groupEnd();
    
    return {
      success: true,
      migratedState,
      hasLegacyData: true,
      migrationSummary: summary,
      codeToAdd
    };
  } catch (error) {
    console.error('Failed to migrate legacy state:', error);
    return {
      success: false,
      hasLegacyData: true,
      migrationSummary: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Apply migrated state to current active profile (for testing)
 */
export const applyMigratedState = (migratedState: Partial<UserExplorationState>): UserExplorationState => {
  return {
    ...activeUserProfile,
    ...migratedState,
    // Ensure arrays are properly set
    watchlistCompanyIds: migratedState.watchlistCompanyIds || [],
    removedCompanyIds: migratedState.removedCompanyIds || [],
    addedCompanies: migratedState.addedCompanies || []
  };
};

/**
 * Clear legacy localStorage data after successful migration
 */
export const clearLegacyState = (): void => {
  try {
    localStorage.removeItem('cosmos-watchlist');
    localStorage.removeItem('cosmos-removed-companies');
    localStorage.removeItem('cosmos-custom-companies');
    
    console.log('✅ Legacy localStorage data cleared');
  } catch (error) {
    console.error('Failed to clear legacy state:', error);
  }
};

/**
 * Generate code snippet to add to companies.ts
 */
function generateCompaniesCodeSnippet(migratedState: Partial<UserExplorationState>): string {
  const { watchlistCompanyIds = [], removedCompanyIds = [], addedCompanies = [] } = migratedState;
  
  return `// Migrated from localStorage - update your active user profile:
{
  ...yourExistingProfile,
  watchlistCompanyIds: ${JSON.stringify(watchlistCompanyIds, null, 4)},
  removedCompanyIds: ${JSON.stringify(removedCompanyIds, null, 4)},
  addedCompanies: ${JSON.stringify(addedCompanies, null, 4)}
}`;
}

/**
 * Create human-readable migration summary
 */
function createMigrationSummary(
  watchlistIds: number[],
  removedIds: number[],
  customCompanies: Company[]
): string {
  const parts = [];
  
  if (watchlistIds.length > 0) {
    parts.push(`${watchlistIds.length} watchlisted companies`);
  }
  
  if (removedIds.length > 0) {
    parts.push(`${removedIds.length} removed companies`);
  }
  
  if (customCompanies.length > 0) {
    parts.push(`${customCompanies.length} custom companies`);
  }
  
  if (parts.length === 0) {
    return 'No legacy data found.';
  }
  
  return `Found legacy data: ${parts.join(', ')}. Code snippet generated for companies.ts integration.`;
}

/**
 * Development helper: Log migration instructions
 */
export const logMigrationInstructions = (result: LegacyMigrationResult): void => {
  if (!result.hasLegacyData) {
    console.log('ℹ️ No legacy data migration needed.');
    return;
  }
  
  console.group('📚 Migration Instructions');
  console.log('1. Copy the generated code snippet to your user profile in companies.ts');
  console.log('2. Replace the relevant fields in your active user profile');
  console.log('3. Save the file and reload the application');
  console.log('4. Verify that your watchlist and removed companies are preserved');
  console.log('5. Run clearLegacyState() to clean up old localStorage data');
  console.log('\n💡 Tip: You can also use applyMigratedState() for testing');
  console.groupEnd();
};

/**
 * Auto-migration utility (use with caution in development)
 */
export const autoMigrate = (): boolean => {
  const result = migrateLegacyState();
  
  if (!result.success || !result.hasLegacyData) {
    return false;
  }
  
  logMigrationInstructions(result);
  
  // In development, we can provide helpful logging
  if (process.env.NODE_ENV === 'development' && result.codeToAdd) {
    console.log('\n🔧 Auto-migration code (copy to companies.ts):');
    console.log(result.codeToAdd);
  }
  
  return true;
};

// Export utility functions for console usage
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as unknown as Window & { migrationUtils: Record<string, unknown> }).migrationUtils = {
    hasLegacyState,
    migrateLegacyState,
    applyMigratedState,
    clearLegacyState,
    logMigrationInstructions,
    autoMigrate
  };
  
  console.log('🛠️ Migration utils available via window.migrationUtils');
}