/**
 * Company Positioning Utility
 * 
 * Handles smart positioning of new companies in the graph with collision detection,
 * optimal placement algorithms, and connection mapping to existing companies.
 */

import { Company } from '../types';

interface Position {
  x: number;
  y: number;
}

interface PositionResult {
  angle: number;
  distance: number;
  position: Position;
}

// Graph configuration constants
const GRAPH_CENTER = { x: 400, y: 300 };
const MIN_COMPANY_DISTANCE = 75; // Minimum distance between company centers
const MAX_PLACEMENT_ATTEMPTS = 144; // Try every 2.5 degrees

/**
 * Find the optimal position for a new company in the graph
 * Uses intelligent collision detection and distance-based placement
 */
export const findOptimalPosition = (
  newCompany: Company, 
  existingCompanies: Company[]
): PositionResult => {
  const targetDistance = calculateDistanceFromScore(newCompany.matchScore);
  
  // Strategy 1: Try ideal distance with collision detection
  const idealPosition = findPositionAtDistance(targetDistance, existingCompanies);
  if (idealPosition) {
    return idealPosition;
  }
  
  // Strategy 2: Try expanding outward in rings
  for (let expansion = 20; expansion <= 80; expansion += 20) {
    const adjustedDistance = targetDistance + expansion;
    const expandedPosition = findPositionAtDistance(adjustedDistance, existingCompanies);
    if (expandedPosition) {
      return expandedPosition;
    }
  }
  
  // Strategy 3: Try shrinking inward (for very crowded areas)
  for (let contraction = 20; contraction <= 60; contraction += 20) {
    if (targetDistance - contraction > 60) { // Don't get too close to center
      const contractedDistance = targetDistance - contraction;
      const contractedPosition = findPositionAtDistance(contractedDistance, existingCompanies);
      if (contractedPosition) {
        return contractedPosition;
      }
    }
  }
  
  // Strategy 4: Find the least crowded sector
  const optimalSector = findLeastCrowdedSector(existingCompanies);
  const sectorPosition = findPositionInSector(
    optimalSector, 
    Math.max(targetDistance + 100, 250), 
    existingCompanies
  );
  
  if (sectorPosition) {
    return sectorPosition;
  }
  
  // Final fallback: outer ring with random angle
  return {
    angle: Math.floor(Math.random() * 360),
    distance: Math.max(targetDistance + 120, 280),
    position: calculatePositionFromAngle(
      Math.floor(Math.random() * 360), 
      Math.max(targetDistance + 120, 280)
    )
  };
};

/**
 * Try to find a position at a specific distance from center
 */
const findPositionAtDistance = (
  distance: number, 
  existingCompanies: Company[]
): PositionResult | null => {
  const angleStep = 360 / MAX_PLACEMENT_ATTEMPTS;
  
  // Start from a random angle to avoid clustering
  const startAngle = Math.random() * 360;
  
  for (let i = 0; i < MAX_PLACEMENT_ATTEMPTS; i++) {
    const angle = (startAngle + (i * angleStep)) % 360;
    const position = calculatePositionFromAngle(angle, distance);
    
    if (!hasPositionConflict(position, existingCompanies)) {
      return { angle, distance, position };
    }
  }
  
  return null;
};

/**
 * Find the least crowded 90-degree sector of the graph
 */
const findLeastCrowdedSector = (existingCompanies: Company[]): number => {
  const sectors = [0, 90, 180, 270]; // Four main sectors
  const sectorCounts = sectors.map(sectorStart => {
    return existingCompanies.filter(company => {
      if (company.angle === undefined) return false;
      const normalizedAngle = ((company.angle % 360) + 360) % 360;
      const sectorEnd = (sectorStart + 90) % 360;
      
      if (sectorStart <= sectorEnd) {
        return normalizedAngle >= sectorStart && normalizedAngle < sectorEnd;
      } else {
        return normalizedAngle >= sectorStart || normalizedAngle < sectorEnd;
      }
    }).length;
  });
  
  // Find sector with minimum companies
  const minCount = Math.min(...sectorCounts);
  const leastCrowdedIndex = sectorCounts.indexOf(minCount);
  return sectors[leastCrowdedIndex];
};

/**
 * Find a position within a specific 90-degree sector
 */
const findPositionInSector = (
  sectorStart: number,
  distance: number,
  existingCompanies: Company[]
): PositionResult | null => {
  const sectorRange = 90; // 90-degree sector
  const attempts = 36; // Try every 2.5 degrees within sector
  
  for (let i = 0; i < attempts; i++) {
    const angleOffset = (i * sectorRange) / attempts;
    const angle = (sectorStart + angleOffset) % 360;
    const position = calculatePositionFromAngle(angle, distance);
    
    if (!hasPositionConflict(position, existingCompanies)) {
      return { angle, distance, position };
    }
  }
  
  return null;
};

/**
 * Calculate position coordinates from angle and distance
 */
const calculatePositionFromAngle = (angle: number, distance: number): Position => {
  const radians = (angle * Math.PI) / 180;
  return {
    x: GRAPH_CENTER.x + Math.cos(radians) * distance,
    y: GRAPH_CENTER.y + Math.sin(radians) * distance
  };
};

