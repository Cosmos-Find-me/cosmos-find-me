import React, { useState, useEffect, useCallback } from 'react';
import DreamyFirstContact from './DreamyFirstContact';
import CMFGraphExplorerNew from './CMFGraphExplorerNew';
import { createUserProfileFromFiles } from '../utils/fileProcessing';
import { UserExplorationState, UserCMF, Company } from '../types';
import { ProfileStatus } from '../types/database';
import { activeUserProfile } from '../data/companies';
import { createProfileForUser } from '../utils/userProfileCreation';
import { migrateCompanyLogos } from '../utils/logoMigration';
import { mergeUserPreferences, UserPreferencesFromProfile, UserPreferencesFromTable } from '../utils/userPreferencesMerger';
import { track } from '../lib/analytics';
import { useDataSync, DataVersionTimestamps } from '../hooks/useDataSync';

interface UserCompanyData {
  user_id: string;
  updated_at?: string;
  user_profile?: UserPreferencesFromProfile & {
    name?: string;
    cmf?: unknown;
    baseCompanies?: unknown[];
    addedCompanies?: unknown[];
    [key: string]: unknown;
  };
  companies?: unknown[];
  [key: string]: unknown;
}

interface UserDataResponse {
  authenticated?: boolean;
  hasData?: boolean;
  userId: string;
  profileStatus?: ProfileStatus;
  isViewingAsUser?: boolean;
  viewedUserInfo?: { email: string; full_name: string };
  companyData?: UserCompanyData;
  preferences?: UserPreferencesFromTable & { updated_at?: string };
}

