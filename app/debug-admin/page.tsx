'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '../../src/lib/supabase'

// Force dynamic rendering for debug pages
export const dynamic = 'force-dynamic'

interface DebugInfo {
  error?: string
  user?: { id: string; email: string | undefined; role: string | undefined } | null
  userError?: unknown
  profile?: { role: string; email: string } | null
  profileError?: unknown
  isAuthenticated?: boolean
  isAdmin?: boolean
}

export default function DebugAdminPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClientComponentClient()
      if (!supabase) {
        setDebugInfo({ error: 'Supabase client not available' })
        setLoading(false)
        return
      }
      
      try {
        // Check current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        console.log('Current user:', user)
        console.log('User error:', userError)

        let profile: { role: string; email: string } | null = null
        let profileError: unknown = null

        if (user) {
          // Get user profile
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single<{ role: string; email: string }>()

          profile = data
          profileError = error

          console.log('Profile data:', profile)
          console.log('Profile error:', profileError)
        }

        setDebugInfo({
          user: user ? {
            id: user.id,
            email: user.email,
            role: user.role
          } : null,
          userError,
          profile,
          profileError,
          isAuthenticated: !!user,
          isAdmin: profile?.role === 'admin'
        })

      } catch (error) {
        console.error('Debug error:', error)
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div className="p-8">Loading debug info...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Auth Debug</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Authentication Debug Info</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="mt-6 space-y-4">
          <div className={`p-4 rounded ${debugInfo.isAuthenticated ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
            <strong>Authentication Status:</strong> {debugInfo.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </div>
          
          <div className={`p-4 rounded ${debugInfo.isAdmin ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
            <strong>Admin Status:</strong> {debugInfo.isAdmin ? '✅ Is Admin' : '❌ Not Admin'}
          </div>

          {debugInfo.profile && (
            <div className="p-4 bg-blue-50 border-blue-200 border rounded">
              <strong>Profile Role:</strong> {debugInfo.profile.role}
              <br />
              <strong>Profile Email:</strong> {debugInfo.profile.email}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}