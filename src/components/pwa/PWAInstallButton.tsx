import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 font-medium text-white bg-[#1f232a] hover:bg-[#282d36] border border-[#2d333f] rounded-lg transition-colors shadow-xs ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-xs'
        }`}
        title="Pasang Mahada Indonesia ke Perangkat Anda (PWA)"
      >
        <Download className="w-3.5 h-3.5 shrink-0 text-blue-400" />
        <span className="whitespace-nowrap">Install App</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit beforeinstallprompt fallback)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 font-medium text-zinc-300 bg-[#1f232a] border border-[#2d333f] hover:bg-[#282d36] rounded-lg transition-colors ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0 text-blue-400" />
          <span className="whitespace-nowrap">Install di iPhone/iPad</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl bg-[#1c2026] p-5 shadow-2xl border border-[#2d333f]">
              <div className="flex items-center justify-between pb-3 border-b border-[#2d333f]">
                <h3 className="text-sm font-semibold text-white">Pasang di iPhone / iPad</h3>
                <button 
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 text-xs text-zinc-300 space-y-2">
                <p>1. Tekan tombol <strong className="text-white">Bagikan (Share)</strong> pada toolbar Safari di bagian bawah.</p>
                <p>2. Gulir ke bawah dan pilih <strong className="text-white">Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
                <p>3. Tekan <strong className="text-white">Tambah (Add)</strong> di pojok kanan atas.</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-500 transition shadow-xs"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