const AppContainer: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserExplorationState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [_isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasCompletedDataCheck, setHasCompletedDataCheck] = useState(false);
  const [isViewingAsUser, setIsViewingAsUser] = useState(false);
  const [viewedUserInfo, setViewedUserInfo] = useState<{ email: string; full_name: string } | null>(null);
  // Profile status from Supabase - replaces localStorage-based useFirstTimeExperience
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('pending');
  const [userId, setUserId] = useState<string | null>(null);
  const [dataVersions, setDataVersions] = useState<DataVersionTimestamps | null>(null);

  // Check authentication and load user data from the API
  const checkAuthAndLoadData = useCallback(async () => {
    try {
      // Check for URL params
      const urlParams = new URLSearchParams(window.location.search);
      const viewAsUserId = urlParams.get('viewAsUserId');
      const resetOnboarding = urlParams.get('reset-onboarding');

      // Handle reset-onboarding param (for dev/testing)
      if (resetOnboarding === 'true') {
        console.log('🔄 Reset onboarding requested via URL param');
        try {
          const resetResponse = await fetch('/api/user/reset-onboarding', { method: 'POST' });
          if (resetResponse.ok) {
            console.log('✅ Onboarding reset successful, reloading...');
            // Remove the param and reload
            window.location.href = window.location.pathname;
            return;
          } else {
            console.error('Failed to reset onboarding:', await resetResponse.text());
          }
        } catch (error) {
          console.error('Error resetting onboarding:', error);
        }
      }

      // Build API URL with viewAsUserId param if present
      let apiUrl = '/api/user/data';
      if (viewAsUserId) {
        apiUrl += `?viewAsUserId=${viewAsUserId}`;
      }

      // Always check authentication first, regardless of first-time status
      const response = await fetch(apiUrl);
      const userData = await response.json() as UserDataResponse;

      // Track if we're viewing as another user
      if (userData.isViewingAsUser) {
        setIsViewingAsUser(true);
        setViewedUserInfo(userData.viewedUserInfo || null);
      }

      // Check if user is authenticated using the authenticated field
      const userIsAuthenticated = userData.authenticated !== false;
      setIsAuthenticated(userIsAuthenticated);

      if (!userIsAuthenticated) {
        // User is not authenticated, redirect to login
        console.log('🚨 SECURITY: User not authenticated, redirecting to login');
        setAuthLoading(false);
        window.location.href = '/login';
        return;
      }

      // User is authenticated - now handle data loading
      console.log('🔍 AppContainer userData analysis:', {
        hasData: userData.hasData,
        hasCompanyData: !!userData.companyData,
        companyDataKeys: userData.companyData ? Object.keys(userData.companyData) : null,
        userId: userData.userId,
        profileStatus: userData.profileStatus
      });

      // Store userId and profileStatus from Supabase
      setUserId(userData.userId);
      setProfileStatus(userData.profileStatus || 'pending');

      if (userData.hasData && userData.companyData) {
        // Existing user with data
        console.log('✅ User has data, profile_status:', userData.profileStatus);

        const dbUserProfile = userData.companyData.user_profile;
        const dbCompanies = userData.companyData.companies;

        // Migrate logo URLs from Clearbit to Logo.dev
        // Use baseCompanies if it has data, otherwise fall back to companies array
        const baseCompanies = (dbUserProfile?.baseCompanies && dbUserProfile.baseCompanies.length > 0)
          ? dbUserProfile.baseCompanies
          : (dbCompanies || []);
        const addedCompanies = dbUserProfile?.addedCompanies || [];

        // Merge preferences from both sources using centralized utility
        const mergedPreferences = mergeUserPreferences(dbUserProfile, userData.preferences);

        // Debug: trace the full preferences merge pipeline (#130)
        console.log('🔍 [SYNC DEBUG] AppContainer merge pipeline:', {
          // Source 1: JSONB profile (legacy fallback)
          profilePrefs: {
            watchlistCompanyIds: dbUserProfile?.watchlistCompanyIds ?? 'UNDEFINED',
            removedCompanyIds: dbUserProfile?.removedCompanyIds ?? 'UNDEFINED',
            viewMode: dbUserProfile?.viewMode ?? 'UNDEFINED',
          },
          // Source 2: user_preferences table (source of truth)
          tablePrefs: {
            watchlist_company_ids: userData.preferences?.watchlist_company_ids ?? 'UNDEFINED',
            removed_company_ids: userData.preferences?.removed_company_ids ?? 'UNDEFINED',
            view_mode: userData.preferences?.view_mode ?? 'UNDEFINED',
          },
          // Merge result
          merged: mergedPreferences,
        });

        const customProfile: UserExplorationState = {
          ...activeUserProfile, // Use as base structure
          id: userData.companyData.user_id,
          name: dbUserProfile?.name || 'User',
          cmf: (dbUserProfile?.cmf ?? dbUserProfile) as UserCMF,
          // Handle UserExplorationState format from admin import - with logo migration
          baseCompanies: migrateCompanyLogos(baseCompanies as Company[]),
          addedCompanies: migrateCompanyLogos(addedCompanies as Company[]),
          // Use merged preferences from centralized utility
          watchlistCompanyIds: mergedPreferences.watchlistCompanyIds,
          removedCompanyIds: mergedPreferences.removedCompanyIds,
          viewMode: mergedPreferences.viewMode
        };

        setUserProfile(customProfile);

        // Track server timestamps for data sync detection
        setDataVersions({
          companyDataUpdatedAt: userData.companyData.updated_at ?? null,
          preferencesUpdatedAt: userData.preferences?.updated_at ?? null,
        });
      } else {
        // Authenticated but no data - new user (will show first-time experience)
        console.log('❌ User has no data, will show first-time experience');

        // Use the real user ID from the API response
        const realUserId = userData.userId;

        // Clear localStorage only if NOT using local fallback
        if (process.env.NEXT_PUBLIC_USE_LOCAL_FALLBACK !== 'true') {
          // Clear new cosmos keys
          localStorage.removeItem('cosmos-exploration-state');
          localStorage.removeItem('cosmos-watchlist');
          localStorage.removeItem('cosmos-custom-companies');
          localStorage.removeItem('cosmos-removed-companies');
          // Also clear legacy keys for backwards compatibility
          localStorage.removeItem('cmf-exploration-state');
          localStorage.removeItem('cmf-explorer-watchlist');
          localStorage.removeItem('cmf-explorer-custom-companies');
          localStorage.removeItem('cmf-explorer-removed-companies');
          localStorage.removeItem('cmf-watchlist-state');
          localStorage.removeItem('cmf-removed-companies');
        }

        const newProfile = await createProfileForUser({
          userId: realUserId, // Use real Supabase user ID
          userName: 'New User'
        }, true);

        setUserProfile(newProfile);
      }

      // Mark that we've completed the data check
      setHasCompletedDataCheck(true);
    } catch (error) {
      console.error('Error during auth check and data loading:', error);

      // On error, redirect to login for safety
      window.location.href = '/login';
    } finally {
      setDataLoading(false);
      setAuthLoading(false);
    }
  }, []);

  // Initial data load on mount
  useEffect(() => {
    checkAuthAndLoadData();
  }, [checkAuthAndLoadData]);

  // Sync data when returning to the app (visibility change)
  useDataSync({
    knownVersions: dataVersions,
    onStaleData: checkAuthAndLoadData,
    enabled: hasCompletedDataCheck,
  });

  const handleFirstTimeComplete = async (resumeFile: File, cmfFile: File) => {
    setIsLoading(true);

    try {
      // Process the uploaded files and discover companies using Perplexity
      // Returns: { id, name, cmf: {...}, baseCompanies: [...] }
      const discoveryData = await createUserProfileFromFiles(resumeFile, cmfFile, userId!);

      console.log('📦 Received discovery data:', {
        name: discoveryData.name,
        cmf: discoveryData.cmf,
        companiesCount: discoveryData.baseCompanies?.length || 0
      });

      // Create new user exploration state with the discovered profile and companies
      // IMPORTANT: Use the real Supabase user ID (not the generated one from discovery)
      // so that ExplorationStateManager.persistState() can save to the database.
      const newUserProfile: UserExplorationState = {
        ...activeUserProfile,
        id: userId!,
        name: discoveryData.name || discoveryData.cmf.name,
        cmf: discoveryData.cmf,
        baseCompanies: discoveryData.baseCompanies || [],
        addedCompanies: [], // User hasn't manually added any yet
        removedCompanyIds: [],
        watchlistCompanyIds: [],
        viewMode: 'explore'
      };

      console.log('✅ Created user profile with', newUserProfile.baseCompanies.length, 'companies');

      // Save profile data AND update profile_status to 'complete' in Supabase
      if (userId) {
        try {
          await fetch('/api/user/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              profileStatus: 'complete',
              // Save the full profile data (CMF + companies)
              userProfile: newUserProfile.cmf,
              companies: [
                ...newUserProfile.baseCompanies,
                ...newUserProfile.addedCompanies
              ],
              preferences: {
                watchlist_company_ids: newUserProfile.watchlistCompanyIds,
                removed_company_ids: newUserProfile.removedCompanyIds,
                view_mode: newUserProfile.viewMode
              }
            })
          });
          setProfileStatus('complete');
          console.log('✅ Saved user profile and companies to Supabase');
        } catch (error) {
          console.error('Failed to save profile data:', error);
          // Continue anyway - the user can still use the app
        }
      }

      // Simulate processing time for dramatic effect (let user read "universe awakening" message)
      setTimeout(() => {
        setUserProfile(newUserProfile);
        setIsLoading(false);
        setIsTransitioning(true);

        // Analytics: Track onboarding completed
        const companyCount = (newUserProfile.baseCompanies?.length || 0) + (newUserProfile.addedCompanies?.length || 0);
        track('onboarding_completed', { company_count: companyCount });

        // After a brief transition, remove transition state
        setTimeout(() => {
          setIsTransitioning(false);
        }, 1000);
      }, 3000);

    } catch (error) {
      console.error('❌ Error processing files:', error);

      // Show error to user instead of silently falling back
      const errorMessage = error instanceof Error ? error.message : 'Failed to process files';

      setIsLoading(false);

      // Show user-friendly error message
      alert(
        `🔍 Company Discovery Failed\n\n` +
        `${errorMessage}\n\n` +
        `What you can try:\n` +
        `• Check that your PERPLEXITY_API_KEY is configured correctly\n` +
        `• Verify your files are readable (PDF/TXT/DOCX)\n` +
        `• Try uploading different files\n` +
        `• Contact support if the issue persists`
      );

      // Don't mark as visited - let them try again on the first-time screen
    }
  };

  // Loading state during universe generation
  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden" style={{ minHeight: '100vh' }}>
        {/* Floating cosmic particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-pulse opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            >
              <div className="w-1 h-1 bg-blue-300 rounded-full" />
            </div>
          ))}
        </div>
        
        <div className="text-center px-4">
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full mx-auto animate-pulse shadow-2xl" />
            <div className="absolute inset-0 scale-150 opacity-20">
              <div className="w-32 h-32 bg-gradient-to-r from-orange-400 to-purple-500 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-6">
            🌟 Generating Your Universe 🌟
          </h1>
          <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
            Analyzing your profile and mapping perfect company matches...
          </p>
          
          <div className="flex justify-center space-x-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show dreamy first contact for first-time users (profile_status === 'pending')
  // Only after we've completed data check to avoid flash of wrong content
  // Check for skip-intro param (used by E2E tests and development)
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const skipIntro = urlParams?.get('skip-intro') === 'true';
  const isTestEnv = typeof window !== 'undefined' && (
    process.env.NODE_ENV === 'test' ||
    window.navigator.userAgent.includes('Playwright')
  );

  if (profileStatus === 'pending' && !authLoading && !dataLoading && hasCompletedDataCheck && !skipIntro && !isTestEnv) {
    return <DreamyFirstContact onComplete={handleFirstTimeComplete} />;
  }

  // Transition state - smooth fade from dark to light
  if (isTransitioning) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden" style={{ minHeight: '100vh' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-0 animate-pulse" 
             style={{ animationDuration: '2s', animationFillMode: 'forwards' }} />
        
        <div className="text-center px-4 relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full mx-auto animate-pulse shadow-2xl mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4 animate-fade-out">
            🚀 Launching Your Career Universe
          </h1>
          <p className="text-lg text-blue-200 animate-fade-out">
            Preparing your personalized company exploration...
          </p>
        </div>
      </div>
    );
  }

  // Floating stars component for cosmic background
  const FloatingStars = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        >
          <div className="w-1 h-1 bg-blue-300 rounded-full" />
        </div>
      ))}
    </div>
  );

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mx-auto animate-pulse shadow-2xl mb-4" />
          <p className="text-slate-600 text-lg">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Show the main graph explorer for returning users or after completion
  if (userProfile && hasCompletedDataCheck && !authLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden transition-all duration-1000" style={{ height: '100dvh', maxHeight: '100dvh' }}>
        <FloatingStars />

        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* View As User Banner */}
        {isViewingAsUser && viewedUserInfo && (
          <div className="absolute top-0 left-0 right-0 bg-purple-600 text-white px-4 py-3 z-50 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                <span className="font-semibold">
                  🔍 Viewing as: {viewedUserInfo.full_name || viewedUserInfo.email}
                </span>
                <span className="text-purple-200 text-sm">
                  ({viewedUserInfo.email})
                </span>
              </div>
              <button
                onClick={() => window.close()}
                className="bg-purple-700 hover:bg-purple-800 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        )}

        <div className="relative" style={{ marginTop: isViewingAsUser ? '52px' : '0' }}>
          <CMFGraphExplorerNew userProfile={userProfile} />
        </div>
      </div>
    );
  }

  // Show loading while fetching user data (only after auth is verified)
  if (dataLoading && !authLoading && profileStatus !== 'pending') {
    return (
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-purple-400 rounded-full mx-auto animate-pulse shadow-2xl mb-4" />
          <p className="text-white text-lg">Loading your personalized data...</p>
        </div>
      </div>
    );
  }

  // Loading state while checking first-time status (avoid blue background if auth is still loading)
  
  return (
    <div
      className={`flex items-center justify-center ${
        authLoading
          ? 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
          : 'bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900'
      }`}
      style={{ minHeight: '100vh' }}
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-300 to-purple-400 rounded-full mx-auto animate-pulse shadow-2xl mb-4" />
        <p className={`text-lg ${authLoading ? 'text-slate-600' : 'text-white'}`}>
          {authLoading ? 'Verifying authentication...' : 'Initializing...'}
        </p>
      </div>
    </div>
  );
};

export default AppContainer;