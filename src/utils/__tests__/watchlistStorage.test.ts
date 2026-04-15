import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  loadWatchlistFromStorage,
  saveWatchlistToStorage,
  clearWatchlistFromStorage,
  isStorageAvailable,
} from '../watchlistStorage'

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------

const store: Record<string, string> = {}

const mockLocalStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
  key: vi.fn(),
  get length() { return Object.keys(store).length },
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  })
  mockLocalStorage.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const STORAGE_KEY = 'cosmos-watchlist'
const LEGACY_KEY = 'cmf-explorer-watchlist'

// ---------------------------------------------------------------------------
// isWatchlistData (tested indirectly through loadWatchlistFromStorage)
// ---------------------------------------------------------------------------

describe('isWatchlistData (via loadWatchlistFromStorage)', () => {
  it('accepts a well-formed WatchlistData object', () => {
    store[STORAGE_KEY] = JSON.stringify({ companyIds: [1, 2, 3], lastUpdated: new Date().toISOString(), version: 1 })
    const result = loadWatchlistFromStorage()
    expect(result.error).toBeUndefined()
    expect([...result.data]).toEqual([1, 2, 3])
  })

  it('rejects a plain string — throws and returns empty set with error', () => {
    store[STORAGE_KEY] = JSON.stringify('just a string')
    const result = loadWatchlistFromStorage()
    expect(result.error).toBeDefined()
    expect(result.data.size).toBe(0)
  })

  it('rejects a number', () => {
    store[STORAGE_KEY] = JSON.stringify(42)
    const result = loadWatchlistFromStorage()
    expect(result.error).toBeDefined()
    expect(result.data.size).toBe(0)
  })

  it('rejects an object missing companyIds', () => {
    store[STORAGE_KEY] = JSON.stringify({ lastUpdated: new Date().toISOString(), version: 1 })
    const result = loadWatchlistFromStorage()
    expect(result.error).toBeDefined()
    expect(result.data.size).toBe(0)
  })

  it('rejects an object where companyIds is not an array', () => {
    store[STORAGE_KEY] = JSON.stringify({ companyIds: 'not-an-array', version: 1 })
    const result = loadWatchlistFromStorage()
    expect(result.error).toBeDefined()
    expect(result.data.size).toBe(0)
  })

  it('rejects null', () => {
    store[STORAGE_KEY] = JSON.stringify(null)
    const result = loadWatchlistFromStorage()
    expect(result.error).toBeDefined()
    expect(result.data.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Legacy array migration — filters non-numbers without casting
// ---------------------------------------------------------------------------

describe('legacy array migration', () => {
  it('migrates a plain number array and returns those IDs', () => {
    store[STORAGE_KEY] = JSON.stringify([10, 20, 30])
    const result = loadWatchlistFromStorage()
    expect(result.migrated).toBe(true)
    expect([...result.data]).toEqual([10, 20, 30])
    expect(result.error).toBeUndefined()
  })

  it('filters out non-number elements from a legacy mixed array', () => {
    store[STORAGE_KEY] = JSON.stringify([1, 'two', null, 3, true])
    const result = loadWatchlistFromStorage()
    expect(result.migrated).toBe(true)
    // only actual numbers survive
    expect([...result.data]).toEqual([1, 3])
  })

  it('writes the migrated data back to storage as a WatchlistData object', () => {
    store[STORAGE_KEY] = JSON.stringify([7, 8])
    loadWatchlistFromStorage()
    const written = JSON.parse(store[STORAGE_KEY])
    expect(written).toMatchObject({ companyIds: [7, 8], version: 1 })
    expect(typeof written.lastUpdated).toBe('string')
  })

  it('migrates from the legacy key when the new key is absent', () => {
    store[LEGACY_KEY] = JSON.stringify({ companyIds: [5, 6], lastUpdated: new Date().toISOString(), version: 1 })
    const result = loadWatchlistFromStorage()
    expect(result.error).toBeUndefined()
    expect([...result.data]).toEqual([5, 6])
    // new key is now populated, old key removed
    expect(store[STORAGE_KEY]).toBeDefined()
    expect(store[LEGACY_KEY]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// createStorageError — unknown input handling
//
// isStorageAvailable() does a test write via setItem, which would consume a
// mockImplementationOnce before the real call. To isolate the catch path we
// mock isStorageAvailable itself so the function reaches the try/catch, then
// override setItem only for the actual storage write.
// ---------------------------------------------------------------------------

describe('createStorageError (via saveWatchlistToStorage catch path)', () => {
  beforeEach(() => {
    // Make isStorageAvailable return true so saveWatchlistToStorage proceeds
    // past the early-exit guard and reaches the try/catch we want to test.
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { /* no-op for availability check */ })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const runWithThrowingSetItem = async (thrownValue: unknown) => {
    // First call (test-write inside isStorageAvailable) succeeds silently.
    // Second call (the real write) throws.
    let callCount = 0
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      callCount++
      if (callCount > 1) throw thrownValue
    })
    return saveWatchlistToStorage(new Set([1]))
  }

  it('handles a thrown Error object', async () => {
    const result = await runWithThrowingSetItem(new Error('disk full'))
    expect(result.success).toBe(false)
    expect(result.error?.type).toBe('unknown')
    expect(result.error?.message).toContain('disk full')
  })

  it('handles a thrown non-Error value (string)', async () => {
    const result = await runWithThrowingSetItem('something weird')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(typeof result.error?.message).toBe('string')
  })

  it('handles a thrown non-Error value (plain object)', async () => {
    const result = await runWithThrowingSetItem({ code: 99, reason: 'unknown' })
    expect(result.success).toBe(false)
    expect(typeof result.error?.message).toBe('string')
  })

  it('classifies QuotaExceededError by name', async () => {
    const quotaError = new Error('quota')
    quotaError.name = 'QuotaExceededError'
    const result = await runWithThrowingSetItem(quotaError)
    expect(result.error?.type).toBe('quota_exceeded')
  })

  it('classifies Firefox quota error by name', async () => {
    const ffError = new Error('quota')
    ffError.name = 'NS_ERROR_DOM_QUOTA_REACHED'
    const result = await runWithThrowingSetItem(ffError)
    expect(result.error?.type).toBe('quota_exceeded')
  })

  it('classifies SecurityError by name', async () => {
    const secError = new Error('denied')
    secError.name = 'SecurityError'
    const result = await runWithThrowingSetItem(secError)
    expect(result.error?.type).toBe('security')
  })
})

// ---------------------------------------------------------------------------
// saveWatchlistToStorage / loadWatchlistFromStorage round-trip
// ---------------------------------------------------------------------------

describe('round-trip save → load', () => {
  it('persists a set of IDs and reloads them correctly', async () => {
    const ids = new Set([100, 200, 300])
    await saveWatchlistToStorage(ids)
    const result = loadWatchlistFromStorage()
    expect(result.error).toBeUndefined()
    expect(result.data).toEqual(ids)
  })

  it('returns an empty set when storage is empty', () => {
    const result = loadWatchlistFromStorage()
    expect(result.data.size).toBe(0)
    expect(result.error).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// clearWatchlistFromStorage
// ---------------------------------------------------------------------------

describe('clearWatchlistFromStorage', () => {
  it('removes stored data and subsequent load returns empty set', async () => {
    await saveWatchlistToStorage(new Set([1, 2]))
    clearWatchlistFromStorage()
    const result = loadWatchlistFromStorage()
    expect(result.data.size).toBe(0)
    expect(result.error).toBeUndefined()
  })

  it('returns success: true on successful clear', async () => {
    await saveWatchlistToStorage(new Set([1]))
    const result = clearWatchlistFromStorage()
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// isStorageAvailable
// ---------------------------------------------------------------------------

describe('isStorageAvailable', () => {
  it('returns true when localStorage works normally', () => {
    expect(isStorageAvailable()).toBe(true)
  })

  it('returns false when localStorage.setItem throws', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => { throw new Error('unavailable') })
    expect(isStorageAvailable()).toBe(false)
  })
})
