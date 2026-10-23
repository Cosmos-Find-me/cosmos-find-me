import React from 'react';
import { Star } from 'lucide-react';

interface CosmosBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

// Deterministic star positions to avoid hydration mismatch
const STAR_POSITIONS = [
  { left: 15, top: 10, delay: 0, duration: 2.5 },
  { left: 85, top: 20, delay: 1, duration: 3 },
  { left: 45, top: 15, delay: 0.5, duration: 2.8 },
  { left: 70, top: 60, delay: 2, duration: 3.2 },
  { left: 25, top: 70, delay: 1.5, duration: 2.3 },
  { left: 90, top: 45, delay: 0.8, duration: 3.5 },
  { left: 10, top: 80, delay: 2.5, duration: 2.7 },
  { left: 55, top: 35, delay: 1.2, duration: 3.1 },
  { left: 35, top: 90, delay: 0.3, duration: 2.9 },
  { left: 75, top: 25, delay: 1.8, duration: 3.3 },
  { left: 20, top: 50, delay: 0.7, duration: 2.6 },
  { left: 60, top: 75, delay: 2.2, duration: 3.4 },
];

/**
 * CosmosBackground Component
 *
 * Reusable cosmos-themed background with floating stars and ambient orbs.
 * Creates an immersive space atmosphere used across onboarding and auth pages.
 */
export const CosmosBackground: React.FC<CosmosBackgroundProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-y-auto ${className}`}>
      {/* Floating Stars - positions are deterministic, so server and client render match */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {STAR_POSITIONS.map((star, i) => (
          <div
            key={i}
            className="absolute animate-pulse opacity-30"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          >
            <Star className="w-2 h-2 text-blue-300 fill-current" />
          </div>
        ))}
      </div>

      {/* Dotted Grid Overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Ambient Orbs - positioned in background layer */}
      <div
        className="absolute top-1/4 w-96 compact:w-80 h-96 bg-purple-500 rounded-full opacity-5 blur-3xl animate-pulse pointer-events-none"
        style={{ left: '12%', animationDuration: '8s' }}
      />
      <div
        className="absolute bottom-1/4 w-80 compact:w-72 h-80 bg-blue-500 rounded-full opacity-5 blur-3xl animate-pulse pointer-events-none"
        style={{ left: '10%', animationDelay: '5s', animationDuration: '15s' }}
      />
      <div
        className="absolute top-1/2 w-64 h-64 bg-pink-500 rounded-full opacity-5 blur-3xl animate-pulse pointer-events-none"
        style={{ right: '12%', animationDelay: '1s', animationDuration: '10s' }}
      />

      {/* Content */}
      {children}
    </div>
  );
};
