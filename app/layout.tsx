import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Toaster } from 'sonner'
import { PosthogProvider } from '../src/components/PosthogProvider'
import '../src/styles/index.css'

export const metadata: Metadata = {
  title: 'Cosmos',
  description: 'Interactive company graph explorer to find companies that fit your career preferences',
  applicationName: 'Cosmos',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cosmos',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#1e3a8a', // Blue-900 to match cosmos gradient middle
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const htmlStyle: React.CSSProperties = { height: '-webkit-fill-available', background: 'linear-gradient(to bottom right, #0f172a, #1e3a8a, #312e81)' }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={htmlStyle}>
      <head>
        <meta name="viewport" content="viewport-fit=cover" />
      </head>
      <body className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <Suspense fallback={null}>
          <PosthogProvider>
            {children}
          </PosthogProvider>
        </Suspense>
        <Toaster
          position="top-center"
          offset="5rem"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            className: 'text-sm',
          }}
          duration={4000}
        />
      </body>
    </html>
  )
}