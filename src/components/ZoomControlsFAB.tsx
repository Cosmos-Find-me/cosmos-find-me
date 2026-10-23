import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControlsFABProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
  isMobile?: boolean;
}

/**
 * ZoomControlsFAB Component
 *
 * Desktop-only expandable floating action button for graph zoom controls.
 * - Main action: Fit to view
 * - Expands on hover to reveal: Zoom In, Zoom Out
 *
 * Behavior:
 * - Desktop: Hover to expand zoom controls
 * - Mobile: Simple fit-to-view button (no expansion)
 */
export const ZoomControlsFAB: React.FC<ZoomControlsFABProps> = ({
  onZoomIn,
  onZoomOut,
  onFitToView,
  isMobile = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  const handleActionClick = (action: () => void) => {
    action();
    // Keep menu open on desktop for multiple zoom operations
  };

  return (
    <div className="relative">
      {/* Zoom Controls Container */}
      <div
        className="relative z-50"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="group"
        aria-label="Zoom controls"
      >
        {/* Desktop: Expandable zoom controls - hidden on mobile */}
        {isOpen && !isMobile && (
          <div
            className="flex absolute top-full mt-3 right-0 flex-col gap-3"
            role="menu"
            aria-orientation="vertical"
          >
            {/* Zoom In */}
            <div
              className="relative flex items-center gap-3 group animate-slideUp"
              style={{ animationDelay: '0ms' }}
            >
              {/* Tooltip */}
              <div
                className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm
                  rounded-md whitespace-nowrap pointer-events-none
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  shadow-lg z-50"
                role="tooltip"
              >
                Zoom In
              </div>

              {/* Zoom In Button */}
              <button
                onClick={() => handleActionClick(onZoomIn)}
                className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white
                  rounded-full shadow-lg hover:shadow-xl
                  transition-all duration-200 ease-in-out
                  flex items-center justify-center
                  hover:scale-110 active:scale-95
                  focus:outline-hidden focus:ring-4 focus:ring-blue-400/50"
                aria-label="Zoom in"
                role="menuitem"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>

            {/* Zoom Out */}
            <div
              className="relative flex items-center gap-3 group animate-slideUp"
              style={{ animationDelay: '50ms' }}
            >
              {/* Tooltip */}
              <div
                className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm
                  rounded-md whitespace-nowrap pointer-events-none
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                  shadow-lg z-50"
                role="tooltip"
              >
                Zoom Out
              </div>

              {/* Zoom Out Button */}
              <button
                onClick={() => handleActionClick(onZoomOut)}
                className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white
                  rounded-full shadow-lg hover:shadow-xl
                  transition-all duration-200 ease-in-out
                  flex items-center justify-center
                  hover:scale-110 active:scale-95
                  focus:outline-hidden focus:ring-4 focus:ring-blue-400/50"
                aria-label="Zoom out"
                role="menuitem"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Fit to View FAB */}
        <button
          onClick={onFitToView}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white
            rounded-full shadow-lg hover:shadow-xl
            transition-all duration-200 ease-in-out
            flex items-center justify-center
            hover:scale-105 active:scale-95
            focus:outline-hidden focus:ring-4 focus:ring-blue-600/50"
          aria-label="Fit to view"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  );
};
