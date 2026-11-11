// Clerk publishable keys encode the public Frontend API host. Include that exact
// host so development instances and future custom Clerk domains both work.
function clerkFrontendOrigin() {
  const encoded = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.replace(/^pk_(test|live)_/, '');
  if (!encoded) return '';
  const host = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '');
  return /^[a-z0-9.-]+$/i.test(host) ? `https://${host}` : '';
}
const clerkOrigin = clerkFrontendOrigin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@trde/core', '@trde/mock-db', '@trde/ui-tokens'],
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  // Tree-shake large libraries
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
  },
  webpack: (config, { isServer }) => {
    // Allow importing TypeScript files from workspace packages
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.jsx': ['.tsx', '.jsx'],
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // XSS protection (legacy but still useful)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Force HTTPS for 1 year (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Restrict browser features/APIs
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy
          // Note: 'unsafe-inline' needed for theme script in layout.tsx
          // Consider refactoring theme script to use nonce or hash in future
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkOrigin} https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com https://*.protect.clerk.com https://js.stripe.com https://*.stripe.com`,
              "worker-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.dev", // Required for Clerk web workers and service worker
              "style-src 'self' 'unsafe-inline'", // unsafe-inline for Tailwind and inline styles
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              `connect-src 'self' ${clerkOrigin} https://*.supabase.co https://*.clerk.accounts.dev https://*.clerk.dev https://clerk-telemetry.com https://*.protect.clerk.com https://api.stripe.com https://*.stripe.com`,
              `frame-src 'self' ${clerkOrigin} https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com https://*.protect.clerk.com https://js.stripe.com`,
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      // CORS headers for API routes
      // Note: By default, Next.js API routes are same-origin only
      // Add explicit headers if mobile apps need access
      {
        source: '/api/:path*',
        headers: [
          // Prevent caching of API responses with sensitive data
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
