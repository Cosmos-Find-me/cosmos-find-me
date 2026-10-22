import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteUserConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail: string;
  isDeleting?: boolean;
}

/**
 * DeleteUserConfirmationModal Component
 *
 * Displays a confirmation dialog before deleting a user account.
 * Provides clear warning about the irreversible action.
 */
export const DeleteUserConfirmationModal: React.FC<DeleteUserConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden
          animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-xl font-bold text-gray-900">
                Delete User Account
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-900 mb-2">
              ⚠️ This action cannot be undone
            </p>
            <p className="text-sm text-red-700">
              You are about to permanently delete the user account and all associated data.
            </p>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">User to be deleted:</p>
            <p className="text-base font-semibold text-gray-900 break-all">
              {userEmail}
            </p>
          </div>

          {/* Consequences List */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">
              This will permanently delete:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>User account and authentication credentials</li>
              <li>All company data and exploration history</li>
              <li>Watchlist and preferences</li>
              <li>Any associated metadata</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg
              transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed
              flex items-center gap-2"
          >
            {isDeleting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
};
