import React, { useState } from 'react';
import { Company } from '../types';

interface JobAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  targetRole: string;
}

interface AlertQuery {
  label: string;
  query: string;
  description: string;
}

/**
 * Extract key role term variations using LLM
 */
async function extractKeyRoleVariations(targetRole: string): Promise<string[]> {
  if (!targetRole) return ['engineer'];

  try {
    const response = await fetch('/api/job-alerts/extract-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole })
    });

    if (!response.ok) throw new Error('Failed to extract role');

    const { keyTerms } = await response.json() as { keyTerms?: string[] };
    return keyTerms ?? [targetRole];
  } catch (error) {
    console.error('Error extracting key role:', error);
    return [targetRole];
  }
}

/**
 * Generate Google Alert search queries for job opportunities
 */
function generateAlertQueries(company: Company, keyTerms: string[]): AlertQuery[] {
  const companyName = company.name;

  // Extract the full career URL path (e.g., "retool.com/careers")
  let careerSite = '';
  if (company.careerUrl) {
    try {
      const url = new URL(company.careerUrl);
      // Get hostname and pathname, remove www. and trailing slash
      careerSite = (url.hostname.replace('www.', '') + url.pathname).replace(/\/$/, '');
    } catch (e) {
      console.error('Invalid career URL:', company.careerUrl);
    }
  }

  const queries: AlertQuery[] = [];

  // Single career page query using first keyword
  if (careerSite && keyTerms.length > 0) {
    queries.push({
      label: 'Google Alert',
      query: `site:${careerSite} intitle:${keyTerms[0]}`,
      description: `Get notified when ${companyName} posts new "${keyTerms[0]}" positions`
    });
  }

  return queries;
}

const JobAlertsModal: React.FC<JobAlertsModalProps> = ({
  isOpen,
  onClose,
  company,
  targetRole
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [alertQueries, setAlertQueries] = useState<AlertQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract key role variations and generate queries when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      extractKeyRoleVariations(targetRole).then((keyTerms) => {
        const queries = generateAlertQueries(company, keyTerms);
        setAlertQueries(queries);
        setIsLoading(false);
      });
    }
  }, [isOpen, company, targetRole]);

  // Handle Escape key to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Setup Job Alerts</h2>
              <p className="text-blue-100">
                Get notified when {company.name} posts new {targetRole || 'positions'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">How to setup Google Alerts:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Click the query you want to use below to copy it</li>
                  <li>Click "Open Google Alerts" to visit Google Alerts</li>
                  <li>Paste the query into the search box</li>
                  <li>Customize frequency and click "Create Alert"</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Alert Queries */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Recommended Alert Queries</span>
            </h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {alertQueries.map((alert, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-800">{alert.label}</h4>
                      <button
                        onClick={() => copyToClipboard(alert.query, index)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          copiedIndex === index
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {copiedIndex === index ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{alert.description}</p>
                    <div className="bg-slate-50 rounded-md p-3 border border-slate-200">
                      <code className="text-sm text-slate-800 font-mono break-all">
                        {alert.query}
                      </code>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <a
              href="https://www.google.com/alerts"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm flex items-center justify-center space-x-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>Open Google Alerts</span>
            </a>
            <a
              href="https://www.linkedin.com/jobs/search"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white border border-blue-600 text-blue-600 py-3 px-4 rounded-lg hover:bg-blue-50 transition-all duration-200 flex items-center justify-center space-x-2 font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              <span>Setup LinkedIn Job Alert</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobAlertsModal;
