'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { usePWAInstall } from '@/hooks/usePWAInstall';

// Placeholder URLs - update when public links are available
const APP_STORE_URL = 'https://apps.apple.com/app/trde';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.trde';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function DownloadPage() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const handlePWAInstall = async () => {
    if (isInstallable) {
      await install();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <ArrowLeftIcon className="w-5 h-5 text-gray-500 group-hover:text-black transition-colors" />
              <Image
                src="/logos/TRDE_black_transparent_1024x1024.png"
                alt="TRDE Logo"
                width={48}
                height={48}
                className="h-10 w-10"
              />
            </Link>
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 mb-6">
              <SparklesIcon className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-medium text-gray-700">Available on all platforms</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-black mb-4">
              Download TRDE
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Access your trading journal anywhere. Track, analyze, and improve your performance on any device.
            </p>
          </motion.div>

          {/* Download Options */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-stretch">
            {/* Desktop PWA Card */}
            <motion.div
              {...fadeInUp}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full"
            >
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                <ComputerDesktopIcon className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Desktop App</h3>
              <p className="text-gray-600 mb-6 flex-grow">
                Install TRDE on your desktop for quick access without opening a browser.
              </p>
              
              <div className="mt-auto">
                {isInstalled ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 font-medium py-3">
                    <CheckCircleIcon className="w-5 h-5" />
                    Installed
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={handlePWAInstall}
                    className="w-full px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Install Now
                  </button>
                ) : isIOS ? (
                  <div className="text-sm text-gray-500 text-center py-2">
                    <p className="mb-1 font-medium">To install on iOS Safari:</p>
                    <p>Tap Share → Add to Home Screen</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-3">
                    Open in Chrome, Edge, or Safari to install
                  </p>
                )}
              </div>
            </motion.div>

            {/* iOS App Card */}
            <motion.div
              {...fadeInUp}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full"
            >
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black mb-2">iOS App</h3>
              <p className="text-gray-600 mb-6 flex-grow">
                Native iPhone and iPad app with seamless iOS integration.
              </p>
              <div className="mt-auto">
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  App Store
                </a>
              </div>
            </motion.div>

            {/* Android App Card */}
            <motion.div
              {...fadeInUp}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full md:col-span-2 lg:col-span-1"
            >
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.341a.993.993 0 0 0-.997.997.997.997 0 1 0 .997-.997m-11.046 0a.993.993 0 0 0-.997.997.997.997 0 1 0 .997-.997m11.405-6.02 1.97-3.406a.416.416 0 0 0-.152-.567.416.416 0 0 0-.567.152l-1.995 3.45A12.243 12.243 0 0 0 12 7.997c-1.867 0-3.633.41-5.138 1.143L4.867 5.5a.416.416 0 0 0-.567-.152.416.416 0 0 0-.152.567l1.97 3.406C2.696 11.322.5 14.89.5 18.998h23c0-4.108-2.196-7.676-5.618-9.677M6.477 15.341a.997.997 0 1 1 0 1.994.997.997 0 0 1 0-1.994m11.046 0a.997.997 0 1 1 0 1.994.997.997 0 0 1 0-1.994"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black mb-2">Android App</h3>
              <p className="text-gray-600 mb-6 flex-grow">
                Native Android app optimized for phones and tablets.
              </p>
              <div className="mt-auto">
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Play Store
                </a>
              </div>
            </motion.div>
          </div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-20"
          >
            <h2 className="text-2xl font-bold text-black text-center mb-10">
              Why Download the App?
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: DevicePhoneMobileIcon,
                  title: 'Offline Access',
                  description: 'Review your trades and stats even without internet connection.',
                },
                {
                  icon: SparklesIcon,
                  title: 'Native Experience',
                  description: 'Smooth animations and native feel on every platform.',
                },
                {
                  icon: CheckCircleIcon,
                  title: 'Quick Launch',
                  description: 'One tap to open - no browser needed, no tabs to manage.',
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="text-center p-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-black mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-16 text-center"
          >
            <p className="text-gray-600 mb-4">
              Don&apos;t have an account yet?
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 bg-black text-white font-semibold rounded-xl hover:bg-gray-900 transition-all shadow-lg hover:shadow-xl"
            >
              Get Started Free
              <ArrowDownTrayIcon className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} TRDE. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
