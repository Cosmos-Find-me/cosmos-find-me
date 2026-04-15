/**
 * Company State Manager
 *
 * Handles state management, persistence, and synchronization for custom companies.
 * Provides localStorage integration with error handling and cross-tab synchronization.
 */

import { Company } from '../types';
import { getColorForScore } from './companyPositioning';

interface CompanyStateData {
  companies: Partial<Company>[];
  lastUpdated: string;
  version: number;
}

interface ImportData {
  companies: Partial<Company>[];
}

interface CompaniesUpdatedEvent extends CustomEvent {
  detail: { companies: Company[] };
}


const STORAGE_KEY = 'cmf-custom-companies';
const STORAGE_VERSION = 1;

/**
 * Save custom companies to localStorage with error handling
 */
export const saveCustomCompanies = async (companies: Company[]): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    const stateData: CompanyStateData = {
      companies,
      lastUpdated: new Date().toISOString(),
      version: STORAGE_VERSION
    };
    
    const serialized = JSON.stringify(stateData);
    
    // Check storage quota before saving
    if (serialized.length > 4.5 * 1024 * 1024) { // ~4.5MB limit for safety
      return {
        success: false,
        error: 'Too much data to store locally. Consider removing some companies.'
      };
    }
    
    localStorage.setItem(STORAGE_KEY, serialized);
    
    // Dispatch custom event for cross-tab synchronization
    window.dispatchEvent(new CustomEvent('customCompaniesUpdated', {
      detail: { companies }
    }));
    
    return { success: true };
  } catch (error) {
    console.error('Failed to save custom companies:', error);
    
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      return {
        success: false,
        error: 'Storage quota exceeded. Please clear some data or contact support.'
      };
    }
    
    return {
      success: false,
      error: 'Failed to save companies. Please try again.'
    };
  }
};

/**
 * Load custom companies from localStorage with error handling
 */
export const loadCustomCompanies = (): {
  companies: Company[];
  error?: string;
} => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (!stored) {
      return { companies: [] };
    }
    
    const stateData = JSON.parse(stored) as CompanyStateData;
    
    // Version compatibility check
    if (stateData.version !== STORAGE_VERSION) {
      console.warn('Stored companies data version mismatch, clearing...');
      localStorage.removeItem(STORAGE_KEY);
      return { companies: [] };
    }
    
    // Validate company data structure
    const validatedCompanies = validateCompaniesData(stateData.companies);
    
    return { companies: validatedCompanies };
  } catch (error) {
    console.error('Failed to load custom companies:', error);
    
    // Clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore cleanup errors
    }
    
    return {
      companies: [],
      error: 'Failed to load saved companies. Starting fresh.'
    };
  }
};

/**
 * Add a new company to the list and persist it
 */
export const addCustomCompany = async (
  newCompany: Company,
  existingCompanies: Company[]
): Promise<{
  success: boolean;
  companies: Company[];
  error?: string;
}> => {
  try {
    // Check for duplicates
    const isDuplicate = existingCompanies.some(company => 
      company.name.toLowerCase() === newCompany.name.toLowerCase() ||
      company.id === newCompany.id
    );
    
    if (isDuplicate) {
      return {
        success: false,
        companies: existingCompanies,
        error: 'Company already exists in your exploration.'
      };
    }
    
    const updatedCompanies = [...existingCompanies, newCompany];
    const saveResult = await saveCustomCompanies(updatedCompanies);
    
    if (!saveResult.success) {
      return {
        success: false,
        companies: existingCompanies,
        error: saveResult.error
      };
    }
    
    return {
      success: true,
      companies: updatedCompanies
    };
  } catch (error) {
    console.error('Failed to add custom company:', error);
    return {
      success: false,
      companies: existingCompanies,
      error: 'Failed to add company. Please try again.'
    };
  }
};

/**
 * Remove a company from the list and persist changes
 */
export const removeCustomCompany = async (
  companyId: number,
  existingCompanies: Company[]
): Promise<{
  success: boolean;
  companies: Company[];
  removedCompany?: Company;
  error?: string;
}> => {
  try {
    const companyToRemove = existingCompanies.find(c => c.id === companyId);
    
    if (!companyToRemove) {
      return {
        success: false,
        companies: existingCompanies,
        error: 'Company not found.'
      };
    }
    
    const updatedCompanies = existingCompanies.filter(c => c.id !== companyId);
    const saveResult = await saveCustomCompanies(updatedCompanies);
    
    if (!saveResult.success) {
      return {
        success: false,
        companies: existingCompanies,
        error: saveResult.error
      };
    }
    
    return {
      success: true,
      companies: updatedCompanies,
      removedCompany: companyToRemove
    };
  } catch (error) {
    console.error('Failed to remove custom company:', error);
    return {
      success: false,
      companies: existingCompanies,
      error: 'Failed to remove company. Please try again.'
    };
  }
};

