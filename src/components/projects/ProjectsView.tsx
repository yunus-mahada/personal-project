import React, { useState } from 'react';
import { 
  FolderKanban, 
  Plus, 
  LayoutGrid, 
  Table as TableIcon, 
  Calendar, 
  CheckSquare, 
  Trash2, 
  Edit3,
  X,
  Target,
  ArrowRight,
  Circle,
  CheckCircle2,
  Search,
  Check
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db } from '../../db';
import type { Project, Task, ProjectStatus, ProjectPriority, ActiveTab } from '../../types';
import { DEFAULT_GOAL_CATEGORIES } from '../../types';
import { 
  formatDateIndo, 
  PROJECT_STATUS_LABELS, 
  PRIORITY_LABELS 
} from '../../utils/formatters';
import { cloudUpsertProject, cloudDeleteProject, cloudUpsertTask, cloudDeleteTask, cloudDeleteCalendarEvent } from '../../lib/supabase';

interface ProjectsViewProps {
  onOpenProjectModal: (proj?: Project) => void;
  onOpenTaskModal: (task?: Task, defaultProjectId?: string) => void;
  onNavigate: (tab: ActiveTab, itemId?: string) => void;
  selectedProjectId?: string | null;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onOpenProjectModal,
  onOpenTaskModal,
  onNavigate,
  selectedProjectId: initialSelectedId
}) => {
  // Default to 'table' per user requirement ("pada proyek dibuat tabel saja agar mudah proses pengupdatean")
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeProjectDetail, setActiveProjectDetail] = useState<Project | null>(null);

  // Inline delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const settings = useLiveQuery(() => db.settings.get('user_default'));

  const availableCategories = (settings?.goalCategories && Array.isArray(settings.goalCategories))
    ? settings.goalCategories
    : [];

  React.useEffect(() => {
    if (initialSelectedId && projects.length > 0) {
      const match = projects.find(p => p.id === initialSelectedId);
      if (match) setActiveProjectDetail(match);
    }
  }, [initialSelectedId, projects]);

  const filteredProjects = projects.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  // Quick update project status directly from table
  const handleQuickStatusChange = async (projectId: string, nextStatus: ProjectStatus) => {
    const existing = await db.projects.get(projectId);
    if (!existing) return;
    const nowIso = new Date().toISOString();
    const updated: Project = {
      ...existing,
      status: nextStatus,
      updatedAt: nowIso
    };

    try {
      await cloudUpsertProject(updated);
      await db.projects.put(updated);
      if (nextStatus === 'completed') {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
      }
    } catch (err: any) {
      console.error('Gagal memperbarui status proyek di Supabase:', err);
      alert(`Gagal menyimpan perubahan ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  // Quick update project priority directly from table
  const handleQuickPriorityChange = async (projectId: string, nextPriority: ProjectPriority) => {
    const existing = await db.projects.get(projectId);
    if (!existing) return;
    const nowIso = new Date().toISOString();
    const updated: Project = {
      ...existing,
      priority: nextPriority,
      updatedAt: nowIso
    };

    try {
      await cloudUpsertProject(updated);
      await db.projects.put(updated);
    } catch (err: any) {
      console.error('Gagal memperbarui prioritas proyek di Supabase:', err);
      alert(`Gagal menyimpan perubahan prioritas ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  // Quick update project category directly from table (using business categories from settings)
  const handleQuickCategoryChange = async (projectId: string, nextCategory: string) => {
    const existing = await db.projects.get(projectId);
    if (!existing) return;
    const nowIso = new Date().toISOString();
    const updated: Project = {
      ...existing,
      category: nextCategory,
      updatedAt: nowIso
    };

    try {
      await cloudUpsertProject(updated);
      await db.projects.put(updated);
    } catch (err: any) {
      console.error('Gagal memperbarui kategori proyek di Supabase:', err);
      alert(`Gagal menyimpan perubahan kategori ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  // Safe delete project — cascade hapus tasks dan calendar events terkait
  const handleExecuteDelete = async (id: string) => {
    try {
      // 1. Ambil semua tasks yang terkait dengan project ini
      const relatedTasks = await db.tasks.where('projectId').equals(id).toArray();

      // 2. Untuk setiap task, hapus calendar event-nya jika ada
      for (const task of relatedTasks) {
        if (task.calendarEventId) {
          await cloudDeleteCalendarEvent(task.calendarEventId).catch(console.error);
          await db.calendarEvents.delete(task.calendarEventId);
        }
        await cloudDeleteTask(task.id).catch(console.error);
        await db.tasks.delete(task.id);
      }

      // 3. Hapus project itu sendiri
      await cloudDeleteProject(id);
      await db.projects.delete(id);

      setConfirmDeleteId(null);
      if (activeProjectDetail?.id === id) {
        setActiveProjectDetail(null);
      }
    } catch (err: any) {
      console.error('Gagal menghapus proyek dari Supabase:', err);
      alert(`Gagal menghapus proyek dari Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  const handleToggleTask = async (task: Task) => {
    const nextCompleted = !task.isCompleted;
    const nowIso = new Date().toISOString();
    const updatedTask: Task = {
      ...task,
      isCompleted: nextCompleted,
      status: nextCompleted ? 'done' : 'todo',
      completedAt: nextCompleted ? nowIso : undefined,
      updatedAt: nowIso
    };

    try {
      await cloudUpsertTask(updatedTask);
      await db.tasks.put(updatedTask);
      if (nextCompleted) {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      }
    } catch (err: any) {
      console.error('Gagal memperbarui status tugas di Supabase:', err);
      alert(`Gagal menyimpan perubahan status tugas ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Manajemen Proyek (Projects)
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
              Tabel Interaktif
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Kelola inisiatif bisnis Personal Project, perbarui status, prioritas, timeline, dan tugas secara instan langsung dari tabel.
          </p>
        </div>

        <button
          onClick={() => onOpenProjectModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Proyek</span>
        </button>
      </div>

      {/* Toolbar: Filters, Search & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-[#181b20] border border-[#262b34]">
        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari proyek..."
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

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#20242b]'
              }`}
            >
              Semua ({projects.length})
            </button>
            <button
              onClick={() => setFilterStatus('in_progress')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                filterStatus === 'in_progress'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#20242b]'
              }`}
            >
              Sedang Berjalan ({projects.filter(p => p.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setFilterStatus('review')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                filterStatus === 'review'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#20242b]'
              }`}
            >
              Tinjauan ({projects.filter(p => p.status === 'review').length})
            </button>
            <button
              onClick={() => setFilterStatus('planning')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                filterStatus === 'planning'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#20242b]'
              }`}
            >
              Perencanaan ({projects.filter(p => p.status === 'planning').length})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap cursor-pointer ${
                filterStatus === 'completed'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-[#20242b]'
              }`}
            >
              Selesai ({projects.filter(p => p.status === 'completed').length})
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Business Category Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 hidden xl:inline">Kategori:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs rounded-lg px-2.5 py-1.5 border border-[#2a2f3a] bg-[#121417] text-zinc-300 focus:outline-none focus:border-blue-500 cursor-pointer"
              title="Filter proyek berdasarkan kategori bisnis dari pengaturan"
            >
              <option value="all">Semua Kategori Bisnis</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-0.5 bg-[#121417] rounded-lg self-end lg:self-auto border border-[#2a2f3a]">
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

      {/* Projects Display */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#181b20] border border-[#262b34]">
          <FolderKanban className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-white">Belum Ada Proyek Sesuai Filter</h3>
          <p className="text-xs text-zinc-400 mt-1">Tambahkan proyek baru untuk mulai mengorganisir tugas Personal Project.</p>
          <button
            onClick={() => onOpenProjectModal()}
            className="mt-4 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition cursor-pointer"
          >
            + Buat Proyek Baru
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Interactive Table for Fast Updating */
        <div className="rounded-xl bg-[#181b20] border border-[#262b34] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262b34] bg-[#14161a] text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[220px]">Nama Proyek</th>
                  <th className="py-3 px-3 min-w-[170px]">Kategori Bisnis</th>
                  <th className="py-3 px-3 min-w-[170px]">Status (Update Cepat)</th>
                  <th className="py-3 px-3 min-w-[130px]">Prioritas</th>
                  <th className="py-3 px-3 min-w-[180px]">Tugas Selesai</th>
                  <th className="py-3 px-3 min-w-[120px]">Tenggat</th>
                  <th className="py-3 px-4 text-right min-w-[110px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222731] text-xs">
                {filteredProjects.map((p) => {
                  const pTasks = tasks.filter(t => t.projectId === p.id);
                  const doneCount = pTasks.filter(t => t.isCompleted).length;
                  const pPercent = pTasks.length > 0 ? Math.round((doneCount / pTasks.length) * 100) : 0;
                  const isDeleting = confirmDeleteId === p.id;

                  return (
                    <tr 
                      key={p.id}
                      className="hover:bg-[#1f232b]/80 transition group"
                    >
                      {/* 1. Nama Proyek */}
                      <td className="py-3.5 px-4">
                        <div className="min-w-0">
                          <button
                            onClick={() => setActiveProjectDetail(p)}
                            className="font-semibold text-zinc-100 hover:text-blue-400 text-left transition truncate max-w-xs block cursor-pointer"
                            title="Klik untuk membuka detail dan tugas proyek"
                          >
                            {p.title}
                          </button>
                          {p.description && (
                            <span className="text-[11px] text-zinc-500 truncate max-w-[200px] block mt-0.5">
                              {p.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Kategori Bisnis (Interactive Dropdown from Settings) */}
                      <td className="py-3.5 px-3">
                        <select
                          value={p.category}
                          onChange={(e) => handleQuickCategoryChange(p.id, e.target.value)}
                          className="w-full text-xs rounded-lg px-2 py-1 border bg-[#121417] text-zinc-300 border-[#2a2f3a] focus:outline-none focus:border-blue-500 cursor-pointer truncate"
                          title="Ubah kategori bisnis proyek langsung dari tabel"
                        >
                          {!availableCategories.includes(p.category) && p.category && (
                            <option value={p.category}>
                              {p.category} (Perlu disesuaikan)
                            </option>
                          )}
                          {availableCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 3. Status (Quick Interactive Dropdown) */}
                      <td className="py-3.5 px-3">
                        <select
                          value={p.status}
                          onChange={(e) => handleQuickStatusChange(p.id, e.target.value as ProjectStatus)}
                          className={`text-xs font-medium rounded-lg px-2.5 py-1 border transition cursor-pointer outline-none ${
                            p.status === 'completed'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                              : p.status === 'in_progress'
                              ? 'bg-blue-950/60 text-blue-300 border-blue-800 hover:bg-blue-900/60'
                              : p.status === 'review'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900/60'
                              : p.status === 'planning'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-800 hover:bg-purple-900/60'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                          }`}
                          title="Ubah status proyek seketika"
                        >
                          <option value="planning">Perencanaan</option>
                          <option value="in_progress">Sedang Berjalan</option>
                          <option value="review">Dalam Tinjauan</option>
                          <option value="completed">Selesai</option>
                          <option value="on_hold">Ditunda</option>
                        </select>
                      </td>

                      {/* 4. Prioritas (Quick Interactive Dropdown) */}
                      <td className="py-3.5 px-3">
                        <select
                          value={p.priority}
                          onChange={(e) => handleQuickPriorityChange(p.id, e.target.value as ProjectPriority)}
                          className={`text-xs font-medium rounded-lg px-2 py-1 border bg-[#14161b] cursor-pointer outline-none ${
                            p.priority === 'urgent'
                              ? 'text-rose-400 border-rose-900/60'
                              : p.priority === 'high'
                              ? 'text-amber-400 border-amber-900/60'
                              : p.priority === 'medium'
                              ? 'text-blue-400 border-blue-900/60'
                              : 'text-zinc-400 border-zinc-800'
                          }`}
                          title="Ubah prioritas proyek"
                        >
                          <option value="urgent">Mendesak</option>
                          <option value="high">Tinggi</option>
                          <option value="medium">Sedang</option>
                          <option value="low">Rendah</option>
                        </select>
                      </td>

                      {/* 5. Tugas Selesai & Quick + Tugas */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="tabular-nums text-zinc-300 font-medium">
                              {doneCount}/{pTasks.length} ({pPercent}%)
                            </span>
                            <button
                              onClick={() => onOpenTaskModal(undefined, p.id)}
                              className="text-blue-400 hover:text-blue-300 text-[10px] font-medium flex items-center gap-0.5 cursor-pointer"
                              title="Tambah tugas baru ke proyek ini"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Tugas</span>
                            </button>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[#262b34] overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${pPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 6. Tenggat */}
                      <td className="py-3.5 px-3 text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{formatDateIndo(p.dueDate)}</span>
                        </div>
                      </td>

                      {/* 8. Aksi (Detail, Edit, Safe Delete) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-[10px] text-rose-400">Hapus?</span>
                            <button
                              onClick={() => handleExecuteDelete(p.id)}
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
                              onClick={() => setActiveProjectDetail(p)}
                              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-[#222731] rounded-lg transition cursor-pointer"
                              title="Buka Detail & Checklist Tugas"
                            >
                              <FolderKanban className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onOpenProjectModal(p)}
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#222731] rounded-lg transition cursor-pointer"
                              title="Ubah Lengkap Proyek"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(p.id)}
                              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                              title="Hapus Proyek"
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
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const completedCount = projectTasks.filter(t => t.isCompleted).length;
            const progressPercent = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : 0;

            return (
              <div
                key={project.id}
                onClick={() => setActiveProjectDetail(project)}
                className="p-5 rounded-2xl bg-[#181b20] border border-[#262b34] hover:border-zinc-700 transition cursor-pointer flex flex-col justify-between group shadow-xs"
              >
                <div>
                  {/* Top unboxed metadata */}
                  <div className="flex items-center justify-between text-xs text-zinc-400 pb-3 border-b border-[#262b34]">
                    <span className="font-medium text-zinc-300">{project.category}</span>
                    <select
                      value={project.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleQuickStatusChange(project.id, e.target.value as ProjectStatus)}
                      className={`text-xs font-medium rounded px-2 py-0.5 border cursor-pointer ${
                        project.status === 'completed'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                          : project.status === 'in_progress'
                          ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                          : project.status === 'review'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      <option value="planning">Perencanaan</option>
                      <option value="in_progress">Sedang Berjalan</option>
                      <option value="review">Dalam Tinjauan</option>
                      <option value="completed">Selesai</option>
                      <option value="on_hold">Ditunda</option>
                    </select>
                  </div>

                  <h3 className="text-sm font-semibold text-white mt-3 group-hover:text-blue-400 transition">
                    {project.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {project.description}
                  </p>

                  {/* Tasks Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span>Progres Tugas</span>
                      <span className="font-semibold tabular-nums text-zinc-200">
                        {completedCount}/{projectTasks.length} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#262b34] flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    <span>Tenggat: {formatDateIndo(project.dueDate)}</span>
                  </div>
                  <span className={PRIORITY_LABELS[project.priority]?.textClass}>
                    {PRIORITY_LABELS[project.priority]?.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Detail Modal in Charcoal Dark Theme */}
      {activeProjectDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-[#181b20] border border-[#262b34] overflow-hidden my-8 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262b34] shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <span>{activeProjectDetail.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className={PROJECT_STATUS_LABELS[activeProjectDetail.status]?.textClass}>
                    {PROJECT_STATUS_LABELS[activeProjectDetail.status]?.label}
                  </span>
                </div>
                <h2 className="text-base font-bold text-white truncate">
                  {activeProjectDetail.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onOpenProjectModal(activeProjectDetail)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#222731] transition cursor-pointer"
                  title="Ubah Proyek"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActiveProjectDetail(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#222731] transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Deskripsi Proyek
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {activeProjectDetail.description || 'Tidak ada deskripsi.'}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#121417] border border-[#262b34]">
                <div>
                  <span className="text-[11px] text-zinc-400">Tanggal Mulai</span>
                  <p className="text-xs font-semibold text-zinc-100 mt-0.5">
                    {formatDateIndo(activeProjectDetail.startDate)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400">Tenggat Waktu</span>
                  <p className="text-xs font-semibold text-zinc-100 mt-0.5">
                    {formatDateIndo(activeProjectDetail.dueDate)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400">Kategori Inisiatif</span>
                  <p className="text-xs font-semibold text-zinc-100 mt-0.5 truncate">
                    {activeProjectDetail.category}
                  </p>
                </div>
              </div>

              {/* Tasks Checklist for this Project */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-zinc-200">
                    Daftar Tugas Proyek ({tasks.filter(t => t.projectId === activeProjectDetail.id).length})
                  </h3>
                  <button
                    onClick={() => onOpenTaskModal(undefined, activeProjectDetail.id)}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Tugas</span>
                  </button>
                </div>

                {tasks.filter(t => t.projectId === activeProjectDetail.id).length === 0 ? (
                  <p className="text-xs text-zinc-500 italic py-4 text-center">
                    Belum ada tugas untuk proyek ini. Klik tombol di atas untuk menambahkan.
                  </p>
                ) : (
                  <div className="divide-y divide-[#262b34] rounded-xl border border-[#262b34] overflow-hidden bg-[#121417]/40">
                    {tasks.filter(t => t.projectId === activeProjectDetail.id).map(task => (
                      <div key={task.id} className="p-3 flex items-center justify-between gap-3 hover:bg-[#1e2229] transition">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleTask(task)}
                            className="text-zinc-500 hover:text-emerald-400 transition shrink-0 cursor-pointer"
                          >
                            {task.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                          <span className={`text-xs ${task.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200 font-medium'} truncate`}>
                            {task.title}
                          </span>
                        </div>
                        <span className={`text-[11px] shrink-0 ${PRIORITY_LABELS[task.priority]?.textClass}`}>
                          {PRIORITY_LABELS[task.priority]?.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Safe Inline Confirmation for Deletion */}
            <div className="p-4 bg-[#14161a] border-t border-[#262b34] flex items-center justify-between text-xs shrink-0">
              {confirmDeleteId === activeProjectDetail.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400">Yakin hapus proyek ini?</span>
                  <button
                    onClick={() => handleExecuteDelete(activeProjectDetail.id)}
                    className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition cursor-pointer"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-2.5 py-1 text-xs bg-[#222731] hover:bg-[#2c323f] text-zinc-300 rounded transition cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(activeProjectDetail.id)}
                  className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Proyek</span>
                </button>
              )}

              <button
                onClick={() => setActiveProjectDetail(null)}
                className="px-4 py-1.5 text-xs font-medium text-zinc-300 hover:bg-[#222731] rounded-lg transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
