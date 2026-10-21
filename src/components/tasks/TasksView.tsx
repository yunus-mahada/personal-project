import React, { useState } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Kanban, 
  Table as TableIcon, 
  Grid2X2, 
  Search, 
  Circle, 
  CheckCircle2, 
  Edit3, 
  Trash2,
  Users,
  ClipboardCheck,
  Tag
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db } from '../../db';
import type { Task, TaskStatus, TaskPriority, EisenhowerQuadrant, TaskCategory } from '../../types';
import { 
  formatDateIndo, 
  formatMinutes, 
  TASK_STATUS_LABELS, 
  PRIORITY_LABELS,
  EISENHOWER_LABELS,
  TASK_CATEGORY_LABELS
} from '../../utils/formatters';
import { cloudUpsertTask, cloudDeleteTask, cloudDeleteCalendarEvent } from '../../lib/supabase';

interface TasksViewProps {
  onOpenTaskModal: (task?: Task) => void;
  selectedTaskId?: string | null;
}

export const TasksView: React.FC<TasksViewProps> = ({
  onOpenTaskModal,
  selectedTaskId
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'eisenhower'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCategory, setQuickCategory] = useState<TaskCategory>('Tugas');

  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (filterProject !== 'all' && t.projectId !== filterProject) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && (t.category || 'Tugas') !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchTags = t.tags?.some(tag => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchTags) return false;
    }
    return true;
  });

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
        confetti({ particleCount: 35, spread: 55, origin: { y: 0.8 } });
      }
    } catch (err: any) {
      console.error('Gagal memperbarui status tugas di Supabase:', err);
      alert(`Gagal menyimpan perubahan ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  const handleMoveStatus = async (task: Task, nextStatus: TaskStatus) => {
    const nowIso = new Date().toISOString();
    const isDone = nextStatus === 'done';
    const updatedTask: Task = {
      ...task,
      status: nextStatus,
      isCompleted: isDone,
      completedAt: isDone ? nowIso : undefined,
      updatedAt: nowIso
    };
    try {
      await cloudUpsertTask(updatedTask);
      await db.tasks.put(updatedTask);
      if (isDone) {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      }
    } catch (err: any) {
      console.error('Gagal memindahkan status tugas di Supabase:', err);
      alert(`Gagal menyimpan perubahan status ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  const handleQuickCategoryChange = async (task: Task, nextCategory: TaskCategory) => {
    const nowIso = new Date().toISOString();
    const updatedTask: Task = {
      ...task,
      category: nextCategory,
      updatedAt: nowIso
    };
    try {
      await cloudUpsertTask(updatedTask);
      await db.tasks.put(updatedTask);
    } catch (err: any) {
      console.error('Gagal mengubah kategori tugas di Supabase:', err);
      alert(`Gagal menyimpan perubahan kategori ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  const handleDeleteTask = async (id: string, title: string) => {
    if (window.confirm(`Hapus tugas "${title}"? Event kalender terkait juga akan ikut dihapus.`)) {
      try {
        // Cek apakah tugas punya calendar event yang terhubung
        const taskToDelete = await db.tasks.get(id);
        if (taskToDelete?.calendarEventId) {
          await cloudDeleteCalendarEvent(taskToDelete.calendarEventId);
          await db.calendarEvents.delete(taskToDelete.calendarEventId);
        }
        await cloudDeleteTask(id);
        await db.tasks.delete(id);
      } catch (err: any) {
        console.error('Gagal menghapus tugas di Supabase:', err);
        alert(`Gagal menghapus tugas dari Supabase: ${err.message || 'Cek koneksi internet'}`);
      }
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const nowIso = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0];
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: quickTitle.trim(),
      projectId: filterProject !== 'all' ? filterProject : undefined,
      category: quickCategory,
      status: 'todo',
      priority: 'medium',
      eisenhower: 'do_first',
      dueDate: todayStr,
      isCompleted: false,
      tags: [],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    try {
      await cloudUpsertTask(newTask);
      await db.tasks.put(newTask);
      setQuickTitle('');
    } catch (err: any) {
      console.error('Gagal menambahkan tugas ke Supabase:', err);
      alert(`Gagal menyimpan tugas ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'Untuk Dikerjakan', color: 'border-t-zinc-600' },
    { id: 'in_progress', title: 'Sedang Berjalan', color: 'border-t-blue-500' },
    { id: 'in_review', title: 'Dalam Tinjauan', color: 'border-t-amber-500' },
    { id: 'done', title: 'Selesai', color: 'border-t-emerald-500' },
  ];

  const quadrants: EisenhowerQuadrant[] = ['do_first', 'schedule', 'delegate', 'dont_do'];

  // Helper render badge kategori
  const renderCategoryPill = (catName?: string) => {
    const cat = catName === 'Meeting' ? 'Meeting' : catName === 'Evaluasi' ? 'Evaluasi' : 'Tugas';
    const cfg = TASK_CATEGORY_LABELS[cat];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass}`}>
        {cat === 'Meeting' && <Users className="w-3 h-3 shrink-0" />}
        {cat === 'Evaluasi' && <ClipboardCheck className="w-3 h-3 shrink-0" />}
        {cat === 'Tugas' && <CheckSquare className="w-3 h-3 shrink-0" />}
        <span>{cat}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Daftar Tugas & Eksekusi Operasional</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kelola tugas dengan kategori Meeting, Evaluasi, dan Tugas operasional terintegrasi ke kalender bisnis.
          </p>
        </div>

        <button
          onClick={() => onOpenTaskModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Tugas Baru</span>
        </button>
      </div>

      {/* Quick Add Bar */}
      <form 
        onSubmit={handleQuickAdd}
        className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-xs"
      >
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Plus className="w-4 h-4 text-zinc-500 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="Tambah tugas/meeting/evaluasi baru dengan cepat..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="w-full text-xs bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500"
          />
        </div>

        {/* Quick Category Selector */}
        <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-800 shrink-0">
          <Tag className="w-3 h-3 text-zinc-500" />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value as TaskCategory)}
            className="text-xs bg-transparent text-zinc-200 outline-none cursor-pointer pr-1"
          >
            <option value="Tugas" className="bg-zinc-900 text-blue-300">✅ Tugas</option>
            <option value="Meeting" className="bg-zinc-900 text-purple-300">👥 Meeting</option>
            <option value="Evaluasi" className="bg-zinc-900 text-amber-300">📊 Evaluasi</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={!quickTitle.trim()}
          className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition shrink-0 shadow-xs cursor-pointer"
        >
          Simpan
        </button>
      </form>

      {/* Filter and View Modes Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
        {/* Left: Search & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-zinc-700 text-xs w-48 bg-zinc-950">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              placeholder="Cari tugas atau tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500 text-xs"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 cursor-pointer font-medium"
          >
            <option value="all">Semua Kategori ({tasks.length})</option>
            <option value="Meeting">👥 Meeting ({tasks.filter(t => t.category === 'Meeting').length})</option>
            <option value="Evaluasi">📊 Evaluasi ({tasks.filter(t => t.category === 'Evaluasi').length})</option>
            <option value="Tugas">✅ Tugas ({tasks.filter(t => !t.category || t.category === 'Tugas').length})</option>
          </select>

          {/* Project Filter */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 cursor-pointer"
          >
            <option value="all">Semua Proyek</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 cursor-pointer"
          >
            <option value="all">Semua Prioritas</option>
            <option value="urgent">Mendesak</option>
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </select>
        </div>

        {/* Right: View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-lg self-end lg:self-auto border border-zinc-800">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              viewMode === 'kanban' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              viewMode === 'table' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tabel</span>
          </button>
          <button
            onClick={() => setViewMode('eisenhower')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
              viewMode === 'eisenhower' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Grid2X2 className="w-3.5 h-3.5" />
            <span>Eisenhower Matrix</span>
          </button>
        </div>
      </div>

      {/* Main Tasks Views */}
      {viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);

            return (
              <div 
                key={col.id}
                className={`rounded-2xl bg-zinc-950/70 border border-zinc-800/80 p-3.5 border-t-4 ${col.color}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-200">
                      {col.title}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-zinc-400 bg-zinc-900 border border-zinc-700 px-1.5 py-0.2 rounded-md">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => onOpenTaskModal()}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 cursor-pointer"
                    title="Tambah tugas ke kolom ini"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 min-h-[120px]">
                  {colTasks.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-zinc-500 italic">
                      Tidak ada tugas
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const proj = projects.find(p => p.id === task.projectId);

                      return (
                        <div
                          key={task.id}
                          className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition text-left group shadow-xs"
                        >
                          {/* Top: Category Pill */}
                          <div className="flex items-center justify-between mb-2">
                            {renderCategoryPill(task.category)}
                            {task.dueDate && (
                              <span className="text-[10px] text-zinc-400 font-medium">
                                {formatDateIndo(task.dueDate)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => handleToggleTask(task)}
                              className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition shrink-0 cursor-pointer"
                            >
                              {task.isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-medium text-zinc-100 ${task.isCompleted ? 'line-through text-zinc-500' : ''}`}>
                                {task.title}
                              </p>

                              {proj && (
                                <p className="text-[10px] text-zinc-400 font-medium truncate mt-1">
                                  {proj.title}
                                </p>
                              )}

                              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400 pt-2 border-t border-zinc-800">
                                <span className={PRIORITY_LABELS[task.priority]?.textClass}>
                                  {PRIORITY_LABELS[task.priority]?.label}
                                </span>
                                {task.estimatedMinutes ? (
                                  <span>{formatMinutes(task.estimatedMinutes)}</span>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Quick Move Status / Actions */}
                          <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between opacity-80 group-hover:opacity-100 transition">
                            <select
                              value={task.status}
                              onChange={(e) => handleMoveStatus(task, e.target.value as TaskStatus)}
                              className="text-[10px] bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300 cursor-pointer"
                            >
                              <option value="todo">Untuk Dikerjakan</option>
                              <option value="in_progress">Sedang Berjalan</option>
                              <option value="in_review">Tinjauan</option>
                              <option value="done">Selesai</option>
                            </select>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onOpenTaskModal(task)}
                                className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
                                title="Ubah"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id, task.title)}
                                className="p-1 text-zinc-400 hover:text-rose-400 rounded cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'table' ? (
        /* Linear-style Dense Dark Table with Category Column */
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">Status</th>
                  <th className="py-3 px-4">Nama Tugas</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Proyek</th>
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Tenggat</th>
                  <th className="py-3 px-4">Estimasi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500 italic">
                      Tidak ada tugas yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const proj = projects.find(p => p.id === task.projectId);
                    const currentCategory = task.category || 'Tugas';

                    return (
                      <tr key={task.id} className="hover:bg-zinc-800/40 transition group">
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleTask(task)}
                            className="text-zinc-500 hover:text-emerald-400 transition cursor-pointer"
                          >
                            {task.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-100 max-w-sm truncate">
                          <span className={task.isCompleted ? 'line-through text-zinc-500' : ''}>
                            {task.title}
                          </span>
                        </td>
                        {/* Kolom Kategori dengan pilihan Meeting, Evaluasi, Tugas */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={currentCategory}
                            onChange={(e) => handleQuickCategoryChange(task, e.target.value as TaskCategory)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition cursor-pointer outline-none ${
                              currentCategory === 'Meeting'
                                ? 'bg-purple-950/80 border-purple-800 text-purple-300 hover:border-purple-600'
                                : currentCategory === 'Evaluasi'
                                ? 'bg-amber-950/80 border-amber-800 text-amber-300 hover:border-amber-600'
                                : 'bg-blue-950/80 border-blue-800 text-blue-300 hover:border-blue-600'
                            }`}
                            title="Ubah Kategori (Meeting, Evaluasi, Tugas)"
                          >
                            <option value="Tugas" className="bg-zinc-950 text-blue-300">✅ Tugas</option>
                            <option value="Meeting" className="bg-zinc-950 text-purple-300">👥 Meeting</option>
                            <option value="Evaluasi" className="bg-zinc-950 text-amber-300">📊 Evaluasi</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 max-w-[160px] truncate">
                          {proj ? proj.title : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={PRIORITY_LABELS[task.priority]?.textClass}>
                            {PRIORITY_LABELS[task.priority]?.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                          {formatDateIndo(task.dueDate)}
                        </td>
                        <td className="py-3 px-4 tabular-nums text-zinc-400">
                          {formatMinutes(task.estimatedMinutes)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => onOpenTaskModal(task)}
                            className="p-1 text-zinc-400 hover:text-white rounded mr-1 cursor-pointer"
                            title="Ubah"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            className="p-1 text-zinc-400 hover:text-rose-400 rounded cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Eisenhower Matrix 4 Quadrants with Category Indicator */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {quadrants.map((quad) => {
            const quadInfo = EISENHOWER_LABELS[quad];
            const quadTasks = filteredTasks.filter(t => (t.eisenhower || 'do_first') === quad);

            return (
              <div 
                key={quad}
                className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="pb-3 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold" style={{ color: quadInfo.color }}>
                        {quadInfo.label}
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        {quadInfo.desc}
                      </p>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                      {quadTasks.length}
                    </span>
                  </div>

                  <div className="mt-3 divide-y divide-zinc-800/60 space-y-1">
                    {quadTasks.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic py-4 text-center">
                        Tidak ada tugas di kuadran ini.
                      </p>
                    ) : (
                      quadTasks.map((task) => (
                        <div key={task.id} className="py-2.5 flex items-start justify-between gap-2 group">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <button
                              onClick={() => handleToggleTask(task)}
                              className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition shrink-0 cursor-pointer"
                            >
                              {task.isCompleted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                {renderCategoryPill(task.category)}
                              </div>
                              <p className={`text-xs font-medium ${task.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                {task.title}
                              </p>
                              {task.dueDate && (
                                <span className="text-[10px] text-zinc-400">
                                  Tenggat: {formatDateIndo(task.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => onOpenTaskModal(task)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-white cursor-pointer"
                            title="Ubah"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
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
