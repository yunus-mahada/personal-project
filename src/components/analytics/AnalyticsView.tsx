import React from 'react';
import { 
  BarChart3, 
  CheckSquare, 
  FolderKanban, 
  Target, 
  Zap
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export const AnalyticsView: React.FC = () => {
  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const calendarEvents = useLiveQuery(() => db.calendarEvents.toArray()) ?? [];

  // Calculations
  const completedTasks = tasks.filter(t => t.isCompleted);
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const completedProjects = projects.filter(p => p.status === 'completed');
  const projectDeliveryRate = projects.length > 0 ? Math.round((completedProjects.length / projects.length) * 100) : 0;

  const onTrackGoals = goals.filter(g => g.status === 'on_track' || g.status === 'completed');
  const goalSuccessRate = goals.length > 0 ? Math.round((onTrackGoals.length / goals.length) * 100) : 0;

  // 7-day velocity data
  const last7Days = [
    { day: 'Sab (10 Okt)', completed: 3 },
    { day: 'Min (11 Okt)', completed: 1 },
    { day: 'Sen (12 Okt)', completed: 5 },
    { day: 'Sel (13 Okt)', completed: 6 },
    { day: 'Rab (14 Okt)', completed: 4 },
    { day: 'Kam (15 Okt)', completed: 7 },
    { day: 'Jum (16 Okt)', completed: Math.max(3, completedTasks.length) },
  ];
  const maxCompleted = Math.max(...last7Days.map(d => d.completed), 1);

  // Time allocation breakdown from calendar events
  const totalEvents = calendarEvents.length || 1;
  const deepWorkCount = calendarEvents.filter(e => e.category === 'deep_work').length;
  const clientCount = calendarEvents.filter(e => e.category === 'client').length;
  const meetingCount = calendarEvents.filter(e => e.category === 'meeting').length;
  const otherCount = Math.max(0, totalEvents - (deepWorkCount + clientCount + meetingCount));

  const deepWorkPct = Math.round((deepWorkCount / totalEvents) * 100);
  const clientPct = Math.round((clientCount / totalEvents) * 100);
  const meetingPct = Math.round((meetingCount / totalEvents) * 100);
  const otherPct = Math.max(0, 100 - (deepWorkPct + clientPct + meetingPct));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Analitik Performa & Laporan Bisnis
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Evaluasi kecepatan penyelesaian tugas (Velocity), rasio pengiriman proyek Personal Project, dan alokasi waktu fokus.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Rasio Tugas Selesai</span>
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">{taskCompletionRate}%</span>
            <span className="text-[11px] text-zinc-500">({completedTasks.length}/{tasks.length})</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Total tugas terselesaikan</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Rasio Selesai Proyek</span>
            <FolderKanban className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">{projectDeliveryRate}%</span>
            <span className="text-[11px] text-zinc-500">({completedProjects.length}/{projects.length})</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Inisiatif tuntas dikirim</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Sasaran On Track</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">{goalSuccessRate}%</span>
            <span className="text-[11px] text-zinc-500">({onTrackGoals.length}/{goals.length})</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Target bisnis sesuai jadwal
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Sesi Deep Work</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">{deepWorkPct}%</span>
            <span className="text-[11px] text-zinc-500">dari agenda</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">{deepWorkCount} sesi fokus terjadwal</p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Chart: 7-Day Task Completion Bar Chart */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Kecepatan Eksekusi (Velocity 7 Hari)
                </h2>
                <p className="text-xs text-zinc-400">
                  Jumlah tugas selesai per hari selama satu minggu terakhir
                </p>
              </div>
              <span className="text-xs font-semibold tabular-nums text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-md">
                +18% vs minggu lalu
              </span>
            </div>

            {/* Custom Responsive SVG Bar Chart in Dark Charcoal */}
            <div className="mt-6 h-48 w-full flex items-end justify-between gap-3 px-2">
              {last7Days.map((item, idx) => {
                const heightPct = Math.round((item.completed / maxCompleted) * 100);
                const isToday = idx === last7Days.length - 1;

                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-semibold tabular-nums text-zinc-300 opacity-80 group-hover:opacity-100">
                      {item.completed}
                    </span>
                    <div className="w-full max-w-[36px] bg-zinc-950 rounded-t-lg overflow-hidden h-36 flex items-end border border-zinc-800/60">
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          isToday ? 'bg-blue-600 shadow-xs' : 'bg-zinc-700 hover:bg-zinc-600'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 whitespace-nowrap truncate max-w-[44px]">
                      {item.day.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Rata-rata 4.5 tugas selesai per hari</span>
            <span className="flex items-center gap-1.5 text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Hari Ini
            </span>
          </div>
        </div>

        {/* Time Allocation Breakdown */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">
                Alokasi Waktu Bisnis (Time Blocking)
              </h2>
              <p className="text-xs text-zinc-400">
                Distribusi waktu pada kalender berdasarkan kategori kegiatan
              </p>
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
                  <p className="text-[10px] text-zinc-400">{clientCount} sesi negosiasi/demo</p>
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

          <div className="mt-4 pt-3 border-t border-zinc-800 text-[11px] text-zinc-500">
            Kombinasi ideal: Minimal 50% waktu dialokasikan untuk Deep Work & Klien
          </div>
        </div>
      </div>

      {/* Strategic Goals Completion Matrix */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-xs">
        <div className="pb-3 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Status Capaian Sasaran Bisnis (Goal Velocity)
            </h2>
            <p className="text-xs text-zinc-400">
              Perbandingan metrik target kuantitatif dan estimasi pencapaian akhir kuartal
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-medium tabular-nums">
            {goals.length} Sasaran Aktif
          </span>
        </div>

        <div className="divide-y divide-zinc-800 mt-2">
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));

            return (
              <div key={goal.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase">
                      {goal.category}
                    </span>
                    <span aria-hidden="true" className="text-zinc-600">·</span>
                    <span className="text-xs font-semibold text-white truncate">
                      {goal.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                    {goal.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 sm:w-64 shrink-0">
                  <div className="flex-1">
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                      <span className="tabular-nums">{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                      <span className="font-bold tabular-nums text-white">{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: goal.color || '#3b82f6' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
