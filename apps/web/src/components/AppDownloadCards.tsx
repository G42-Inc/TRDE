'use client';

import { usePWAInstall } from '@/hooks/usePWAInstall';
import { 
  ComputerDesktopIcon, 
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

// Placeholder URLs - update when public links are available
const APP_STORE_URL = 'https://apps.apple.com/app/trde';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.trde';

interface AppDownloadCardsProps {
  showDesktop?: boolean;
  showMobile?: boolean;
  compact?: boolean;
}

export function AppDownloadCards({ 
  showDesktop = true, 
  showMobile = true,
  compact = false 
}: AppDownloadCardsProps) {
  const { isInstallable, isInstalled, isIOS, platform, install } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    }
  };

  const cardBaseStyle = compact 
    ? "p-4 rounded-xl border transition-all duration-300"
    : "p-6 rounded-2xl border transition-all duration-300";

  return (
    <div className={`grid gap-4 ${showDesktop && showMobile ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
      {/* Desktop PWA Card */}
      {showDesktop && (
        <div 
          className={`${cardBaseStyle} ${isInstalled 
            ? 'bg-positive/10 border-positive/30' 
            : 'theme-bg-secondary theme-border hover:border-accent/50 hover:shadow-lg'
          }`}
        >
          <div className="flex items-start gap-4">
            <div 
              className={`p-3 rounded-xl ${isInstalled ? 'bg-positive/20' : 'theme-bg-tertiary'}`}
            >
              <ComputerDesktopIcon className={`w-6 h-6 ${isInstalled ? 'text-positive' : 'theme-text'}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold theme-text mb-1">Desktop App</h3>
              <p className="text-sm theme-text-secondary mb-3">
                {isInstalled 
                  ? 'Installed on your device' 
                  : 'Install for quick access'}
              </p>
              {isInstalled ? (
                <div className="flex items-center gap-2 text-positive text-sm font-medium">
                  <CheckCircleIcon className="w-5 h-5" />
                  Installed
                </div>
              ) : isInstallable ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full px-4 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-accent) 100%)',
                  }}
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  Install App
                </button>
              ) : isIOS ? (
                <div className="text-sm theme-text-secondary">
                  <p className="mb-2">To install on iOS:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Tap the Share button</li>
                    <li>Select &quot;Add to Home Screen&quot;</li>
                  </ol>
                </div>
              ) : (
                <div className="text-sm theme-text-tertiary">
                  Open in Chrome or Edge to install
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS App Card */}
      {showMobile && (
        <div 
          className={`${cardBaseStyle} theme-bg-secondary theme-border hover:border-accent/50 hover:shadow-lg`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl theme-bg-tertiary">
              <svg className="w-6 h-6 theme-text" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold theme-text mb-1">iOS App</h3>
              <p className="text-sm theme-text-secondary mb-3">
                Available on the App Store
              </p>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 theme-bg-tertiary theme-text hover:opacity-80"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                App Store
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Android App Card */}
      {showMobile && (
        <div 
          className={`${cardBaseStyle} theme-bg-secondary theme-border hover:border-accent/50 hover:shadow-lg`}
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl theme-bg-tertiary">
              <svg className="w-6 h-6 theme-text" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.341a.993.993 0 0 0-.997.997.997.997 0 1 0 .997-.997m-11.046 0a.993.993 0 0 0-.997.997.997.997 0 1 0 .997-.997m11.405-6.02 1.97-3.406a.416.416 0 0 0-.152-.567.416.416 0 0 0-.567.152l-1.995 3.45A12.243 12.243 0 0 0 12 7.997c-1.867 0-3.633.41-5.138 1.143L4.867 5.5a.416.416 0 0 0-.567-.152.416.416 0 0 0-.152.567l1.97 3.406C2.696 11.322.5 14.89.5 18.998h23c0-4.108-2.196-7.676-5.618-9.677M6.477 15.341a.997.997 0 1 1 0 1.994.997.997 0 0 1 0-1.994m11.046 0a.997.997 0 1 1 0 1.994.997.997 0 0 1 0-1.994"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold theme-text mb-1">Android App</h3>
              <p className="text-sm theme-text-secondary mb-3">
                Available on Google Play
              </p>
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 theme-bg-tertiary theme-text hover:opacity-80"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Play Store
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
