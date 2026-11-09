import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { InitWrapper } from '@/components/InitWrapper';
import { ClerkProviderWrapper } from '@/components/ClerkProviderWrapper';
import { GlobalProviders } from '@/components/GlobalProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TRDE',
  description: 'Analytics-first trading journal for futures and options traders',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TRDE',
  },
  icons: {
    icon: [
      { url: '/favicons/TRDE_favicon_black_16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicons/TRDE_favicon_black_32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicons/TRDE_favicon_black_48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicons/TRDE_favicon_black_64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/favicons/TRDE_favicon_black_128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/favicons/TRDE_favicon_black_256x256.png', sizes: '256x256', type: 'image/png' },
    ],
    apple: [
      { url: '/logos/TRDE_black_transparent_512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'TRDE',
    'apple-mobile-web-app-title': 'TRDE',
    'theme-color': '#C9A962',
    'msapplication-TileColor': '#000000',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} theme-bg`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var d = document.documentElement;
                  var s = d.style;
                  var p = window.location.pathname;
                  var isDash = /^\\/(app|admin|settings|trades|analytics|journal|strategies|review|risk|edge|performance|flow)/.test(p);

                  // Dashboard always dark (scene system); public pages respect stored preference
                  if (isDash) {
                    d.classList.remove('light','dark');
                    d.classList.add('dark');
                    // Dark mono theme variables
                    s.setProperty('--theme-primary','#3b82f6');
                    s.setProperty('--theme-primary-hover','#2563eb');
                    s.setProperty('--theme-primary-active','#1d4ed8');
                    s.setProperty('--theme-primary-light','#60a5fa');
                    s.setProperty('--theme-primary-dark','#1e3a8a');
                    s.setProperty('--theme-bg','#000000');
                    s.setProperty('--theme-bg-secondary','#000000');
                    s.setProperty('--theme-bg-tertiary','#333333');
                    s.setProperty('--theme-text','#ffffff');
                    s.setProperty('--theme-text-secondary','#e5e5e5');
                    s.setProperty('--theme-text-tertiary','#b3b3b3');
                    s.setProperty('--theme-border','#4a4a4a');
                    s.setProperty('--theme-border-secondary','#333333');
                    s.setProperty('--theme-accent','#3b82f6');
                    s.setProperty('--theme-accent-hover','#2563eb');
                    s.setProperty('--theme-success','#22c55e');
                    s.setProperty('--theme-warning','#f97316');
                    s.setProperty('--theme-error','#ef4444');
                    s.setProperty('--theme-info','#0ea5e9');
                    s.setProperty('--theme-ring','#3b82f6');
                    s.setProperty('--theme-shadow','#3b82f6');
                  } else {
                    var t = localStorage.getItem('trde-theme') || 'light';
                    d.classList.remove('light','dark');
                    d.classList.add(t);
                    var dk = t === 'dark';
                    s.setProperty('--theme-primary', dk ? '#ffffff' : '#000000');
                    s.setProperty('--theme-primary-hover', dk ? '#e5e5e5' : '#1a1a1a');
                    s.setProperty('--theme-primary-active', dk ? '#cccccc' : '#333333');
                    s.setProperty('--theme-primary-light', dk ? '#b3b3b3' : '#4a4a4a');
                    s.setProperty('--theme-primary-dark', dk ? '#ffffff' : '#000000');
                    s.setProperty('--theme-bg', dk ? '#000000' : '#ffffff');
                    s.setProperty('--theme-bg-secondary', dk ? '#000000' : '#ffffff');
                    s.setProperty('--theme-bg-tertiary', dk ? '#333333' : '#f5f5f5');
                    s.setProperty('--theme-text', dk ? '#ffffff' : '#000000');
                    s.setProperty('--theme-text-secondary', dk ? '#e5e5e5' : '#1a1a1a');
                    s.setProperty('--theme-text-tertiary', dk ? '#b3b3b3' : '#4a4a4a');
                    s.setProperty('--theme-border', dk ? '#4a4a4a' : '#d4d4d4');
                    s.setProperty('--theme-border-secondary', dk ? '#333333' : '#e5e5e5');
                    s.setProperty('--theme-accent', dk ? '#ffffff' : '#000000');
                    s.setProperty('--theme-accent-hover', dk ? '#e5e5e5' : '#1a1a1a');
                    s.setProperty('--theme-success', dk ? '#22c55e' : '#16a34a');
                    s.setProperty('--theme-warning', dk ? '#f97316' : '#ea580c');
                    s.setProperty('--theme-error', dk ? '#ef4444' : '#dc2626');
                    s.setProperty('--theme-info','#0ea5e9');
                    s.setProperty('--theme-ring', dk ? '#ffffff' : '#000000');
                    s.setProperty('--theme-shadow', dk ? '#ffffff' : '#000000');
                  }
                  // Always Inter (font selector removed)
                  s.setProperty('--font-family','"Inter", sans-serif');
                  // Clean up stale keys from removed features
                  localStorage.removeItem('trde:selectedFont');
                  localStorage.removeItem('trde:dashboard-theme');
                  localStorage.removeItem('trde:theme');
                } catch(e) {}
              })();
            `,
          }}
        />
        <ClerkProviderWrapper>
          <ThemeProvider>
            <ToastProvider>
              <GlobalProviders>
                <InitWrapper />
                {children}
              </GlobalProviders>
            </ToastProvider>
          </ThemeProvider>
        </ClerkProviderWrapper>
      </body>
    </html>
  );
}
