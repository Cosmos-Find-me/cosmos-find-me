'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '../../../src/lib/supabase'
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react'

// Force dynamic rendering for invite pages
export const dynamic = 'force-dynamic'

interface Invitation {
  email: string
  full_name: string | null
  expires_at: string
  invite_token: string
  used: boolean
}

export default function InvitePage() {
  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState(false)

  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const checkInvitation = useCallback(async () => {
    try {
      const response = await fetch(`/api/invite/${token}`)
      const data = await response.json() as { invitation?: Invitation; error?: string }

      if (response.ok) {
        setInvitation(data.invitation ?? null)
      } else {
        setError(data.error ?? 'Invalid or expired invitation')
      }
    } catch (error) {
      setError('Failed to verify invitation')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    checkInvitation()
  }, [token, checkInvitation])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    if (!invitation) {
      setError('Invitation not found')
      setCreating(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setCreating(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setCreating(false)
      return
    }

    try {
      const supabase = createClientComponentClient()
      if (!supabase) {
        setError('Authentication service not available')
        setCreating(false)
        return
      }
      
      // Create the account with timeout handling
      console.log('Starting signup for:', invitation.email)
      
      // Add a timeout wrapper around the signup call
      const signupPromise = supabase.auth.signUp({
        email: invitation.email,
        password: password,
        options: {
          data: {
            full_name: invitation.full_name
          }
        }
      })

      // Set a 30-second timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Signup request timed out')), 30000)
      })

      const result = await Promise.race([signupPromise, timeoutPromise])
      const { data, error: signupError } = result as Awaited<typeof signupPromise>

      console.log('Signup response:', { data, error: signupError })

      if (signupError) {
        console.error('Signup error:', signupError)
        
        // Enhanced error handling with specific messages
        let errorMessage = signupError.message
        
        if (signupError.message.includes('timeout') || signupError.message.includes('network')) {
          errorMessage = 'The signup process is taking too long. This may be due to email service rate limits or network issues. Please wait a few minutes and try again, or contact support if the problem persists.'
        } else if (signupError.message.includes('rate') || signupError.message.includes('limit')) {
          errorMessage = 'Too many signup attempts. Please wait an hour before trying again, or contact an administrator to disable email confirmation temporarily.'
        } else if (signupError.message.includes('email') && signupError.message.includes('invalid')) {
          errorMessage = 'The email address format is invalid. Please check the email address and try again.'
        } else if (signupError.message.includes('email') && signupError.message.includes('exists')) {
          errorMessage = 'An account with this email already exists. Please try signing in instead, or use a different email address.'
        } else if (signupError.message.includes('password')) {
          errorMessage = 'Password does not meet requirements. Please ensure your password is at least 6 characters long.'
        }
        
        setError(errorMessage)
        setCreating(false)
        return
      }

      console.log('Signup successful, marking invitation as used')
      // Mark invitation as used
      await fetch(`/api/invite/${token}/accept`, {
        method: 'POST'
      })

      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=Account created successfully! Please sign in.')
      }, 3000)

    } catch (error) {
      console.error('Catch block error:', error)
      
      let errorMessage = 'Failed to create account'
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMsg === 'Signup request timed out') {
        errorMessage = 'The signup process timed out. This is often caused by email service rate limits (4 emails per hour). Please wait an hour and try again, or contact an administrator to temporarily disable email confirmation for testing.'
      } else if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
        errorMessage = 'Network error occurred during signup. Please check your internet connection and try again.'
      } else if (errorMsg) {
        errorMessage = `Signup failed: ${errorMsg}`
      }
      
      setError(errorMessage)
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/40 p-8 w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h1>
          <p className="text-slate-600 mb-4">
            Your account has been successfully created. You will be redirected to login shortly.
          </p>
          <div className="animate-pulse text-blue-600">Redirecting to login...</div>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/40 p-8 w-full max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Invitation</h1>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/40 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <UserPlus className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Complete Your Registration</h1>
          <p className="text-slate-600 mt-2">
            You've been invited to join CMF Explorer as <strong>{invitation.full_name}</strong>
          </p>
          <p className="text-sm text-slate-500 mt-1">{invitation.email}</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Create Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
              placeholder="Enter your password"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90"
              placeholder="Confirm your password"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1">Account creation failed</p>
                  <p className="text-sm">{error}</p>
                  {error.includes('rate limit') || error.includes('4 emails per hour') ? (
                    <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                      <p className="font-medium">Developer Note:</p>
                      <p>You can disable email confirmation in Supabase Dashboard → Authentication → Settings → Email to bypass this limit during development.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50"
          >
            {creating ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}