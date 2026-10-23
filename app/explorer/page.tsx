import { Suspense } from 'react'
import App from '../../src/App'
import ExplorerLoading from './loading'

/**
 * Explorer page - renders the main application.
 *
 * Authentication is handled client-side by AppContainer which:
 * 1. Calls /api/user/data to fetch user data and verify authentication
 * 2. Redirects to /login if the user is not authenticated
 *
 * This avoids a redundant getUser() call that would add ~200-500ms latency.
 * The proxy (proxy.ts) handles cookie/session refresh without requiring getUser().
 */
export default function ExplorePage() {
  // Following async-suspense-boundaries: Wrap App in Suspense for streaming
  return (
    <Suspense fallback={<ExplorerLoading />}>
      <App />
    </Suspense>
  )
}