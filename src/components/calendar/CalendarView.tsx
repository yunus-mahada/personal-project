import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Edit3, 
  Trash2,
  CheckCircle2, 
  Circle, 
  Users, 
  ClipboardCheck, 
  CheckSquare, 
  Sparkles, 
  Link as LinkIcon, 
  Filter, 
  Layers, 
  FolderKanban,
  Repeat
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  parseISO
} from 'date-fns';
import { id } from 'date-fns/locale';
import { db } from '../../db';
import type { CalendarEvent, Task, Routine } from '../../types';
import { 
  cloudUpsertCalendarEvent, 
  cloudDeleteCalendarEvent, 
  cloudUpsertTask, 
  cloudDeleteTask,
  cloudUpsertRoutine,
  cloudDeleteRoutine
} from '../../lib/supabase';
import { 
  formatTimeOnly, 
  CALENDAR_CATEGORY_LABELS,
  formatDateIndo 
} from '../../utils/formatters';
import { 
  getRoutineStatus, 
  toggleRoutineCompletion, 
  isDayInMonthRange 
} from '../../utils/routineUtils';

interface CalendarViewProps {
  onOpenEventModal: (event?: CalendarEvent, defaultDate?: string, defaultTime?: string) => void;
  onOpenTaskModal?: (task?: Task, defaultProjectId?: string, defaultDate?: string) => void;
  onOpenRoutineModal?: (routine?: Routine) => void;
}

// Representasi terpadu untuk event kalender, tugas, & rutinitas bisnis
export interface UnifiedCalendarItem {
  id: string;
  sourceType: 'event' | 'task' | 'routine';
  rawEvent?: CalendarEvent;
  rawTask?: Task;
  rawRoutine?: Routine;
  title: string;
  description?: string;
  dateStr: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  category: 'meeting' | 'review' | 'deep_work' | 'client' | 'task' | 'routine' | 'other';
  categoryLabel: 'Meeting' | 'Evaluasi' | 'Deep Work' | 'Klien' | 'Tugas' | 'Rutinitas' | 'Lainnya';
  routineFrequencyLabel?: string;
  isCompleted: boolean;
  color?: string;
  locationOrLink?: string;
  projectId?: string;
  projectName?: string;
  priority?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenEventModal,
  onOpenTaskModal,
  onOpenRoutineModal
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [includeTasks, setIncludeTasks] = useState<boolean>(true);
  const [includeRoutines, setIncludeRoutines] = useState<boolean>(true);

