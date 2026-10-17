import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs font-medium text-neutral-100 shadow-xl backdrop-blur-md">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
      <span>Mode Offline — Semua data tersimpan aman di database lokal (IndexedDB).</span>
    </div>
  );
};