/**
 * Check if a position conflicts with existing companies
 */
const hasPositionConflict = (
  newPosition: Position, 
  existingCompanies: Company[]
): boolean => {
  return existingCompanies.some(company => {
    const companyPosition = getCompanyPosition(company);
    const distance = calculateDistance(newPosition, companyPosition);
    return distance < MIN_COMPANY_DISTANCE;
  });
};

/**
 * Get the position of an existing company
 */
const getCompanyPosition = (company: Company): Position => {
  if (company.angle !== undefined && company.distance !== undefined) {
    return calculatePositionFromAngle(company.angle, company.distance);
  }
  
  // Fallback: estimate position based on match score
  const estimatedDistance = calculateDistanceFromScore(company.matchScore);
  const estimatedAngle = Math.random() * 360; // Random angle as fallback
  return calculatePositionFromAngle(estimatedAngle, estimatedDistance);
};

/**
 * Calculate distance between two positions
 */
const calculateDistance = (pos1: Position, pos2: Position): number => {
  return Math.sqrt(
    Math.pow(pos1.x - pos2.x, 2) + 
    Math.pow(pos1.y - pos2.y, 2)
  );
};

/**
 * Calculate optimal distance from center based on match score
 * Higher scores = closer to center
 */
export const calculateDistanceFromScore = (matchScore: number): number => {
  // Hybrid approach optimized for typical score distribution:
  // - 90-100%: few companies (5-8) → very compressed at 75-85px
  // - 70-89%: most companies → spread over 85-240px (main focus area)
  // - <70%: outliers → compressed at 240-300px

  if (matchScore >= 90) {
    // Top tier (90-100%): 5-8 companies, very compressed near center
    // Linear: 100% → 75px, 90% → 85px (10px range for 10%)
    const distance = 75 + ((100 - matchScore) / 10) * 10;
    return Math.round(distance);
  } else if (matchScore >= 70) {
    // Main range (70-89%): most companies, maximum spread for visual clarity
    // Linear: 90% → 85px, 70% → 240px (155px range for 20%)
    const distance = 85 + ((90 - matchScore) / 20) * 155;
    return Math.round(distance);
  } else {
    // Low scores (<70%): outliers, compressed far from center
    // Linear: 70% → 240px, 0% → 300px (60px range for 70%)
    const distance = 240 + ((70 - matchScore) / 70) * 60;
    return Math.round(distance);
  }
};

/**
 * Map company connections to existing companies using fuzzy matching
 * Returns connection IDs and relationship types for companies that exist in the graph
 */
export const mapConnectionsToExistingCompanies = (
  newCompany: Company, 
  existingCompanies: Company[]
): { connections: number[]; connectionTypes: Record<number, string> } => {
  const connections: number[] = [];
  const connectionTypes: Record<number, string> = {};

  // If the new company doesn't have connection data, try to infer some
  if (!newCompany.connectionTypes || Object.keys(newCompany.connectionTypes).length === 0) {
    // Find companies in the same industry
    const industryMatches = existingCompanies.filter(company => 
      company.industry === newCompany.industry && 
      company.id !== newCompany.id
    );
    
    // Connect to up to 2 companies in same industry
    industryMatches.slice(0, 2).forEach(company => {
      connections.push(company.id);
      connectionTypes[company.id] = 'Industry Peer';
    });

    return { connections, connectionTypes };
  }

  // Enhanced matching logic for explicit connections
  Object.entries(newCompany.connectionTypes).forEach(([companyName, relationshipType]) => {
    const matchingCompany = findBestCompanyMatch(companyName, existingCompanies);
    
    if (matchingCompany) {
      connections.push(matchingCompany.id);
      connectionTypes[matchingCompany.id] = relationshipType;
    }
  });

  return { connections, connectionTypes };
};

/**
 * Find the best matching company using fuzzy matching algorithms
 */
const findBestCompanyMatch = (searchName: string, companies: Company[]): Company | null => {
  const normalizedSearch = normalizeCompanyName(searchName);
  
  // Strategy 1: Exact match (case-insensitive)
  let match = companies.find(c => 
    normalizeCompanyName(c.name) === normalizedSearch
  );
  if (match) return match;
  
  // Strategy 2: Partial match (contains)
  match = companies.find(c => {
    const normalizedCompanyName = normalizeCompanyName(c.name);
    return normalizedCompanyName.includes(normalizedSearch) ||
           normalizedSearch.includes(normalizedCompanyName);
  });
  if (match) return match;
  
  // Strategy 3: Common tech company aliases
  const aliases = getCompanyAliases(normalizedSearch);
  for (const alias of aliases) {
    match = companies.find(c => normalizeCompanyName(c.name) === alias);
    if (match) return match;
  }
  
  // Strategy 4: Industry-based fuzzy matching
  match = companies.find(c => {
    const searchIndustry = inferIndustryFromName(searchName);
    return c.industry.toLowerCase().includes(searchIndustry) && 
           levenshteinDistance(normalizedSearch, normalizeCompanyName(c.name)) <= 3;
  });
  
  return match || null;
};

