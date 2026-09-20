import React, { useState } from 'react';
import { Download, Smartphone, Apple, X, Share2, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenMobileGuide?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ onOpenMobileGuide }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already running as an installed PWA / standalone native container, show subtle mobile badge or hide
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        Mobile App Active
      </span>
    );
  }

  // Chromium / Android / Desktop browser native install trigger
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 shadow-sm transition-all"
        title="Install RockMin ID as standalone mobile/desktop app"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit doesn't trigger beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 shadow-sm transition-all"
          title="Install RockMin ID on iPhone / iPad"
        >
          <Apple className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Install on iOS</span>
        </button>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-800 p-5 shadow-2xl text-stone-200 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <Apple className="w-4 h-4" />
                  Install on iPhone / iPad
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="text-stone-400 hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-stone-300">
                To install RockMin ID on your iOS home screen:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs text-stone-400">
                <li>
                  Tap the <strong>Share</strong> button <Share2 className="w-3 h-3 inline text-cyan-400 mx-1" /> in Safari&apos;s bottom toolbar.
                </li>
                <li>
                  Scroll down the action sheet and select <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> at top right to complete installation.
                </li>
              </ol>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback button that opens the full packaging modal
  return (
    <button
      onClick={onOpenMobileGuide}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-stone-850 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 transition-colors"
      title="Mobile App Packaging & Installation Guide"
    >
      <Smartphone className="w-3.5 h-3.5 text-amber-400" />
      <span className="hidden sm:inline">Mobile App</span>
    </button>
  );
};
