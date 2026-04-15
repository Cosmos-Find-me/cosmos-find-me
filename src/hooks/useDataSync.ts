import { useEffect, useRef, useCallback } from 'react'

const DEFAULT_MIN_CHECK_INTERVAL = 10_000 // 10 seconds

export interface DataVersionTimestamps {
  companyDataUpdatedAt: string | null
  preferencesUpdatedAt: string | null
}

interface UseDataSyncOptions {
  /** Timestamps from the most recent full data fetch */
  knownVersions: DataVersionTimestamps | null
  /** Called when server data is newer than local data */
  onStaleData: () => void
  /** Minimum interval between checks in ms. Default: 10000 */
  minCheckInterval?: number
  /** Whether sync checking is enabled. Default: true */
  enabled?: boolean
}

export function useDataSync({
  knownVersions,
  onStaleData,
  minCheckInterval = DEFAULT_MIN_CHECK_INTERVAL,
  enabled = true,
}: UseDataSyncOptions): void {
  const knownVersionsRef = useRef(knownVersions)
  const onStaleDataRef = useRef(onStaleData)
  const lastCheckTimeRef = useRef<number>(0)
  const isCheckingRef = useRef(false)

  useEffect(() => {
    knownVersionsRef.current = knownVersions
  }, [knownVersions])

  useEffect(() => {
    onStaleDataRef.current = onStaleData
  }, [onStaleData])

  const checkForUpdates = useCallback(async () => {
    if (!enabled || !knownVersionsRef.current || isCheckingRef.current) {
      return
    }

    const now = Date.now()
    if (now - lastCheckTimeRef.current < minCheckInterval) {
      return
    }

    isCheckingRef.current = true
    lastCheckTimeRef.current = now

    try {
      const response = await fetch('/api/user/data/version')

      if (!response.ok) {
        return
      }

      const serverVersions = await response.json() as DataVersionTimestamps
      const known = knownVersionsRef.current
      if (!known) return

      const isStale =
        serverVersions.companyDataUpdatedAt !== known.companyDataUpdatedAt ||
        serverVersions.preferencesUpdatedAt !== known.preferencesUpdatedAt

      if (isStale) {
        onStaleDataRef.current()
      }
    } catch {
      // Network errors are expected (offline, etc.) — fail silently
    } finally {
      isCheckingRef.current = false
    }
  }, [enabled, minCheckInterval])

  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, checkForUpdates])
}
