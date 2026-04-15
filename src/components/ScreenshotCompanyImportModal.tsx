import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Camera, X, Upload, Clipboard } from 'lucide-react';
import { toast } from 'sonner';
import { Company } from '../types';
import { extractTextFromImage, validateImageFile } from '../utils/ocrService';
import { useCompanyDetection } from '../hooks/useCompanyDetection';
import { CompanySelectionList } from './CompanySelectionList';

interface ScreenshotCompanyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompanies: (companies: Company[]) => Promise<void>;
  existingCompanies: Company[];
  viewMode: 'explore' | 'watchlist';
  onShowLLMSettings?: () => void;
}

type ModalStep = 'upload' | 'processing' | 'results';

/**
 * ScreenshotCompanyImportModal Component
 *
 * Allows users to upload or paste screenshots/images containing company names.
 * Uses OCR (Tesseract.js) to extract text, then LLM to detect companies.
 * Supports drag & drop, file upload, and clipboard paste (including mobile).
 */
export const ScreenshotCompanyImportModal: React.FC<ScreenshotCompanyImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompanies,
  existingCompanies,
  viewMode: _viewMode,
  onShowLLMSettings,
}) => {
  const [step, setStep] = useState<ModalStep>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Use shared company detection hook
  const {
    detectedCompanies,
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
      setStep('upload');
      setSelectedImage(null);
      setImagePreviewUrl('');
      setOcrProgress(0);
      setExtractedText('');
      resetDetection();
      setIsProcessing(false);
      setIsImporting(false);
    }
  }, [isOpen, resetDetection]);

  // Clean up preview URL
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    // Validate file
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    // Set selected image and create preview
    setSelectedImage(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);
  }, []);

  // Handle drag & drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((f) =>
        ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(f.type)
      );

      if (imageFile) {
        handleFileSelect(imageFile);
      } else {
        toast.error('Please drop an image file (PNG, JPG, or WEBP)');
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle paste from clipboard (including mobile)
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent | ClipboardEvent) => {
      e.preventDefault();

      const items = e.clipboardData?.items;
      if (!items) return;

      // Look for image in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleFileSelect(file);
            toast.success('Image pasted from clipboard');
            return;
          }
        }
      }

      toast.info('No image found in clipboard');
    },
    [handleFileSelect]
  );

  // Listen for paste events globally when modal is open
  useEffect(() => {
    if (isOpen && step === 'upload') {
      const handleGlobalPaste = (e: ClipboardEvent) => {
        handlePaste(e);
      };

      document.addEventListener('paste', handleGlobalPaste);
      return () => document.removeEventListener('paste', handleGlobalPaste);
    }
  }, [isOpen, step, handlePaste]);

  // Process image: OCR → LLM extraction → Show results
  const handleProcessImage = useCallback(async () => {
    if (!selectedImage) {
      toast.error('Please select an image first');
      return;
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
      return;
    }

    setIsProcessing(true);
    setStep('processing');
    setOcrProgress(0);

    try {
      // Step 1: Extract text using OCR
      toast.loading('Extracting text from image...', { id: 'ocr-processing' });

      const { text, confidence } = await extractTextFromImage(selectedImage, {
        onProgress: (progress) => setOcrProgress(progress),
      });

      setExtractedText(text);

      if (!text.trim()) {
        toast.error('No text found in image', {
          id: 'ocr-processing',
          description: 'Try a clearer screenshot or adjust image quality',
        });
        setStep('upload');
        setIsProcessing(false);
        return;
      }

      toast.success(`Text extracted (${Math.round(confidence)}% confidence)`, {
        id: 'ocr-processing',
      });

      // Step 2: Use shared hook to detect companies from extracted text
      const success = await detectCompanies(text);
      if (success) {
        setStep('results');
      } else {
        setStep('upload');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image', {
        id: 'ocr-processing',
        description: error instanceof Error ? error.message : 'Please try again',
      });
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedImage, llmConfigured, detectCompanies, onClose, onShowLLMSettings]);

  // Import selected companies
  const handleImport = useCallback(async () => {
    const companiesToImport = prepareCompaniesForImport();

    if (!companiesToImport) {
      toast.error('No companies selected');
      return;
    }

    onClose();

    toast.loading(
      `Importing ${companiesToImport.length} ${companiesToImport.length === 1 ? 'company' : 'companies'}...`,
      {
        id: 'batch-import',
        duration: Infinity,
      }
    );

    try {
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
              <Camera className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 id="modal-title" className="text-xl font-bold text-gray-900">
                Import from Screenshot
              </h2>
              <p className="text-sm text-gray-500">
                Upload or paste an image with company names
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
          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drop Zone */}
              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center
                  hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Upload image"
              >
                {selectedImage ? (
                  // Image Preview
                  <div className="space-y-4">
                    <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={imagePreviewUrl}
                        alt="Screenshot preview"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 font-medium">
                        {selectedImage.name}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(null);
                          setImagePreviewUrl('');
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  // Upload Prompt
                  <div className="space-y-4">
                    <div className="flex justify-center gap-4">
                      <Upload className="w-12 h-12 text-gray-400" />
                      <Clipboard className="w-12 h-12 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drop an image here, or click to browse
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Or press Cmd/Ctrl+V to paste from clipboard
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Supports PNG, JPG, WEBP • Max 10MB (5MB on mobile)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
                aria-hidden="true"
              />

              {/* LLM Configuration Warning */}
              {!llmConfigured && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <div className="text-amber-600 mt-0.5">⚠️</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">
                      API Key Required
                    </p>
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

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Processing Image
                </h3>
                <p className="text-sm text-gray-600">
                  Extracting text and detecting companies...
                </p>
              </div>

              {/* OCR Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">OCR Progress</span>
                  <span className="text-gray-900 font-medium">{ocrProgress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>

              {/* Extracted Text Preview (if available) */}
              {extractedText && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    Extracted Text:
                  </p>
                  <p className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                    {extractedText.substring(0, 500)}
                    {extractedText.length > 500 ? '...' : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Results Step */}
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
          {step === 'upload' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessImage}
                disabled={!selectedImage || isProcessing || !llmConfigured}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                  transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {isProcessing && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isProcessing ? 'Processing...' : 'Extract Companies'}
              </button>
            </>
          ) : step === 'processing' ? (
            <div className="w-full text-center text-sm text-gray-600">
              Please wait while we process your image...
            </div>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep('upload');
                  setSelectedImage(null);
                  setImagePreviewUrl('');
                  resetDetection();
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
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
                {isImporting
                  ? 'Importing...'
                  : `Import ${selectedCount} ${selectedCount === 1 ? 'Company' : 'Companies'}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
