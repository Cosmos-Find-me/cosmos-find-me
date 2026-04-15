import React, { useState, useEffect } from 'react';
import { X, FileUp, AlertCircle } from 'lucide-react';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  onImportSuccess: () => void;
}

const ImportDataModal: React.FC<ImportDataModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  onImportSuccess
}) => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

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

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!importFile) {
      setError('Please select a file');
      return;
    }

    setImporting(true);
    setError('');

    try {
      // Read the file content
      const fileContent = await importFile.text();

      // Try to parse as JSON
      let companiesData: unknown;
      try {
        companiesData = JSON.parse(fileContent) as unknown;
      } catch (parseError) {
        setError('Invalid JSON format. Please provide a valid JSON file with userProfile and companies fields.');
        setImporting(false);
        return;
      }

      const response = await fetch('/api/admin/import-user-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          companiesData: companiesData
        })
      });

      const data = await response.json() as { error?: string };

      if (response.ok) {
        onImportSuccess();
        onClose();
        setImportFile(null);
      } else {
        setError(data.error ?? 'Failed to import data');
      }
    } catch (error) {
      setError('Failed to import companies data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setImportFile(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <FileUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Import Companies Data</h2>
              <p className="text-sm text-slate-600">for {userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleImport} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Companies JSON File
            </label>
            <input
              type="file"
              accept=".json,.ts,.js"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-colors"
              required
            />
          </div>

          {/* Expected Format */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <p className="font-medium text-slate-700 text-sm">Expected JSON format (UserExplorationState):</p>
            <pre className="text-xs text-slate-600 overflow-x-auto bg-white p-3 rounded border border-slate-200">
{`{
  "id": "user-id",
  "name": "User Name",
  "cmf": {
    "name": "...",
    "targetRole": "...",
    "mustHaves": [...],
    "wantToHave": [...],
    "experience": [...],
    "targetCompanies": "..."
  },
  "baseCompanies": [...],
  "addedCompanies": [...],
  "watchlistCompanyIds": [...],
  "removedCompanyIds": [...],
  "viewMode": "explore"
}`}
            </pre>
            <p className="text-xs text-slate-500">
              Also supports legacy format: <code className="bg-white px-1 py-0.5 rounded">{'{"userProfile": {...}, "companies": [...]}'}</code>
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importing || !importFile}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportDataModal;
