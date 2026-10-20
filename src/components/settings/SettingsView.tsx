import React, { useState, useRef } from 'react';
import { 
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
  Tag,
  Plus,
  Trash2,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  db, 
  exportDatabaseBackup, 
  importDatabaseBackup, 
  resetDatabaseWithSamples, 
  resetDatabaseToClean 
} from '../../db';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { DEFAULT_BUSINESS_CATEGORIES } from '../../types';
import { 
  isSupabaseConfigured, 
  testSupabaseConnection, 
  syncLocalToSupabase, 
  syncSupabaseToLocal, 
  cloudUpsertSettings,
  cloudUpsertCategory,
  cloudDeleteCategory,
  cloudResetCategories
} from '../../lib/supabase';

type SettingsTab = 'profile' | 'categories' | 'setup';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const projectsCount = useLiveQuery(() => db.projects.count()) ?? 0;
  const tasksCount = useLiveQuery(() => db.tasks.count()) ?? 0;
  const eventsCount = useLiveQuery(() => db.calendarEvents.count()) ?? 0;
  const notesCount = useLiveQuery(() => db.notes.count()) ?? 0;
  const routinesCount = useLiveQuery(() => db.routines.count()) ?? 0;

  // Profile Form States
  const [userName, setUserName] = useState(settings?.userName || 'Yunus Mahada');
  const [businessName, setBusinessName] = useState(settings?.businessName || 'Personal Project');
  const [currency, setCurrency] = useState<'IDR' | 'USD' | 'EUR' | 'SGD'>(settings?.currency || 'IDR');
  const [defaultWeeklyHours, setDefaultWeeklyHours] = useState<number>(settings?.defaultWeeklyGoalHours || 40);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Category Management States
  const categories: string[] = settings?.goalCategories && Array.isArray(settings.goalCategories)
    ? settings.goalCategories
    : [];
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showResetCatConfirm, setShowResetCatConfirm] = useState(false);

  // Supabase Cloud States
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseStatusMsg, setSupabaseStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCloudReady = isSupabaseConfigured();

  // General Notifications & Confirmations
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const isProfileLoadedRef = useRef(false);

  React.useEffect(() => {
    if (settings && !isProfileLoadedRef.current) {
      setUserName(settings.userName || 'Yunus Mahada');
      setBusinessName(settings.businessName || 'Personal Project');
      setCurrency(settings.currency || 'IDR');
      setDefaultWeeklyHours(settings.defaultWeeklyGoalHours || 40);
      isProfileLoadedRef.current = true;
    }
  }, [settings]);

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const existing = await db.settings.get('user_default');
    const updatedSettings: any = {
      ...(existing || {}),
      id: 'user_default',
      userName: userName.trim() || 'Yunus Mahada',
      businessName: businessName.trim() || 'Personal Project',
      currency,
      defaultWeeklyGoalHours: Number(defaultWeeklyHours) || 40,
      theme: 'dark',
      hasCompletedOnboarding: true,
      goalCategories: existing?.goalCategories && existing.goalCategories.length > 0 
        ? existing.goalCategories 
        : categories
    };
    try {
      await cloudUpsertSettings(updatedSettings);
      await db.settings.put(updatedSettings);
      setSaveStatus('Pengaturan profil berhasil disimpan & disinkronkan ke Supabase Cloud!');
    } catch (err: any) {
      console.error('Gagal menyimpan profil ke Supabase:', err);
      setSaveStatus(`Gagal menyimpan ke Supabase: ${err.message || 'Cek koneksi'}`);
    }
    setTimeout(() => setSaveStatus(null), 3500);
  };

  // Add Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setNotice({ text: `Kategori "${trimmed}" sudah ada dalam daftar.`, type: 'error' });
      return;
    }

    const updated = [...categories, trimmed];
    const existing = await db.settings.get('user_default');
    const updatedSettings: any = {
      ...(existing || {}),
      id: 'user_default',
      userName: existing?.userName || userName || 'Yunus Mahada',
      businessName: existing?.businessName || businessName || 'Personal Project',
      currency: existing?.currency || currency || 'IDR',
      defaultWeeklyGoalHours: existing?.defaultWeeklyGoalHours || Number(defaultWeeklyHours) || 40,
      theme: 'dark',
      hasCompletedOnboarding: true,
      goalCategories: updated
    };
    try {
      await cloudUpsertSettings(updatedSettings);
      await cloudUpsertCategory(trimmed);
      await db.settings.put(updatedSettings);
      setNewCategoryName('');
      setNotice({ text: `Kategori "${trimmed}" berhasil ditambahkan & tersimpan di Supabase Cloud!`, type: 'success' });
    } catch (err: any) {
      console.error('Gagal menambahkan kategori ke Supabase:', err);
      setNotice({ text: `Gagal menyimpan ke Supabase: ${err.message || 'Cek koneksi'}`, type: 'error' });
    }
    setTimeout(() => setNotice(null), 3500);
  };

  // Delete Category
  const handleConfirmDeleteCategory = async (cat: string) => {
    if (categories.length <= 1) {
      setNotice({ text: 'Sistem membutuhkan minimal 1 kategori bisnis.', type: 'error' });
      return;
    }

    const updated = categories.filter(c => c !== cat);
    const existing = await db.settings.get('user_default');
    const updatedSettings: any = {
      ...(existing || {}),
      id: 'user_default',
      userName: existing?.userName || userName || 'Yunus Mahada',
      businessName: existing?.businessName || businessName || 'Personal Project',
      currency: existing?.currency || currency || 'IDR',
      defaultWeeklyGoalHours: existing?.defaultWeeklyGoalHours || Number(defaultWeeklyHours) || 40,
      theme: 'dark',
      hasCompletedOnboarding: true,
      goalCategories: updated
    };
    try {
      await cloudUpsertSettings(updatedSettings);
      await cloudDeleteCategory(cat);
      await db.settings.put(updatedSettings);
      setCategoryToDelete(null);
      setNotice({ text: `Kategori "${cat}" berhasil dihapus dari sistem & Supabase Cloud.`, type: 'success' });
    } catch (err: any) {
      console.error('Gagal menghapus kategori dari Supabase:', err);
      setNotice({ text: `Gagal menghapus dari Supabase: ${err.message || 'Cek koneksi'}`, type: 'error' });
    }
    setTimeout(() => setNotice(null), 3500);
  };

  // Reset & Kosongkan Seluruh Kategori (Tanpa membawa kategori bawaan sistem)
  const handleResetCategories = async () => {
    const existing = await db.settings.get('user_default');
    const updatedSettings: any = {
      ...(existing || {}),
      id: 'user_default',
      goalCategories: []
    };
    try {
      await cloudResetCategories();
      await db.settings.put(updatedSettings);
      setShowResetCatConfirm(false);
      setNotice({ text: 'Tabel kategori berhasil direset & dikosongkan (tanpa kategori bawaan).', type: 'success' });
    } catch (err: any) {
      console.error('Gagal mereset kategori di Supabase:', err);
      await db.settings.put(updatedSettings);
      setShowResetCatConfirm(false);
      setNotice({ text: `Kategori lokal dikosongkan. Catatan Supabase: ${err.message || 'Cek koneksi'}`, type: 'error' });
    }
    setTimeout(() => setNotice(null), 3500);
  };

  // Supabase Cloud Actions
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

  // Backup & Restore
  const handleExportBackup = async () => {
    const jsonStr = await exportDatabaseBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-project-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
        setNotice({ text: 'Gagal mengimpor file. Format data tidak sesuai standar Personal Project.', type: 'error' });
      }
      setTimeout(() => setNotice(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteClear = async () => {
    await resetDatabaseToClean();
    setShowClearConfirm(false);
    setNotice({ text: 'Seluruh data bisnis telah dikosongkan. Sistem sekarang bersih 100%!', type: 'success' });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleExecuteReset = async () => {
    await resetDatabaseWithSamples();
    setShowResetConfirm(false);
    setNotice({ text: 'Database berhasil diisi dengan data percontohan demo Personal Project!', type: 'success' });
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
          Kelola profil eksekutif, opsi kategori bisnis dropdown, dan seluruh infrastruktur data aplikasi Personal Project.
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
          <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-white text-xs cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Profil & Preferensi</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Kategori Bisnis</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeTab === 'categories'
              ? 'bg-blue-800 text-white'
              : 'bg-zinc-800 text-zinc-400'
          }`}>
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
            activeTab === 'setup'
              ? 'bg-blue-600 text-white shadow-xs font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Setup Sistem & Data</span>
        </button>
      </div>

      {/* TAB 1: PROFIL & PREFERENSI */}
      {activeTab === 'profile' && (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xs space-y-6">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Profil Eksekutif & Identitas Bisnis</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Identitas ini digunakan sebagai nama entitas pada laporan bisnis, header aplikasi, dan konfigurasi lokal.
            </p>
          </div>

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
                  Mata Uang Utama
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="IDR">Rupiah Indonesia (IDR / Rp)</option>
                  <option value="USD">Dolar Amerika Serikat (USD / $)</option>
                  <option value="SGD">Dolar Singapura (SGD / S$)</option>
                  <option value="EUR">Euro Uni Eropa (EUR / €)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Target Jam Kerja / Minggu
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={defaultWeeklyHours}
                  onChange={(e) => setDefaultWeeklyHours(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              {saveStatus ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  {saveStatus}
                </span>
              ) : (
                <span className="text-xs text-zinc-500">
                  Perubahan akan disimpan otomatis ke IndexedDB lokal.
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs cursor-pointer"
              >
                Simpan Perubahan Profil
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: KATEGORI BISNIS */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Add Category Form */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>Pengaturan Pilihan Kategori Bisnis (Dropdown)</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kategori yang terdaftar di sini akan menjadi pilihan opsi dropdown pada formulir **Proyek (Projects)** dan filter kategori di seluruh sistem.
              </p>
            </div>

            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Contoh: Ekspansi Pasar, Kemitraan, HR & Talenta..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kategori</span>
              </button>
            </form>
          </div>

          {/* Category List */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-xs font-semibold text-zinc-200">
                Daftar Kategori Aktif ({categories.length})
              </h3>
              {categories.length > 0 && (
                !showResetCatConfirm ? (
                  <button
                    onClick={() => setShowResetCatConfirm(true)}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
                    title="Kosongkan seluruh kategori bisnis di tabel database"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Reset / Kosongkan Kategori</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-rose-300">Yakin kosongkan semua?</span>
                    <button
                      onClick={handleResetCategories}
                      className="px-2 py-0.5 text-[10px] font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition cursor-pointer"
                    >
                      Ya, Reset
                    </button>
                    <button
                      onClick={() => setShowResetCatConfirm(false)}
                      className="px-2 py-0.5 text-[10px] text-zinc-400 hover:text-white bg-zinc-800 rounded transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                )
              )}
            </div>

            {categories.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 text-zinc-500 text-xs">
                Belum ada kategori bisnis. Silakan tambahkan kategori kustom Anda melalui formulir di atas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {categories.map((cat, idx) => {
                  const isConfirming = categoryToDelete === cat;

                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/90 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-zinc-800 text-[10px] font-semibold text-zinc-400 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {cat}
                        </span>
                      </div>

                      {isConfirming ? (
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            onClick={() => handleConfirmDeleteCategory(cat)}
                            className="px-2 py-0.5 text-[10px] font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition cursor-pointer"
                          >
                            Hapus
                          </button>
                          <button
                            onClick={() => setCategoryToDelete(null)}
                            className="px-2 py-0.5 text-[10px] text-zinc-400 hover:text-white bg-zinc-800 rounded transition cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCategoryToDelete(cat)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer shrink-0 ml-2"
                          title={`Hapus kategori "${cat}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex items-start gap-2 text-[11px] text-zinc-400">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                Setiap kategori baru yang ditambahkan di sini akan langsung tersedia di menu dropdown saat membuat Proyek & Tugas Bisnis, dan ikut tersinkronkan ke Supabase Cloud saat melakukan Push Sync.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SETUP SISTEM & DATA */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* 1. Database Statistics & Storage */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xs">
            <h2 className="text-sm font-semibold text-white mb-4 pb-2 border-b border-zinc-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Status Penyimpanan Lokal (IndexedDB)</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
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
                    Unduh seluruh data proyek, tugas, catatan, jadwal, dan rutinitas ke file JSON lokal di komputer atau ponsel Anda.
                  </p>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="mt-4 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition border border-zinc-700 cursor-pointer"
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

          {/* 2. Supabase Cloud Database & Synchronization */}
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
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 rounded-lg transition border border-cyan-800/80 disabled:opacity-50 cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>{supabaseLoading ? 'Memeriksa...' : 'Tes Koneksi Cloud'}</span>
              </button>

              <button
                onClick={handlePushSupabase}
                disabled={supabaseLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>{supabaseLoading ? 'Memproses...' : 'Unggah Data Lokal ke Supabase (Push)'}</span>
              </button>

              <button
                onClick={handlePullSupabase}
                disabled={supabaseLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition border border-zinc-700 disabled:opacity-50 cursor-pointer"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                <span>{supabaseLoading ? 'Mengunduh...' : 'Unduh Data dari Supabase (Pull)'}</span>
              </button>
            </div>
          </div>

          {/* 3. PWA & Install Guide Section */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xs">
            <h2 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-zinc-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Aplikasi Web Progresif (PWA) & Offline</span>
            </h2>

            <div className="text-xs text-zinc-300 space-y-2">
              <p>
                Personal Project dirancang dengan arsitektur <strong>Offline-First</strong>. Aplikasi dapat dipasang langsung ke layar utama perangkat desktop, Android, maupun iPhone tanpa memerlukan toko aplikasi pihak ketiga.
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

          {/* 4. Danger Zone: Database Reset & Clean Slate */}
          <div className="rounded-2xl bg-zinc-900 border border-rose-900/60 p-6 shadow-xs">
            <h2 className="text-sm font-semibold text-rose-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Zona Pemulihan & Pembersihan Database</span>
            </h2>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Gunakan opsi di bawah ini untuk mengosongkan seluruh data dummy bawaan agar siap diisi dengan data operasional riil bisnis Anda, atau memuat kembali data demo contoh jika diperlukan.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Button 1: Kosongkan Data (Clean Slate) */}
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Seluruh Data (Fresh Start)</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-700 space-y-2.5 w-full">
                  <p className="text-xs text-rose-200 font-medium">
                    ⚠️ <strong>Konfirmasi:</strong> Anda akan menghapus seluruh data Proyek, Tugas, Kalender, Catatan, dan Rutinitas. Profil & Kategori Bisnis Anda akan tetap disimpan. Lanjutkan?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExecuteClear}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition shadow-xs cursor-pointer"
                    >
                      Ya, Kosongkan Sekarang
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Button 2: Muat Data Demo (Hanya tampil jika tidak sedang konfirmasi) */}
              {!showClearConfirm && (
                <>
                  {!showResetConfirm ? (
                    <button
                      onClick={() => setShowResetConfirm(true)}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Muat Contoh Data Demo</span>
                    </button>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-700 space-y-2.5 w-full">
                      <p className="text-xs text-zinc-300 font-medium">
                        Muat data contoh demo Personal Project? Data buatan Anda akan ditimpa dengan data percontohan demo.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExecuteReset}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs cursor-pointer"
                        >
                          Ya, Muat Data Demo
                        </button>
                        <button
                          onClick={() => setShowResetConfirm(false)}
                          className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
