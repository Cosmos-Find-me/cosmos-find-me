import React, { useState } from 'react';
import { UserCMF, getCMFDisplayText } from '../types';

interface UserProfileModalProps {
  userCMF: UserCMF;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userCMF, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  return (
    <div className={`fixed inset-0 z-70 ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'} bg-white`}>
      {/* Mobile Header Bar - Stacked centered profile design */}
      <div className="relative px-4 pt-3 pb-4 border-b border-purple-200/40 bg-white/80 backdrop-blur-xs">
        {/* Back Button - Top Left */}
        <button
          onClick={handleClose}
          className="absolute top-3 left-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back to cosmos"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Centered: User Avatar and Name */}
        <div className="flex flex-col items-center pt-5">
          {/* User Avatar - Gradient spark/sun effect matching the center node */}
          <div className="relative w-20 h-20 mb-3 compact:mb-2">
            <div className="absolute inset-0 bg-linear-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full shadow-2xl" />
            <div className="absolute inset-1 bg-linear-to-br from-yellow-200 via-orange-300 to-pink-400 rounded-full" />
            <div className="absolute inset-2 bg-linear-to-br from-yellow-100 via-orange-200 to-yellow-300 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-lg drop-shadow-lg">
                {userCMF.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 text-center px-4">
            {userCMF.name}
          </h2>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto h-[calc(100vh-180px)] px-4 py-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* Target Role Section */}
          <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100/50">
            <h3 className="text-sm font-semibold text-purple-900 mb-2 compact:mb-1.5">Target Role</h3>
            <p className="text-base text-slate-700">{userCMF.targetRole}</p>
          </div>

          {/* Target Companies Section */}
          {userCMF.targetCompanies && (
            <div className="bg-white/60 rounded-lg p-4 border border-pink-100/50">
              <h3 className="text-sm font-semibold text-pink-900 mb-2 compact:mb-1.5">Target Companies</h3>
              <p className="text-base text-slate-700">{userCMF.targetCompanies}</p>
            </div>
          )}

          {/* Must-Haves Section */}
          {userCMF.mustHaves && userCMF.mustHaves.length > 0 && (
            <div className="bg-white/60 rounded-lg p-4 border border-blue-100/50">
              <h3 className="text-sm font-semibold text-blue-900 mb-3 compact:mb-2">Must-Haves</h3>
              <ul className="space-y-2">
                {userCMF.mustHaves.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-base text-slate-700">{getCMFDisplayText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Want-to-Haves Section */}
          {userCMF.wantToHave && userCMF.wantToHave.length > 0 && (
            <div className="bg-white/60 rounded-lg p-4 border border-purple-100/50">
              <h3 className="text-sm font-semibold text-purple-900 mb-3 compact:mb-2">Want-to-Haves</h3>
              <ul className="space-y-2">
                {userCMF.wantToHave.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-purple-500 mr-2 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                    </svg>
                    <span className="text-base text-slate-700">{getCMFDisplayText(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Experience Section */}
          {userCMF.experience && userCMF.experience.length > 0 && (
            <div className="bg-white/60 rounded-lg p-4 border border-orange-100/50">
              <h3 className="text-sm font-semibold text-orange-900 mb-3 compact:mb-2">Experience</h3>
              <ul className="space-y-2">
                {userCMF.experience.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mr-2 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                      <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                    </svg>
                    <span className="text-base text-slate-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
