import React, { useState, useEffect } from 'react';
import { LLMSettings, LLMProvider } from '../types';
import { LLM_PROVIDERS } from '../utils/llm/config';
import { llmService } from '../utils/llm/service';

interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: () => void;
}

// Saved settings may name a provider without a model; default to its first model
const withDefaultModel = (settings: LLMSettings): LLMSettings => {
  const providerConfig = settings.provider !== 'none' ? LLM_PROVIDERS[settings.provider] : null;
  // Also replaces a saved model that is no longer offered (e.g. a retired Claude model)
  const offered = providerConfig?.models.some((m) => m.id === settings.model);
  return providerConfig && !offered ? { ...settings, model: providerConfig.models[0].id } : settings;
};

const LLMSettingsModal: React.FC<LLMSettingsModalProps> = (props) =>
  // Content only mounts while open, so it loads the saved settings on every open
  props.isOpen ? <LLMSettingsModalContent {...props} /> : null;

const LLMSettingsModalContent: React.FC<Omit<LLMSettingsModalProps, 'isOpen'>> = ({
  onClose,
  onSettingsUpdated
}) => {
  const [settings, setSettings] = useState<LLMSettings>(() => withDefaultModel(llmService.getSettings()));
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleProviderChange = (provider: LLMProvider) => {
    const providerConfig = provider !== 'none' ? LLM_PROVIDERS[provider] : null;
    
    setSettings(prev => ({
      ...prev,
      provider,
      model: providerConfig ? providerConfig.models[0].id : '',
      apiKey: provider === prev.provider ? prev.apiKey : '' // Keep API key if same provider
    }));
    
    setValidationResult(null);
    setError('');
  };


  const handleModelChange = (model: string) => {
    setSettings(prev => ({ ...prev, model }));
  };

  const validateApiKey = async () => {
    if (settings.provider === 'none') {
      setError('Please select a provider');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      // Test backend connection with dummy API key
      const testSettings = { ...settings, apiKey: 'backend-configured' };
      const isValid = await llmService.updateSettings(testSettings);
      setValidationResult(isValid ? 'valid' : 'invalid');
      
      if (!isValid) {
        setError('Backend connection failed. Make sure the server is running and API key is configured in server/.env');
      }
    } catch {
      setValidationResult('invalid');
      setError('Failed to connect to backend. Make sure the LLM API server is running on port 3001.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (settings.provider === 'none') {
      // Allow saving "none" provider
      llmService.clearSettings();
      onSettingsUpdated?.();
      onClose();
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Save settings with backend-configured API key
      const settingsToSave = { ...settings, apiKey: 'backend-configured' };
      const success = await llmService.updateSettings(settingsToSave);
      
      if (success) {
        onSettingsUpdated?.();
        onClose();
      } else {
        setError('Failed to save settings. Make sure the backend server is running and properly configured.');
      }
    } catch {
      setError('Failed to save settings. Please check the backend connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSettings = () => {
    llmService.clearSettings();
    setSettings(llmService.getSettings());
    setValidationResult(null);
    setError('');
    onSettingsUpdated?.();
  };

  const selectedProvider = settings.provider !== 'none' ? LLM_PROVIDERS[settings.provider] : null;

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
              LLM Settings
            </h2>
            <p className="text-sm text-slate-600">
              Configure your preferred AI provider for enhanced company analysis.
            </p>
          </div>

          {/* Backend Notice */}
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800 mb-1">Production Setup</h4>
                <p className="text-sm text-green-700">
                  Using secure backend API with server-side API keys. 
                  Start the backend server and configure your API keys in the .env file to enable real LLM analysis.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                AI Provider
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* None Option */}
                <button
                  onClick={() => handleProviderChange('none')}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    settings.provider === 'none'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm text-slate-800">None</div>
                  <div className="text-xs text-slate-500 mt-1">Use basic analysis</div>
                </button>

                {/* Provider Options */}
                {Object.values(LLM_PROVIDERS).map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => handleProviderChange(provider.name)}
                    className={`p-4 border rounded-lg text-left transition-all ${
                      settings.provider === provider.name
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-800">
                      {provider.displayName}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {provider.models[0]?.costPer1MTokens && (
                        `$${provider.models[0].costPer1MTokens.input}-${provider.models[0].costPer1MTokens.output}/1M tokens`
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedProvider && (
              <>
                {/* Model Selection */}
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <select
                    id="model"
                    value={settings.model}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                  >
                    {selectedProvider.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Backend Configuration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key Configuration
                  </label>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-slate-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-slate-800 mb-1">Server-Side Configuration</h4>
                        <p className="text-sm text-slate-600 mb-2">
                          API keys are securely stored in the backend server environment.
                        </p>
                        <p className="text-xs text-slate-500 font-mono bg-white px-2 py-1 rounded-sm border">
                          server/.env → ANTHROPIC_API_KEY={selectedProvider.apiKeyPlaceholder}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={validateApiKey}
                      disabled={isValidating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      {isValidating ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Testing Connection...</span>
                        </>
                      ) : (
                        <span>Test Backend Connection</span>
                      )}
                    </button>
                    
                    {validationResult === 'valid' && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Connected</span>
                      </div>
                    )}
                    
                    {validationResult === 'invalid' && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Connection Failed</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-xs text-slate-500">
                      Get your API key from{' '}
                      <a 
                        href={selectedProvider.docsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        {selectedProvider.displayName} documentation
                      </a>
                    </p>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-1">
                        Max Tokens
                      </label>
                      <input
                        id="maxTokens"
                        type="number"
                        value={settings.maxTokens || 1500}
                        onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1500 }))}
                        min="100"
                        max="4000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                        Temperature
                      </label>
                      <input
                        id="temperature"
                        type="number"
                        value={settings.temperature || 0.7}
                        onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                        min="0"
                        max="1"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t">
            <div className="flex flex-col space-y-2">
              <button
                onClick={handleClearSettings}
                className="text-sm text-slate-500 hover:text-gray-700 underline text-left"
              >
                Clear All Settings
              </button>
              <a
                href="https://logo.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                title="Logo API"
              >
                Company logos provided by Logo.dev
              </a>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Settings</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMSettingsModal;