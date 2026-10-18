import React from 'react';
import { 
  BarChart3, 
  CheckSquare, 
  FolderKanban, 
  Tag, 
  Zap,
  Repeat,
  FileText,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  Clock,
  Flame,
  PieChart
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { subDays, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { db } from '../../db';
import type { ActiveTab } from '../../types';
import { DEFAULT_GOAL_CATEGORIES } from '../../types';

interface AnalyticsViewProps {
  onNavigate?: (tab: ActiveTab, itemId?: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigate }) => {
  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const calendarEvents = useLiveQuery(() => db.calendarEvents.toArray()) ?? [];
  const routines = useLiveQuery(() => db.routines.toArray()) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray()) ?? [];

  const availableCategories = (settings?.goalCategories && settings.goalCategories.length > 0)
    ? settings.goalCategories
    : DEFAULT_GOAL_CATEGORIES;

  // 1. Task Metrics (Menu: Daftar Tugas)
  const completedTasks = tasks.filter(t => t.isCompleted);
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  
  const urgentTasks = tasks.filter(t => t.priority === 'urgent');
  const highTasks = tasks.filter(t => t.priority === 'high');
  const mediumTasks = tasks.filter(t => t.priority === 'medium');
  const lowTasks = tasks.filter(t => t.priority === 'low');

  // 2. Project Metrics (Menu: Proyek)
  const completedProjects = projects.filter(p => p.status === 'completed');
  const activeProjects = projects.filter(p => p.status === 'in_progress' || p.status === 'planning');
  const projectDeliveryRate = projects.length > 0 ? Math.round((completedProjects.length / projects.length) * 100) : 0;

  // 3. Dynamic 7-Day Velocity from Real Task Data (Menu: Daftar Tugas)
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const last7Days = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayLabel = format(d, 'EEE (d MMM)', { locale: id });
    
    // Count real tasks completed on this date
    const count = tasks.filter(t => {
      if (!t.isCompleted) return false;
      if (t.completedAt && t.completedAt.startsWith(dateStr)) return true;
      if (!t.completedAt && t.updatedAt && t.updatedAt.startsWith(dateStr)) return true;
      if (i === 0 && t.isCompleted && !t.completedAt) return true; // completed today fallback
      return false;
    }).length;

    last7Days.push({ day: dayLabel, dateStr, completed: count });
  }

  const maxCompleted = Math.max(...last7Days.map(d => d.completed), 1);
  const totalCompletedLast7Days = last7Days.reduce((acc, d) => acc + d.completed, 0);
  const avgVelocity = (totalCompletedLast7Days / 7).toFixed(1);

  // 4. Time Allocation from Real Calendar Events (Menu: Kalender Bisnis)
  const totalEvents = calendarEvents.length || 1;
  const deepWorkCount = calendarEvents.filter(e => e.category === 'deep_work').length;
  const clientCount = calendarEvents.filter(e => e.category === 'client').length;
  const meetingCount = calendarEvents.filter(e => e.category === 'meeting').length;
  const otherCount = Math.max(0, totalEvents - (deepWorkCount + clientCount + meetingCount));

  const deepWorkPct = Math.round((deepWorkCount / totalEvents) * 100);
  const clientPct = Math.round((clientCount / totalEvents) * 100);
  const meetingPct = Math.round((meetingCount / totalEvents) * 100);
  const otherPct = Math.max(0, 100 - (deepWorkPct + clientPct + meetingPct));

  // 5. Routine Discipline & Consistency Metrics (Menu: Rutinitas Bisnis)
  const completedRoutinesToday = routines.filter(r => r.completedDates?.includes(todayStr)).length;
  const routineCompletionRate = routines.length > 0 ? Math.round((completedRoutinesToday / routines.length) * 100) : 0;
  const maxStreak = routines.reduce((acc, r) => Math.max(acc, r.streak || 0), 0);

  // 6. Documentation & Knowledge Metrics (Menu: Catatan & Dokumen)
  const pinnedNotes = notes.filter(n => n.isPinned).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Connection Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Pusat Inteligensi Bisnis</span>
            <span>·</span>
            <span className="text-blue-400 font-semibold">{settings?.businessName || 'Personal Project'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            Analitik Performa & Eksekusi Terpadu
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Data analitik ini terhubung secara real-time dengan seluruh modul: Proyek, Daftar Tugas, Kalender Waktu, Rutinitas Harian, dan Kategori Bisnis di Pengaturan.
          </p>
        </div>

        {/* Modules Connected Status Badges */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <span className="px-2.5 py-1 rounded-md bg-zinc-950 text-[11px] font-medium text-zinc-300 border border-zinc-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            6 Menu Terhubung
          </span>
        </div>
      </div>

      {/* Top 4 KPI Connected Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Daftar Tugas */}
        <div 
          onClick={() => onNavigate?.('tasks')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all text-left group cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Rasio Tugas Selesai</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">{taskCompletionRate}%</span>
            <span className="text-[11px] text-zinc-500">({completedTasks.length}/{tasks.length})</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{pendingTasks.length} Belum Selesai</span>
            <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Daftar Tugas <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Proyek */}
        <div 
          onClick={() => onNavigate?.('projects')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-blue-500/50 hover:bg-zinc-900 transition-all text-left group cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Rasio Selesai Proyek</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">{projectDeliveryRate}%</span>
            <span className="text-[11px] text-zinc-500">({completedProjects.length}/{projects.length})</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{activeProjects.length} Proyek Aktif</span>
            <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Proyek <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Rutinitas Bisnis */}
        <div 
          onClick={() => onNavigate?.('routines')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-teal-500/50 hover:bg-zinc-900 transition-all text-left group cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Disiplin Rutinitas</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Repeat className="w-3.5 h-3.5 text-teal-400" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">{routineCompletionRate}%</span>
            <span className="text-[11px] text-zinc-500">({completedRoutinesToday}/{routines.length})</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Flame className="w-3 h-3" /> {maxStreak} Hari Streak
            </span>
            <span className="text-teal-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Rutinitas <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Kalender Bisnis */}
        <div 
          onClick={() => onNavigate?.('calendar')}
          className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-purple-500/50 hover:bg-zinc-900 transition-all text-left group cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Alokasi Deep Work</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tabular-nums text-white">{deepWorkPct}%</span>
            <span className="text-[11px] text-zinc-500">dari agenda</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{deepWorkCount} Sesi Mandiri</span>
            <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
              Kalender <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Connected Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Velocity Chart (Real Task Completions per Day) */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Kecepatan Eksekusi (Velocity 7 Hari)
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Dihitung otomatis dari tugas yang diselesaikan di menu <strong>Daftar Tugas</strong>
                </p>
              </div>
              <button
                onClick={() => onNavigate?.('tasks')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Tugas</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Custom Responsive SVG Bar Chart */}
            <div className="mt-6 h-48 w-full flex items-end justify-between gap-3 px-2">
              {last7Days.map((item, idx) => {
                const heightPct = Math.round((item.completed / maxCompleted) * 100);
                const isToday = idx === last7Days.length - 1;

                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-semibold tabular-nums text-zinc-300 opacity-80 group-hover:opacity-100">
                      {item.completed}
                    </span>
                    <div className="w-full max-w-[36px] bg-zinc-950 rounded-t-lg overflow-hidden h-36 flex items-end border border-zinc-800/80">
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isToday 
                            ? 'bg-blue-600 shadow-xs' 
                            : item.completed > 0 
                            ? 'bg-emerald-600/80 hover:bg-emerald-500' 
                            : 'bg-zinc-800'
                        }`}
                        style={{ height: `${Math.max(6, heightPct)}%` }}
                        title={`${item.day}: ${item.completed} tugas selesai`}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap truncate max-w-[48px]">
                      {item.day.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Rata-rata: <strong className="text-zinc-200">{avgVelocity}</strong> tugas/hari (total {totalCompletedLast7Days} minggu ini)</span>
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Hari Ini
            </span>
          </div>
        </div>

        {/* Time Allocation from Calendar Events */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-semibold text-white">
                    Alokasi Waktu Bisnis (Time Blocking)
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Dihitung dari jadwal dan blok waktu pada menu <strong>Kalender Bisnis</strong>
                </p>
              </div>
              <button
                onClick={() => onNavigate?.('calendar')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Kalender</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Segmented Bar */}
            <div className="mt-6">
              <div className="h-4 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden flex">
                <div style={{ width: `${deepWorkPct}%` }} className="h-full bg-blue-600" title={`Deep Work: ${deepWorkPct}%`} />
                <div style={{ width: `${clientPct}%` }} className="h-full bg-emerald-500" title={`Klien: ${clientPct}%`} />
                <div style={{ width: `${meetingPct}%` }} className="h-full bg-purple-500" title={`Rapat: ${meetingPct}%`} />
                <div style={{ width: `${otherPct}%` }} className="h-full bg-amber-500" title={`Evaluasi: ${otherPct}%`} />
              </div>

              {/* Legends */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="text-xs font-semibold text-zinc-200">Deep Work</span>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-white">{deepWorkPct}%</p>
                  <p className="text-[10px] text-zinc-400">{deepWorkCount} sesi fokus mandiri</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-zinc-200">Pertemuan Klien</span>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-white">{clientPct}%</p>
                  <p className="text-[10px] text-zinc-400">{clientCount} sesi demo/negosiasi</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-xs font-semibold text-zinc-200">Rapat Internal</span>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-white">{meetingPct}%</p>
                  <p className="text-[10px] text-zinc-400">{meetingCount} sesi koordinasi tim</p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-xs font-semibold text-zinc-200">Review & Evaluasi</span>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-white">{otherPct}%</p>
                  <p className="text-[10px] text-zinc-400">Tinjauan mingguan & keuangan</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Standar: Minimal 50% waktu dialokasikan untuk Deep Work & Klien</span>
          </div>
        </div>
      </div>

      {/* Business Categories Project Distribution (Connected to Pengaturan & Proyek) */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="pb-3 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Distribusi Proyek Berdasarkan Kategori Bisnis
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Kategori terhubung langsung dengan menu <strong>Pengaturan &gt; Kategori Bisnis</strong> dan inisiatif di <strong>Proyek</strong>
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('settings')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Kelola Kategori di Pengaturan ({availableCategories.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {(() => {
            const isCategoryMatch = (p: { category?: string; title?: string }, cat: string) => {
              if (!cat) return false;
              const target = cat.toLowerCase().trim();
              const pCat = p.category?.toLowerCase().trim();
              if (pCat === target) return true;
              if (p.title?.toLowerCase().trim().includes(target)) return true;
              return false;
            };

            // Track which tasks and projects are accounted for
            const matchedProjectIds = new Set<string>();
            const matchedTaskIds = new Set<string>();

            const categoryRows = availableCategories.map((cat, idx) => {
              const catProjects = projects.filter(p => {
                const match = isCategoryMatch(p, cat);
                if (match) matchedProjectIds.add(p.id);
                return match;
              });
              const completedCatProjects = catProjects.filter(p => p.status === 'completed');
              
              const catTasks = tasks.filter(t => {
                const match = catProjects.some(p => p.id === t.projectId) || 
                              t.tags?.some(tag => tag.toLowerCase().trim() === cat.toLowerCase().trim());
                if (match) matchedTaskIds.add(t.id);
                return match;
              });
              const doneTasks = catTasks.filter(t => t.isCompleted);
              const pct = catTasks.length > 0 ? Math.round((doneTasks.length / catTasks.length) * 100) : 0;

              return (
                <div key={cat} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-zinc-950/40 px-2 rounded-lg transition-colors">
                  <div className="min-w-0 max-w-md">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-zinc-800 text-[10px] font-semibold text-zinc-400 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">
                        {cat}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 pl-7">
                      {catProjects.length} Proyek Terdaftar ({completedCatProjects.length} Selesai)
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:w-72 shrink-0 pl-7 sm:pl-0">
                    <div className="flex-1">
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span className="tabular-nums">{doneTasks.length} / {catTasks.length} Tugas Selesai</span>
                        <span className="font-bold tabular-nums text-white">{pct}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate?.('projects')}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                      title="Lihat Proyek Terkait"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            });

            // Check if there are unassigned tasks (tasks created without specific project)
            const unassignedTasks = tasks.filter(t => !matchedTaskIds.has(t.id));
            const unassignedDone = unassignedTasks.filter(t => t.isCompleted);
            const unassignedPct = unassignedTasks.length > 0 ? Math.round((unassignedDone.length / unassignedTasks.length) * 100) : 0;

            return (
              <>
                {categoryRows}
                {unassignedTasks.length > 0 && (
                  <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-zinc-950/40 px-2 rounded-lg transition-colors border-t border-dashed border-zinc-800">
                    <div className="min-w-0 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-zinc-800/60 text-[10px] font-semibold text-zinc-500 flex items-center justify-center shrink-0">
                          •
                        </span>
                        <span className="text-xs font-medium text-zinc-300 truncate">
                          Tugas Mandiri (Tanpa Proyek Khusus)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 pl-7">
                        Aksi operasional cepat yang tidak dikelompokkan ke proyek tertentu
                      </p>
                    </div>

                    <div className="flex items-center gap-4 sm:w-72 shrink-0 pl-7 sm:pl-0">
                      <div className="flex-1">
                        <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                          <span className="tabular-nums">{unassignedDone.length} / {unassignedTasks.length} Tugas Selesai</span>
                          <span className="font-bold tabular-nums text-emerald-400">{unassignedPct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                            style={{ width: `${unassignedPct}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => onNavigate?.('tasks')}
                        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-white transition cursor-pointer"
                        title="Lihat Daftar Tugas"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Module Integration Map Footer */}
      <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <span className="font-medium text-zinc-300">Peta Keterhubungan Modul:</span>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => onNavigate?.('projects')} className="hover:text-blue-400 transition cursor-pointer">📁 Proyek ({projects.length})</button>
          <span>·</span>
          <button onClick={() => onNavigate?.('tasks')} className="hover:text-emerald-400 transition cursor-pointer">☑️ Tugas ({tasks.length})</button>
          <span>·</span>
          <button onClick={() => onNavigate?.('calendar')} className="hover:text-purple-400 transition cursor-pointer">📅 Kalender ({calendarEvents.length})</button>
          <span>·</span>
          <button onClick={() => onNavigate?.('routines')} className="hover:text-teal-400 transition cursor-pointer">🔄 Rutinitas ({routines.length})</button>
          <span>·</span>
          <button onClick={() => onNavigate?.('notes')} className="hover:text-amber-400 transition cursor-pointer">📝 Catatan ({notes.length})</button>
          <span>·</span>
          <button onClick={() => onNavigate?.('settings')} className="hover:text-white transition cursor-pointer">⚙️ Pengaturan</button>
        </div>
      </div>
    </div>
  );
};
