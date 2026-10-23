import React from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';

export interface DetectedCompany {
  name: string;
  preview: {
    logo: string;
    domain: string;
  };
  selected: boolean;
  isDuplicate: boolean;
}

interface CompanySelectionListProps {
  companies: DetectedCompany[];
  onToggleSelection: (index: number) => void;
  onToggleSelectAll: () => void;
}

/**
 * CompanySelectionList Component
 *
 * Shared UI for displaying and selecting companies in batch import modals.
 * Used by both PasteCompanyListModal and ScreenshotCompanyImportModal.
 */
export const CompanySelectionList: React.FC<CompanySelectionListProps> = ({
  companies,
  onToggleSelection,
  onToggleSelectAll,
}) => {
  const selectedCount = companies.filter((c) => c.selected).length;
  const totalCount = companies.length;
  const allSelected = companies.every((c) => c.selected || c.isDuplicate);

  return (
    <div className="space-y-4">
      {/* Stats and Select All */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {selectedCount} of {totalCount} companies selected
        </p>
        <button
          onClick={onToggleSelectAll}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Company List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {companies.map((company, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              company.isDuplicate
                ? 'bg-gray-50 border-gray-200'
                : company.selected
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Checkbox */}
            <button
              onClick={() => !company.isDuplicate && onToggleSelection(index)}
              disabled={company.isDuplicate}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                company.isDuplicate
                  ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                  : company.selected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              aria-label={
                company.isDuplicate
                  ? 'Already in graph'
                  : company.selected
                  ? 'Deselect'
                  : 'Select'
              }
            >
              {company.selected && <Check className="w-3 h-3 text-white" />}
            </button>

            {/* Logo */}
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src={company.preview.logo}
                alt={`${company.name} logo`}
                fill
                className="rounded-lg object-contain"
                unoptimized
              />
            </div>

            {/* Company Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{company.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {company.preview.domain}
              </p>
            </div>

            {/* Duplicate Badge */}
            {company.isDuplicate && (
              <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded-sm">
                Already in graph
              </span>
            )}
          </div>
        ))}
      </div>

      {/* No Results */}
      {companies.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No companies detected</p>
        </div>
      )}
    </div>
  );
};
