import { describe, it, expect } from 'vitest'
import { generateStars, generateBurst } from '../starField'

describe('generateStars', () => {
  it('is deterministic for a given seed (same output on server and client)', () => {
    expect(generateStars(12, 7)).toEqual(generateStars(12, 7))
  })

  it('varies with the seed', () => {
    expect(generateStars(12, 1)).not.toEqual(generateStars(12, 2))
  })

  it('places stars inside the container with the existing animation ranges', () => {
    const stars = generateStars(50, 3)

    expect(stars).toHaveLength(50)
    for (const s of stars) {
      expect(s.left).toBeGreaterThanOrEqual(0)
      expect(s.left).toBeLessThan(100)
      expect(s.top).toBeGreaterThanOrEqual(0)
      expect(s.top).toBeLessThan(100)
      expect(s.delay).toBeGreaterThanOrEqual(0)
      expect(s.delay).toBeLessThan(3)
      expect(s.duration).toBeGreaterThanOrEqual(2)
      expect(s.duration).toBeLessThan(4)
    }
  })
})

describe('generateBurst', () => {
  it('is deterministic and keeps particles 50-200px from the centre', () => {
    const burst = generateBurst(20, 11)

    expect(burst).toEqual(generateBurst(20, 11))
    expect(burst).toHaveLength(20)
    for (const p of burst) {
      const distance = Math.hypot(p.x, p.y)
      expect(distance).toBeGreaterThanOrEqual(50 - 1e-9)
      expect(distance).toBeLessThan(200)
      expect(p.delay).toBeGreaterThanOrEqual(0)
      expect(p.delay).toBeLessThan(1)
      expect(p.duration).toBeGreaterThanOrEqual(1)
      expect(p.duration).toBeLessThan(2)
    }
  })
})
