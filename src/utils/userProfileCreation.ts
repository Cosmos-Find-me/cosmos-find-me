import { UserExplorationState, UserCMF } from '../types';

/**
 * Profile Creation Utilities
 * 
 * This module provides extensible user profile creation functions.
 * Future agentic workflows can easily integrate by adding new profile creators.
 */

// ==========================================
// CORE PROFILE CREATION FUNCTIONS
// ==========================================

/**
 * Creates an empty user profile for new users
 */
export const createEmptyUserProfile = (userId: string, userName?: string): UserExplorationState => ({
  id: userId,
  name: userName || 'New User',
  cmf: createEmptyUserCMF(userId, userName),
  baseCompanies: [], // Empty - will be populated by future agentic workflows
  addedCompanies: [],
  watchlistCompanyIds: [],
  removedCompanyIds: [],
  lastSelectedCompanyId: undefined,
  viewMode: 'explore'
});

/**
 * Creates an empty CMF (Career & Market Fit) profile
 */
export const createEmptyUserCMF = (userId: string, userName?: string): UserCMF => ({
  id: userId,
  name: userName || 'New User',
  targetRole: '',
  mustHaves: [],
  wantToHave: [],
  experience: [],
  targetCompanies: ''
});

// ==========================================
// EXTENSIBLE PROFILE CREATION SYSTEM
// ==========================================

/**
 * Profile Creation Methods
 * Add new methods here as they become available
 */
export type ProfileCreationMethod = 
  | 'empty'           // Creates empty profile (current default)
  | 'agentic'         // Future: AI-powered profile generation
  | 'import'          // Import from companies.ts file
  | 'template';       // Future: Use predefined templates

/**
 * Profile Creation Context
 * Contains all information needed for profile creation
 */
export interface ProfileCreationContext {
  userId: string;
  userName?: string;
  email?: string;
  // Future extension points:
  resumeFile?: File;
  cmfFile?: File;
  linkedinProfile?: string;
  preferences?: Record<string, unknown>;
}

/**
 * Main Profile Creator - Extensible Entry Point
 * 
 * This is where future agentic workflows will plug in.
 * Example future usage:
 * 
 * await createUserProfile('agentic', {
 *   userId: 'user-123',
 *   resumeFile: resumeFile,
 *   cmfFile: cmfFile
 * });
 */
export const createUserProfile = async (
  method: ProfileCreationMethod,
  context: ProfileCreationContext
): Promise<UserExplorationState> => {
  
  switch (method) {
    case 'empty':
      return createEmptyUserProfile(context.userId, context.userName);
    
    case 'import': {
      // Use local companies.ts fallback (development only)
      const { activeUserProfile } = await import('../data/companies');
      return {
        ...activeUserProfile,
        id: context.userId,
        name: context.userName || activeUserProfile.name
      };
    }
    
    case 'agentic':
      // TODO: Future agentic workflow integration point
      // This is where AI-powered profile generation will happen:
      // return await generateProfileWithAI(context);
      throw new Error('Agentic profile creation not yet implemented');
    
    case 'template':
      // TODO: Template-based profile creation
      throw new Error('Template method not yet implemented');
    
    default:
      // Default to empty profile for safety
      return createEmptyUserProfile(context.userId, context.userName);
  }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Determines which profile creation method to use
 * Based on environment, user state, and available data
 */
export const determineProfileCreationMethod = (
  _context: ProfileCreationContext,
  _isNewUser: boolean = true
): ProfileCreationMethod => {
  
  // Check for local fallback environment variable (development override)
  if (process.env.NEXT_PUBLIC_USE_LOCAL_FALLBACK === 'true') {
    console.log('🔧 Using local companies.ts fallback (NEXT_PUBLIC_USE_LOCAL_FALLBACK=true)');
    return 'import'; // Use companies.ts fallback for development
  }
  
  // Future: Check if agentic workflow is available
  // if (context.resumeFile && context.cmfFile && isAgenticServiceAvailable()) {
  //   return 'agentic';
  // }
  
  // Default: empty profile for new users
  return 'empty';
};

/**
 * Profile Creation Factory - High-level interface
 * 
 * This function encapsulates the entire profile creation logic
 * and can be easily called from anywhere in the application.
 */
export const createProfileForUser = async (
  context: ProfileCreationContext,
  isNewUser: boolean = true
): Promise<UserExplorationState> => {
  
  const method = determineProfileCreationMethod(context, isNewUser);
  
  console.log(`🔧 Creating user profile using method: ${method}`, {
    userId: context.userId,
    userName: context.userName,
    isNewUser
  });
  
  try {
    return await createUserProfile(method, context);
  } catch (error) {
    console.error('Profile creation failed, falling back to empty profile:', error);
    return createEmptyUserProfile(context.userId, context.userName);
  }
};