  const events = useLiveQuery(() => db.calendarEvents.toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const routines = useLiveQuery(() => db.routines.toArray()) ?? [];

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedDayStr = format(selectedDay, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Gabungkan CalendarEvents, Tasks, dan Routines menjadi satu Unified Feed
  const unifiedItems: UnifiedCalendarItem[] = [];

  // 1. Masukkan semua Calendar Events
  events.forEach(evt => {
    const dateStr = evt.startTime.split('T')[0] || '';
    const proj = evt.projectId ? projects.find(p => p.id === evt.projectId) : undefined;
    
    let catType: UnifiedCalendarItem['category'] = 'other';
    let catLabel: UnifiedCalendarItem['categoryLabel'] = 'Lainnya';

    if (evt.category === 'meeting') {
      catType = 'meeting';
      catLabel = 'Meeting';
    } else if (evt.category === 'review') {
      catType = 'review';
      catLabel = 'Evaluasi';
    } else if (evt.category === 'deep_work') {
      catType = 'deep_work';
      catLabel = 'Deep Work';
    } else if (evt.category === 'client') {
      catType = 'client';
      catLabel = 'Klien';
    }

    unifiedItems.push({
      id: evt.id,
      sourceType: 'event',
      rawEvent: evt,
      title: evt.title,
      description: evt.description,
      dateStr,
      startTime: formatTimeOnly(evt.startTime),
      endTime: formatTimeOnly(evt.endTime),
      category: catType,
      categoryLabel: catLabel,
      isCompleted: evt.isCompleted,
      color: evt.color || (catType === 'meeting' ? '#9333ea' : catType === 'review' ? '#d97706' : '#2563eb'),
      locationOrLink: evt.locationOrLink,
      projectId: evt.projectId,
      projectName: proj?.title
    });
  });

  // 2. Masukkan Tasks yang memiliki dueDate atau scheduledDate (Sinkronisasi Otomatis)
  if (includeTasks) {
    tasks.forEach(t => {
      const taskDate = t.scheduledDate || t.dueDate;
      if (!taskDate) return;

      // Cek apakah sudah terhubung dengan event di calendarEvents untuk menghindari double entry
      const alreadyHasEvent = events.some(e => e.taskId === t.id || (t.calendarEventId && e.id === t.calendarEventId));
      if (alreadyHasEvent) return;

      const proj = t.projectId ? projects.find(p => p.id === t.projectId) : undefined;
      const tCat = t.category || 'Tugas';

      let catType: UnifiedCalendarItem['category'] = 'task';
      let catLabel: UnifiedCalendarItem['categoryLabel'] = 'Tugas';
      let defaultColor = '#2563eb';

      if (tCat === 'Meeting') {
        catType = 'meeting';
        catLabel = 'Meeting';
        defaultColor = '#9333ea';
      } else if (tCat === 'Evaluasi') {
        catType = 'review';
        catLabel = 'Evaluasi';
        defaultColor = '#d97706';
      }

      unifiedItems.push({
        id: `task-sync-${t.id}`,
        sourceType: 'task',
        rawTask: t,
        title: t.title,
        description: t.description,
        dateStr: taskDate,
        startTime: t.scheduledStartTime,
        endTime: t.scheduledEndTime,
        category: catType,
        categoryLabel: catLabel,
        isCompleted: t.isCompleted,
        color: defaultColor,
        projectId: t.projectId,
        projectName: proj?.title,
        priority: t.priority
      });
    });
  }

  // 3. Masukkan Rutinitas Bisnis (Sinkronisasi Kalender Terpadu dengan Warna Khas Teal #0d9488)
  if (includeRoutines) {
    routines.forEach(r => {
      // Tentukan rentang waktu default berdasarkan waktu pelaksanaan rutinitas
      let defaultStart = '08:00';
      let defaultEnd = '08:30';
      if (r.timeOfDay === 'afternoon') {
        defaultStart = '13:30';
        defaultEnd = '14:00';
      } else if (r.timeOfDay === 'evening') {
        defaultStart = '19:00';
        defaultEnd = '19:30';
      }

      // Distribusikan rutinitas ke hari-hari kalender aktif
      calendarDays.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayOfMonth = day.getDate();
        const dayOfWeek = day.getDay(); // 0 = Min, 1 = Sen, ...

        let appliesToDay = false;
        let freqLabel = 'Harian';

        if (r.frequency === 'custom_range') {
          const start = r.startDay ?? 1;
          const end = r.endDay ?? start;
          appliesToDay = isDayInMonthRange(dayOfMonth, start, end);
          freqLabel = `Tgl ${start} - ${end}`;
        } else if (r.frequency === 'workdays') {
          appliesToDay = dayOfWeek >= 1 && dayOfWeek <= 5;
          freqLabel = 'Hari Kerja';
        } else if (r.frequency === 'weekly') {
          appliesToDay = dayOfWeek === 1; // Ditampilkan di hari Senin sebagai penanda target mingguan
          freqLabel = 'Mingguan';
        } else {
          // daily
          appliesToDay = true;
          freqLabel = 'Harian';
        }

        if (appliesToDay) {
          const status = getRoutineStatus(r, day);
          unifiedItems.push({
            id: `routine-sync-${r.id}-${dayStr}`,
            sourceType: 'routine',
            rawRoutine: r,
            title: r.title,
            description: r.description,
            dateStr: dayStr,
            startTime: defaultStart,
            endTime: defaultEnd,
            category: 'routine',
            categoryLabel: 'Rutinitas',
            routineFrequencyLabel: freqLabel,
            isCompleted: status.isCompleted,
            color: '#0d9488', // Warna Khas Rutinitas: Teal
            priority: 'routine'
          });
        }
      });
    });
  }

