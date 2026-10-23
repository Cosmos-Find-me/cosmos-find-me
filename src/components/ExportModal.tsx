import React, { useState } from 'react';
import { X, FileText, FileJson, Download } from 'lucide-react';
import { Company } from '../types';
import { getExternalLinks } from '../utils/externalLinks';
import { track } from '../lib/analytics';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  viewMode: 'explore' | 'watchlist';
}

type ExportFormat = 'csv' | 'markdown' | 'json';

/**
 * ExportModal Component
 *
 * Modal for exporting company data in various formats.
 * Shows preview of companies to be exported and format selection.
 */
const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  companies,
  viewMode,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `companies-${viewMode}-${timestamp}`;

      switch (selectedFormat) {
        case 'csv':
          content = exportToCSV(companies);
          filename = `${baseFilename}.csv`;
          mimeType = 'text/csv';
          break;
        case 'markdown':
          content = exportToMarkdown(companies);
          filename = `${baseFilename}.md`;
          mimeType = 'text/markdown';
          break;
        case 'json':
          content = exportToJSON(companies);
          filename = `${baseFilename}.json`;
          mimeType = 'application/json';
          break;
      }

      // Create and trigger download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Analytics: Track export
      track('companies_exported', {
        company_count: companies.length,
        format: selectedFormat
      });

      // Close modal after successful export
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error('Error exporting companies:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const formats: { value: ExportFormat; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value: 'csv',
      label: 'CSV',
      description: 'Import into Excel or Google Sheets',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      value: 'markdown',
      label: 'Markdown Table',
      description: 'Paste directly into Notion',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      value: 'json',
      label: 'JSON',
      description: 'For technical use or re-importing',
      icon: <FileJson className="w-5 h-5" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-linear-to-br from-white via-blue-50 to-indigo-50 rounded-lg shadow-xl max-w-md w-full p-6 compact:p-5 border border-blue-200/40 backdrop-blur-xs">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2 compact:mb-1.5">
              Export Companies
            </h2>
            <p className="text-sm text-slate-600">
              Exporting <span className="font-medium">{companies.length} {companies.length === 1 ? 'company' : 'companies'}</span> from{' '}
              <span className="font-medium capitalize">{viewMode}</span>
            </p>
          </div>

          {/* Company Preview */}
          <div className="mb-6 p-3 bg-white/60 backdrop-blur-xs rounded-lg border border-blue-200/30 max-h-32 overflow-y-auto">
            <div className="text-xs text-slate-500 mb-2 compact:mb-1.5 font-medium">Companies to export:</div>
            <div className="flex flex-wrap gap-1.5">
              {companies.slice(0, 10).map((company) => (
                <span
                  key={company.id}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                >
                  {company.name}
                </span>
              ))}
              {companies.length > 10 && (
                <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                  +{companies.length - 10} more
                </span>
              )}
            </div>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3 compact:mb-2">
              Export Format
            </label>
            <div className="space-y-2">
              {formats.map((format) => (
                <button
                  key={format.value}
                  onClick={() => setSelectedFormat(format.value)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedFormat === format.value
                      ? 'border-blue-500 bg-blue-50/80'
                      : 'border-blue-200/30 bg-white/40 hover:border-blue-300 hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`mt-0.5 ${
                      selectedFormat === format.value ? 'text-blue-600' : 'text-slate-400'
                    }`}>
                      {format.icon}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${
                        selectedFormat === format.value ? 'text-blue-900' : 'text-slate-800'
                      }`}>
                        {format.label}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {format.description}
                      </div>
                    </div>
                    {selectedFormat === format.value && (
                      <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 backdrop-blur-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || companies.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to escape CSV values
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// CSV Export
function exportToCSV(companies: Company[]): string {
  const headers = [
    'Name',
    'Match Score',
    'Industry',
    'Stage',
    'Location',
    'Employees',
    'Remote',
    'Open Roles',
    'Match Reasons',
    'Website',
    'Career Page',
    'LinkedIn',
    'Glassdoor',
    'Crunchbase',
    'My Connections',
    'Setup Alerts',
  ];

  const rows = companies.map(company => {
    const links = getExternalLinks(company);
    const connectionsUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company.name)}`;
    const alertsUrl = `https://www.google.com/alerts#create_alert`;

    return [
      escapeCSV(company.name),
      company.matchScore.toString(),
      escapeCSV(company.industry),
      escapeCSV(company.stage),
      escapeCSV(company.location),
      escapeCSV(company.employees),
      escapeCSV(company.remote),
      company.openRoles.toString(),
      escapeCSV(company.matchReasons.join('; ')),
      escapeCSV(links.website || ''),
      escapeCSV(company.careerUrl || ''),
      escapeCSV(links.linkedin || ''),
      escapeCSV(links.glassdoor || ''),
      escapeCSV(links.crunchbase || ''),
      escapeCSV(connectionsUrl),
      escapeCSV(alertsUrl),
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// Markdown Table Export
function exportToMarkdown(companies: Company[]): string {
  const headers = [
    'Name',
    'Match',
    'Industry',
    'Stage',
    'Location',
    'Size',
    'Remote',
    'Roles',
    'Links',
  ];

  const separator = headers.map(() => '---').join(' | ');

  const rows = companies.map(company => {
    const externalLinks = getExternalLinks(company);
    const connectionsUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company.name)}`;
    const alertsUrl = `https://www.google.com/alerts#create_alert`;

    const links: string[] = [];
    if (externalLinks.website) links.push(`[Website](${externalLinks.website})`);
    if (company.careerUrl) links.push(`[Careers](${company.careerUrl})`);
    if (externalLinks.linkedin) links.push(`[LinkedIn](${externalLinks.linkedin})`);
    if (externalLinks.glassdoor) links.push(`[Glassdoor](${externalLinks.glassdoor})`);
    if (externalLinks.crunchbase) links.push(`[Crunchbase](${externalLinks.crunchbase})`);
    links.push(`[Connections](${connectionsUrl})`);
    links.push(`[Alerts](${alertsUrl})`);

    return [
      company.name,
      `${company.matchScore}%`,
      company.industry,
      company.stage,
      company.location,
      company.employees,
      company.remote,
      company.openRoles.toString(),
      links.join(' · '),
    ].join(' | ');
  });

  return [
    headers.join(' | '),
    separator,
    ...rows,
  ].join('\n');
}

// JSON Export
function exportToJSON(companies: Company[]): string {
  const exportData = companies.map(company => {
    const externalLinks = getExternalLinks(company);
    const connectionsUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company.name)}`;
    const alertsUrl = `https://www.google.com/alerts#create_alert`;

    return {
      name: company.name,
      matchScore: company.matchScore,
      industry: company.industry,
      stage: company.stage,
      location: company.location,
      employees: company.employees,
      remote: company.remote,
      openRoles: company.openRoles,
      matchReasons: company.matchReasons,
      links: {
        website: externalLinks.website,
        careers: company.careerUrl,
        linkedin: externalLinks.linkedin,
        glassdoor: externalLinks.glassdoor,
        crunchbase: externalLinks.crunchbase,
        myConnections: connectionsUrl,
        setupAlerts: alertsUrl,
      },
    };
  });

  return JSON.stringify(exportData, null, 2);
}

export default ExportModal;
