import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  isSupabaseConfigured, 
  syncSupabaseToLocal, 
  subscribeToSupabaseRealtime 
} from '../lib/supabase';

export type SyncState = 'synced' | 'syncing' | 'error' | 'offline';

interface SyncContextType {
  syncState: SyncState;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  isConfigured: boolean;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  syncState: 'synced',
  lastSyncedAt: null,
  errorMessage: null,
  isConfigured: false,
  triggerSync: async () => {},
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const isConfigured = isSupabaseConfigured();

  const performSync = useCallback(async (isSilent = true) => {
    if (!isSupabaseConfigured()) return;
    if (!navigator.onLine) {
      setSyncState('offline');
      return;
    }
    if (isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      setSyncState('syncing');
      setErrorMessage(null);

      await syncSupabaseToLocal();

      setSyncState('synced');
      setLastSyncedAt(new Date());
    } catch (err: any) {
      console.warn('[Background Sync 15s] Catatan sinkronisasi:', err.message || err);
      setSyncState('error');
      setErrorMessage(err.message || 'Gagal menyinkronkan');
      if (!isSilent) throw err;
    } finally {
      isSyncingRef.current = false;
    }
  }, []);

  const triggerSync = useCallback(async () => {
    await performSync(false);
  }, [performSync]);

  useEffect(() => {
    if (!isConfigured) return;

    // Sinkronisasi awal saat aplikasi dibuka
    performSync(true);

    // Langganan realtime postgres Supabase
    const unsubscribe = subscribeToSupabaseRealtime(() => {
      setLastSyncedAt(new Date());
      setSyncState('synced');
    });

    // Siklus otomatis 15 detik di belakang layar (tanpa mengganggu input/tampilan)
    const intervalId = setInterval(() => {
      performSync(true);
    }, 15000);

    // Sinkronisasi saat koneksi pulih atau tab aktif kembali
    const handleOnline = () => performSync(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSync(true);
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConfigured, performSync]);

  return (
    <SyncContext.Provider value={{ syncState, lastSyncedAt, errorMessage, isConfigured, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
