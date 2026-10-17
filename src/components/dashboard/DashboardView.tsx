import React, { useState } from 'react';
import { 
  FolderKanban, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Circle, 
  ArrowUpRight, 
  Flame,
  Zap,
  Repeat
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db } from '../../db';
import type { Task, Project, CalendarEvent, Routine, ActiveTab } from '../../types';
import { 
  formatCurrency, 
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

  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const calendarEvents = useLiveQuery(() => db.calendarEvents.toArray()) ?? [];
  const routines = useLiveQuery(() => db.routines.toArray()) ?? [];

  const todayStr = '2026-10-16'; // Anchor date

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
      priority: 'high',
      dueDate: todayStr,
      isCompleted: false,
      tags: ['Cepat'],
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
    <div className="space-y-6">
      {/* Welcome Banner in Charcoal Slate */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <span>{formatDateIndo(todayStr)}</span>
            <span>·</span>
            <span>WIB (Asia/Jakarta)</span>
            <span>·</span>
            <span className="text-blue-400 font-semibold">{settings?.businessName || 'Personal Project'}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1">
            Selamat datang, {settings?.userName || 'Yunus'}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Pusat komando eksekutif: pantau sasaran strategis, kelola proyek berjalan, dan eksekusi prioritas hari ini.
          </p>
        </div>

        {/* Quick Productivity Score Meter */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm tabular-nums shadow-xs">
            {productivityScore}%
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-100">Skor Produktivitas</p>
            <p className="text-[11px] text-zinc-400">Kombinasi tugas & rutinitas harian</p>
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip (Dark Charcoal Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          onClick={() => onNavigate('projects')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-left hover:border-zinc-700 transition group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Proyek Berjalan</span>
            <FolderKanban className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">
              {activeProjects.length}
            </span>
            <span className="text-xs text-zinc-500">Inisiatif</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400 truncate">
            {projects.length} Total Proyek Bisnis
          </p>
        </button>

        <button
          onClick={() => onNavigate('tasks')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-left hover:border-zinc-700 transition group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Tugas Menunggu</span>
            <CheckSquare className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">
              {pendingTasks.length}
            </span>
            <span className="text-xs text-zinc-500">Aksi</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400 truncate">
            {completedTasks.length} Tugas Selesai
          </p>
        </button>

        <button
          onClick={() => onNavigate('calendar')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-left hover:border-zinc-700 transition group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Agenda Hari Ini</span>
            <CalendarIcon className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">
              {todaysEvents.length}
            </span>
            <span className="text-xs text-zinc-500">Sesi</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400 truncate">
            {todaysEvents.filter(e => e.category === 'deep_work').length} Sesi Deep Work
          </p>
        </button>

        <button
          onClick={() => onNavigate('routines')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-left hover:border-zinc-700 transition group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Rutinitas Harian</span>
            <Repeat className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">
              {routines.length}
            </span>
            <span className="text-xs text-zinc-500">Kebiasaan</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-400 truncate">
            {completedRoutinesToday} Selesai Hari Ini
          </p>
        </button>
      </div>

      {/* Main Grid: Priority Tasks & Today's Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Priority Tasks Execution Center */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Task Add Bar */}
          <form 
            onSubmit={handleQuickAddTask}
            className="flex items-center gap-2 p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-zinc-500 ml-2 shrink-0" />
            <input
              type="text"
              placeholder="Tambahkan tugas cepat hari ini (tekan Enter untuk menyimpan)..."
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              className="w-full text-xs bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={!quickTaskTitle.trim()}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg transition shrink-0 shadow-xs"
            >
              Tambah
            </button>
          </form>

          {/* Today's Priority Tasks List */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Prioritas Utama Hari Ini
                </h2>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <span>Lihat Semua Tugas ({pendingTasks.length})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todaysTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                {tasks.length === 0 
                  ? 'Belum ada tugas operasional. Tambahkan tugas cepat di atas untuk memulai.' 
                  : 'Luar biasa! Semua tugas prioritas hari ini telah diselesaikan.'}
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60 mt-1">
                {todaysTasks.map((task) => {
                  const proj = projects.find(p => p.id === task.projectId);
                  return (
                    <div 
                      key={task.id}
                      className="py-3 flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleTask(task)}
                          className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition shrink-0"
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
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                            {proj && (
                              <>
                                <span className="font-medium text-zinc-300 truncate max-w-[160px]">
                                  {proj.title}
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span className={PRIORITY_LABELS[task.priority]?.textClass}>
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
                        className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition"
                      >
                        Ubah
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inisiatif Proyek & Progres Eksekusi Breakdown */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Inisiatif Proyek & Progres Eksekusi
                </h2>
              </div>
              <button
                onClick={() => onNavigate('projects')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Kelola Proyek ({projects.length})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Belum ada proyek bisnis. Klik <strong className="text-white">Kelola Proyek</strong> untuk membuat inisiatif pertama.
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {projects.slice(0, 4).map((proj) => {
                  const projTasks = tasks.filter(t => t.projectId === proj.id);
                  const doneCount = projTasks.filter(t => t.isCompleted).length;
                  const percent = projTasks.length > 0 ? Math.round((doneCount / projTasks.length) * 100) : 0;
                  const statusInfo = PROJECT_STATUS_LABELS[proj.status];

                  return (
                    <div 
                      key={proj.id} 
                      className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-400 bg-blue-950/60 border border-blue-900/40 px-2 py-0.5 rounded-md inline-block">
                            {proj.category}
                          </span>
                          <h3 
                            onClick={() => onNavigate('projects', proj.id)}
                            className="text-xs font-semibold text-zinc-100 mt-1 truncate hover:text-blue-400 transition cursor-pointer"
                          >
                            {proj.title}
                          </h3>
                        </div>
                        <span className={`text-[11px] font-medium shrink-0 ${statusInfo?.textClass}`}>
                          {statusInfo?.label}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                          <span className="tabular-nums">
                            {doneCount} dari {projTasks.length} tugas selesai
                          </span>
                          <span className="font-semibold tabular-nums text-zinc-200">{percent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Timeline & Quick Action */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/70 flex items-center justify-between text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>Tenggat: {formatDateIndo(proj.dueDate)}</span>
                        </div>
                        <button
                          onClick={() => onOpenTaskModal(undefined, proj.id)}
                          className="text-blue-400 hover:text-blue-300 font-medium text-[10px] flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tambah Tugas</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Today's Schedule & Executive Routines */}
        <div className="space-y-6">
          {/* Today's Business Calendar Agenda */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-purple-400" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Agenda Hari Ini
                </h2>
              </div>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Buka Kalender
              </button>
            </div>

            {todaysEvents.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                Tidak ada agenda terjadwal untuk hari ini.
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {todaysEvents.map((evt) => {
                  const startTime = formatTimeOnly(evt.startTime);
                  const endTime = formatTimeOnly(evt.endTime);
                  const cat = CALENDAR_CATEGORY_LABELS[evt.category];

                  return (
                    <div 
                      key={evt.id}
                      className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition text-left"
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                        <span className="font-mono tabular-nums font-semibold text-zinc-200">
                          {startTime} – {endTime}
                        </span>
                        <span 
                          className="font-medium text-[10px]"
                          style={{ color: cat?.color || '#3b82f6' }}
                        >
                          {cat?.label || 'Agenda'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-100">
                        {evt.title}
                      </p>
                      {evt.locationOrLink && (
                        <p className="text-[11px] text-zinc-400 mt-1 truncate">
                          {evt.locationOrLink}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => onOpenEventModal()}
              className="mt-4 w-full py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition border border-zinc-700/60"
            >
              + Jadwalkan Blok Waktu Baru
            </button>
          </div>

          {/* Daily Executive Routines & Habits */}
          <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-teal-400" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Rutinitas Eksekutif
                </h2>
              </div>
              <button
                onClick={() => onNavigate('routines')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                Kelola
              </button>
            </div>

            <div className="divide-y divide-zinc-800/60 mt-1">
              {routines.map((routine) => {
                const isDone = routine.completedDates.includes(todayStr);

                return (
                  <div 
                    key={routine.id}
                    className="py-3 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleRoutine(routine)}
                        className="mt-0.5 text-zinc-500 hover:text-teal-400 transition shrink-0"
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
                          <span>{routine.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                            <Flame className="w-3 h-3" />
                            <span className="tabular-nums">{routine.streak} hari streak</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
