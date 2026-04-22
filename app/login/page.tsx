'use client'
import { useState } from 'react'
import { createClientComponentClient } from '../../src/lib/supabase'
import { useRouter } from 'next/navigation'
import { LogIn, Mail, Lock, Loader2, Sparkles } from 'lucide-react'
import { CosmosBackground } from '../../src/components/CosmosBackground'
import { getLoginErrorMessage, getPasswordResetErrorMessage } from '../../src/utils/authErrors'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClientComponentClient()
    if (!supabase) {
      setError('Authentication service not available')
      setLoading(false)
      return
    }
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(getLoginErrorMessage(error))
      } else {
        router.push('/explorer')
      }
    } catch (err) {
      setError(getLoginErrorMessage(err))
    }
    setLoading(false)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClientComponentClient()
    if (!supabase) {
      setError('Authentication service not available')
      setLoading(false)
      return
    }
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`
      })
      if (error) {
        setError(getPasswordResetErrorMessage(error))
      } else {
        setResetSent(true)
      }
    } catch (err) {
      setError(getPasswordResetErrorMessage(err))
    }
    setLoading(false)
  }

  return (
    <CosmosBackground className="flex items-center justify-center p-4">
      <div className="relative z-10 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20" style={{ backgroundColor: '#0f172a' }}>
        <div className="text-center mb-8">
          <div className="relative w-16 h-16 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse" style={{ animationDuration: '6s' }}>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 opacity-50 blur animate-pulse" style={{ animationDuration: '6s' }} />
            <LogIn className="w-8 h-8 text-white relative z-10" />
            <Sparkles className="w-4 h-4 text-yellow-200 absolute -top-1 -right-1 animate-bounce" style={{ animationDelay: '0.5s' }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {resetMode ? 'Reset Password' : 'Welcome Back'}
          </h1>
          <p className="text-blue-200">
            {resetMode ? 'Enter your email to reset your password' : (
              <>
                Sign in to your{' '}
                <span className="bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 bg-clip-text text-transparent font-semibold">
                  Cosmos
                </span>
              </>
            )}
          </p>
        </div>
        
        {resetSent ? (
          <div className="text-center">
            <div className="p-4 bg-green-500/20 border border-green-400/30 rounded-lg mb-4 backdrop-blur-sm">
              <p className="text-green-200 text-sm">
                Password reset email sent! Check your inbox and follow the link to reset your password.
              </p>
            </div>
            <button
              onClick={() => {setResetSent(false); setResetMode(false); setError('')}}
              className="text-blue-300 hover:text-blue-200 text-sm font-medium transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={resetMode ? handlePasswordReset : handleLogin} className="space-y-4">
            <div className="flex items-center gap-3 w-full px-4 py-3 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-purple-400 bg-white transition-all">
              <Mail className="text-slate-400 w-5 h-5 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 outline-none bg-transparent text-slate-900 placeholder-slate-400"
                placeholder="you@example.com"
                required
              />
            </div>

            {!resetMode && (
              <div className="flex items-center gap-3 w-full px-4 py-3 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-purple-400 bg-white transition-all">
                <Lock className="text-slate-400 w-5 h-5 flex-shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 outline-none bg-transparent text-slate-900 placeholder-slate-400"
                  placeholder="Enter your password"
                  required
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 blur transition-opacity" />
              <span className="relative z-10 flex items-center">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {resetMode ? 'Send Reset Email' : 'Sign In'}
                    <Sparkles className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </span>
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {setResetMode(!resetMode); setError(''); setPassword('')}}
                className="text-blue-300 hover:text-purple-300 text-sm font-medium transition-colors relative group"
              >
                <span className="relative">
                  {resetMode ? 'Back to Sign In' : 'Forgot Password?'}
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-gradient-to-r from-blue-300 to-purple-300 transform scale-x-0 group-hover:scale-x-100 transition-transform" />
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Logo.dev Attribution - Publicly visible for verification */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <a
            href="https://logo.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            title="Logo API"
          >
            Company logos provided by Logo.dev
          </a>
        </div>
      </div>
    </CosmosBackground>
  )
}