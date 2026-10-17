import React, { useState, useRef } from 'react';
import { 
  Settings, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Check, 
  ShieldCheck, 
  Building2, 
  AlertTriangle,
  Cloud,
  CloudUpload,
  CloudDownload,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, exportDatabaseBackup, importDatabaseBackup, resetDatabaseWithSamples } from '../../db';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { 
  isSupabaseConfigured, 
  testSupabaseConnection, 
  syncLocalToSupabase, 
  syncSupabaseToLocal 
} from '../../lib/supabase';

export const SettingsView: React.FC = () => {
  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const goalsCount = useLiveQuery(() => db.goals.count()) ?? 0;
  const projectsCount = useLiveQuery(() => db.projects.count()) ?? 0;
  const tasksCount = useLiveQuery(() => db.tasks.count()) ?? 0;
  const eventsCount = useLiveQuery(() => db.calendarEvents.count()) ?? 0;
  const notesCount = useLiveQuery(() => db.notes.count()) ?? 0;
  const routinesCount = useLiveQuery(() => db.routines.count()) ?? 0;

  const [userName, setUserName] = useState(settings?.userName || 'Yunus Mahada');
  const [businessName, setBusinessName] = useState(settings?.businessName || 'Mahada Indonesia');
  const [currency, setCurrency] = useState<'IDR' | 'USD' | 'EUR' | 'SGD'>(settings?.currency || 'IDR');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCloudReady = isSupabaseConfigured();

  const handleTestSupabase = async () => {
    setSupabaseLoading(true);
    setSupabaseStatusMsg(null);
    const res = await testSupabaseConnection();
    setSupabaseLoading(false);
    setSupabaseStatusMsg(res.message);
    setNotice({
      text: res.message,
      type: res.success ? 'success' : 'error'
    });
  };

  const handlePushSupabase = async () => {
    setSupabaseLoading(true);
    setSupabaseStatusMsg(null);
    const res = await syncLocalToSupabase();
    setSupabaseLoading(false);
    setSupabaseStatusMsg(res.message);
    setNotice({
      text: res.message,
      type: res.success ? 'success' : 'error'
    });
  };

  const handlePullSupabase = async () => {
    setSupabaseLoading(true);
    setSupabaseStatusMsg(null);
    const res = await syncSupabaseToLocal();
    setSupabaseLoading(false);
    setSupabaseStatusMsg(res.message);
    setNotice({
      text: res.message,
      type: res.success ? 'success' : 'error'
    });
  };

  React.useEffect(() => {
    if (settings) {
      setUserName(settings.userName || 'Yunus Mahada');
      setBusinessName(settings.businessName || 'Mahada Indonesia');
      setCurrency(settings.currency || 'IDR');
    }
  }, [settings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.settings.put({
      id: 'user_default',
      userName,
      businessName,
      currency,
      defaultWeeklyGoalHours: settings?.defaultWeeklyGoalHours || 40,
      theme: 'dark',
      hasCompletedOnboarding: true
    });
    setSaveStatus('Pengaturan berhasil disimpan!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleExportBackup = async () => {
    const jsonStr = await exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mahada-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importDatabaseBackup(content);
      if (success) {
        setNotice({ text: 'Data cadangan berhasil diimpor ke sistem!', type: 'success' });
      } else {
        setNotice({ text: 'Gagal mengimpor file. Format data tidak sesuai standar Mahada Indonesia.', type: 'error' });
      }
      setTimeout(() => setNotice(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteReset = async () => {
    await resetDatabaseWithSamples();
    setShowResetConfirm(false);
    setNotice({ text: 'Database berhasil direset dengan data bisnis resmi Mahada Indonesia!', type: 'success' });
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Pengaturan Sistem & Manajemen Data
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Atur profil eksekutif Mahada Indonesia, preferensi mata uang, serta cadangkan seluruh database lokal secara offline.
        </p>
      </div>

      {/* Dynamic Feedback Toast */}
      {notice && (
        <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-center justify-between ${
          notice.type === 'success' 
            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' 
            : 'bg-rose-950/60 text-rose-300 border-rose-800/80'
        }`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Profile & Business Preferences */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-white mb-4 pb-2 border-b border-zinc-800 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-400" />
          <span>Profil & Preferensi Perusahaan</span>
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Nama Pengguna / Pemimpin Bisnis
              </label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Nama Perusahaan / Bisnis
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Format Mata Uang Default
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="IDR">IDR — Rupiah Indonesia (Rp)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="SGD">SGD — Singapore Dollar (S$)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Bahasa Aplikasi
              </label>
              <input
                type="text"
                disabled
                value="Bahasa Indonesia (id-ID)"
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-800 bg-zinc-950/60 text-zinc-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            {saveStatus ? (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {saveStatus}
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>

      {/* Database Statistics & Storage */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-white mb-4 pb-2 border-b border-zinc-800 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Status Penyimpanan Lokal (IndexedDB)</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
            <span className="text-lg font-bold tabular-nums text-white">{goalsCount}</span>
            <p className="text-[11px] text-zinc-400">Sasaran</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
            <span className="text-lg font-bold tabular-nums text-white">{projectsCount}</span>
            <p className="text-[11px] text-zinc-400">Proyek</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
            <span className="text-lg font-bold tabular-nums text-white">{tasksCount}</span>
            <p className="text-[11px] text-zinc-400">Tugas</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
            <span className="text-lg font-bold tabular-nums text-white">{eventsCount}</span>
            <p className="text-[11px] text-zinc-400">Jadwal</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
            <span className="text-lg font-bold tabular-nums text-white">{notesCount}</span>
            <p className="text-[11px] text-zinc-400">Catatan</p>
          </div>
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
            <span className="text-lg font-bold tabular-nums text-white">{routinesCount}</span>
            <p className="text-[11px] text-zinc-400">Rutinitas</p>
          </div>
        </div>

        {/* Backup & Restore Tools */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Ekspor Cadangan (Backup JSON)</h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Unduh seluruh data sasaran, proyek, tugas, catatan, dan jadwal ke file JSON lokal di komputer atau ponsel Anda.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition border border-zinc-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh File Cadangan</span>
            </button>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-zinc-200">Impor Cadangan (Restore JSON)</h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Pulihkan data dari file JSON cadangan yang telah Anda ekspor sebelumnya.
              </p>
            </div>
            <label className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition cursor-pointer border border-zinc-700">
              <Upload className="w-3.5 h-3.5" />
              <span>Pilih File JSON</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Database & Synchronization */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-zinc-800 gap-2">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-400" />
            <span>Supabase Cloud Database & Sinkronisasi</span>
          </h2>
          <div className="flex items-center gap-2">
            {isCloudReady ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Kredensial Terkonfigurasi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Belum Terhubung (Mode Offline)
              </span>
            )}
          </div>
        </div>

        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Hubungkan aplikasi ke database PostgreSQL di <strong>Supabase</strong> untuk sinkronisasi multi-perangkat dan pencadangan awan real-time. Data Anda tetap tersimpan di lokal (IndexedDB) sehingga tetap dapat bekerja 100% tanpa internet.
        </p>

        {!isCloudReady && (
          <div className="mb-5 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/90 text-xs text-zinc-300 space-y-2">
            <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>📋 Langkah Menghubungkan Supabase:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px] leading-relaxed">
              <li>Buat proyek baru di <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline inline-flex items-center gap-0.5">supabase.com <ExternalLink className="w-2.5 h-2.5" /></a>.</li>
              <li>Buka menu <strong>SQL Editor</strong> di dashboard Supabase, lalu jalankan seluruh skrip dari file <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">supabase/schema.sql</code>.</li>
              <li>Salin <strong>Project URL</strong> dan <strong>Anon Public Key</strong> dari <em>Project Settings → API</em>.</li>
              <li>Tambahkan ke file <code className="text-zinc-200 bg-zinc-800 px-1 py-0.5 rounded">.env</code> lokal (untuk localhost) atau menu <em>Environment Variables</em> di dashboard Vercel:</li>
            </ol>
            <pre className="p-2.5 bg-black/50 rounded-lg text-[10px] text-zinc-300 font-mono overflow-x-auto border border-zinc-800/60">
              VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co&#10;VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
            </pre>
          </div>
        )}

        {supabaseStatusMsg && (
          <div className="mb-4 p-3 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-200">
            {supabaseStatusMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleTestSupabase}
            disabled={supabaseLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 rounded-lg transition border border-cyan-800/80 disabled:opacity-50"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{supabaseLoading ? 'Memeriksa...' : 'Tes Koneksi Cloud'}</span>
          </button>

          <button
            onClick={handlePushSupabase}
            disabled={supabaseLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs disabled:opacity-50"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>{supabaseLoading ? 'Memproses...' : 'Unggah Data Lokal ke Supabase (Push)'}</span>
          </button>

          <button
            onClick={handlePullSupabase}
            disabled={supabaseLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition border border-zinc-700 disabled:opacity-50"
          >
            <CloudDownload className="w-3.5 h-3.5" />
            <span>{supabaseLoading ? 'Mengunduh...' : 'Unduh Data dari Supabase (Pull)'}</span>
          </button>
        </div>
      </div>

      {/* PWA & Install Guide Section */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-zinc-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          <span>Aplikasi Web Progresif (PWA) & Offline</span>
        </h2>

        <div className="text-xs text-zinc-300 space-y-2">
          <p>
            Mahada Indonesia Project Manager dirancang dengan arsitektur <strong>Offline-First</strong>. Aplikasi dapat dipasang langsung ke layar utama perangkat desktop, Android, maupun iPhone tanpa memerlukan toko aplikasi pihak ketiga.
          </p>
          <p>
            Semua perubahan data disimpan secara instan ke IndexedDB di browser Anda dan tetap dapat diakses penuh tanpa koneksi internet.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-400">Pasang aplikasi ke perangkat:</span>
          <PWAInstallButton />
        </div>
      </div>

      {/* Danger Zone: Reset with Samples */}
      <div className="rounded-2xl bg-zinc-900 border border-rose-900/60 p-6 shadow-xs">
        <h2 className="text-sm font-semibold text-rose-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Zona Pemulihan Database</span>
        </h2>
        <p className="text-xs text-zinc-400 mb-4">
          Ingin mengatur ulang database dan memuat ulang data percontohan bisnis Mahada Indonesia? Tindakan ini akan menggantikan data yang telah Anda modifikasi.
        </p>

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-rose-400 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/80 rounded-lg transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset ke Data Contoh Mahada Indonesia</span>
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 space-y-3">
            <p className="text-xs text-rose-300 font-medium">
              Konfirmasi: Seluruh data saat ini akan digantikan dengan data percontohan resmi Mahada Indonesia. Lanjutkan?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExecuteReset}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition shadow-xs"
              >
                Ya, Reset Database
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
