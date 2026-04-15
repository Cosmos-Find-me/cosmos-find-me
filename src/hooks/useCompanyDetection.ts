import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { llmService } from '../utils/llm/service';
import { getCompanyPreview } from '../utils/companyValidation';
import { Company } from '../types';

export interface DetectedCompany {
  name: string;
  preview: {
    logo: string;
    domain: string;
    careerUrl?: string;
    inferredUrl?: string;
  };
  selected: boolean;
  isDuplicate: boolean;
}

interface UseCompanyDetectionProps {
  existingCompanies: Company[];
  onShowLLMSettings?: () => void;
  onClose: () => void;
}

/**
 * Shared hook for company detection logic
 *
 * Handles LLM extraction, company preview fetching, and duplicate detection.
 * Used by both PasteCompanyListModal and ScreenshotCompanyImportModal.
 */
export function useCompanyDetection({
  existingCompanies,
  onShowLLMSettings,
  onClose,
}: UseCompanyDetectionProps) {
  const [detectedCompanies, setDetectedCompanies] = useState<DetectedCompany[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  const llmConfigured = llmService.isConfigured();

  // Detect companies from extracted text using LLM
  const detectCompanies = useCallback(
    async (text: string, html?: string): Promise<boolean> => {
      if (!text.trim()) {
        toast.error('No text provided for company detection');
        return false;
      }

      if (!llmConfigured) {
        toast.error('Please configure your API key first', {
          action: onShowLLMSettings
            ? {
                label: 'Configure',
                onClick: () => {
                  onClose();
                  onShowLLMSettings();
                },
              }
            : undefined,
        });
        return false;
      }

      setIsDetecting(true);

      try {
        // Use LLM to extract company names and URLs
        const { companies: extractedCompanies, warning } =
          await llmService.extractCompanies(text, html || '');

        // Show warning if companies were limited to 25
        if (warning) {
          toast.warning(warning, {
            duration: 8000,
          });
        }

        if (extractedCompanies.length === 0) {
          toast.error('No companies found in the text', {
            description: 'Try different text or use different formatting',
          });
          return false;
        }

        // Get previews for each company and check for duplicates
        const detectedWithPreviews: DetectedCompany[] = await Promise.all(
          extractedCompanies.map(async (extracted) => {
            // Use the URL from LLM if provided, otherwise use the company name
            const nameOrUrl = extracted.url || extracted.name;
            const preview = await getCompanyPreview(nameOrUrl);

            // Store the original company name from LLM
            const companyName = extracted.name;

            const isDuplicate = existingCompanies.some(
              (c) => c.name.toLowerCase() === companyName.toLowerCase()
            );

            return {
              name: companyName,
              preview: {
                ...preview,
                careerUrl: extracted.careerUrl,
                inferredUrl: extracted.url,
              },
              selected: !isDuplicate, // Don't select duplicates by default
              isDuplicate,
            };
          })
        );

        setDetectedCompanies(detectedWithPreviews);
        return true;
      } catch (error) {
        console.error('Error detecting companies:', error);
        toast.error('Failed to detect companies', {
          description: error instanceof Error ? error.message : 'Please try again',
        });
        return false;
      } finally {
        setIsDetecting(false);
      }
    },
    [llmConfigured, existingCompanies, onClose, onShowLLMSettings]
  );

  // Toggle individual company selection
  const toggleCompanySelection = useCallback((index: number) => {
    setDetectedCompanies((prev) =>
      prev.map((company, i) =>
        i === index ? { ...company, selected: !company.selected } : company
      )
    );
  }, []);

  // Select/Deselect all companies
  const toggleSelectAll = useCallback(() => {
    const allSelected = detectedCompanies.every((c) => c.selected || c.isDuplicate);
    setDetectedCompanies((prev) =>
      prev.map((company) => ({
        ...company,
        selected: company.isDuplicate ? false : !allSelected,
      }))
    );
  }, [detectedCompanies]);

  // Prepare companies for import
  const prepareCompaniesForImport = useCallback(() => {
    const selectedCompanies = detectedCompanies.filter(
      (c) => c.selected && !c.isDuplicate
    );

    if (selectedCompanies.length === 0) {
      return null;
    }

    return selectedCompanies.map((detected) => ({
      name: detected.name,
      logo: detected.preview.logo,
      careerUrl: detected.preview.careerUrl ?? '',
      domain: detected.preview.inferredUrl ?? detected.preview.domain,
    }));
  }, [detectedCompanies]);

  // Reset state
  const reset = useCallback(() => {
    setDetectedCompanies([]);
    setIsDetecting(false);
  }, []);

  return {
    detectedCompanies,
    isDetecting,
    llmConfigured,
    detectCompanies,
    toggleCompanySelection,
    toggleSelectAll,
    prepareCompaniesForImport,
    reset,
  };
}
