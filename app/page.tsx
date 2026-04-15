'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { CosmosBackground } from '../src/components/CosmosBackground'
import appPreviewImage from '../assets/images/cosmos-ui.jpg'
import { Sparkles, Mail, Rocket, LogIn, X, ZoomIn } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageExpanded, setImageExpanded] = useState(false)

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (imageExpanded) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [imageExpanded])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error ?? 'Failed to join waitlist')
      }

      setSubmitted(true)
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CosmosBackground className="px-4 py-12 md:py-16 lg:py-20">
      {/* Sign In Link - Top Right */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
        <Link
          href="/login"
          className="flex items-center gap-2 px-4 py-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
        >
          <LogIn className="w-4 h-4" />
          <span className="text-sm font-medium">Sign In</span>
        </Link>
      </div>

      <div className="max-w-5xl w-full mx-auto">
        {/* Hero Section - Increased spacing and typography hierarchy */}
        <div className="text-center mb-16 md:mb-20 lg:mb-24">
          {/* Title with spark overlay */}
          <div className="relative flex justify-center items-center mb-6 md:mb-8" style={{ height: '200px' }}>
            {/* Spark container */}
            <div className="absolute left-1/2 transform -translate-x-1/2" style={{ width: '154px', height: '154px', top: '50%', transform: 'translate(-50%, -48%)' }}>
              {/* Outer glow layers */}
              <div className="absolute inset-0 scale-150 opacity-20 pointer-events-none" style={{ transform: 'translateZ(0)', willChange: 'opacity' }}>
                <div className="w-full h-full bg-gradient-to-r from-orange-400 via-purple-500 to-blue-500 rounded-full animate-pulse" />
              </div>

              <div className="absolute inset-0 scale-125 opacity-40 pointer-events-none" style={{ transform: 'translateZ(0)', willChange: 'opacity' }}>
                <div className="w-full h-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 rounded-full animate-pulse"
                     style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
              </div>

              {/* Main spark - 60% of 256px = 154px */}
              <div className="relative w-full h-full bg-gradient-to-br from-orange-300 via-pink-400 to-purple-500 rounded-full shadow-2xl">
                <div className="absolute inset-2 bg-gradient-to-br from-yellow-200 via-orange-300 to-pink-400 rounded-full animate-pulse pointer-events-none" style={{ animationDuration: '2s', transform: 'translateZ(0)', willChange: 'opacity' }} />
                <div className="absolute inset-4 bg-gradient-to-br from-yellow-100 via-orange-200 to-yellow-300 rounded-full animate-pulse pointer-events-none" style={{ animationDelay: '1s', animationDuration: '4s', transform: 'translateZ(0)', willChange: 'opacity' }} />

                {/* Small sparkles around the main spark */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 pointer-events-none">
                  <Sparkles className="w-4 h-4 text-yellow-200 animate-bounce" style={{ animationDelay: '2s' }} />
                </div>
                <div className="absolute -right-1 top-1/3 pointer-events-none">
                  <Sparkles className="w-3 h-3 text-pink-200 animate-bounce" style={{ animationDelay: '1s' }} />
                </div>
                <div className="absolute -left-1 bottom-1/3 pointer-events-none">
                  <Sparkles className="w-2 h-2 text-purple-200 animate-bounce" style={{ animationDelay: '3s' }} />
                </div>
              </div>
            </div>

            {/* Cosmos text overlaying the spark */}
            <h1
              className="font-bold text-white relative z-10"
              style={{
                fontSize: '6rem',
                lineHeight: '1.1',
                transform: 'translateY(-8px)'
              }}
            >
              Cosmos
            </h1>
          </div>

          {/* Subtitle - Proper contrast with title (1.5-2x difference) */}
          <p className="text-2xl md:text-3xl lg:text-4xl text-blue-100 max-w-3xl mx-auto px-4 leading-relaxed font-light">
            Find where you belong! Job search, redesigned for you.
          </p>
        </div>

        {/* Video/Image Section - Centerpiece with proper spacing above and below */}
        <div className="mb-16 md:mb-20 lg:mb-24">
          {/* App Preview Image - Natural aspect ratio, clickable to expand */}
          <div
            className="relative z-10 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl max-w-6xl mx-auto cursor-pointer group"
            onClick={() => setImageExpanded(true)}
          >
            <Image
              src={appPreviewImage}
              alt="Cosmos App Preview"
              className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
              placeholder="blur"
            />
            {/* Zoom hint overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 rounded-full p-3">
                <ZoomIn className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          {/* Video - Hidden until ready, uncomment and remove Image above to restore
          <div className="relative z-10 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border-2 border-white/30 max-w-6xl mx-auto">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Cosmos Introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          */}
        </div>

        {/* Waitlist Section - Full width to match video, better padding */}
        <div className="relative z-10 rounded-2xl shadow-2xl p-8 md:p-12 lg:p-16 border border-white/20 mb-16 max-w-6xl mx-auto" style={{ backgroundColor: '#0f172a' }}>
          {submitted ? (
            <div className="text-center">
              <div className="flex justify-center mb-6 md:mb-8">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center">
                  <Rocket className="w-10 h-10 md:w-12 md:h-12 text-white" />
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 md:mb-8 leading-tight">
                Welcome to Cosmos! 🚀
              </h2>
              <p className="text-blue-200 text-lg md:text-xl lg:text-2xl max-w-2xl mx-auto leading-relaxed mb-6">
                Thank you for joining our waitlist. We'll keep you updated on our progress and let you know when Cosmos is ready for launch.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-purple-300 hover:text-purple-200 text-base md:text-lg font-medium transition-colors"
              >
                Join the waitlist with another email
              </button>
            </div>
          ) : (
            <div className="text-center">
              {/* Title */}
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 md:mb-8 leading-tight">
                Get Early Access
              </h2>

              {/* Subtitle - Clear size difference from title */}
              <p className="text-blue-200 text-lg md:text-xl lg:text-2xl max-w-2xl mx-auto leading-relaxed" style={{ marginBottom: '1.5rem' }}>
                Be the first to get access to Cosmos and updates on progress.
              </p>

              {/* Form - Wider to match section width better */}
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-3 w-full px-4 py-3 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-purple-400 bg-white transition-all">
                  <Mail className="text-slate-400 w-5 h-5 flex-shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 outline-none bg-transparent text-slate-900 placeholder-slate-400 text-lg"
                    placeholder="you@example.com"
                    required
                    data-lpignore="true"
                    data-1p-ignore
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
                    <p className="text-red-200 text-base">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 text-white py-4 md:py-5 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 blur transition-opacity" />
                  <span className="relative z-10 flex items-center gap-2 font-semibold">
                    {loading ? 'Joining...' : 'Join the Waitlist'}
                    <Sparkles className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-sm">
          <p>© 2026 Cosmos. Navigate your career through the stars.</p>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {imageExpanded && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-80 transition-opacity"
            onClick={() => setImageExpanded(false)}
          />

          {/* Modal content */}
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Close button */}
            <button
              className="fixed top-4 right-4 z-10 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              onClick={() => setImageExpanded(false)}
            >
              <X className="w-8 h-8" />
            </button>

            {/* Expanded image - constrained to 90vh with border */}
            <div
              className="relative rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl cursor-pointer"
              style={{ maxHeight: '90vh', maxWidth: '95vw' }}
              onClick={() => setImageExpanded(false)}
            >
              <Image
                src={appPreviewImage}
                alt="Cosmos App Preview - Expanded"
                className="object-contain"
                style={{ maxHeight: '90vh', width: 'auto', height: 'auto' }}
                placeholder="blur"
              />
            </div>

            {/* Click anywhere hint */}
            <p className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm pointer-events-none">
              Click anywhere to close
            </p>
          </div>
        </div>
      )}
    </CosmosBackground>
  )
}
