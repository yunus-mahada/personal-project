import React, { useState } from 'react';
import { 
  FolderKanban, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ArrowUpRight, 
  Flame,
  Repeat,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Layers,
  Users,
  ClipboardCheck,
  Sun,
  Sunset,
  Moon,
  FileText,
  Pin,
  Edit3,
  ExternalLink,
  Target,
  Table as TableIcon,
  Search
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { db } from '../../db';
import type { Task, Project, CalendarEvent, Routine, Note, ActiveTab } from '../../types';
import { 
  formatDateIndo, 
  formatTimeOnly, 
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  CALENDAR_CATEGORY_LABELS
} from '../../utils/formatters';
import { 
  getRoutineStatus, 
  toggleRoutineCompletion, 
  isDayInMonthRange, 
  formatCustomDaysLabel 
} from '../../utils/routineUtils';
import { toggleTaskCompletion, toggleEventCompletion } from '../../utils/taskSync';
import { cloudUpsertRoutine, cloudUpsertTask } from '../../lib/supabase';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab, itemId?: string) => void;
  onOpenTaskModal: (task?: Task, defaultProjectId?: string) => void;
  onOpenProjectModal: (proj?: Project) => void;
  onOpenEventModal: (event?: CalendarEvent, defaultDate?: string, defaultTime?: string) => void;
  onOpenRoutineModal?: (routine?: Routine) => void;
  onOpenNoteModal?: (note?: Note) => void;
}