/**
 * Normalize company names for better matching
 */
const normalizeCompanyName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s*(inc|llc|corp|ltd|limited|company|co)\s*$/i, '') // Remove business suffixes
    .trim();
};

/**
 * Get common aliases for tech companies
 */
const getCompanyAliases = (normalizedName: string): string[] => {
  const aliasMap: Record<string, string[]> = {
    'google': ['alphabet', 'alphabet inc'],
    'alphabet': ['google'],
    'facebook': ['meta', 'meta platforms'],
    'meta': ['facebook', 'meta platforms'],
    'twitter': ['x', 'x corp'],
    'x': ['twitter'],
    'microsoft': ['msft'],
    'amazon': ['aws', 'amazon web services'],
    'aws': ['amazon', 'amazon web services']
  };
  
  return aliasMap[normalizedName] || [];
};

/**
 * Infer industry from company name
 */
const inferIndustryFromName = (companyName: string): string => {
  const name = companyName.toLowerCase();
  
  if (name.includes('ai') || name.includes('artificial') || name.includes('neural')) {
    return 'ai';
  }
  if (name.includes('crypto') || name.includes('blockchain') || name.includes('coin')) {
    return 'crypto';
  }
  if (name.includes('finance') || name.includes('pay') || name.includes('bank')) {
    return 'fintech';
  }
  if (name.includes('game') || name.includes('gaming')) {
    return 'gaming';
  }
  
  return 'technology';
};

/**
 * Calculate Levenshtein distance for fuzzy string matching
 */
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = Array.from({ length: str2.length + 1 }, () =>
    Array.from({ length: str1.length + 1 }, () => 0)
  );
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Check if the existing companies have significant positioning errors
 * Returns true if relocation would improve overall positioning
 */
export const shouldTriggerRelocation = (
  existingCompanies: Company[],
  threshold: number = 30
): boolean => {
  let totalError = 0;
  let companiesWithError = 0;
  
  for (const company of existingCompanies) {
    const targetDistance = calculateDistanceFromScore(company.matchScore);
    const currentDistance = company.distance || 0;
    const error = Math.abs(targetDistance - currentDistance);
    
    if (error > threshold) {
      totalError += error;
      companiesWithError++;
    }
  }
  
  // Trigger relocation if more than 30% of companies are significantly mispositioned
  const errorRate = companiesWithError / existingCompanies.length;
  const averageError = companiesWithError > 0 ? totalError / companiesWithError : 0;
  
  return errorRate > 0.3 || averageError > 60;
};

/**
 * Get color for company based on match score
 */
export const getColorForScore = (score: number): string => {
  if (score >= 90) return "#10B981"; // Green - Excellent
  if (score >= 80) return "#F59E0B"; // Yellow - Good
  if (score >= 70) return "#3B82F6"; // Blue - Fair
  if (score >= 50) return "#6B7280"; // Gray - Poor
  return "#EF4444"; // Red - Very Poor
};

/**
 * Generate a career URL for a company (fallback when no URL provided)
 *
 * Handles both full URLs and clean domains:
 * - "https://bevel.health" → "https://bevel.health/careers"
 * - "bevel.health" → "https://bevel.health/careers"
 * - "https://www.stripe.com" → "https://stripe.com/careers"
 */
export const generateCareerUrl = (companyName: string, domain?: string): string => {
  if (domain) {
    // Extract clean domain from URL if full URL provided
    // Handles: "https://bevel.health", "www.bevel.health", "bevel.health/"
    let cleanDomain = domain
      .replace(/^https?:\/\//, '')  // Remove protocol
      .replace(/^www\./, '')         // Remove www prefix only
      .replace(/\/$/, '')            // Remove trailing slash
      .split('/')[0];                // Take only domain part (ignore paths)

    return `https://${cleanDomain}/careers`;
  }

  // Generate based on company name (last resort fallback)
  // Note: This should rarely be hit with improved domain passing from Extraction API
  const normalizedName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '');

  return `https://${normalizedName}.com/careers`;
};

/**
 * Resolve career URL with priority system
 *
 * Priority order:
 * 1. Extraction API careerUrl (from pasted email, already filtered by URL processors)
 * 2. Analysis API careerUrl (from LLM research, only if LLM is confident)
 * 3. Generated from domain ({domain}/careers)
 * 4. Generated from company name ({normalized-name}.com/careers)
 *
 * @param extractionCareerUrl - From extraction API (optional, filtered)
 * @param analysisCareerUrl - From analysis API (optional, LLM confident)
 * @param companyName - Company name for fallback generation
 * @param domain - Company domain for fallback generation
 * @returns Resolved career URL
 */
export const resolveCareerUrl = (
  extractionCareerUrl: string | undefined,
  analysisCareerUrl: string | undefined,
  companyName: string,
  domain?: string
): string => {
  return extractionCareerUrl ||
         analysisCareerUrl ||
         generateCareerUrl(companyName, domain);
};