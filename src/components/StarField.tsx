import React from 'react';
import { generateBurst, generateStars } from '../utils/starField';

interface StarFieldProps {
  count: number;
  seed?: number;
  /** Content rendered inside each star; defaults to a small dot */
  star?: React.ReactNode;
}

const defaultStar = <div className="w-1 h-1 bg-blue-300 rounded-full" />;

/** Decorative twinkling stars covering the parent container */
export const StarField: React.FC<StarFieldProps> = ({ count, seed = 1, star = defaultStar }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {generateStars(count, seed).map((s, i) => (
      <div
        key={i}
        data-star
        className="absolute animate-pulse opacity-30"
        style={{
          left: `${s.left}%`,
          top: `${s.top}%`,
          animationDelay: `${s.delay}s`,
          animationDuration: `${s.duration}s`,
        }}
      >
        {star}
      </div>
    ))}
  </div>
);

/** Particles bursting out from the centre of the parent container */
export const ParticleBurst: React.FC<{ count: number; seed?: number }> = ({ count, seed = 1 }) => (
  <>
    {generateBurst(count, seed).map((p, i) => (
      <div
        key={`particle-${i}`}
        className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-bounce pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(${p.x - 2}px, ${p.y - 2}px)`, // -2px to center the 1px dot
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
        }}
      />
    ))}
  </>
);