export type RoutineCadenceTab = 'all' | 'daily' | 'weekly' | 'monthly';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenTaskModal,
  onOpenProjectModal,
  onOpenEventModal,
  onOpenRoutineModal,
  onOpenNoteModal
}) => {
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('high');
  const [quickTaskCategory, setQuickTaskCategory] = useState<'Tugas' | 'Meeting' | 'Evaluasi'>('Tugas');
  const [routineTab, setRoutineTab] = useState<RoutineCadenceTab>('all');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const calendarEvents = useLiveQuery(() => db.calendarEvents.toArray()) ?? [];
  const routines = useLiveQuery(() => db.routines.toArray()) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray()) ?? [];

  // Live dynamic today's date in local time
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const formattedToday = format(now, 'EEEE, d MMMM yyyy', { locale: id });
  const dayOfMonth = now.getDate();
  const dayOfWeek = now.getDay(); // 0 = Minggu, 1 = Senin, ...

  // Dynamic contextual greeting based on hour
  const currentHour = now.getHours();
  const greeting = currentHour < 11 
    ? 'Selamat pagi' 
    : currentHour < 15 
    ? 'Selamat siang' 
    : currentHour < 18 
    ? 'Selamat sore' 
    : 'Selamat malam';

  // 1. Projects Metrics & Filter
  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'on_hold');

  const filteredDashboardProjects = projects.filter(p => {
    if (projectStatusFilter === 'in_progress' && (p.status === 'completed' || p.status === 'on_hold')) return false;
    if (projectStatusFilter === 'completed' && p.status !== 'completed') return false;
    if (projectSearchQuery.trim()) {
      const q = projectSearchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCat = p.category?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchDesc) return false;
    }
    return true;
  });

  // 2. Tasks Metrics
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  // 3. Priority tasks for today (urgent/high priority or due/scheduled today)
  const todaysTasks = tasks
    .filter(t => !t.isCompleted && (t.dueDate === todayStr || t.scheduledDate === todayStr || t.priority === 'urgent' || t.priority === 'high'))
    .slice(0, 6);

  // 4. Unified Agenda Hari Ini (Tersinkronisasi Penuh dengan Kalender Bisnis)
  // Termasuk CalendarEvents hari ini + Tugas yang dijadwalkan hari ini
  const todaysCalendarEvents = calendarEvents.filter(e => e.startTime.startsWith(todayStr));
  
  const todaysTasksInAgenda = tasks.filter(t => {
    const taskDate = t.scheduledDate || t.dueDate;
    if (taskDate !== todayStr) return false;
    // Hindari duplikasi jika task sudah memiliki calendarEvent terdaftar
    return !todaysCalendarEvents.some(e => e.taskId === t.id || (t.calendarEventId && e.id === t.calendarEventId));
  });

  const totalAgendaItemsCount = todaysCalendarEvents.length + todaysTasksInAgenda.length;

  // 5. Rutinitas Klasifikasi: Harian, Mingguan, Bulanan
  const harianRoutines = routines.filter(r => r.frequency === 'daily' || r.frequency === 'workdays');
  const mingguanRoutines = routines.filter(r => r.frequency === 'weekly' || r.frequency === 'custom_days');
  const bulananRoutines = routines.filter(r => r.frequency === 'custom_range');

  // Menghitung rutinitas yang aktif / terjadwal hari ini
  const routinesDueToday = routines.filter(r => {
    if (r.frequency === 'daily') return true;
    if (r.frequency === 'workdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
    if (r.frequency === 'custom_days') return r.customDays?.includes(dayOfWeek);
    if (r.frequency === 'weekly') return true; // Target siklus mingguan
    if (r.frequency === 'custom_range') {
      const start = r.startDay ?? 1;
      const end = r.endDay ?? start;
      return isDayInMonthRange(dayOfMonth, start, end);
    }
    return false;
  });

  const completedRoutinesToday = routinesDueToday.filter(r => getRoutineStatus(r, now).isCompleted).length;
  const maxRoutineStreak = routines.reduce((acc, r) => Math.max(acc, r.streak || 0), 0);

  // Executive Productivity Score (0-100)
  const taskCompletionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
  const routineCompletionRate = routinesDueToday.length > 0 ? (completedRoutinesToday / routinesDueToday.length) * 100 : 100;
  
  const productivityScore = (tasks.length === 0 && routines.length === 0)
    ? 0
    : Math.min(100, Math.round((taskCompletionRate * 0.5) + (routineCompletionRate * 0.5) + (tasks.length > 0 ? 30 : 0)));

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { label: 'Sangat Produktif', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 50) return { label: 'Progres Stabil', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    return { label: 'Mulai Hari Ini', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  };

  const scoreStatus = getScoreStatus(productivityScore);

  // Handler: Toggle Task (Tersinkronisasi otomatis dengan Kalender Bisnis)
  const handleToggleTask = async (task: Task) => {
    try {
      const { isCompleted } = await toggleTaskCompletion(task);
      if (isCompleted) {
        confetti({ particleCount: 35, spread: 55, origin: { y: 0.8 } });
      }
    } catch (err: any) {
      console.error('Gagal memperbarui status tugas:', err);
      alert(`Gagal menyimpan perubahan ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  // Handler: Toggle Event di Kalender Bisnis (Tersinkronisasi otomatis dengan Daftar Tugas)
  const handleToggleCalendarEvent = async (event: CalendarEvent) => {
    try {
      const { isCompleted } = await toggleEventCompletion(event);
      if (isCompleted) {
        confetti({ particleCount: 35, spread: 55, origin: { y: 0.8 } });
      }
    } catch (err: any) {
      console.error('Gagal memperbarui agenda kalender:', err);
      alert(`Gagal menyimpan perubahan agenda: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  // Handler: Toggle Rutinitas
  const handleToggleRoutine = async (routine: Routine) => {
    const { updatedRoutine, isNowCompleted } = toggleRoutineCompletion(routine, now);
    try {
      await cloudUpsertRoutine(updatedRoutine);
      await db.routines.put(updatedRoutine);
      if (isNowCompleted) {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      }
    } catch (err: any) {
      console.error('Gagal memperbarui rutinitas:', err);
      alert(`Gagal menyimpan rutinitas: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  // Quick Add Task inline handler
  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const nowIso = new Date().toISOString();
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: quickTaskTitle.trim(),
      category: quickTaskCategory,
      status: 'todo',
      priority: quickTaskPriority,
      dueDate: todayStr,
      isCompleted: false,
      tags: ['Prioritas'],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    try {
      await cloudUpsertTask(newTask);
      await db.tasks.put(newTask);
      setQuickTaskTitle('');
    } catch (err: any) {
      console.error('Gagal menambahkan tugas:', err);
      alert(`Gagal menyimpan tugas baru: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  // Catatan penting / tersemat
  const pinnedNotes = notes.filter(n => n.isPinned).slice(0, 3);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Welcome & Command Header */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-[#16181e] border border-zinc-800 shadow-sm">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left Greeting & Context Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-400">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 font-medium">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                {formattedToday}
              </span>
              <span>·</span>
              <span className="text-zinc-400">WIB (Asia/Jakarta)</span>
              <span>·</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-950/70 border border-blue-800/40 text-blue-400 font-semibold text-[11px]">
                {settings?.businessName || 'Personal Project'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span>{greeting}, {settings?.userName || 'Yunus'}</span>
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Pusat kendali eksekutif untuk memonitor inisiatif proyek, eksekusi tugas, kalender bisnis, dan kedisiplinan rutinitas secara terpadu.
            </p>
          </div>

          {/* Right Action & Productivity Meter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Productivity Widget */}
            <div className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90 shadow-inner">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base tabular-nums shadow-xs">
                  {productivityScore}%
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-100">Produktivitas</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${scoreStatus.color}`}>
                    {scoreStatus.label}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {completedTasks.length} tugas & {completedRoutinesToday} rutinitas selesai
                </p>
              </div>
            </div>

            {/* Quick Create Buttons */}
            <div className="flex sm:flex-col gap-2 shrink-0">
              <button
                onClick={() => onOpenProjectModal()}
                className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Proyek Baru</span>
              </button>
              <button
                onClick={() => onOpenTaskModal()}
                className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition border border-zinc-700/80 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tugas Baru</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Metrics Strip ("Card Card di Atas") — Sinkron dengan Seluruh Menu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Proyek Berjalan */}
        <button
          onClick={() => onNavigate('projects')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-blue-500/50 hover:bg-zinc-900 transition-all duration-200 text-left group cursor-pointer relative overflow-hidden shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Proyek Berjalan</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderKanban className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white tracking-tight">
              {activeProjects.length}
            </span>
            <span className="text-xs font-medium text-zinc-500">Inisiatif Aktif</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{projects.length} Total Proyek</span>
            <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Buka Proyek <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Card 2: Daftar Tugas */}
        <button
          onClick={() => onNavigate('tasks')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all duration-200 text-left group cursor-pointer relative overflow-hidden shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Tugas Menunggu</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white tracking-tight">
              {pendingTasks.length}
            </span>
            <span className="text-xs font-medium text-zinc-500">Aksi Operasional</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{completedTasks.length} Selesai</span>
            <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Daftar Tugas <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Card 3: Kalender Bisnis */}
        <button
          onClick={() => onNavigate('calendar')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-purple-500/50 hover:bg-zinc-900 transition-all duration-200 text-left group cursor-pointer relative overflow-hidden shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Agenda Hari Ini</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarIcon className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white tracking-tight">
              {totalAgendaItemsCount}
            </span>
            <span className="text-xs font-medium text-zinc-500">Sesi Terjadwal</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{todaysCalendarEvents.length} Acara · {todaysTasksInAgenda.length} Tugas</span>
            <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Kalender <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Card 4: Rutinitas Bisnis */}
        <button
          onClick={() => onNavigate('routines')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-teal-500/50 hover:bg-zinc-900 transition-all duration-200 text-left group cursor-pointer relative overflow-hidden shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Rutinitas Bisnis</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Repeat className="w-4 h-4 text-teal-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white tracking-tight">
              {completedRoutinesToday}/{routinesDueToday.length}
            </span>
            <span className="text-xs font-medium text-zinc-500">Selesai Hari Ini</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{maxRoutineStreak} Hari Streak Tertinggi</span>
            <span className="text-teal-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Rutinitas <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>
      </div>

      {/* 3. INFORMASI RUTINITAS EKSEKUTIF (DISIMPAN DI BAWAH CARD CARD DI ATAS) */}
      {/* Menampilkan point-point penting untuk dibaca Harian, Mingguan, dan Bulanan */}
      <section className="p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
        {/* Section Header with Tabs & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Briefing &amp; Point-Point Penting Rutinitas
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300">
                  {completedRoutinesToday}/{routinesDueToday.length} Terlaksana
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Panduan poin penting operasional untuk dibaca dan ditaati secara <span className="text-teal-400 font-semibold">Harian</span>, <span className="text-blue-400 font-semibold">Mingguan</span>, dan <span className="text-purple-400 font-semibold">Bulanan</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Cadence Tabs */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setRoutineTab('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  routineTab === 'all'
                    ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Semua ({routines.length})
              </button>
              <button
                onClick={() => setRoutineTab('daily')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  routineTab === 'daily'
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-teal-400 hover:text-teal-300'
                }`}
              >
                ☀️ Harian ({harianRoutines.length})
              </button>
              <button
                onClick={() => setRoutineTab('weekly')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  routineTab === 'weekly'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                🗓️ Mingguan ({mingguanRoutines.length})
              </button>
              <button
                onClick={() => setRoutineTab('monthly')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  routineTab === 'monthly'
                    ? 'bg-purple-600 text-white font-semibold shadow-xs'
                    : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                📆 Bulanan ({bulananRoutines.length})
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              {onOpenRoutineModal && (
                <button
                  onClick={() => onOpenRoutineModal()}
                  className="px-2.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                  title="Tambah rutinitas bisnis baru"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Rutinitas</span>
                </button>
              )}
              <button
                onClick={() => onNavigate('routines')}
                className="text-xs text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                title="Buka halaman manajemen rutinitas lengkap"
              >
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content: Cadence-Grouped Rutinitas Grid */}
        {routines.length === 0 ? (
          <div className="py-10 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto text-zinc-500">
              <Repeat className="w-6 h-6" />
            </div>
            <div className="max-w-sm mx-auto">
              <p className="text-xs font-semibold text-zinc-200">Belum ada rutinitas bisnis</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Atur checklist harian (ritual pagi/review malam), checkpoint mingguan, atau tenggat kepatuhan bulanan (pajak, payroll).
              </p>
            </div>
            {onOpenRoutineModal && (
              <button
                onClick={() => onOpenRoutineModal()}
                className="mt-2 px-4 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Rutinitas Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 3-Column Responsive Cadence Layout: Harian, Mingguan, Bulanan */}
            <div className={`grid grid-cols-1 ${routineTab === 'all' ? 'lg:grid-cols-3' : 'grid-cols-1'} gap-4`}>
              
              {/* Kolom 1: Rutinitas Harian */}
              {(routineTab === 'all' || routineTab === 'daily') && (
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    {/* Header Kolom Harian */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center text-xs">
                          ☀️
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-white tracking-tight uppercase">
                            Point Harian (Daily)
                          </h3>
                          <span className="text-[10px] text-zinc-500">Fokus Pagi, Siang &amp; Refleksi Malam</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300">
                        {harianRoutines.filter(r => getRoutineStatus(r, now).isCompleted).length}/{harianRoutines.length} Selesai
                      </span>
                    </div>

                    {/* List Items Harian */}
                    <div className="mt-3 space-y-3">
                      {harianRoutines.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic py-4 text-center">Belum ada rutinitas harian.</p>
                      ) : (
                        harianRoutines.map((routine) => {
                          const status = getRoutineStatus(routine, now);
                          const isDone = status.isCompleted;

                          const TimeIcon = routine.timeOfDay === 'morning' 
                            ? Sun 
                            : routine.timeOfDay === 'afternoon' 
                            ? Sunset 
                            : Moon;

                          const timeColor = routine.timeOfDay === 'morning'
                            ? 'text-amber-400 bg-amber-950/50 border-amber-800/50'
                            : routine.timeOfDay === 'afternoon'
                            ? 'text-blue-400 bg-blue-950/50 border-blue-800/50'
                            : 'text-indigo-400 bg-indigo-950/50 border-indigo-800/50';

                          return (
                            <div 
                              key={routine.id}
                              className={`p-3 rounded-xl border transition-all text-left space-y-2 group ${
                                isDone 
                                  ? 'bg-zinc-900/40 border-zinc-800/60 opacity-75' 
                                  : 'bg-zinc-900/90 border-zinc-800 hover:border-teal-500/40 shadow-xs'
                              }`}
                            >
                              {/* Top Bar: Waktu + Kategori + Checkbox */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${timeColor}`}>
                                    <TimeIcon className="w-2.5 h-2.5" />
                                    <span className="capitalize">{routine.timeOfDay === 'morning' ? 'Pagi' : routine.timeOfDay === 'afternoon' ? 'Siang' : 'Malam'}</span>
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-medium px-1.5 py-0.2 rounded bg-zinc-800">
                                    {routine.category}
                                  </span>
                                  <span className="text-[10px] text-teal-400/90 font-mono">
                                    {routine.frequency === 'workdays' ? 'Sen-Jum' : 'Tiap Hari'}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleToggleRoutine(routine)}
                                  className="text-zinc-500 hover:text-teal-400 transition cursor-pointer shrink-0 mt-0.5"
                                  title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              {/* Title */}
                              <h4 className={`text-xs font-semibold ${isDone ? 'line-through text-zinc-400' : 'text-zinc-100'}`}>
                                {routine.title}
                              </h4>

                              {/* Point Penting untuk dibaca (Callout box) */}
                              <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed font-normal">
                                <span className="text-[9px] uppercase font-bold text-teal-400 tracking-wider block mb-0.5">
                                  📌 Poin Penting:
                                </span>
                                {routine.description || 'Disiplin eksekusi tanpa distraksi notifikasi.'}
                              </div>

                              {/* Bottom Status & Streak */}
                              <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400">
                                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                  <Flame className="w-3 h-3 text-amber-400" />
                                  <span>{routine.streak} streak</span>
                                </span>
                                {onOpenRoutineModal && (
                                  <button
                                    onClick={() => onOpenRoutineModal(routine)}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition text-[10px] flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Ubah</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Kolom 2: Rutinitas Mingguan */}
              {(routineTab === 'all' || routineTab === 'weekly') && (
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    {/* Header Kolom Mingguan */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
                          🗓️
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-white tracking-tight uppercase">
                            Point Mingguan (Weekly)
                          </h3>
                          <span className="text-[10px] text-zinc-500">Review Kinerja &amp; Sprint Checkpoints</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300">
                        {mingguanRoutines.filter(r => getRoutineStatus(r, now).isCompleted).length}/{mingguanRoutines.length} Selesai
                      </span>
                    </div>

                    {/* List Items Mingguan */}
                    <div className="mt-3 space-y-3">
                      {mingguanRoutines.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic py-4 text-center">Belum ada rutinitas mingguan.</p>
                      ) : (
                        mingguanRoutines.map((routine) => {
                          const status = getRoutineStatus(routine, now);
                          const isDone = status.isCompleted;
                          const isCustomDays = routine.frequency === 'custom_days';
                          const scheduleText = isCustomDays 
                            ? `Tiap ${formatCustomDaysLabel(routine.customDays)}` 
                            : 'Sekali seminggu';

                          return (
                            <div 
                              key={routine.id}
                              className={`p-3 rounded-xl border transition-all text-left space-y-2 group ${
                                isDone 
                                  ? 'bg-zinc-900/40 border-zinc-800/60 opacity-75' 
                                  : 'bg-zinc-900/90 border-zinc-800 hover:border-blue-500/40 shadow-xs'
                              }`}
                            >
                              {/* Top Bar: Jadwal + Kategori + Checkbox */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-950/60 border border-blue-800/60 text-blue-300">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>{scheduleText}</span>
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-medium px-1.5 py-0.2 rounded bg-zinc-800">
                                    {routine.category}
                                  </span>
                                  {status.isDueToday && !isDone && (
                                    <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.2 rounded animate-pulse">
                                      ⚡ Jadwal Hari Ini
                                    </span>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleToggleRoutine(routine)}
                                  className="text-zinc-500 hover:text-blue-400 transition cursor-pointer shrink-0 mt-0.5"
                                  title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              {/* Title */}
                              <h4 className={`text-xs font-semibold ${isDone ? 'line-through text-zinc-400' : 'text-zinc-100'}`}>
                                {routine.title}
                              </h4>

                              {/* Point Penting untuk dibaca (Callout box) */}
                              <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed font-normal">
                                <span className="text-[9px] uppercase font-bold text-blue-400 tracking-wider block mb-0.5">
                                  📌 Poin Penting Evaluasi:
                                </span>
                                {routine.description || 'Lakukan review capaian mingguan dan penyesuaian backlog.'}
                              </div>

                              {/* Bottom Status & Streak */}
                              <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400">
                                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                  <Flame className="w-3 h-3 text-amber-400" />
                                  <span>{routine.streak} siklus</span>
                                </span>
                                {onOpenRoutineModal && (
                                  <button
                                    onClick={() => onOpenRoutineModal(routine)}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition text-[10px] flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Ubah</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Kolom 3: Rutinitas Bulanan */}
              {(routineTab === 'all' || routineTab === 'monthly') && (
                <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    {/* Header Kolom Bulanan */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xs">
                          📆
                        </span>
                        <div>
                          <h3 className="text-xs font-bold text-white tracking-tight uppercase">
                            Point Bulanan (Monthly)
                          </h3>
                          <span className="text-[10px] text-zinc-500">Kepatuhan, Pajak, Payroll &amp; Audit</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-800/60 text-purple-300">
                        {bulananRoutines.filter(r => getRoutineStatus(r, now).isCompleted).length}/{bulananRoutines.length} Selesai
                      </span>
                    </div>

                    {/* List Items Bulanan */}
                    <div className="mt-3 space-y-3">
                      {bulananRoutines.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic py-4 text-center">Belum ada rutinitas bulanan.</p>
                      ) : (
                        bulananRoutines.map((routine) => {
                          const status = getRoutineStatus(routine, now);
                          const isDone = status.isCompleted;
                          const start = routine.startDay ?? 1;
                          const end = routine.endDay ?? start;
                          const isInsideWindow = status.isInsideWindow;

                          return (
                            <div 
                              key={routine.id}
                              className={`p-3 rounded-xl border transition-all text-left space-y-2 group ${
                                isDone 
                                  ? 'bg-zinc-900/40 border-zinc-800/60 opacity-75' 
                                  : isInsideWindow
                                  ? 'bg-purple-950/20 border-purple-600/50 shadow-sm ring-1 ring-purple-500/30'
                                  : 'bg-zinc-900/90 border-zinc-800 hover:border-purple-500/40 shadow-xs'
                              }`}
                            >
                              {/* Top Bar: Rentang Tanggal + Kategori + Checkbox */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                                    isInsideWindow && !isDone
                                      ? 'bg-purple-900/80 text-purple-200 border-purple-600 animate-pulse'
                                      : 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                                  }`}>
                                    <CalendarIcon className="w-2.5 h-2.5" />
                                    <span>Tgl {start} - {end} Bulanan</span>
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-medium px-1.5 py-0.2 rounded bg-zinc-800">
                                    {routine.category}
                                  </span>
                                  {isInsideWindow && !isDone && (
                                    <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-1.5 py-0.2 rounded">
                                      ⚡ Window Aktif
                                    </span>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleToggleRoutine(routine)}
                                  className="text-zinc-500 hover:text-purple-400 transition cursor-pointer shrink-0 mt-0.5"
                                  title={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              {/* Title */}
                              <h4 className={`text-xs font-semibold ${isDone ? 'line-through text-zinc-400' : 'text-zinc-100'}`}>
                                {routine.title}
                              </h4>

                              {/* Point Penting untuk dibaca (Callout box) */}
                              <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed font-normal">
                                <span className="text-[9px] uppercase font-bold text-purple-400 tracking-wider block mb-0.5">
                                  📌 Poin Kepatuhan &amp; Prosedur:
                                </span>
                                {routine.description || 'Pastikan dokumen, bukti transaksi, dan validasi pajak/payroll tersimpan rapi.'}
                              </div>

                              {/* Bottom Status & Streak */}
                              <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400">
                                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                                  <Flame className="w-3 h-3 text-amber-400" />
                                  <span>{routine.streak} bulan beruntun</span>
                                </span>
                                {onOpenRoutineModal && (
                                  <button
                                    onClick={() => onOpenRoutineModal(routine)}
                                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 transition text-[10px] flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Ubah</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </section>

      {/* 4. Dual-Column Workspace: Left (Daftar Tugas Prioritas) vs Right (Kalender Bisnis Hari Ini) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Prioritas & Eksekusi Hari Ini (Daftar Tugas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/90">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    Prioritas &amp; Eksekusi Hari Ini
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Daftar tugas berkepentingan tinggi atau bertenggat hari ini (Sinkron dengan Kalender Bisnis)
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer transition"
              >
                <span>Lihat Semua ({pendingTasks.length})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Task Add Bar */}
            <form 
              onSubmit={handleQuickAddTask}
              className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 focus-within:border-blue-500 transition shadow-inner"
            >
              <div className="pl-2.5 text-zinc-500">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Tambahkan tugas cepat hari ini (tekan Enter untuk simpan)..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="flex-1 text-xs bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500 px-1"
              />
              <select
                value={quickTaskCategory}
                onChange={(e) => setQuickTaskCategory(e.target.value as any)}
                className="text-[11px] bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-lg px-2 py-1 outline-none"
              >
                <option value="Tugas">Tugas</option>
                <option value="Meeting">Meeting</option>
                <option value="Evaluasi">Evaluasi</option>
              </select>
              <select
                value={quickTaskPriority}
                onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                className="text-[11px] bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-lg px-2 py-1 outline-none"
              >
                <option value="urgent">Mendesak</option>
                <option value="high">Tinggi</option>
                <option value="medium">Sedang</option>
                <option value="low">Rendah</option>
              </select>
              <button
                type="submit"
                disabled={!quickTaskTitle.trim()}
                className="px-3.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition shrink-0 shadow-xs cursor-pointer"
              >
                Tambah
              </button>
            </form>

            {/* Task Items List */}
            {todaysTasks.length === 0 ? (
              <div className="py-10 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800/80 p-6 space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-zinc-200">
                  {tasks.length === 0 
                    ? 'Belum ada tugas operasional' 
                    : 'Semua tugas prioritas hari ini telah tuntas!'}
                </p>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                  {tasks.length === 0 
                    ? 'Gunakan bar input di atas untuk membuat tugas cepat pertama Anda.' 
                    : 'Pertahankan momentum produktif Anda atau buka menu Daftar Tugas.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/70">
                {todaysTasks.map((task) => {
                  const proj = projects.find(p => p.id === task.projectId);
                  return (
                    <div 
                      key={task.id}
                      className="py-3 flex items-start justify-between gap-3 group hover:bg-zinc-950/40 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleTask(task)}
                          className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition shrink-0 cursor-pointer"
                          aria-label={task.isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                        >
                          {task.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium text-zinc-100 ${task.isCompleted ? 'line-through text-zinc-500' : ''}`}>
                            {task.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                            {task.category && task.category !== 'Tugas' && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                                task.category === 'Meeting'
                                  ? 'bg-purple-950/60 border-purple-800 text-purple-300'
                                  : 'bg-amber-950/60 border-amber-800 text-amber-300'
                              }`}>
                                {task.category}
                              </span>
                            )}
                            {proj && (
                              <>
                                <span className="font-medium text-zinc-300 truncate max-w-[140px] px-1.5 py-0.2 rounded bg-zinc-800 text-[10px]">
                                  {proj.title}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span className={`font-semibold ${PRIORITY_LABELS[task.priority]?.textClass}`}>
                              {PRIORITY_LABELS[task.priority]?.label}
                            </span>
                            {task.dueDate && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{formatDateIndo(task.dueDate)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenTaskModal(task)}
                        className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer"
                      >
                        Ubah
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Agenda Kalender Bisnis Hari Ini (Tersinkronisasi Penuh) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/90">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Kalender Bisnis Hari Ini
                  </h2>
                  <p className="text-[10px] text-zinc-400">Jadwal &amp; sesi fokus terintegrasi</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                Kalender →
              </button>
            </div>

            {totalAgendaItemsCount === 0 ? (
              <div className="py-6 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800/80 p-4 space-y-2">
                <p className="text-xs text-zinc-400">Tidak ada agenda atau tugas berjadwal hari ini.</p>
                <button
                  onClick={() => onOpenEventModal(undefined, todayStr)}
                  className="px-3 py-1 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition border border-zinc-700/80 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Jadwalkan Blok Waktu</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {/* 1. Calendar Events */}
                {todaysCalendarEvents.map((evt) => {
                  const startTime = formatTimeOnly(evt.startTime);
                  const endTime = formatTimeOnly(evt.endTime);
                  const cat = CALENDAR_CATEGORY_LABELS[evt.category];

                  return (
                    <div 
                      key={evt.id}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition text-left space-y-1 group"
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-mono tabular-nums font-semibold text-zinc-200">
                          {startTime} – {endTime}
                        </span>
                        <span 
                          className="font-medium text-[10px] px-2 py-0.2 rounded-full border"
                          style={{ 
                            color: cat?.color || '#3b82f6',
                            borderColor: `${cat?.color || '#3b82f6'}30`,
                            backgroundColor: `${cat?.color || '#3b82f6'}15`
                          }}
                        >
                          {cat?.label || 'Agenda'}
                        </span>
                      </div>
                      
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <button
                            onClick={() => handleToggleCalendarEvent(evt)}
                            className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition shrink-0 cursor-pointer"
                            title={evt.isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                          >
                            {evt.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                          <p className={`text-xs font-semibold ${evt.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                            {evt.title}
                          </p>
                        </div>

                        <button
                          onClick={() => onOpenEventModal(evt)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 text-[10px] transition cursor-pointer"
                        >
                          Ubah
                        </button>
                      </div>

                      {evt.locationOrLink && (
                        <p className="text-[11px] text-purple-300 truncate pl-6">
                          📍 {evt.locationOrLink}
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* 2. Tasks Scheduled for Today */}
                {todaysTasksInAgenda.map((task) => {
                  const startTime = task.scheduledStartTime || 'Hari ini';
                  const endTime = task.scheduledEndTime ? ` – ${task.scheduledEndTime}` : '';
                  const proj = projects.find(p => p.id === task.projectId);

                  return (
                    <div 
                      key={`task-agenda-${task.id}`}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-blue-900/40 hover:border-blue-700/60 transition text-left space-y-1 group"
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-mono tabular-nums font-semibold text-zinc-200">
                          {startTime}{endTime}
                        </span>
                        <span className="font-medium text-[10px] px-2 py-0.2 rounded-full border border-blue-800 text-blue-300 bg-blue-950/60">
                          {task.category || 'Tugas Kalender'}
                        </span>
                      </div>
                      
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <button
                            onClick={() => handleToggleTask(task)}
                            className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition shrink-0 cursor-pointer"
                            title={task.isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                          >
                            {task.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <p className={`text-xs font-semibold ${task.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                              {task.title}
                            </p>
                            {proj && (
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                Proyek: {proj.title}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => onOpenTaskModal(task)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-300 text-[10px] transition cursor-pointer"
                        >
                          Ubah
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Widget Catatan & SOP Strategis Ringkas */}
          {pinnedNotes.length > 0 && (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Pin className="w-3.5 h-3.5 text-amber-400" />
                  <span>Catatan &amp; SOP Tersemat</span>
                </div>
                <button
                  onClick={() => onNavigate('notes')}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  Semua ({notes.length}) →
                </button>
              </div>

              <div className="space-y-1.5">
                {pinnedNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => onNavigate('notes', note.id)}
                    className="p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-800/80 transition cursor-pointer flex items-center justify-between gap-2"
                  >
                    <p className="text-xs text-zinc-200 font-medium truncate">
                      {note.title}
                    </p>
                    <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Diagram & Tabel Progres Proyek (Diagram Tabel Project) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-800/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Diagram &amp; Tabel Progres Proyek
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  {projects.length} Total Proyek
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Pantau rincian proyek, diagram progres milestone, status pengerjaan, dan tenggat waktu secara real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Status Pills */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setProjectStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  projectStatusFilter === 'all'
                    ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Semua ({projects.length})
              </button>
              <button
                onClick={() => setProjectStatusFilter('in_progress')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  projectStatusFilter === 'in_progress'
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-blue-400 hover:text-blue-300'
                }`}
              >
                Sedang Berjalan ({activeProjects.length})
              </button>
              <button
                onClick={() => setProjectStatusFilter('completed')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  projectStatusFilter === 'completed'
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Selesai ({projects.filter(p => p.status === 'completed').length})
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari proyek..."
                value={projectSearchQuery}
                onChange={(e) => setProjectSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-blue-500 transition w-32 sm:w-40"
              />
            </div>

            {/* Navigation & Action */}
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer transition px-2 py-1 rounded hover:bg-zinc-800"
            >
              <span>Kelola Semua ({projects.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onOpenProjectModal()}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Proyek</span>
            </button>
          </div>
        </div>

        {/* Diagram Table Content */}
        {filteredDashboardProjects.length === 0 ? (
          <div className="py-10 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/60 flex items-center justify-center mx-auto text-zinc-500">
              <FolderKanban className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-200">
              {projects.length === 0 ? 'Belum ada inisiatif proyek' : 'Tidak ada proyek yang sesuai filter'}
            </p>
            {projects.length === 0 && (
              <button
                onClick={() => onOpenProjectModal()}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Proyek Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-950/70 border border-zinc-800/90 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <th className="py-3 px-4 min-w-[220px]">Nama Proyek</th>
                    <th className="py-3 px-3 min-w-[130px]">Kategori Bisnis</th>
                    <th className="py-3 px-4 min-w-[220px]">Diagram Progres Eksekusi</th>
                    <th className="py-3 px-3 min-w-[140px]">Status</th>
                    <th className="py-3 px-3 min-w-[100px]">Prioritas</th>
                    <th className="py-3 px-3 min-w-[120px]">Tenggat Waktu</th>
                    <th className="py-3 px-4 text-right min-w-[130px]">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 text-xs">
                  {filteredDashboardProjects.map((proj) => {
                    const projTasks = tasks.filter(t => t.projectId === proj.id);
                    const doneCount = projTasks.filter(t => t.isCompleted).length;
                    const percent = projTasks.length > 0 ? Math.round((doneCount / projTasks.length) * 100) : 0;
                    const statusInfo = PROJECT_STATUS_LABELS[proj.status];
                    const priorityInfo = PRIORITY_LABELS[proj.priority];

                    return (
                      <tr 
                        key={proj.id}
                        className="hover:bg-zinc-900/50 transition group"
                      >
                        {/* 1. Nama Proyek & Deskripsi */}
                        <td className="py-3.5 px-4">
                          <div className="min-w-0 max-w-xs">
                            <button
                              onClick={() => onNavigate('projects', proj.id)}
                              className="font-semibold text-zinc-100 hover:text-blue-400 text-left transition truncate block cursor-pointer"
                              title="Klik untuk membuka detail proyek"
                            >
                              {proj.title}
                            </button>
                            {proj.description && (
                              <p className="text-[11px] text-zinc-400 truncate mt-0.5" title={proj.description}>
                                {proj.description}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* 2. Kategori Bisnis */}
                        <td className="py-3.5 px-3">
                          <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-400 bg-blue-950/70 border border-blue-900/50 px-2 py-0.5 rounded-md inline-block max-w-[130px] truncate">
                            {proj.category || 'Umum'}
                          </span>
                        </td>

                        {/* 3. Diagram Progres Eksekusi (Visual Diagram Progress Bar) */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5 max-w-[200px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-zinc-400 tabular-nums">
                                {doneCount} dari {projTasks.length} tugas selesai
                              </span>
                              <span className={`font-bold tabular-nums ${percent === 100 ? 'text-emerald-400' : 'text-zinc-200'}`}>
                                {percent}%
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-zinc-800/90 overflow-hidden shadow-inner">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percent === 100
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                    : percent >= 50
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-500'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-400'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 4. Status Proyek */}
                        <td className="py-3.5 px-3">
                          <span className={`text-[11px] font-medium shrink-0 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 border border-zinc-700/40 ${statusInfo?.bgClass} ${statusInfo?.textClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              proj.status === 'completed' 
                                ? 'bg-emerald-400' 
                                : proj.status === 'in_progress' 
                                ? 'bg-blue-400' 
                                : 'bg-zinc-400'
                            }`} />
                            <span>{statusInfo?.label || proj.status}</span>
                          </span>
                        </td>

                        {/* 5. Prioritas */}
                        <td className="py-3.5 px-3">
                          <span className={`text-[11px] font-semibold ${priorityInfo?.textClass}`}>
                            {priorityInfo?.label || proj.priority}
                          </span>
                        </td>

                        {/* 6. Tenggat Waktu */}
                        <td className="py-3.5 px-3 text-[11px] text-zinc-400">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span>{formatDateIndo(proj.dueDate)}</span>
                          </div>
                        </td>

                        {/* 7. Aksi Cepat */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenTaskModal(undefined, proj.id)}
                              className="px-2 py-1 text-[11px] font-semibold text-blue-400 hover:text-white hover:bg-blue-600/30 border border-blue-900/60 rounded-md transition flex items-center gap-1 cursor-pointer"
                              title="Tambah tugas ke proyek ini"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tugas</span>
                            </button>
                            <button
                              onClick={() => onNavigate('projects', proj.id)}
                              className="px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition flex items-center gap-0.5 cursor-pointer"
                              title="Buka rincian proyek"
                            >
                              <span>Buka</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
