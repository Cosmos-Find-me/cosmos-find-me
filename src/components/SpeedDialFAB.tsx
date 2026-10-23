import React, { useState, useRef, useEffect } from 'react';
import { Plus, Clipboard, Camera } from 'lucide-react';

interface SpeedDialAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface SpeedDialFABProps {
  onAddCompany: () => void;
  onPasteList: () => void;
  onScreenshotImport: () => void;
}

/**
 * SpeedDialFAB Component
 *
 * An expandable floating action button that reveals additional import options.
 * - Main action: Add single company
 * - Action 1: Paste company list
 * - Action 2: Import from screenshot
 *
 * Behavior:
 * - Desktop: Hover to expand
 * - Mobile: Tap to toggle
 * - Keyboard: Tab to navigate, Enter/Space to activate
 */
export const SpeedDialFAB: React.FC<SpeedDialFABProps> = ({
  onAddCompany,
  onPasteList,
  onScreenshotImport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile/touch device - use screen size as primary indicator
  useEffect(() => {
    const checkMobile = () => {
      // Consider mobile if screen width is <= 768px (tablet/mobile breakpoint)
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMobile]);

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
    if (!isMobile) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
    }
  };

  const handleMainClick = () => {
    if (isMobile) {
      setIsOpen(!isOpen);
    } else {
      onAddCompany();
    }
  };

  const handleActionClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const actions: SpeedDialAction[] = [
    ...(isMobile ? [{
      icon: <Plus className="w-5 h-5" />,
      label: 'Add Single Company',
      onClick: onAddCompany,
    }] : []),
    {
      icon: <Clipboard className="w-5 h-5" />,
      label: 'Paste Company List',
      onClick: onPasteList,
    },
    {
      icon: <Camera className="w-5 h-5" />,
      label: 'Import from Screenshot',
      onClick: onScreenshotImport,
    },
  ];

  return (
    <div className="relative">
      {/* Speed Dial Container */}
      <div
        ref={containerRef}
        className="relative z-50"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="group"
        aria-label="Quick actions menu"
      >
        {/* Action Buttons - positioned absolutely above the main FAB */}
        {isOpen && (
          <div
            className="absolute bottom-full mb-3 compact:mb-2 right-0 flex flex-col-reverse gap-3"
            role="menu"
            aria-orientation="vertical"
          >
            {actions.map((action, index) => (
              <div
                key={action.label}
                className="relative flex items-center gap-3 group animate-slideUp"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Tooltip */}
                <div
                  className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm
                    rounded-md whitespace-nowrap pointer-events-none
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200
                    shadow-lg z-50"
                  role="tooltip"
                  id={`tooltip-${action.label.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  {action.label}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleActionClick(action.onClick)}
                  className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white
                    rounded-full shadow-lg hover:shadow-xl
                    transition-all duration-200 ease-in-out
                    flex items-center justify-center
                    hover:scale-110 active:scale-95
                    focus:outline-hidden focus:ring-4 focus:ring-blue-400/50"
                  aria-label={action.label}
                  aria-describedby={`tooltip-${action.label.replace(/\s+/g, '-').toLowerCase()}`}
                  role="menuitem"
                  tabIndex={isOpen ? 0 : -1}
                >
                  {action.icon}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <button
          data-main-fab
          onClick={handleMainClick}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white
            rounded-full shadow-lg hover:shadow-xl
            transition-all duration-200 ease-in-out
            flex items-center justify-center
            hover:scale-105 active:scale-95
            focus:outline-hidden focus:ring-4 focus:ring-blue-600/50"
          aria-label={isMobile ? "Quick actions menu" : "Add Company"}
          aria-expanded={isMobile ? isOpen : undefined}
          aria-haspopup={isMobile ? "menu" : undefined}
          aria-controls={isMobile && isOpen ? "speed-dial-actions" : undefined}
        >
          <Plus
            className="w-6 h-6 compact:w-5 compact:h-5 transition-transform duration-200"
            style={{
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          />
        </button>
      </div>
    </div>
  );
};
