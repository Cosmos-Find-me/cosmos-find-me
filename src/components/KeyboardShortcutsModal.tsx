import React, { useEffect } from 'react';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: ShortcutItem[];
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
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

  const categories: ShortcutCategory[] = [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['E'], description: 'Switch to Explore tab' },
        { keys: ['W'], description: 'Switch to Watchlist tab' },
        { keys: ['/'], description: 'Focus search bar' },
      ],
    },
    {
      title: 'Actions',
      shortcuts: [
        { keys: ['A'], description: 'Add new company' },
        { keys: ['Enter'], description: 'Select highlighted item' },
        { keys: ['Esc'], description: 'Close/deselect/clear search' },
      ],
    },
    {
      title: 'List Navigation',
      shortcuts: [
        { keys: ['↓'], description: 'Move selection down' },
        { keys: ['↑'], description: 'Move selection up' },
        { keys: ['Enter'], description: 'Select company' },
      ],
    },
    {
      title: 'Help',
      shortcuts: [
        { keys: ['?'], description: 'Show keyboard shortcuts (this dialog)' },
      ],
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Keyboard Shortcuts</h2>
              <p className="text-sm text-slate-600 mt-1">
                Navigate faster with these shortcuts
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Shortcuts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
                  {category.title}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm text-slate-700">{shortcut.description}</span>
                      <div className="flex items-center space-x-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-sm shadow-xs"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded-sm">Esc</kbd> to close this dialog
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
