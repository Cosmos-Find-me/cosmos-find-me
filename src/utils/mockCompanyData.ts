/**
 * Mock company data used by AddCompanyModal when no LLM provider is configured.
 */
import type { UserCMF } from '../types';
import type { CompanyPreview } from './companyValidation';

// Enhanced mock data generation when LLM is not available
export const generateEnhancedMockData = (preview: CompanyPreview, userCMF: UserCMF) => {
  // Check if CMF is empty (new user)
  const isCMFEmpty = (!userCMF.experience || userCMF.experience.length === 0) &&
                     (!userCMF.mustHaves || userCMF.mustHaves.length === 0) &&
                     (!userCMF.wantToHave || userCMF.wantToHave.length === 0) &&
                     (!userCMF.targetRole || userCMF.targetRole.trim() === '') &&
                     (!userCMF.targetCompanies || userCMF.targetCompanies.trim() === '');

  let matchScore;
  
  if (isCMFEmpty) {
    // For empty CMF, generate neutral but encouraging scores
    // Most companies should be 70-85 to encourage exploration
    matchScore = 70 + Math.floor(Math.random() * 16); // 70-85 range
  } else {
    // More sophisticated mock score based on user criteria
    const baseScore = 70;
    matchScore = baseScore;
    
    // Boost score if company industry aligns with user experience
    if (userCMF.experience && userCMF.experience.some(exp => preview.industry?.toLowerCase().includes(exp.toLowerCase()))) {
      matchScore += 10;
    }
    
    // Boost score if company industry matches target companies pattern
    if (userCMF.targetCompanies?.toLowerCase().includes(preview.industry?.toLowerCase() || '')) {
      matchScore += 5;
    }
    
    // Add some randomness but keep it reasonable
    matchScore += Math.floor(Math.random() * 15) - 5; // -5 to +10 variation
    matchScore = Math.min(95, Math.max(60, matchScore)); // Clamp between 60-95
  }

  return {
    name: preview.name,
    industry: preview.industry || 'Technology',
    stage: determineCompanyStage(preview),
    location: preview.location || 'San Francisco, CA',
    employees: preview.employees || '~500',
    remote: 'Remote-Friendly',
    openRoles: Math.floor(Math.random() * 15) + 5,
    matchScore,
    matchReasons: generateMatchReasons(preview, userCMF, isCMFEmpty),
    connections: [], // Will be populated by positioning logic
    connectionTypes: {},
    description: preview.description || `${preview.name} is a technology company focused on innovation.`,
    externalLinks: preview.domain ? {
      website: `https://${preview.domain}`
    } : undefined
  };
};

// Helper function to determine company stage based on preview data
export const determineCompanyStage = (preview: CompanyPreview): string => {
  if (preview.confidence === 'high') {
    // For known companies, make educated guesses based on name/industry
    const name = preview.name.toLowerCase();
    if (name.includes('google') || name.includes('microsoft') || name.includes('apple') || 
        name.includes('amazon') || name.includes('meta') || name.includes('facebook')) {
      return 'Public';
    }
    if (name.includes('startup') || preview.industry === 'AI' || preview.industry === 'AI/ML') {
      return 'Early Stage';
    }
    return 'Late Stage';
  }
  
  // Default for unknown companies
  return 'Late Stage';
};

// Helper function to generate contextual match reasons
export const generateMatchReasons = (preview: CompanyPreview, userCMF: UserCMF, isCMFEmpty: boolean = false): string[] => {
  const reasons: string[] = [];
  
  if (isCMFEmpty) {
    // Generate exploration-focused reasons for new users
    const explorationReasons = [
      `${preview.name} is well-regarded in the ${preview.industry || 'tech'} industry`,
      'Great company to explore career opportunities',
      'Strong company reputation and growth potential',
      'Good starting point for your career exploration',
      'Company offers diverse learning opportunities',
      'Well-known for positive work culture',
      'Good opportunities for professional development'
    ];
    
    // Add industry-specific reason if available
    if (preview.industry) {
      reasons.push(`Excellent reputation in the ${preview.industry} sector`);
    }
    
    // Add 2-3 exploration reasons
    const shuffledExploration = explorationReasons.sort(() => 0.5 - Math.random());
    reasons.push(...shuffledExploration.slice(0, 3));
    
  } else {
    // Generate personalized reasons based on CMF data
    
    // Add role-specific reasons
    if (userCMF.targetRole && userCMF.targetRole.trim()) {
      reasons.push(`Strong alignment with your ${userCMF.targetRole} background`);
    }
    
    // Add industry-specific reasons
    if (preview.industry) {
      reasons.push(`Excellent fit in the ${preview.industry} industry`);
    }
    
    // Add must-have aligned reasons
    if (userCMF.mustHaves && userCMF.mustHaves.length > 0) {
      const randomMustHave = userCMF.mustHaves[Math.floor(Math.random() * userCMF.mustHaves.length)];
      reasons.push(`Company culture aligns with your requirement: ${randomMustHave}`);
    }
    
    // Add experience-based reasons
    if (userCMF.experience && userCMF.experience.length > 0) {
      const matchingExp = userCMF.experience.find(exp => 
        preview.industry?.toLowerCase().includes(exp.toLowerCase())
      );
      if (matchingExp) {
        reasons.push(`Your ${matchingExp} experience is highly valued here`);
      }
    }
    
    // Add some generic positive reasons if we need more
    if (reasons.length < 3) {
      const genericReasons = [
        'Technology stack matches your experience',
        'Company growth trajectory looks promising',
        'Strong team and engineering culture',
        'Innovative approach to solving problems',
        'Good work-life balance and benefits'
      ];
      
      const needed = 4 - reasons.length;
      const shuffledGeneric = genericReasons.sort(() => 0.5 - Math.random());
      reasons.push(...shuffledGeneric.slice(0, needed));
    }
  }
  
  return reasons.slice(0, 4); // Limit to 4 reasons
};
