/**
 * Custom hook for watchlist state management
 * Following 2025 React patterns with comprehensive error handling
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  WatchlistState, 
  WatchlistActions, 
  WatchlistStats, 
  StorageError 
} from '../types/watchlist';
import { Company } from '../types';
import {
  saveWatchlistToStorage,
  loadWatchlistFromStorage,
  clearWatchlistFromStorage,
  dispatchStorageChange,
} from '../utils/watchlistStorage';
import { track } from '../lib/analytics';

interface UseWatchlistOptions {
  userId?: string;
  companies: Company[];
  onError?: (error: StorageError) => void;
}

interface UseWatchlistReturn extends WatchlistState, WatchlistActions {
  watchlistCompanies: Company[];
  stats: WatchlistStats;
}

export const useWatchlist = (options: UseWatchlistOptions): UseWatchlistReturn => {
  const { userId, companies, onError } = options;

  const [companyIds, setCompanyIds] = useState<Set<number>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to avoid dependency issues with onError callback
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Handle storage errors consistently
  const handleError = useCallback((storageError: StorageError) => {
    const errorMessage = storageError.message;
    setError(errorMessage);
    
    if (onError) {
      onError(storageError);
    } else {
      // Log to console if no error handler provided
      console.error('Watchlist storage error:', storageError);
    }
  }, [onError]);

  // Load watchlist from storage on mount
  useEffect(() => {
    const loadWatchlist = () => {
      setIsLoading(true);
      setError(null);

      const result = loadWatchlistFromStorage(userId);
      
      if (result.error) {
        // Handle error inline to avoid dependency issues
        const errorMessage = result.error.message;
        setError(errorMessage);
        
        if (onErrorRef.current) {
          onErrorRef.current(result.error);
        } else {
          console.error('Watchlist storage error:', result.error);
        }
      } else {
        setCompanyIds(result.data);
        setLastUpdated(new Date());
        
        if (result.migrated) {
          console.info('Watchlist data migrated to new format');
        }
      }
      
      setIsLoading(false);
    };

    loadWatchlist();
  }, [userId]); // Only depend on userId now that we use ref for onError

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ companyIds: number[] }>;
      if (customEvent.detail) {
        setCompanyIds(new Set(customEvent.detail.companyIds));
        setLastUpdated(new Date());
      }
    };

    window.addEventListener('watchlist-storage-change', handleStorageChange);
    
    // Also listen for native storage events
    const handleNativeStorageChange = (event: StorageEvent) => {
      if ((event.key === 'cosmos-watchlist' || event.key === 'cmf-explorer-watchlist') && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as number[] | { companyIds: number[] };
          const ids: number[] = Array.isArray(parsed) ? parsed : parsed.companyIds ?? [];
          setCompanyIds(new Set(ids));
          setLastUpdated(new Date());
        } catch (error) {
          console.warn('Failed to parse storage change:', error);
        }
      }
    };

    window.addEventListener('storage', handleNativeStorageChange);

    return () => {
      window.removeEventListener('watchlist-storage-change', handleStorageChange);
      window.removeEventListener('storage', handleNativeStorageChange);
    };
  }, []);

  // Save to storage with error handling
  const saveToStorage = useCallback(async (newIds: Set<number>) => {
    const result = await saveWatchlistToStorage(newIds, userId);
    
    if (result.success) {
      // Dispatch change event for other hook instances
      dispatchStorageChange({
        userId,
        companyIds: Array.from(newIds),
        lastUpdated: new Date().toISOString(),
        version: 1,
      });
      setError(null);
    } else if (result.error) {
      handleError(result.error);
    }
    
    return result.success;
  }, [userId, handleError]);

  // Actions
  const addToWatchlist = useCallback(async (companyId: number) => {
    if (companyIds.has(companyId)) return;

    const newIds = new Set(companyIds);
    newIds.add(companyId);

    setCompanyIds(newIds);
    setLastUpdated(new Date());

    await saveToStorage(newIds);

    // Analytics: Track watchlist add
    track('company_added_to_watchlist', { company_id: companyId });
  }, [companyIds, saveToStorage]);

  const removeFromWatchlist = useCallback(async (companyId: number) => {
    if (!companyIds.has(companyId)) return;

    const newIds = new Set(companyIds);
    newIds.delete(companyId);

    setCompanyIds(newIds);
    setLastUpdated(new Date());

    await saveToStorage(newIds);

    // Analytics: Track watchlist remove
    track('company_removed_from_watchlist', { company_id: companyId });
  }, [companyIds, saveToStorage]);

  const toggleWatchlist = useCallback(async (companyId: number) => {
    if (companyIds.has(companyId)) {
      await removeFromWatchlist(companyId);
    } else {
      await addToWatchlist(companyId);
    }
  }, [companyIds, addToWatchlist, removeFromWatchlist]);

  const isInWatchlist = useCallback((companyId: number): boolean => {
    return companyIds.has(companyId);
  }, [companyIds]);

  const clearWatchlist = useCallback(async () => {
    setCompanyIds(new Set());
    setLastUpdated(new Date());
    
    const result = clearWatchlistFromStorage();
    if (!result.success && result.error) {
      handleError(result.error);
    }
  }, [handleError]);

  // Calculate statistics
  const getWatchlistStats = useCallback((): WatchlistStats => {
    const watchlistCompanies = companies.filter(company => companyIds.has(company.id));
    
    return {
      totalCompanies: watchlistCompanies.length,
      excellentMatches: watchlistCompanies.filter(company => company.matchScore >= 90).length,
      totalOpenRoles: watchlistCompanies.reduce((sum, company) => sum + company.openRoles, 0),
      lastActivity: companyIds.size > 0 ? lastUpdated : null,
    };
  }, [companies, companyIds, lastUpdated]);

  // Memoized watchlist companies
  const watchlistCompanies = useMemo(() => {
    return companies.filter(company => companyIds.has(company.id));
  }, [companies, companyIds]);

  // Memoized statistics
  const stats = useMemo(() => getWatchlistStats(), [getWatchlistStats]);

  return {
    // State
    companyIds,
    lastUpdated,
    isLoading,
    error,
    
    // Actions
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
    clearWatchlist,
    getWatchlistStats,
    
    // Computed values (bonus)
    watchlistCompanies,
    stats,
  };
};

/**
 * Simplified hook for components that only need to check membership
 */
export const useWatchlistCheck = (companyId: number, options: UseWatchlistOptions): boolean => {
  const { isInWatchlist } = useWatchlist(options);
  return isInWatchlist(companyId);
};

/**
 * Hook for components that only need watchlist statistics
 */
export const useWatchlistStats = (options: UseWatchlistOptions): WatchlistStats & { isLoading: boolean } => {
  const { stats, isLoading } = useWatchlist(options);
  return { ...stats, isLoading };
};