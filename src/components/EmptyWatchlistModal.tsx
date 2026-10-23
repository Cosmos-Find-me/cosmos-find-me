import React from 'react';

interface EmptyWatchlistModalProps {
  isOpen: boolean;
  onGoToExplore: () => void;
}

const EmptyWatchlistModal: React.FC<EmptyWatchlistModalProps> = ({
  isOpen,
  onGoToExplore,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-linear-to-br from-white via-blue-50 to-indigo-50 rounded-lg shadow-xl max-w-md w-full p-8 border border-blue-200/40 backdrop-blur-xs text-center">
          
          {/* Empty State Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
            <svg className="h-8 w-8 compact:w-7 compact:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>

          {/* Content */}
          <h2 className="text-xl font-semibold text-slate-800 mb-3 compact:mb-2">
            Your watchlist is empty
          </h2>
          
          <p className="text-slate-600 mb-8 leading-relaxed">
            Start exploring companies to build your personalized watchlist of interesting opportunities.
          </p>

          {/* Action Button */}
          <button
            onClick={onGoToExplore}
            className="w-full px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 
                     rounded-lg font-medium transition-colors duration-200 ease-in-out
                     focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     shadow-lg hover:shadow-xl"
          >
            Go to Explore Companies
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmptyWatchlistModal;