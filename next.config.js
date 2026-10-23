import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for PostHog reverse proxy - prevents Next.js from redirecting
  // URLs with trailing slashes (PostHog's API uses /e/, /s/, etc.)
  skipTrailingSlashRedirect: true,

  // Explicitly set the output file tracing root to this directory
  // This fixes the multiple lockfiles warning by telling Next.js this is the project root
  outputFileTracingRoot: __dirname,
  
  // Enable experimental features if needed
  experimental: {
    // Enable app directory (already default in Next.js 15)
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: 'my-value',
  },
  
  // Image optimization (for company logos)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'img.logo.dev',
      },
      {
        protocol: 'https',
        hostname: 'cdn.brandfolder.io',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com', // Temporary - for migrating old data
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Redirect old Vite paths if needed
  async redirects() {
    return [];
  },

  // PostHog reverse proxy to avoid ad blockers
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
      },
    ];
  },
};

export default nextConfig;