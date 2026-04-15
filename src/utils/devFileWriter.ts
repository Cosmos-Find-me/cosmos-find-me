/**
 * Development File Writer Utility
 * 
 * Provides functionality to write exploration state back to companies.ts
 * during development. This enables persistent state changes that survive
 * browser refreshes and file edits.
 * 
 * NOTE: This is for development only - production apps should use a database.
 */

import { UserExplorationState } from '../types';

// Development server endpoint for file writing
const DEV_API_BASE = 'http://localhost:3001';

export interface FileWriteResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Write the current exploration state back to companies.ts
 */
export async function writeStateToDisk(
  profileName: string,
  state: UserExplorationState
): Promise<FileWriteResponse> {
  if (process.env.NODE_ENV !== 'development') {
    return {
      success: false,
      message: 'File writing is only available in development mode'
    };
  }

  try {
    const response = await fetch(`${DEV_API_BASE}/api/dev/write-companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileName,
        state
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as FileWriteResponse;
    return result;
  } catch (error) {
    // Only log errors in non-test environments to avoid cluttering test output
    if (!process.env.VITEST) {
      console.error('Failed to write to companies.ts:', error);
    }
    return {
      success: false,
      message: 'Failed to write to file',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if the development file server is available
 * DEPRECATED: Using Supabase for persistence now
 */
export async function checkDevServerAvailable(): Promise<boolean> {
  // Dev file server is deprecated - using Supabase for persistence
  // Return false to skip health checks and avoid console errors
  return false;
}

/**
 * Generate the updated companies.ts file content
 */
export function generateCompaniesFileContent(
  profileName: string,
  state: UserExplorationState
): string {
  const { baseCompanies, addedCompanies, removedCompanyIds, watchlistCompanyIds, lastSelectedCompanyId, viewMode, cmf } = state;

  return `import { Company, UserExplorationState } from '../types';

// Base company dataset - original data without user modifications
const baseCompanies: Company[] = ${JSON.stringify(baseCompanies, null, 2)};

// User profiles with complete exploration state
const ${profileName}: UserExplorationState = {
  id: "${state.id}",
  name: "${state.name}",
  cmf: ${JSON.stringify(cmf, null, 2)},
  baseCompanies: baseCompanies,
  addedCompanies: ${JSON.stringify(addedCompanies, null, 2)},
  removedCompanyIds: ${JSON.stringify(removedCompanyIds, null, 2)},
  watchlistCompanyIds: ${JSON.stringify(watchlistCompanyIds, null, 2)},
  lastSelectedCompanyId: ${lastSelectedCompanyId || 'undefined'},
  viewMode: '${viewMode}'
};

// Export the current active user (manually switch by changing this line)
export const activeUserProfile = ${profileName};

// Legacy exports for compatibility
export const sampleUserCMF = activeUserProfile.cmf;
export const sampleCompanies = activeUserProfile.baseCompanies;
`;
}

/**
 * Development utility to backup current companies.ts before writing
 */
export async function backupCompaniesFile(): Promise<FileWriteResponse> {
  if (process.env.NODE_ENV !== 'development') {
    return { success: false, message: 'Backup only available in development' };
  }

  try {
    const response = await fetch(`${DEV_API_BASE}/api/dev/backup-companies`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json() as FileWriteResponse;
  } catch (error) {
    return {
      success: false,
      message: 'Failed to backup file',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Development helper to show file write instructions in console
 */
export function logFileWriteInstructions(state: UserExplorationState): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.group('📁 Development File Writing Available');
  console.log('Your exploration state can be automatically saved to companies.ts');
  console.log('Current state summary:');
  console.log(`- Added companies: ${state.addedCompanies.length}`);
  console.log(`- Removed companies: ${state.removedCompanyIds.length}`);
  console.log(`- Watchlisted companies: ${state.watchlistCompanyIds.length}`);
  console.log(`- Current view: ${state.viewMode}`);
  console.log(`- Last selected: ${state.lastSelectedCompanyId || 'none'}`);
  console.log('');
  console.log('🔧 To enable automatic file writing:');
  console.log('1. Run the development file server: npm run dev:file-server');
  console.log('2. Or manually copy the JSON logged above to companies.ts');
  console.groupEnd();
}