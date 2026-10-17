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
  Layers
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { db } from '../../db';
import type { Task, Project, CalendarEvent, Routine, ActiveTab } from '../../types';
import { 
  formatDateIndo, 
  formatTimeOnly, 
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  CALENDAR_CATEGORY_LABELS
} from '../../utils/formatters';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab, itemId?: string) => void;
  onOpenTaskModal: (task?: Task, defaultProjectId?: string) => void;
  onOpenProjectModal: (proj?: Project) => void;
  onOpenEventModal: (event?: CalendarEvent) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenTaskModal,
  onOpenProjectModal,
  onOpenEventModal
}) => {
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('high');

  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const calendarEvents = useLiveQuery(() => db.calendarEvents.toArray()) ?? [];
  const routines = useLiveQuery(() => db.routines.toArray()) ?? [];

  // Live dynamic today's date in local time
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const formattedToday = format(now, 'EEEE, d MMMM yyyy', { locale: id });

  // Dynamic contextual greeting based on hour
  const currentHour = now.getHours();
  const greeting = currentHour < 11 
    ? 'Selamat pagi' 
    : currentHour < 15 
    ? 'Selamat siang' 
    : currentHour < 18 
    ? 'Selamat sore' 
    : 'Selamat malam';

  // Metrics calculation
  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'on_hold');
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  // Today's priority tasks: urgent or high priority, or scheduled/due today
  const todaysTasks = tasks
    .filter(t => !t.isCompleted && (t.dueDate === todayStr || t.scheduledDate === todayStr || t.priority === 'urgent' || t.priority === 'high'))
    .slice(0, 6);

  // Today's agenda events
  const todaysEvents = calendarEvents
    .filter(e => e.startTime.startsWith(todayStr))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Executive Productivity Score (0-100) based on task velocity & active routines
  const taskCompletionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
  const completedRoutinesToday = routines.filter(r => r.completedDates.includes(todayStr)).length;
  const routineCompletionRate = routines.length > 0 ? (completedRoutinesToday / routines.length) * 100 : 0;
  
  const productivityScore = (tasks.length === 0 && routines.length === 0)
    ? 0
    : Math.min(100, Math.round((taskCompletionRate * 0.5) + (routineCompletionRate * 0.5) + (tasks.length > 0 ? 30 : 0)));

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { label: 'Sangat Produktif', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (score >= 50) return { label: 'Progres Stabil', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    return { label: 'Mulai Hari Ini', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  };

  const scoreStatus = getScoreStatus(productivityScore);

  // Handle task quick checkbox toggle
  const handleToggleTask = async (task: Task) => {
    const nextCompleted = !task.isCompleted;
    const nowIso = new Date().toISOString();
    await db.tasks.update(task.id, {
      isCompleted: nextCompleted,
      status: nextCompleted ? 'done' : 'todo',
      completedAt: nextCompleted ? nowIso : undefined,
      updatedAt: nowIso
    });

    if (nextCompleted) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 }
      });
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
      status: 'todo',
      priority: quickTaskPriority,
      dueDate: todayStr,
      isCompleted: false,
      tags: ['Prioritas'],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await db.tasks.put(newTask);
    setQuickTaskTitle('');
  };

  // Toggle routine for today
  const handleToggleRoutine = async (routine: Routine) => {
    const isCompletedToday = routine.completedDates.includes(todayStr);
    let nextDates = [...routine.completedDates];
    let nextStreak = routine.streak;

    if (isCompletedToday) {
      nextDates = nextDates.filter(d => d !== todayStr);
      nextStreak = Math.max(0, nextStreak - 1);
    } else {
      nextDates.push(todayStr);
      nextStreak += 1;
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    }

    await db.routines.update(routine.id, {
      completedDates: nextDates,
      streak: nextStreak
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Executive Welcome & Command Header */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-[#16181e] border border-zinc-800 shadow-sm">
        {/* Ambient background glow accents */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

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
              Pusat kendali eksekutif untuk memonitor inisiatif proyek, eksekusi prioritas, dan produktivitas harian secara terpadu.
            </p>
          </div>

          {/* Right Action & Productivity Meter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Productivity Widget */}
            <div className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-zinc-950/90 border border-zinc-800/90 shadow-inner">
              <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Progress Circle Visual */}
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

      {/* 2. KPI Metrics Strip (4 Sleek Interactive Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Proyek Berjalan */}
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
              Lihat <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Tugas Menunggu */}
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
              Buka <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Agenda Hari Ini */}
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
              {todaysEvents.length}
            </span>
            <span className="text-xs font-medium text-zinc-500">Sesi Terjadwal</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{todaysEvents.filter(e => e.category === 'deep_work').length} Sesi Deep Work</span>
            <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Jadwal <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Rutinitas Harian */}
        <button
          onClick={() => onNavigate('routines')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-teal-500/50 hover:bg-zinc-900 transition-all duration-200 text-left group cursor-pointer relative overflow-hidden shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Rutinitas Harian</span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Repeat className="w-4 h-4 text-teal-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white tracking-tight">
              {completedRoutinesToday}/{routines.length}
            </span>
            <span className="text-xs font-medium text-zinc-500">Selesai Hari Ini</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{routines.reduce((acc, r) => Math.max(acc, r.streak), 0)} Hari Rekor Streak</span>
            <span className="text-teal-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Disiplin <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </button>
      </div>

      {/* 3. Inisiatif Proyek Unggulan (Executive Spotlight Grid) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/90">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <FolderKanban className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Inisiatif Proyek & Progres Eksekusi
              </h2>
              <p className="text-[11px] text-zinc-400">
                Pantau progres milestone, status pengerjaan, dan tenggat waktu proyek aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer transition"
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

        {projects.length === 0 ? (
          <div className="py-10 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto text-zinc-500">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div className="max-w-sm mx-auto">
              <p className="text-xs font-semibold text-zinc-200">Belum ada inisiatif proyek</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Buat proyek baru untuk mengorganisir tugas operasional, kategori bisnis, dan tenggat waktu.
              </p>
            </div>
            <button
              onClick={() => onOpenProjectModal()}
              className="mt-2 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Proyek Pertama</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((proj) => {
              const projTasks = tasks.filter(t => t.projectId === proj.id);
              const doneCount = projTasks.filter(t => t.isCompleted).length;
              const percent = projTasks.length > 0 ? Math.round((doneCount / projTasks.length) * 100) : 0;
              const statusInfo = PROJECT_STATUS_LABELS[proj.status];

              return (
                <div 
                  key={proj.id} 
                  className="flex flex-col justify-between p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/90 hover:border-zinc-700 transition-all duration-200 group shadow-xs"
                >
                  <div>
                    {/* Top Category & Status Header */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-400 bg-blue-950/70 border border-blue-900/50 px-2 py-0.5 rounded-md inline-block max-w-[170px] truncate">
                        {proj.category || 'Umum'}
                      </span>
                      <span className={`text-[11px] font-medium shrink-0 px-2 py-0.5 rounded-full ${statusInfo?.bgClass} ${statusInfo?.textClass}`}>
                        {statusInfo?.label || proj.status}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 
                      onClick={() => onNavigate('projects', proj.id)}
                      className="text-sm font-semibold text-zinc-100 mt-2.5 hover:text-blue-400 transition cursor-pointer line-clamp-1 group-hover:text-blue-300"
                    >
                      {proj.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 min-h-[32px] leading-relaxed">
                      {proj.description || 'Tidak ada deskripsi proyek.'}
                    </p>

                    {/* Progress Bar & Ratio */}
                    <div className="mt-3.5">
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1.5">
                        <span className="tabular-nums">
                          {doneCount} dari {projTasks.length} tugas selesai
                        </span>
                        <span className="font-bold tabular-nums text-zinc-200">{percent}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-800/90 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Deadline & Quick Actions */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{formatDateIndo(proj.dueDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenTaskModal(undefined, proj.id)}
                        className="text-blue-400 hover:text-blue-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tugas</span>
                      </button>
                      <button
                        onClick={() => onNavigate('projects', proj.id)}
                        className="text-zinc-400 hover:text-zinc-200 font-medium text-[11px] flex items-center cursor-pointer transition"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Dual-Column Workspace: Left (Tasks & Execution) vs Right (Agenda & Routines) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Priority Tasks Execution Center */}
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
                    Prioritas & Eksekusi Hari Ini
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    Daftar tugas berkepentingan tinggi atau bertenggat hari ini
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
                    : 'Pertahankan momentum produktif Anda atau tambahkan tugas berikutnya.'}
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

        {/* Right Column (5 cols): Time Schedule & Executive Routines */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Agenda & Time-Blocking */}
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/90">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Agenda Hari Ini
                  </h2>
                  <p className="text-[10px] text-zinc-400">Jadwal & blok waktu fokus</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                Kalender →
              </button>
            </div>

            {todaysEvents.length === 0 ? (
              <div className="py-6 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800/80 p-4 space-y-2">
                <p className="text-xs text-zinc-400">Tidak ada agenda terjadwal untuk hari ini.</p>
                <button
                  onClick={() => onOpenEventModal()}
                  className="px-3 py-1 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition border border-zinc-700/80 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Jadwalkan Blok Waktu</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todaysEvents.map((evt) => {
                  const startTime = formatTimeOnly(evt.startTime);
                  const endTime = formatTimeOnly(evt.endTime);
                  const cat = CALENDAR_CATEGORY_LABELS[evt.category];

                  return (
                    <div 
                      key={evt.id}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition text-left space-y-1"
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
                      <p className="text-xs font-semibold text-zinc-100">
                        {evt.title}
                      </p>
                      {evt.locationOrLink && (
                        <p className="text-[11px] text-zinc-400 truncate">
                          {evt.locationOrLink}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily Executive Routines & Habits */}
          <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/90">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <Repeat className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">
                    Rutinitas Eksekutif
                  </h2>
                  <p className="text-[10px] text-zinc-400">Konsistensi & disiplin harian</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('routines')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                Kelola →
              </button>
            </div>

            {routines.length === 0 ? (
              <div className="py-6 text-center rounded-xl bg-zinc-950/40 border border-dashed border-zinc-800/80 p-4 text-xs text-zinc-400">
                Belum ada rutinitas bisnis yang diatur.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/70">
                {routines.map((routine) => {
                  const isDone = routine.completedDates.includes(todayStr);

                  return (
                    <div 
                      key={routine.id}
                      className="py-2.5 flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleRoutine(routine)}
                          className="mt-0.5 text-zinc-500 hover:text-teal-400 transition shrink-0 cursor-pointer"
                          aria-label={isDone ? 'Batal selesai' : 'Tandai selesai'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium text-zinc-100 ${isDone ? 'line-through text-zinc-500' : ''}`}>
                            {routine.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                            <span className="text-[10px] text-zinc-400">{routine.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-0.5 text-amber-400 font-medium text-[10px]">
                              <Flame className="w-3 h-3 text-amber-400" />
                              <span className="tabular-nums">{routine.streak} hari streak</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
