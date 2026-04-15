import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Clipboard, X } from 'lucide-react';
import { toast } from 'sonner';
import { Company } from '../types';
import { useCompanyDetection } from '../hooks/useCompanyDetection';
import { CompanySelectionList } from './CompanySelectionList';

interface PasteCompanyListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompanies: (companies: Company[]) => Promise<void>;
  existingCompanies: Company[];
  viewMode: 'explore' | 'watchlist';
  onShowLLMSettings?: () => void;
}

type ModalStep = 'input' | 'results';

/**
 * PasteCompanyListModal Component
 *
 * Allows users to paste a list of company names and batch import them.
 * Supports various formats: comma-separated, line-separated, embedded in text, etc.
 */
export const PasteCompanyListModal: React.FC<PasteCompanyListModalProps> = ({
  isOpen,
  onClose,
  onImportCompanies,
  existingCompanies,
  viewMode: _viewMode, // Reserved for future use (tab-specific import behavior)
  onShowLLMSettings,
}) => {
  const [step, setStep] = useState<ModalStep>('input');
  const [pastedText, setPastedText] = useState('');
  const [pastedHtml, setPastedHtml] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const editableRef = useRef<HTMLDivElement>(null);

  // Use shared company detection hook
  const {
    detectedCompanies,
    isDetecting,
    llmConfigured,
    detectCompanies,
    toggleCompanySelection,
    toggleSelectAll,
    prepareCompaniesForImport,
    reset: resetDetection,
  } = useCompanyDetection({
    existingCompanies,
    onShowLLMSettings,
    onClose,
  });

  // Reset modal when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setPastedText('');
      setPastedHtml('');
      resetDetection();
      setIsImporting(false);
    } else {
      // Focus editable div when opened
      setTimeout(() => editableRef.current?.focus(), 100);
    }
  }, [isOpen, resetDetection]);

  // Handle paste event to capture both text and HTML
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();

    // Get both HTML and plain text
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    // Store the HTML for the LLM (if available)
    setPastedHtml(html || '');

    // Store the plain text for character count
    setPastedText(text);

    // Update the editable div - preserve HTML formatting if available
    if (editableRef.current) {
      if (html) {
        // Insert the HTML content to preserve formatting
        editableRef.current.innerHTML = html;
      } else {
        // Plain text paste
        editableRef.current.textContent = text;
      }
    }
  }, []);

  // Detect companies from pasted text using LLM
  const handleDetectCompanies = useCallback(async () => {
    if (!pastedText.trim()) {
      toast.error('Please paste some text first');
      return;
    }

    const success = await detectCompanies(pastedText, pastedHtml);
    if (success) {
      setStep('results');
    }
  }, [pastedText, pastedHtml, detectCompanies]);

  // Import selected companies
  const handleImport = useCallback(async () => {
    const companiesToImport = prepareCompaniesForImport();

    if (!companiesToImport) {
      toast.error('No companies selected');
      return;
    }

    // Close modal immediately
    onClose();

    // Show toast and let parent handle the actual import with LLM analysis
    toast.loading(
      `Importing ${companiesToImport.length} ${companiesToImport.length === 1 ? 'company' : 'companies'}...`,
      {
        id: 'batch-import',
        duration: Infinity, // Will be dismissed by parent when done
      }
    );

    try {
      // Pass the data to parent for processing
      await onImportCompanies(companiesToImport as unknown as Company[]);
    } catch (error) {
      console.error('Error importing companies:', error);
      toast.error('Failed to import companies', {
        id: 'batch-import',
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  }, [prepareCompaniesForImport, onImportCompanies, onClose]);

  if (!isOpen) return null;

  const selectedCount = detectedCompanies.filter((c) => c.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col
          animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clipboard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 id="modal-title" className="text-xl font-bold text-gray-900">
                Paste Company List
              </h2>
              <p className="text-sm text-gray-500">
                Import multiple companies at once
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="paste-input" className="block text-sm font-medium text-gray-700 mb-2">
                  Paste your company list
                </label>
                <div
                  ref={editableRef}
                  id="paste-input"
                  contentEditable
                  onPaste={handlePaste}
                  onInput={(e) => setPastedText(e.currentTarget.textContent || '')}
                  data-placeholder={!pastedText ? `Paste company names here...

Examples:
• Anthropic, OpenAI, Google DeepMind
• One company per line
• Or any text with hyperlinks from LinkedIn, etc.` : undefined}
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg overflow-y-auto
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    text-gray-900 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:whitespace-pre-wrap"
                  role="textbox"
                  aria-multiline="true"
                  aria-label="Paste company list"
                />
                <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
                  <span>{pastedText.length} characters</span>
                  {pastedHtml && (
                    <span className="text-blue-600 font-medium">
                      Rich text detected
                    </span>
                  )}
                </div>
              </div>

              {!llmConfigured && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="text-amber-600 mt-0.5">⚠️</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">API Key Required</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Configure your Anthropic API key to use company detection.
                    </p>
                    {onShowLLMSettings && (
                      <button
                        onClick={() => {
                          onClose();
                          onShowLLMSettings();
                        }}
                        className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-800 underline"
                      >
                        Configure API Key
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'results' && (
            <CompanySelectionList
              companies={detectedCompanies}
              onToggleSelection={toggleCompanySelection}
              onToggleSelectAll={toggleSelectAll}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          {step === 'input' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDetectCompanies}
                disabled={!pastedText.trim() || isDetecting || !llmConfigured}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                  transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {isDetecting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isDetecting ? 'Analyzing...' : 'Detect Companies'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('input')}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={selectedCount === 0 || isImporting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                  transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {isImporting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isImporting ? 'Importing...' : `Import ${selectedCount} ${selectedCount === 1 ? 'Company' : 'Companies'}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
