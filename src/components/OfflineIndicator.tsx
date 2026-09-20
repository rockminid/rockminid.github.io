import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-stone-950 shadow-xl border border-amber-400/40 animate-bounce">
      <WifiOff className="w-4 h-4" />
      <span>Offline Mode — Using local database &amp; cached models</span>
    </div>
  );
};
