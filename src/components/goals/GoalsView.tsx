import React, { useState } from 'react';
import { 
  Target, 
  Plus, 
  FolderKanban, 
  Calendar, 
  Edit3, 
  Trash2, 
  ArrowRight,
  Filter,
  Check,
  X,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Sparkles,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db } from '../../db';
import { cloudUpsertGoal, cloudDeleteGoal } from '../../lib/supabase';
import { DEFAULT_GOAL_CATEGORIES, type Goal, type GoalCategory, type GoalStatus, type GoalPriority, Project, ActiveTab } from '../../types';
import { formatDateIndo, GOAL_STATUS_LABELS, PRIORITY_LABELS } from '../../utils/formatters';

interface GoalsViewProps {
  onOpenGoalModal: (goal?: Goal) => void;
  onOpenProjectModal: (proj?: Project, defaultGoalId?: string) => void;
  onNavigate: (tab: ActiveTab, itemId?: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  onOpenGoalModal,
  onOpenProjectModal,
  onNavigate
}) => {
  // Default to 'table' per user requirement ("pada sasaran bisnis dan proyek dibuat tabel saja agar mudah proses pengupdatean")
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Inline value editing state: goalId -> current string input
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Inline delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const settings = useLiveQuery(() => db.settings.get('user_default'));

  // Filter logic
  const filteredGoals = goals.filter(g => {
    if (selectedCategory !== 'all') {
      const matchExact = g.category === selectedCategory;
      const matchPrefix = g.category.startsWith(selectedCategory.split(' ')[0]) || selectedCategory.startsWith(g.category.split(' ')[0]);
      if (!matchExact && !matchPrefix) return false;
    }
    if (selectedStatus !== 'all' && g.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = g.title.toLowerCase().includes(q);
      const matchDesc = g.description.toLowerCase().includes(q);
      const matchCat = g.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  // Quick update status directly from table
  const handleQuickStatusChange = async (goalId: string, nextStatus: GoalStatus) => {
    const nowIso = new Date().toISOString();
    await db.goals.update(goalId, {
      status: nextStatus,
      updatedAt: nowIso
    });
    const g = await db.goals.get(goalId);
    if (g) cloudUpsertGoal(g);
    if (nextStatus === 'completed') {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    }
  };

  // Quick update priority directly from table
  const handleQuickPriorityChange = async (goalId: string, nextPriority: GoalPriority) => {
    const nowIso = new Date().toISOString();
    await db.goals.update(goalId, {
      priority: nextPriority,
      updatedAt: nowIso
    });
    const g = await db.goals.get(goalId);
    if (g) cloudUpsertGoal(g);
  };

  // Start inline value editing
  const startEditValue = (goal: Goal) => {
    setEditingValueId(goal.id);
    setTempValue(String(goal.currentValue));
  };

  // Save inline value editing
  const saveEditValue = async (goal: Goal) => {
    const num = parseFloat(tempValue);
    if (!isNaN(num) && num >= 0) {
      const isNowCompleted = num >= goal.targetValue;
      const nowIso = new Date().toISOString();
      const updatedGoal: Goal = {
        ...goal,
        currentValue: num,
        status: isNowCompleted ? 'completed' : goal.status === 'completed' ? 'on_track' : goal.status,
        updatedAt: nowIso
      };

      try {
        await cloudUpsertGoal(updatedGoal);
        await db.goals.put(updatedGoal);
        if (isNowCompleted && goal.status !== 'completed') {
          confetti({ particleCount: 40, spread: 70, origin: { y: 0.7 } });
        }
      } catch (err: any) {
        console.error('Gagal memperbarui sasaran di Supabase:', err);
        alert(`Gagal menyimpan perubahan ke Supabase: ${err.message || 'Cek koneksi internet'}`);
      }
    }
    setEditingValueId(null);
  };

  // Handle inline deletion without window.confirm
  const handleExecuteDelete = async (id: string) => {
    try {
      await cloudDeleteGoal(id);
      await db.goals.delete(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error('Gagal menghapus sasaran dari Supabase:', err);
      alert(`Gagal menghapus sasaran dari Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  const categories: string[] = settings?.goalCategories && settings.goalCategories.length > 0
    ? settings.goalCategories
    : DEFAULT_GOAL_CATEGORIES;

  return (
    <div className="space-y-6">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Sasaran Bisnis (Strategic Goals)
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
              Tabel Interaktif
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Pantau realisasi target kuantitatif Personal Project dan perbarui status atau progres langsung dari tabel secara cepat.
          </p>
        </div>

        <button
          onClick={() => onOpenGoalModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Sasaran</span>
        </button>
      </div>

      {/* Filter Toolbar & View Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-[#181b20] border border-[#262b34]">
        {/* Category Segmented Control & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari sasaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#2a2f3a] bg-[#121417] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#20242b]'
              }`}
            >
              Semua ({goals.length})
            </button>
            {categories.map(cat => {
              const count = goals.filter(g => g.category === cat || g.category.startsWith(cat.split(' ')[0]) || cat.startsWith(g.category.split(' ')[0])).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-[#20242b]'
                  }`}
                >
                  {cat} {count > 0 && <span className="text-[10px] opacity-75">({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side: Status Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-[#2a2f3a] bg-[#121417] text-zinc-200 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="on_track">Sesuai Target</option>
              <option value="at_risk">Perlu Perhatian</option>
              <option value="behind">Tertinggal</option>
              <option value="completed">Tercapai</option>
            </select>
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-[#121417] rounded-lg border border-[#2a2f3a]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'table' ? 'bg-[#222731] shadow-xs text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Tampilan Tabel (Mudah Update)"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-[#222731] shadow-xs text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Tampilan Kartu"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {filteredGoals.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#181b20] border border-[#262b34]">
          <Target className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          {goals.length > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-white">Tidak Ada Sasaran yang Cocok dengan Filter</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Anda memiliki {goals.length} sasaran tersimpan, namun tersembunyi karena filter kategori "{selectedCategory}" atau pencarian aktif.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition cursor-pointer"
                >
                  Tampilkan Semua Sasaran ({goals.length})
                </button>
                <button
                  onClick={() => onOpenGoalModal()}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 rounded-lg transition cursor-pointer"
                >
                  + Tambah Sasaran Baru
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-white">Belum Ada Sasaran Bisnis</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Mulai susun roadmap bisnis Personal Project dengan membuat sasaran strategis baru.
              </p>
              <button
                onClick={() => onOpenGoalModal()}
                className="mt-4 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition cursor-pointer"
              >
                + Buat Sasaran Sekarang
              </button>
            </>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Interactive Table for Quick & Seamless Updating */
        <div className="rounded-xl bg-[#181b20] border border-[#262b34] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262b34] bg-[#14161a] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[220px]">Sasaran Bisnis</th>
                  <th className="py-3 px-3 min-w-[140px]">Kategori</th>
                  <th className="py-3 px-3 min-w-[160px]">Status (Update Cepat)</th>
                  <th className="py-3 px-3 min-w-[130px]">Prioritas</th>
                  <th className="py-3 px-4 min-w-[260px]">Realisasi Target (Edit Angka)</th>
                  <th className="py-3 px-3 min-w-[140px]">Proyek Terkait</th>
                  <th className="py-3 px-3 min-w-[120px]">Tenggat</th>
                  <th className="py-3 px-4 text-right min-w-[100px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222731] text-xs">
                {filteredGoals.map((goal) => {
                  const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                  const childProjects = projects.filter(p => p.goalId === goal.id);
                  const isEditingValue = editingValueId === goal.id;
                  const isDeleting = confirmDeleteId === goal.id;

                  return (
                    <tr 
                      key={goal.id}
                      className="hover:bg-[#1f232b]/80 transition group"
                    >
                      {/* 1. Sasaran Bisnis & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div 
                            className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" 
                            style={{ backgroundColor: goal.color || '#3b82f6' }}
                          />
                          <div className="min-w-0">
                            <button
                              onClick={() => onOpenGoalModal(goal)}
                              className="font-semibold text-zinc-100 hover:text-blue-400 text-left transition truncate max-w-xs block cursor-pointer"
                              title="Klik untuk membuka detail sasaran"
                            >
                              {goal.title}
                            </button>
                            {goal.description && (
                              <p className="text-[11px] text-zinc-400 truncate max-w-xs mt-0.5">
                                {goal.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Kategori */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#222731] text-zinc-300 border border-[#2d3340]">
                          {goal.category}
                        </span>
                      </td>

                      {/* 3. Status - Interactive Quick Dropdown */}
                      <td className="py-3.5 px-3">
                        <select
                          value={goal.status}
                          onChange={(e) => handleQuickStatusChange(goal.id, e.target.value as GoalStatus)}
                          className={`text-xs font-medium rounded-lg px-2.5 py-1 border transition cursor-pointer outline-none ${
                            goal.status === 'completed'
                              ? 'bg-blue-950/60 text-blue-300 border-blue-800 hover:bg-blue-900/60'
                              : goal.status === 'on_track'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                              : goal.status === 'at_risk'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900/60'
                              : 'bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900/60'
                          }`}
                          title="Klik untuk mengubah status seketika"
                        >
                          <option value="on_track">Sesuai Target</option>
                          <option value="at_risk">Perlu Perhatian</option>
                          <option value="behind">Tertinggal</option>
                          <option value="completed">Tercapai</option>
                        </select>
                      </td>

                      {/* 4. Prioritas - Interactive Quick Dropdown */}
                      <td className="py-3.5 px-3">
                        <select
                          value={goal.priority}
                          onChange={(e) => handleQuickPriorityChange(goal.id, e.target.value as GoalPriority)}
                          className={`text-xs font-medium rounded-lg px-2 py-1 border bg-[#14161b] cursor-pointer outline-none ${
                            goal.priority === 'high'
                              ? 'text-amber-400 border-amber-900/60'
                              : goal.priority === 'medium'
                              ? 'text-blue-400 border-blue-900/60'
                              : 'text-zinc-400 border-zinc-800'
                          }`}
                          title="Ubah prioritas sasaran"
                        >
                          <option value="high">Tinggi</option>
                          <option value="medium">Sedang</option>
                          <option value="low">Rendah</option>
                        </select>
                      </td>

                      {/* 5. Realisasi Target (Inline Quick Edit) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {isEditingValue ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                autoFocus
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditValue(goal);
                                  if (e.key === 'Escape') setEditingValueId(null);
                                }}
                                className="w-24 px-2 py-1 text-xs font-semibold bg-[#121417] border border-blue-500 rounded text-white focus:outline-none"
                              />
                              <span className="text-zinc-400 text-xs">/ {goal.targetValue} {goal.unit}</span>
                              <button
                                onClick={() => saveEditValue(goal)}
                                className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer"
                                title="Simpan perubahan"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingValueId(null)}
                                className="p-1 rounded bg-[#222731] hover:bg-[#2c323f] text-zinc-400 hover:text-white transition cursor-pointer"
                                title="Batal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <button
                                onClick={() => startEditValue(goal)}
                                className="flex items-center gap-1 text-xs font-semibold text-zinc-200 hover:text-blue-400 transition cursor-pointer text-left group/val"
                                title="Klik untuk mengupdate angka realisasi"
                              >
                                <span className="tabular-nums">
                                  {goal.currentValue} / {goal.targetValue} {goal.unit}
                                </span>
                                <Edit3 className="w-3 h-3 text-zinc-500 group-hover/val:text-blue-400 opacity-60 group-hover/val:opacity-100" />
                              </button>
                              <span className="text-xs font-bold tabular-nums text-white shrink-0">
                                {percent}%
                              </span>
                            </div>
                          )}

                          {/* Progress Bar */}
                          <div className="h-1.5 w-full rounded-full bg-[#262b34] overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-300"
                              style={{ 
                                width: `${percent}%`,
                                backgroundColor: goal.color || (percent >= 100 ? '#10b981' : '#3b82f6')
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 6. Proyek Terkait */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-300 tabular-nums font-medium">
                            {childProjects.length} Proyek
                          </span>
                          <button
                            onClick={() => onOpenProjectModal(undefined, goal.id)}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 rounded transition cursor-pointer"
                            title="Tautkan proyek baru ke sasaran ini"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* 7. Tenggat */}
                      <td className="py-3.5 px-3 text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{formatDateIndo(goal.deadline)}</span>
                        </div>
                      </td>

                      {/* 8. Aksi (Inline Confirmation for Delete) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-rose-400">Hapus?</span>
                            <button
                              onClick={() => handleExecuteDelete(goal.id)}
                              className="px-2 py-0.5 text-[11px] font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition cursor-pointer"
                            >
                              Ya
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 text-[11px] bg-[#222731] hover:bg-[#2c323f] text-zinc-300 rounded transition cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onOpenGoalModal(goal)}
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#222731] rounded-lg transition cursor-pointer"
                              title="Ubah Lengkap Sasaran"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(goal.id)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                              title="Hapus Sasaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View (Alternative View) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGoals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
            const childProjects = projects.filter(p => p.goalId === goal.id);

            return (
              <div 
                key={goal.id}
                className="rounded-2xl bg-[#181b20] border border-[#262b34] p-5 flex flex-col justify-between hover:border-zinc-700 transition shadow-xs"
              >
                <div>
                  {/* Top Bar on Card */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#262b34]">
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-200">{goal.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className={PRIORITY_LABELS[goal.priority]?.textClass}>
                        Prioritas {PRIORITY_LABELS[goal.priority]?.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={goal.status}
                        onChange={(e) => handleQuickStatusChange(goal.id, e.target.value as GoalStatus)}
                        className={`text-xs font-medium rounded-md px-2 py-0.5 border cursor-pointer ${
                          goal.status === 'completed'
                            ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                            : goal.status === 'on_track'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : goal.status === 'at_risk'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                            : 'bg-rose-950/60 text-rose-300 border-rose-800'
                        }`}
                      >
                        <option value="on_track">Sesuai Target</option>
                        <option value="at_risk">Perlu Perhatian</option>
                        <option value="behind">Tertinggal</option>
                        <option value="completed">Tercapai</option>
                      </select>
                      <button
                        onClick={() => onOpenGoalModal(goal)}
                        className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
                        title="Ubah Sasaran"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleExecuteDelete(goal.id)}
                        className="p-1 text-zinc-400 hover:text-rose-400 rounded cursor-pointer"
                        title="Hapus Sasaran"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Goal Title & Description */}
                  <div className="mt-3">
                    <h2 className="text-base font-semibold text-white">
                      {goal.title}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {goal.description}
                    </p>
                  </div>

                  {/* Progress & Target Quantitative Metric */}
                  <div className="mt-4 p-3.5 rounded-xl bg-[#121417] border border-[#262b34]">
                    <div className="flex items-baseline justify-between text-xs mb-1.5">
                      <button
                        onClick={() => startEditValue(goal)}
                        className="font-semibold text-zinc-200 tabular-nums hover:text-blue-400 transition cursor-pointer flex items-center gap-1.5"
                        title="Klik untuk memperbarui capaian"
                      >
                        <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                        <Edit3 className="w-3 h-3 text-zinc-500" />
                      </button>
                      <span className="font-bold tabular-nums text-white">{percent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-300"
                        style={{ 
                          width: `${percent}%`,
                          backgroundColor: goal.color || '#3b82f6'
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        <span>Tenggat: {formatDateIndo(goal.deadline)}</span>
                      </div>
                      <span>
                        {percent >= 100 ? 'Target Terlampaui!' : `${100 - percent}% lagi menuju target`}
                      </span>
                    </div>
                  </div>

                  {/* Child Projects Linked */}
                  <div className="mt-4 pt-3 border-t border-[#262b34]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                        Proyek Terhubung ({childProjects.length})
                      </span>
                      <button
                        onClick={() => onOpenProjectModal(undefined, goal.id)}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tautkan Proyek</span>
                      </button>
                    </div>

                    {childProjects.length === 0 ? (
                      <p className="text-[11px] text-zinc-500 italic py-1">
                        Belum ada proyek yang ditautkan ke sasaran ini.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {childProjects.map((p) => {
                          const projectTasks = tasks.filter(t => t.projectId === p.id);
                          const doneTasks = projectTasks.filter(t => t.isCompleted);
                          const projPercent = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;

                          return (
                            <div
                              key={p.id}
                              onClick={() => onNavigate('projects', p.id)}
                              className="p-2.5 rounded-lg border border-[#262b34] bg-[#121417]/70 hover:border-zinc-700 hover:bg-[#1e2229] transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-zinc-200 truncate">
                                  {p.title}
                                </p>
                                <p className="text-[10px] text-zinc-500">
                                  {doneTasks.length}/{projectTasks.length} tugas selesai ({projPercent}%)
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
