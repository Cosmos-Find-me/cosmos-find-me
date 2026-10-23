/**
 * Deterministic positions for decorative stars and particles.
 *
 * A seeded generator (instead of Math.random during render) keeps positions
 * stable across re-renders and identical between server and client renders.
 */

export interface StarPosition {
  left: number; // %
  top: number; // %
  delay: number; // s
  duration: number; // s
}

export interface BurstParticle {
  x: number; // px from centre
  y: number; // px from centre
  delay: number; // s
  duration: number; // s
}

// mulberry32: small, fast, good-enough PRNG for visual randomness
const createRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const generateStars = (count: number, seed: number): StarPosition[] => {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => ({
    left: random() * 100,
    top: random() * 100,
    delay: random() * 3,
    duration: 2 + random() * 2,
  }));
};

export const generateBurst = (count: number, seed: number): BurstParticle[] => {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => {
    const angle = random() * 2 * Math.PI;
    const distance = 50 + random() * 150;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: random(),
      duration: 1 + random(),
    };
  });
};