/**
 * Validate company data structure and fix common issues
 */
const validateCompaniesData = (companies: Partial<Company>[]): Company[] => {
  if (!Array.isArray(companies)) {
    return [];
  }
  
  return companies.filter((company): company is Company => {
    // Basic required fields check
    if (typeof company !== 'object' || company === null) return false;
    if (typeof company.id !== 'number') return false;
    if (typeof company.name !== 'string' || !company.name.trim()) return false;
    if (typeof company.matchScore !== 'number' || company.matchScore < 0 || company.matchScore > 100) return false;
    
    // Fix missing optional fields
    company.logo = company.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=random`;
    company.industry = company.industry || 'Technology';
    company.stage = company.stage || 'Unknown';
    company.location = company.location || 'Unknown';
    company.employees = company.employees || 'Unknown';
    company.remote = company.remote || 'Unknown';
    company.openRoles = typeof company.openRoles === 'number' ? company.openRoles : 0;
    company.connections = Array.isArray(company.connections) ? company.connections : [];
    company.connectionTypes = typeof company.connectionTypes === 'object' && company.connectionTypes ? company.connectionTypes : {};
    company.matchReasons = Array.isArray(company.matchReasons) ? company.matchReasons : [];
    company.color = getColorForScore(company.matchScore || 0);
    company.angle = typeof company.angle === 'number' ? company.angle : Math.random() * 360;
    company.distance = typeof company.distance === 'number' ? company.distance : 150;
    company.careerUrl = company.careerUrl || `https://${company.name.toLowerCase().replace(/\s+/g, '')}.com/careers`;
    
    return true;
  });
};

/**
 * Get storage usage statistics
 */
export const getStorageStats = (): {
  used: number;
  available: number;
  companiesCount: number;
  usagePercentage: number;
} => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const usedBytes = stored ? new Blob([stored]).size : 0;
    const availableBytes = 5 * 1024 * 1024; // Assume 5MB localStorage limit
    
    const { companies } = loadCustomCompanies();
    
    return {
      used: usedBytes,
      available: availableBytes,
      companiesCount: companies.length,
      usagePercentage: (usedBytes / availableBytes) * 100
    };
  } catch {
    return {
      used: 0,
      available: 5 * 1024 * 1024,
      companiesCount: 0,
      usagePercentage: 0
    };
  }
};

/**
 * Clear all custom companies from storage
 */
export const clearCustomCompanies = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    
    // Dispatch custom event for cross-tab synchronization
    window.dispatchEvent(new CustomEvent('customCompaniesUpdated', {
      detail: { companies: [] }
    }));
    
    return { success: true };
  } catch (error) {
    console.error('Failed to clear custom companies:', error);
    return {
      success: false,
      error: 'Failed to clear companies. Please try again.'
    };
  }
};

/**
 * Setup cross-tab synchronization listener
 */
export const setupCrossTabSync = (
  onCompaniesUpdated: (companies: Company[]) => void
): (() => void) => {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      const { companies } = loadCustomCompanies();
      onCompaniesUpdated(companies);
    }
  };
  
  const handleCustomEvent = (event: CompaniesUpdatedEvent) => {
    onCompaniesUpdated(event.detail.companies);
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('customCompaniesUpdated', handleCustomEvent as EventListener);

  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('customCompaniesUpdated', handleCustomEvent as EventListener);
  };
};

/**
 * Export companies data for backup
 */
export const exportCompaniesData = (): string => {
  const { companies } = loadCustomCompanies();
  const exportData = {
    companies,
    exportDate: new Date().toISOString(),
    version: STORAGE_VERSION
  };
  
  return JSON.stringify(exportData, null, 2);
};

/**
 * Import companies data from backup
 */
export const importCompaniesData = async (jsonData: string): Promise<{
  success: boolean;
  companiesCount: number;
  error?: string;
}> => {
  try {
    const importData = JSON.parse(jsonData) as ImportData;

    if (!importData.companies || !Array.isArray(importData.companies)) {
      return {
        success: false,
        companiesCount: 0,
        error: 'Invalid import data format.'
      };
    }
    
    const validatedCompanies = validateCompaniesData(importData.companies);
    const saveResult = await saveCustomCompanies(validatedCompanies);
    
    if (!saveResult.success) {
      return {
        success: false,
        companiesCount: 0,
        error: saveResult.error
      };
    }
    
    return {
      success: true,
      companiesCount: validatedCompanies.length
    };
  } catch (error) {
    console.error('Failed to import companies data:', error);
    return {
      success: false,
      companiesCount: 0,
      error: 'Failed to parse import data. Please check the file format.'
    };
  }
};