import React, { useState, useRef, useEffect } from 'react';
import { Settings, Download } from 'lucide-react';

interface SettingsFABProps {
  onSettings: () => void;
  onExport: () => void;
}

/**
 * SettingsFAB Component
 *
 * An expandable floating action button that reveals the export option.
 * - Main action: Settings
 * - Action 1: Export companies
 *
 * Behavior:
 * - Desktop: Hover to expand, main button stays clickable
 * - Mobile: Hidden (settings not available on mobile)
 * - Keyboard: Tab to navigate, Enter/Space to activate
 */
export const SettingsFAB: React.FC<SettingsFABProps> = ({
  onSettings,
  onExport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        const mainButton = containerRef.current?.querySelector<HTMLButtonElement>('[data-main-fab]');
        mainButton?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  const handleMainClick = () => {
    onSettings();
  };

  const handleExportClick = () => {
    onExport();
    setIsOpen(false);
  };

  return (
    <div className="relative hidden md:block">
      {/* Settings FAB Container */}
      <div
        ref={containerRef}
        className="relative z-50"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="group"
        aria-label="Settings menu"
      >
        {/* Export Action Button - positioned absolutely above the main FAB */}
        {isOpen && (
          <div
            className="absolute bottom-full mb-3 right-0"
            role="menu"
            aria-orientation="vertical"
          >
            <div className="relative flex items-center gap-3 group animate-slideUp">
              {/* Export Button */}
              <button
                onClick={handleExportClick}
                className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white
                  rounded-full shadow-lg hover:shadow-xl
                  transition-all duration-200 ease-in-out
                  flex items-center justify-center
                  hover:scale-110 active:scale-95
                  focus:outline-hidden focus:ring-4 focus:ring-blue-400/50"
                aria-label="Export Companies"
                aria-describedby="tooltip-export"
                role="menuitem"
                tabIndex={isOpen ? 0 : -1}
              >
                <Download className="w-5 h-5" />
              </button>

              {/* Tooltip - positioned to the right */}
              <div
                className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-sm
                  rounded-md whitespace-nowrap pointer-events-none
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  shadow-lg z-50"
                role="tooltip"
                id="tooltip-export"
              >
                Export Companies
              </div>
            </div>
          </div>
        )}

        {/* Main Settings FAB */}
        <button
          data-main-fab
          onClick={handleMainClick}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white
            rounded-full shadow-lg hover:shadow-xl
            transition-all duration-200 ease-in-out
            flex items-center justify-center
            hover:scale-105 active:scale-95
            focus:outline-hidden focus:ring-4 focus:ring-blue-600/50"
          aria-label="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