  // Filter items berdasarkan kategori terpilih
  const filteredItems = unifiedItems.filter(item => {
    if (filterCategory === 'meeting' && item.category !== 'meeting') return false;
    if (filterCategory === 'review' && item.category !== 'review') return false;
    if (filterCategory === 'deep_work' && item.category !== 'deep_work') return false;
    if (filterCategory === 'task' && item.category !== 'task') return false;
    if (filterCategory === 'routine' && item.category !== 'routine') return false;
    return true;
  });

  // Items untuk hari yang sedang dipilih
  const selectedDayItems = filteredItems
    .filter(i => i.dateStr === selectedDayStr)
    .sort((a, b) => {
      // Prioritaskan Meeting & Evaluasi, lalu Rutinitas, lalu Tugas & Waktu
      if (a.category === 'meeting' && b.category !== 'meeting') return -1;
      if (b.category === 'meeting' && a.category !== 'meeting') return 1;
      if (a.category === 'review' && b.category !== 'review') return -1;
      if (b.category === 'review' && a.category !== 'review') return 1;
      if (a.category === 'routine' && b.category !== 'routine') return -1;
      if (b.category === 'routine' && a.category !== 'routine') return 1;
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      if (a.startTime && !b.startTime) return -1;
      if (!a.startTime && b.startTime) return 1;
      return a.title.localeCompare(b.title);
    });

  // Statistik bulan ini
  const currentMonthPrefix = format(currentDate, 'yyyy-MM');
  const monthItems = unifiedItems.filter(i => i.dateStr.startsWith(currentMonthPrefix));
  const meetingMonthCount = monthItems.filter(i => i.category === 'meeting').length;
  const reviewMonthCount = monthItems.filter(i => i.category === 'review').length;
  const routineMonthCount = monthItems.filter(i => i.category === 'routine').length;
  const completedMonthCount = monthItems.filter(i => i.isCompleted).length;
  const totalMonthCount = monthItems.length;

