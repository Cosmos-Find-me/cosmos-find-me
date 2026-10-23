import React from 'react';
import { Clipboard, Camera } from 'lucide-react';

interface BatchImportPlaceholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'paste' | 'screenshot';
}

/**
 * Placeholder modal for batch import features (Stories 2 & 3)
 * Shows a "Coming soon" message until the features are implemented
 */
export const BatchImportPlaceholderModal: React.FC<BatchImportPlaceholderModalProps> = ({
  isOpen,
  onClose,
  type,
}) => {
  if (!isOpen) return null;

  const config = {
    paste: {
      icon: <Clipboard className="w-12 h-12 compact:w-10 compact:h-10 text-blue-500" />,
      title: 'Paste Company List',
      description: 'Quickly import multiple companies by pasting a list from LinkedIn, articles, or emails.',
    },
    screenshot: {
      icon: <Camera className="w-12 h-12 compact:w-10 compact:h-10 text-blue-500" />,
      title: 'Import from Screenshot',
      description: 'Upload a screenshot and automatically detect company names to import.',
    },
  };

  const { icon, title, description } = config[type];

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
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6
          animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          {icon}
        </div>

        {/* Title */}
        <h2
          id="modal-title"
          className="text-2xl font-bold text-gray-900 text-center mb-3 compact:mb-2"
        >
          {title}
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          {description}
        </p>

        {/* Coming Soon Badge */}
        <div className="bg-linear-to-r from-blue-500 to-purple-600 text-white
          py-3 px-4 rounded-lg text-center mb-6">
          <p className="font-semibold text-lg">Coming Soon</p>
          <p className="text-sm text-blue-100 mt-1">
            We're working on this feature!
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200
            text-gray-700 font-medium rounded-lg
            transition-colors duration-200
            focus:outline-hidden focus:ring-4 focus:ring-gray-300"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
