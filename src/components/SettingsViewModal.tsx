import React, { useEffect } from 'react';
import Image from 'next/image';
import { LLMSettings } from '../types';
import { LLM_PROVIDERS } from '../utils/llm/config';
import { llmService } from '../utils/llm/service';
import { getCompanyLogo } from '../utils/logoProvider';

interface SettingsViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowKeyboardShortcuts?: () => void;
}

const SettingsViewModal: React.FC<SettingsViewModalProps> = ({
  isOpen,
  onClose,
  onShowKeyboardShortcuts
}) => {
  const settings: LLMSettings = llmService.getSettings();

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedProvider = settings.provider !== 'none' ? LLM_PROVIDERS[settings.provider] : null;
  const selectedModel = selectedProvider?.models.find(m => m.id === settings.model);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-lg shadow-xl max-w-2xl w-full p-6 border border-blue-200/40">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Current Settings
            </h2>
            <p className="text-sm text-slate-600">
              View your current AI configuration. Contact your administrator to make changes.
            </p>
          </div>

          <div className="space-y-6">
            {/* AI Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                AI Provider
              </label>
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {selectedProvider ? (
                    <>
                      <Image
                        src={getCompanyLogo('anthropic.com', 'Anthropic')}
                        alt="Anthropic"
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium text-slate-800">
                          {selectedProvider.displayName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Configured by administrator
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-600">
                      No AI provider configured
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedProvider && selectedModel && (
              <>
                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <div className="p-4 bg-white border border-gray-200 rounded-lg">
                    <div className="font-medium text-slate-800 mb-1">
                      {selectedModel.name}
                    </div>
                    <div className="text-sm text-slate-600 mb-2">
                      {selectedModel.description}
                    </div>
                    {selectedModel.costPer1MTokens && (
                      <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-sm inline-block">
                        Cost: ${selectedModel.costPer1MTokens.input}-${selectedModel.costPer1MTokens.output}/1M tokens
                      </div>
                    )}
                  </div>
                </div>

              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t">
            {onShowKeyboardShortcuts && (
              <button
                onClick={() => {
                  onClose();
                  onShowKeyboardShortcuts();
                }}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span>⌨️ Keyboard Shortcuts</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsViewModal;