  // Toggle Selesai untuk Item (Event, Task, atau Rutinitas)
  const handleToggleItem = async (item: UnifiedCalendarItem) => {
    const nextCompleted = !item.isCompleted;
    const nowIso = new Date().toISOString();

    if (item.sourceType === 'task' && item.rawTask) {
      const updatedTask: Task = {
        ...item.rawTask,
        isCompleted: nextCompleted,
        status: nextCompleted ? 'done' : 'todo',
        completedAt: nextCompleted ? nowIso : undefined,
        updatedAt: nowIso
      };
      await db.tasks.put(updatedTask);
      cloudUpsertTask(updatedTask).catch(console.error);
    } else if (item.sourceType === 'event' && item.rawEvent) {
      const updatedEvent: CalendarEvent = {
        ...item.rawEvent,
        isCompleted: nextCompleted,
        updatedAt: nowIso
      };
      await db.calendarEvents.put(updatedEvent);
      cloudUpsertCalendarEvent(updatedEvent).catch(console.error);
    } else if (item.sourceType === 'routine' && item.rawRoutine) {
      const targetDate = parseISO(item.dateStr);
      const { updatedRoutine, isNowCompleted } = toggleRoutineCompletion(item.rawRoutine, targetDate);
      await db.routines.put(updatedRoutine);
      cloudUpsertRoutine(updatedRoutine).catch(console.error);

      if (isNowCompleted) {
        confetti({ particleCount: 35, spread: 55, origin: { y: 0.8 } });
      }
      return;
    }

    if (nextCompleted) {
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.8 } });
    }
  };

  // Hapus item
  const handleDeleteItem = async (item: UnifiedCalendarItem) => {
    if (item.sourceType === 'task' && item.rawTask) {
      if (window.confirm(`Hapus tugas "${item.title}"?`)) {
        await db.tasks.delete(item.rawTask.id);
        cloudDeleteTask(item.rawTask.id).catch(console.error);
      }
    } else if (item.sourceType === 'event' && item.rawEvent) {
      if (window.confirm(`Hapus agenda "${item.title}" dari kalender?`)) {
        await db.calendarEvents.delete(item.rawEvent.id);
        cloudDeleteCalendarEvent(item.rawEvent.id).catch(console.error);
      }
    } else if (item.sourceType === 'routine' && item.rawRoutine) {
      if (window.confirm(`Hapus rutinitas "${item.title}"?`)) {
        await db.routines.delete(item.rawRoutine.id);
        cloudDeleteRoutine(item.rawRoutine.id).catch(console.error);
      }
    }
  };

  const weekDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Kalender Bisnis & Time Blocking</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Jadwal operasional terintegrasi dengan penanda agenda <span className="text-purple-400 font-semibold">Meeting</span>, sesi <span className="text-amber-400 font-semibold">Evaluasi</span>, dan <span className="text-teal-400 font-semibold">Rutinitas Bisnis</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onOpenTaskModal && (
            <button
              onClick={() => onOpenTaskModal(undefined, undefined, selectedDayStr)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition shadow-xs cursor-pointer"
              title="Tambah tugas untuk tanggal yang dipilih"
            >
              <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Tugas Hari Ini</span>
            </button>
          )}

          <button
            onClick={() => onOpenEventModal(undefined, selectedDayStr)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Jadwalkan Agenda</span>
          </button>
        </div>
      </div>

      {/* Mini Executive Metric Cards Bulan Ini */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Total Agenda</p>
            <p className="text-base font-bold text-white tabular-nums mt-0.5">{totalMonthCount}</p>
          </div>
        </div>

        {/* Meeting Stat Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-950/40 to-zinc-900/90 border border-purple-800/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-900/60 border border-purple-700/60 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-purple-300" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">Rapat / Meeting</p>
            <p className="text-base font-bold text-purple-200 tabular-nums mt-0.5">{meetingMonthCount}</p>
          </div>
        </div>

        {/* Evaluasi Stat Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-950/40 to-zinc-900/90 border border-amber-800/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-900/60 border border-amber-700/60 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Evaluasi</p>
            <p className="text-base font-bold text-amber-200 tabular-nums mt-0.5">{reviewMonthCount}</p>
          </div>
        </div>

        {/* Rutinitas Stat Card dengan Warna Khas Teal */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-teal-950/40 to-zinc-900/90 border border-teal-800/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-900/60 border border-teal-700/60 flex items-center justify-center shrink-0">
            <Repeat className="w-4 h-4 text-teal-300" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-teal-300 uppercase tracking-wider">Rutinitas</p>
            <p className="text-base font-bold text-teal-200 tabular-nums mt-0.5">{routineMonthCount}</p>
          </div>
        </div>

        {/* Completed Stat Card */}
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Terselesaikan</p>
            <p className="text-base font-bold text-emerald-400 tabular-nums mt-0.5">{completedMonthCount}</p>
          </div>
        </div>
      </div>

      {/* Month Navigation & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white min-w-[150px]">
            {format(currentDate, 'MMMM yyyy', { locale: id })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-md transition border border-zinc-700 cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filters & Synchronizations */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterCategory('meeting')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                filterCategory === 'meeting'
                  ? 'bg-purple-600 text-white font-bold shadow-xs'
                  : 'text-purple-300 hover:bg-purple-950/60'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Meeting ({meetingMonthCount})</span>
            </button>
            <button
              onClick={() => setFilterCategory('review')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                filterCategory === 'review'
                  ? 'bg-amber-600 text-white font-bold shadow-xs'
                  : 'text-amber-300 hover:bg-amber-950/60'
              }`}
            >
              <ClipboardCheck className="w-3 h-3" />
              <span>Evaluasi ({reviewMonthCount})</span>
            </button>
            <button
              onClick={() => setFilterCategory('routine')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                filterCategory === 'routine'
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'text-teal-300 hover:bg-teal-950/60'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span>Rutinitas ({routineMonthCount})</span>
            </button>
            <button
              onClick={() => setFilterCategory('deep_work')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap cursor-pointer ${
                filterCategory === 'deep_work'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Deep Work
            </button>
            <button
              onClick={() => setFilterCategory('task')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition whitespace-nowrap cursor-pointer ${
                filterCategory === 'task'
                  ? 'bg-blue-700 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tugas
            </button>
          </div>

          {/* Toggle Sinkronisasi Tugas */}
          <button
            onClick={() => setIncludeTasks(!includeTasks)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
              includeTasks
                ? 'bg-blue-950/70 border-blue-700/80 text-blue-300 shadow-xs'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Tampilkan tugas operasional yang memiliki tanggal di kalender"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tugas {includeTasks ? 'Aktif' : 'Nonaktif'}</span>
          </button>

          {/* Toggle Sinkronisasi Rutinitas Bisnis (Warna Khas Teal) */}
          <button
            onClick={() => setIncludeRoutines(!includeRoutines)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
              includeRoutines
                ? 'bg-teal-950/70 border-teal-700/80 text-teal-300 shadow-xs'
                : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Tampilkan rutinitas bisnis & kebiasaan tanggal di kalender"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Rutinitas {includeRoutines ? 'Aktif' : 'Nonaktif'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar Grid & Day Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Month Calendar Grid */}
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 mb-2 border-b border-zinc-800 pb-2">
            {weekDayNames.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days Cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDay);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dayItems = filteredItems.filter(e => e.dateStr === dayStr);
              const isTodayDate = dayStr === todayStr;

              // Deteksi kategori agenda khusus
              const hasMeeting = dayItems.some(i => i.category === 'meeting');
              const hasReview = dayItems.some(i => i.category === 'review');
              const hasRoutine = dayItems.some(i => i.category === 'routine');

              return (
                <div
                  key={dayStr}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[85px] md:min-h-[100px] p-2 rounded-xl border transition cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'border-blue-500 bg-zinc-800/90 shadow-md ring-1 ring-blue-500/50'
                      : isTodayDate
                      ? 'border-blue-500/80 bg-blue-950/20 hover:border-blue-400'
                      : 'border-zinc-800/70 hover:border-zinc-700 bg-zinc-950/60'
                  } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                >
                  {/* Top Bar Sel: Angka Tanggal + Penanda Khusus */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold tabular-nums w-6 h-6 flex items-center justify-center rounded-full ${
                      isTodayDate 
                        ? 'bg-blue-600 text-white font-bold shadow-xs' 
                        : isSelected 
                        ? 'bg-zinc-700 text-white font-bold' 
                        : 'text-zinc-300'
                    }`}>
                      {format(day, 'd')}
                    </span>

                    {/* Tanda khusus Meeting, Evaluasi, & Rutinitas di header tanggal */}
                    <div className="flex items-center gap-1">
                      {hasMeeting && (
                        <span 
                          className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.9)]" 
                          title="Ada agenda Meeting" 
                        />
                      )}
                      {hasReview && (
                        <span 
                          className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.9)]" 
                          title="Ada sesi Evaluasi" 
                        />
                      )}
                      {hasRoutine && (
                        <span 
                          className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.9)]" 
                          title="Ada Rutinitas Bisnis" 
                        />
                      )}
                      {dayItems.length > 0 && (
                        <span className="text-[10px] font-medium text-zinc-400 tabular-nums ml-0.5">
                          {dayItems.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Day Items Pills dengan Penanda Khusus */}
                  <div className="space-y-1 mt-1.5 overflow-hidden">
                    {dayItems.slice(0, 3).map((item) => {
                      const isMeeting = item.category === 'meeting';
                      const isReview = item.category === 'review';
                      const isRoutine = item.category === 'routine';

                      let badgeStyle = 'bg-zinc-800/90 text-zinc-200 border-zinc-700';
                      if (isMeeting) {
                        badgeStyle = 'bg-purple-950/90 text-purple-200 border-purple-800/80 border-l-3 border-l-purple-400 font-semibold ring-1 ring-purple-600/30';
                      } else if (isReview) {
                        badgeStyle = 'bg-amber-950/90 text-amber-200 border-amber-800/80 border-l-3 border-l-amber-400 font-semibold ring-1 ring-amber-600/30';
                      } else if (isRoutine) {
                        badgeStyle = 'bg-teal-950/90 text-teal-200 border-teal-800/80 border-l-3 border-l-teal-400 font-semibold ring-1 ring-teal-600/30';
                      } else if (item.sourceType === 'task') {
                        badgeStyle = 'bg-blue-950/80 text-blue-200 border-blue-900 border-l-2 border-l-blue-400';
                      }

                      return (
                        <div
                          key={item.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded border truncate transition shadow-2xs flex items-center gap-1 ${badgeStyle} ${
                            item.isCompleted ? 'line-through opacity-50' : ''
                          }`}
                          title={`${item.startTime ? item.startTime + ' - ' : ''}${isMeeting ? '[MEETING] ' : isReview ? '[EVALUASI] ' : isRoutine ? '[RUTINITAS] ' : ''}${item.title}`}
                        >
                          {isMeeting && <Users className="w-2.5 h-2.5 text-purple-400 shrink-0" />}
                          {isReview && <ClipboardCheck className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                          {isRoutine && <Repeat className="w-2.5 h-2.5 text-teal-400 shrink-0" />}
                          {!isMeeting && !isReview && !isRoutine && item.sourceType === 'task' && (
                            <CheckSquare className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {item.title}
                          </span>
                        </div>
                      );
                    })}

                    {dayItems.length > 3 && (
                      <span className="text-[9px] text-zinc-500 font-medium block text-right pr-1">
                        +{dayItems.length - 3} lainnya
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend Penanda di Bawah Kalender */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between text-[11px] text-zinc-400 gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-zinc-300">Tanda Agenda:</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800 text-purple-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.9)]" />
                <span>👥 Rapat / Meeting</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
                <span>📊 Sesi Evaluasi &amp; Review</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-950/60 border border-teal-800 text-teal-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(20,184,166,0.9)]" />
                <span>🔁 Rutinitas Bisnis</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-300">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>✅ Tugas Tersinkron</span>
              </span>
            </div>
            <span className="text-zinc-500 italic">Klik tanggal mana saja untuk melihat rincian</span>
          </div>
        </div>

        {/* Selected Day Agenda View */}
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 flex flex-col shadow-xs">
          {/* Header Panel Harian */}
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800">
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Jadwal Harian</span>
              </p>
              <h2 className="text-sm font-bold text-white mt-0.5">
                {format(selectedDay, 'EEEE, d MMMM yyyy', { locale: id })}
              </h2>
            </div>

            <div className="flex items-center gap-1">
              {onOpenTaskModal && (
                <button
                  onClick={() => onOpenTaskModal(undefined, undefined, selectedDayStr)}
                  className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  title="Tambah tugas di hari ini"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onOpenEventModal(undefined, selectedDayStr)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                title="Jadwalkan agenda di hari ini"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Agenda Items List */}
          <div className="py-3 flex-1 overflow-y-auto space-y-3 max-h-[620px]">
            {selectedDayItems.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="font-medium text-zinc-400">Tidak ada agenda, tugas, atau rutinitas di tanggal ini.</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Semua agenda operasional Anda akan tersinkronisasi otomatis di sini.</p>
                
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => onOpenEventModal(undefined, selectedDayStr)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-900 rounded-lg transition cursor-pointer"
                  >
                    + Jadwalkan Agenda
                  </button>
                  {onOpenTaskModal && (
                    <button
                      onClick={() => onOpenTaskModal(undefined, undefined, selectedDayStr)}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 border border-zinc-700 rounded-lg transition cursor-pointer"
                    >
                      + Tambah Tugas
                    </button>
                  )}
                </div>
              </div>
            ) : (
              selectedDayItems.map((item) => {
                const isMeeting = item.category === 'meeting';
                const isReview = item.category === 'review';
                const isRoutine = item.category === 'routine';
                const isSyncedTask = item.sourceType === 'task';

                // Kartu Khusus untuk Meeting / Evaluasi / Rutinitas / Tugas
                let cardBorder = 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60';
                if (isMeeting) {
                  cardBorder = 'border-l-4 border-l-purple-500 border-purple-800/40 bg-gradient-to-r from-purple-950/40 via-zinc-950/80 to-zinc-950 shadow-sm';
                } else if (isReview) {
                  cardBorder = 'border-l-4 border-l-amber-500 border-amber-800/40 bg-gradient-to-r from-amber-950/40 via-zinc-950/80 to-zinc-950 shadow-sm';
                } else if (isRoutine) {
                  cardBorder = 'border-l-4 border-l-teal-500 border-teal-800/40 bg-gradient-to-r from-teal-950/40 via-zinc-950/80 to-zinc-950 shadow-sm';
                } else if (isSyncedTask) {
                  cardBorder = 'border-l-4 border-l-blue-500 border-zinc-800 bg-zinc-950/60';
                }

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition text-left relative group ${cardBorder}`}
                  >
                    {/* Header Penanda Kategori Menonjol */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isMeeting ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-900/60 border border-purple-600/60 text-purple-200 text-[10px] font-bold tracking-wider uppercase shadow-xs">
                            <Users className="w-3 h-3 text-purple-300" />
                            <span>Agenda Meeting / Rapat</span>
                          </span>
                        ) : isReview ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-900/60 border border-amber-600/60 text-amber-200 text-[10px] font-bold tracking-wider uppercase shadow-xs">
                            <ClipboardCheck className="w-3 h-3 text-amber-300" />
                            <span>Sesi Evaluasi &amp; Review</span>
                          </span>
                        ) : isRoutine ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-900/60 border border-teal-600/60 text-teal-200 text-[10px] font-bold tracking-wider uppercase shadow-xs">
                            <Repeat className="w-3 h-3 text-teal-300" />
                            <span>Rutinitas Bisnis {item.routineFrequencyLabel ? `· ${item.routineFrequencyLabel}` : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-semibold">
                            {isSyncedTask ? <CheckSquare className="w-3 h-3 text-blue-400" /> : <Clock className="w-3 h-3 text-zinc-400" />}
                            <span>{item.categoryLabel}</span>
                          </span>
                        )}

                        {/* Indikator Asal Sumber */}
                        {isSyncedTask && (
                          <span className="text-[9px] font-medium text-blue-400 bg-blue-950 border border-blue-900/80 px-1.5 py-0.2 rounded">
                            Tugas Tersinkron
                          </span>
                        )}
                        {isRoutine && (
                          <span className="text-[9px] font-medium text-teal-400 bg-teal-950 border border-teal-900/80 px-1.5 py-0.2 rounded">
                            Rutinitas Tersinkron
                          </span>
                        )}
                      </div>

                      {/* Waktu Pelaksanaan */}
                      <span className="text-[11px] font-mono tabular-nums text-zinc-400 font-semibold">
                        {item.startTime ? `${item.startTime}${item.endTime ? ' – ' + item.endTime : ''}` : 'Sepanjang Hari'}
                      </span>
                    </div>

                    {/* Konten Utama: Checkbox + Judul + Deskripsi */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          onClick={() => handleToggleItem(item)}
                          className={`mt-0.5 transition shrink-0 cursor-pointer ${
                            isRoutine 
                              ? 'text-zinc-500 hover:text-teal-400' 
                              : 'text-zinc-500 hover:text-emerald-400'
                          }`}
                          title={item.isCompleted ? 'Tandai belum selesai' : 'Tandai selesai'}
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className={`w-4 h-4 ${isRoutine ? 'text-teal-400' : 'text-emerald-400'}`} />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <h3 className={`text-xs font-semibold ${item.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                            {item.title}
                          </h3>

                          {item.description && (
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          {/* Info Proyek Terkait */}
                          {item.projectName && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-400 font-medium">
                              <FolderKanban className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span className="truncate">{item.projectName}</span>
                            </div>
                          )}

                          {/* Info Lokasi / Link Pertemuan untuk Meeting */}
                          {item.locationOrLink && (
                            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-purple-300 bg-purple-950/40 border border-purple-900/60 px-2 py-1 rounded-md">
                              <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                              <span className="truncate flex-1">{item.locationOrLink}</span>
                              {item.locationOrLink.startsWith('http') && (
                                <a
                                  href={item.locationOrLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline flex items-center gap-0.5 shrink-0"
                                >
                                  <LinkIcon className="w-2.5 h-2.5" />
                                  <span>Buka</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tombol Aksi Ubah & Hapus */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button
                          onClick={() => {
                            if (item.sourceType === 'task' && item.rawTask && onOpenTaskModal) {
                              onOpenTaskModal(item.rawTask);
                            } else if (item.sourceType === 'routine' && item.rawRoutine && onOpenRoutineModal) {
                              onOpenRoutineModal(item.rawRoutine);
                            } else if (item.rawEvent) {
                              onOpenEventModal(item.rawEvent);
                            }
                          }}
                          className="p-1 text-zinc-400 hover:text-white rounded cursor-pointer"
                          title="Ubah rincian"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="p-1 text-zinc-400 hover:text-rose-400 rounded cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
