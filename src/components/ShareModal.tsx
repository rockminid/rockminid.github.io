import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  Send,
  ExternalLink,
  MessageCircle,
  Mail,
  Linkedin,
  Twitter,
  QrCode,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSampleName?: string;
  activeSampleSummary?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  activeSampleName,
  activeSampleSummary,
}) => {
  const [copiedApp, setCopiedApp] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://rockmin-id.app';
  const appTitle = 'RockMin ID - Geochemical & Mineral Classifier';
  const appDescription =
    'Interactive Geochemical Classifier & Petrological Analysis Platform with TAS volcanic classification, CIPW Norm calculation, and D3 Ternary Projections.';

  const sampleShareText = activeSampleSummary
    ? `🌋 Petrological Analysis for ${activeSampleName || 'Specimen'}:\n${activeSampleSummary}\n\nAnalyzed on RockMin ID: ${appUrl}`
    : `Explore RockMin ID: ${appDescription}\n${appUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedApp(true);
      setTimeout(() => setCopiedApp(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(sampleShareText);
      setCopiedSample(true);
      setTimeout(() => setCopiedSample(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: activeSampleName ? `RockMin ID: ${activeSampleName}` : appTitle,
          text: activeSampleSummary || appDescription,
          url: appUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Native share error:', err);
        }
      }
    }
  };

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(sampleShareText)}`,
    },
    {
      name: 'X (Twitter)',
      icon: Twitter,
      color: 'bg-sky-600 hover:bg-sky-500 text-white',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(sampleShareText)}`,
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-600 text-white',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`,
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-sky-500 hover:bg-sky-400 text-white',
      url: `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(sampleShareText)}`,
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-stone-700 hover:bg-stone-600 text-stone-100',
      url: `mailto:?subject=${encodeURIComponent(
        activeSampleName ? `Geochemical Specimen Analysis: ${activeSampleName}` : appTitle
      )}&body=${encodeURIComponent(sampleShareText)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 shadow-md">
              <Share2 className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                Share RockMin ID
              </h2>
              <p className="text-xs text-stone-400">
                Share with fellow geologists, petrologists, and students
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-stone-300">
          {/* Native Share Button if supported on mobile/tablet */}
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              onClick={handleNativeShare}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Open System Share Sheet (Mobile / Android / iOS)</span>
            </button>
          )}

          {/* Direct Link Copy */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-stone-200">Platform Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-300 font-mono text-xs select-all focus:outline-hidden"
              />
              <button
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-semibold transition-all ${
                  copiedApp
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                }`}
              >
                {copiedApp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedApp ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Share Active Sample if available */}
          {activeSampleSummary && (
            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-400">
                  Active Specimen: {activeSampleName || 'Rock/Mineral Sample'}
                </span>
                <button
                  onClick={handleCopySample}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  {copiedSample ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSample ? 'Copied Summary!' : 'Copy Summary'}</span>
                </button>
              </div>
              <div className="text-[11px] text-stone-400 font-mono whitespace-pre-line bg-stone-900/80 p-2.5 rounded-lg border border-stone-850">
                {activeSampleSummary}
              </div>
            </div>
          )}

          {/* Social / Direct Share Grid */}
          <div className="space-y-2">
            <label className="block font-semibold text-stone-200">Share Via</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {shareLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-sm transition-all ${link.color}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{link.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* QR Code Toggle for Quick Mobile Scanning */}
          <div className="pt-2 border-t border-stone-800">
            <button
              onClick={() => setShowQR(!showQR)}
              className="w-full py-2 px-3 rounded-xl bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-300 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Show QR Code for Field Phones</span>
              </div>
              <span className="text-[10px] text-stone-500">{showQR ? 'Hide' : 'View'}</span>
            </button>

            {showQR && (
              <div className="mt-3 p-4 bg-stone-950 border border-stone-800 rounded-xl flex flex-col items-center justify-center space-y-2 text-center animate-in fade-in duration-200">
                <div className="p-3 bg-white rounded-xl shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(appUrl)}`}
                    alt="RockMin ID QR Code"
                    className="w-36 h-36"
                    loading="lazy"
                  />
                </div>
                <p className="text-[11px] text-stone-400">
                  Scan with Android camera or Google Lens to launch RockMin ID instantly on your smartphone.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
