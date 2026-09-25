import React from 'react';
import { Download, Smartphone, Monitor, Share2, Sparkles, X, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

/**
 * Install RockMin ID as a web app.
 *
 * There is no native Android or iOS build. The app is a Progressive Web App:
 * installing it from the browser gives it a home-screen icon, its own window
 * and full offline use, with nothing to download from a store.
 */

interface MobileAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Steps: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
    <h4 className="font-bold text-stone-200 text-sm flex items-center gap-2">
      {icon}
      {title}
    </h4>
    <ol className="list-decimal list-inside space-y-1.5 text-stone-400 pl-1">{children}</ol>
  </div>
);

export const MobileAppModal: React.FC<MobileAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="install-title" className="text-base sm:text-lg font-bold text-stone-100">
                Install the Web App
              </h2>
              <p className="text-xs text-stone-400">
                Phone, tablet or desktop — straight from your browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-stone-300">
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                No app store needed
              </div>
              {isInstalled && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Already installed
                </span>
              )}
            </div>
            <p className="text-stone-300 leading-relaxed">
              RockMin ID installs directly from your browser. You get a home-screen icon, its own
              window, and the whole application — every calculation, diagram and reference dataset
              — available offline.
            </p>

            {isInstallable && !isInstalled && (
              <button
                onClick={install}
                className="mt-2 w-full sm:w-auto px-4 py-2.5 min-h-11 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-stone-950 flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                Install RockMin ID on this device
              </button>
            )}
          </div>

          <Steps
            icon={<Smartphone className="w-4 h-4 text-emerald-400" />}
            title="Android (Chrome, Edge, Samsung Internet)"
          >
            <li>Open rockminid.github.io in your browser.</li>
            <li>
              Tap the <strong>menu (⋮)</strong> at the top right.
            </li>
            <li>
              Choose <strong>&ldquo;Install app&rdquo;</strong> or{' '}
              <strong>&ldquo;Add to Home screen&rdquo;</strong>, then confirm.
            </li>
          </Steps>

          <Steps
            icon={<Smartphone className="w-4 h-4 text-cyan-400" />}
            title="iPhone and iPad (Safari)"
          >
            <li>Open rockminid.github.io in Safari.</li>
            <li>
              Tap the <strong>Share</strong> button
              <Share2 className="w-3.5 h-3.5 inline text-cyan-400 mx-1" />.
            </li>
            <li>
              Choose <strong>&ldquo;Add to Home Screen&rdquo;</strong>, then tap <strong>Add</strong>.
            </li>
          </Steps>

          <Steps
            icon={<Monitor className="w-4 h-4 text-amber-400" />}
            title="Desktop (Chrome, Edge)"
          >
            <li>
              Click the <strong>install icon</strong> at the right-hand end of the address bar.
            </li>
            <li>
              Or open the browser menu and choose <strong>&ldquo;Install RockMin ID&rdquo;</strong>.
            </li>
          </Steps>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-stone-950/60 border border-stone-800 text-stone-400">
            <WifiOff className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Once installed and opened once online, RockMin ID works fully offline. Updates are
              picked up automatically the next time you open it with a connection.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 min-h-11 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
