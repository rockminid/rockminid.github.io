import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Apple,
  Share2,
  Check,
  ExternalLink,
  HelpCircle,
  Sparkles,
  Layers,
  X,
  Copy,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileAppModal: React.FC<MobileAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'ios'>('pwa');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                Install &amp; Package Mobile App
              </h2>
              <p className="text-xs text-stone-400">
                Android APK / Google Play &bull; iOS App Store &bull; Instant Home Screen PWA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-800 bg-stone-950 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`px-3 py-2 font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'pwa'
                ? 'text-amber-400 border-amber-500 bg-stone-900'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Direct Mobile Install (PWA)
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`px-3 py-2 font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'apk'
                ? 'text-emerald-400 border-emerald-500 bg-stone-900'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Android APK &amp; Play Store
          </button>
          <button
            onClick={() => setActiveTab('ios')}
            className={`px-3 py-2 font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'ios'
                ? 'text-cyan-400 border-cyan-500 bg-stone-900'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Apple className="w-4 h-4" />
            iOS / App Store Prep
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-stone-300">
          {/* TAB 1: Direct Install */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Instant Standalone Mobile App
                  </div>
                  {isInstalled && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Already Installed
                    </span>
                  )}
                </div>
                <p className="text-stone-300 leading-relaxed">
                  RockMin ID is configured as a fully compliant Progressive Web App with offline caching, high-density icons, and mobile viewport controls. You can install it right now without downloading an external installer file.
                </p>

                {isInstallable && (
                  <button
                    onClick={install}
                    className="mt-2 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-stone-950 flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Install RockMin ID on this Device
                  </button>
                )}
              </div>

              {/* Android Instructions */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                <h4 className="font-bold text-stone-200 text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  How to install on Android (Chrome / Edge / Samsung Internet):
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-400 pl-1">
                  <li>Open this app on your phone browser.</li>
                  <li>
                    Tap the <strong>three dots menu (⋮)</strong> at the top-right corner.
                  </li>
                  <li>
                    Select <strong>&ldquo;Install app&rdquo;</strong> or <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                  </li>
                  <li>Tap <strong>Install</strong>. The app will launch with its own icon and splash screen like any native app.</li>
                </ol>
              </div>

              {/* iOS Instructions */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                <h4 className="font-bold text-stone-200 text-sm flex items-center gap-2">
                  <Apple className="w-4 h-4 text-cyan-400" />
                  How to install on iPhone &amp; iPad (Safari):
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-400 pl-1">
                  <li>Open this URL in <strong>Apple Safari</strong>.</li>
                  <li>
                    Tap the <strong>Share button</strong> <Share2 className="w-3.5 h-3.5 inline text-cyan-400 mx-1" /> (square with upward arrow).
                  </li>
                  <li>Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</li>
                  <li>Confirm by tapping <strong>Add</strong> in the top right.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: Android APK & Play Store */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Building a Standalone .APK and Google Play .AAB
                </h4>
                <p className="text-stone-300 leading-relaxed">
                  To publish to the <strong>Google Play Store</strong> or distribute a raw <strong>.apk</strong> file to colleagues, RockMin ID is pre-configured with <code>capacitor.config.ts</code> and package ID <code>com.kishantiwari.rockminid</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-200">Option 1: Capacitor Native Shell (Play Store &amp; APK)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `npm install @capacitor/core\nnpm install -D @capacitor/cli @capacitor/android\nnpm run build\nnpx cap add android\nnpx cap sync\nnpx cap open android`,
                        'cap-android'
                      )
                    }
                    className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1"
                  >
                    {copiedSection === 'cap-android' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-stone-900 rounded-lg font-mono text-[11px] text-amber-300 overflow-x-auto border border-stone-850">
{`# 1. Install Capacitor Android tools
npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/android

# 2. Build web assets & sync to Android Studio project
npm run build
npx cap add android
npx cap sync

# 3. Open in Android Studio to build APK or Play Store Bundle (.aab)
npx cap open android`}
                </pre>
                <div className="text-[11px] text-stone-400 bg-stone-900/60 p-2.5 rounded-lg">
                  In Android Studio: Click <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>. The output <code>app-debug.apk</code> can be transferred and installed immediately on any Android phone.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-200">Option 2: Google Bubblewrap (Fastest Google Play TWA)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `npm install -g @bubblewrap/cli\nbubblewrap init --manifest=https://your-domain.com/manifest.json\nbubblewrap build`,
                        'bubblewrap'
                      )
                    }
                    className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1"
                  >
                    {copiedSection === 'bubblewrap' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-stone-900 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto border border-stone-850">
{`# Install Google's official Bubblewrap CLI
npm install -g @bubblewrap/cli

# Initialize APK build from web manifest
bubblewrap init --manifest=https://your-domain.com/manifest.json
bubblewrap build`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: iOS / App Store */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-1.5">
                  <Apple className="w-4 h-4" />
                  Preparing for Apple iOS &amp; App Store
                </h4>
                <p className="text-stone-300 leading-relaxed">
                  RockMin ID is configured for iOS compilation through Capacitor with safe-area insets, Apple Touch Icon (180x180), and status bar customization.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-200">Capacitor iOS Compilation Commands</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `npm install @capacitor/core\nnpm install -D @capacitor/cli @capacitor/ios\nnpm run build\nnpx cap add ios\nnpx cap sync\nnpx cap open ios`,
                        'cap-ios'
                      )
                    }
                    className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1"
                  >
                    {copiedSection === 'cap-ios' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Commands</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-stone-900 rounded-lg font-mono text-[11px] text-cyan-300 overflow-x-auto border border-stone-850">
{`# 1. Install iOS tools (Requires macOS + Xcode)
npm install @capacitor/core
npm install -D @capacitor/cli @capacitor/ios

# 2. Build web bundle & initialize Xcode project
npm run build
npx cap add ios
npx cap sync

# 3. Open in Xcode
npx cap open ios`}
                </pre>
                <div className="text-[11px] text-stone-400 bg-stone-900/60 p-2.5 rounded-lg space-y-1">
                  <div>• In Xcode: Select your developer team under <strong>Signing &amp; Capabilities</strong>.</div>
                  <div>• Click <strong>Product &gt; Archive</strong> to generate a build for TestFlight or App Store Connect.</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-[11px] text-stone-400">
                <strong>Configured Bundle ID:</strong> <code className="text-amber-400">com.kishantiwari.rockminid</code> &bull; <strong>Creator:</strong> Kishan Tiwari (kishangeo.github.io)
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>See detailed steps in</span>
            <code className="text-amber-400">MOBILE_BUILD_GUIDE.md</code>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
