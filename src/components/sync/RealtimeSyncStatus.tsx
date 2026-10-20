import React from 'react';
import { RefreshCw, Cloud, CloudOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSync } from '../../context/SyncContext';
import { format } from 'date-fns';

interface RealtimeSyncStatusProps {
  compact?: boolean;
}

export const RealtimeSyncStatus: React.FC<RealtimeSyncStatusProps> = ({ compact = false }) => {
  const { syncState, lastSyncedAt, isConfigured, triggerSync } = useSync();

  const handleManualSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncState !== 'syncing') {
      triggerSync().catch(console.error);
    }
  };

  if (!isConfigured) {
    return (
      <div 
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-950/30 border border-amber-900/50 text-[11px] text-amber-300"
        title="Supabase belum dikonfigurasi pada file .env"
      >
        <div className="flex items-center gap-2">
          <CloudOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-medium truncate">Supabase Offline</span>
        </div>
        <span className="text-[10px] text-amber-400/80">Cek .env</span>
      </div>
    );
  }

  return (
    <div
      onClick={handleManualSync}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleManualSync(e as any); }}
      className={`w-full group select-none transition-all duration-200 cursor-pointer rounded-xl border ${
        syncState === 'syncing'
          ? 'bg-blue-950/30 border-blue-800/60 hover:bg-blue-950/40'
          : syncState === 'error'
          ? 'bg-rose-950/30 border-rose-900/60 hover:bg-rose-950/40'
          : syncState === 'offline'
          ? 'bg-zinc-900/80 border-zinc-800 hover:bg-zinc-800/60'
          : 'bg-[#14171d]/90 border-[#262c37] hover:border-emerald-500/40 hover:bg-[#181c23]'
      } px-3 py-2 shadow-xs`}
      title="Klik untuk menyinkronkan data ke Supabase Cloud sekarang"
    >
      <div className="flex items-center justify-between">
        {/* Left: Indicator Dot & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center shrink-0">
            {syncState === 'syncing' && (
              <>
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </>
            )}
            {syncState === 'synced' && (
              <>
                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </>
            )}
            {syncState === 'error' && (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            )}
            {syncState === 'offline' && (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500" />
            )}
          </div>

          <div className="min-w-0 flex flex-col">
            <span className="text-[11px] font-semibold text-zinc-100 flex items-center gap-1.5 truncate">
              {syncState === 'syncing' && 'Sinkronisasi Cloud...'}
              {syncState === 'synced' && 'Supabase Realtime'}
              {syncState === 'error' && 'Gagal Sinkronisasi'}
              {syncState === 'offline' && 'Mode Offline'}
            </span>
            <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
              {syncState === 'syncing' ? (
                <span className="text-blue-400">Otomatis di latar...</span>
              ) : lastSyncedAt ? (
                <span>Otomatis (15s) • {format(lastSyncedAt, 'HH:mm:ss')}</span>
              ) : (
                <span>Tiap 15 detik</span>
              )}
            </span>
          </div>
        </div>

        {/* Right: Refresh action button */}
        <div className="shrink-0 ml-1.5 flex items-center">
          <button
            type="button"
            className="p-1 rounded-md text-zinc-400 group-hover:text-white hover:bg-zinc-800 transition"
            title="Klik untuk sinkronkan manual"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                syncState === 'syncing' ? 'animate-spin text-blue-400' : 'group-hover:rotate-180 transition-transform duration-500'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
