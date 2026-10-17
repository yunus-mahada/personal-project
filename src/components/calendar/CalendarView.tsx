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
  Circle
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
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
  isSameDay
} from 'date-fns';
import { id } from 'date-fns/locale';
import { db } from '../../db';
import type { CalendarEvent } from '../../types';
import { cloudUpsertCalendarEvent, cloudDeleteCalendarEvent } from '../../lib/supabase';
import { 
  formatTimeOnly, 
  CALENDAR_CATEGORY_LABELS 
} from '../../utils/formatters';

interface CalendarViewProps {
  onOpenEventModal: (event?: CalendarEvent, defaultDate?: string, defaultTime?: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenEventModal
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 16)); // 16 October 2026
  const [selectedDay, setSelectedDay] = useState<Date>(new Date(2026, 9, 16));
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const events = useLiveQuery(() => db.calendarEvents.toArray()) ?? [];

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => {
    const today = new Date(2026, 9, 16);
    setCurrentDate(today);
    setSelectedDay(today);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const selectedDayStr = format(selectedDay, 'yyyy-MM-dd');

  const filteredEvents = events.filter(e => {
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    return true;
  });

  const selectedDayEvents = filteredEvents
    .filter(e => e.startTime.startsWith(selectedDayStr))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const handleDeleteEvent = async (id: string, title: string) => {
    if (window.confirm(`Hapus agenda "${title}" dari kalender?`)) {
      await db.calendarEvents.delete(id);
      cloudDeleteCalendarEvent(id).catch(console.error);
    }
  };

  const handleToggleEvent = async (event: CalendarEvent) => {
    const updatedEvent: CalendarEvent = {
      ...event,
      isCompleted: !event.isCompleted,
      updatedAt: new Date().toISOString()
    };
    await db.calendarEvents.put(updatedEvent);
    cloudUpsertCalendarEvent(updatedEvent).catch(console.error);
  };

  const weekDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Kalender Bisnis & Time Blocking
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sinkronkan tugas operasional Personal Project, jadwalkan sesi fokus (Deep Work), dan rapat bisnis.
          </p>
        </div>

        <button
          onClick={() => onOpenEventModal(undefined, selectedDayStr)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Jadwalkan Agenda</span>
        </button>
      </div>

      {/* Month Navigation & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-white min-w-[140px]">
            {format(currentDate, 'MMMM yyyy', { locale: id })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-md transition border border-zinc-700"
            >
              Hari Ini
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              filterCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterCategory('deep_work')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              filterCategory === 'deep_work'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Deep Work
          </button>
          <button
            onClick={() => setFilterCategory('client')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              filterCategory === 'client'
                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Klien
          </button>
          <button
            onClick={() => setFilterCategory('meeting')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              filterCategory === 'meeting'
                ? 'bg-purple-600 text-white shadow-xs font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Rapat
          </button>
        </div>
      </div>

      {/* Main Grid: Calendar Grid & Day Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month Calendar Grid */}
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 mb-2 border-b border-zinc-800 pb-2">
            {weekDayNames.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-zinc-500">
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
              const dayEvents = filteredEvents.filter(e => e.startTime.startsWith(dayStr));
              const isTodayDate = dayStr === '2026-10-16';

              return (
                <div
                  key={dayStr}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[75px] md:min-h-[90px] p-1.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-500 bg-zinc-800/80 shadow-xs'
                      : 'border-zinc-800/70 hover:border-zinc-700 bg-zinc-950/60'
                  } ${!isCurrentMonth ? 'opacity-25' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold tabular-nums w-5 h-5 flex items-center justify-center rounded-full ${
                      isTodayDate ? 'bg-blue-600 text-white font-bold' : 'text-zinc-300'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-medium text-zinc-400">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events Pills */}
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium text-white shadow-xs"
                        style={{ backgroundColor: ev.color || '#2563eb' }}
                        title={`${formatTimeOnly(ev.startTime)} - ${ev.title}`}
                      >
                        {formatTimeOnly(ev.startTime)} {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-zinc-400 pl-1 font-medium">
                        +{dayEvents.length - 2} lagi
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda View */}
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Jadwal Harian
              </p>
              <h2 className="text-sm font-bold text-white mt-0.5">
                {format(selectedDay, 'EEEE, d MMMM yyyy', { locale: id })}
              </h2>
            </div>
            <button
              onClick={() => onOpenEventModal(undefined, selectedDayStr)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
              title="Tambah agenda pada hari ini"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Agenda Items List */}
          <div className="py-3 flex-1 overflow-y-auto space-y-3">
            {selectedDayEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                <Clock className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                <p>Tidak ada agenda terjadwal untuk tanggal ini.</p>
                <button
                  onClick={() => onOpenEventModal(undefined, selectedDayStr)}
                  className="mt-3 text-blue-400 hover:underline font-medium"
                >
                  + Jadwalkan sesi sekarang
                </button>
              </div>
            ) : (
              selectedDayEvents.map((evt) => {
                const startTime = formatTimeOnly(evt.startTime);
                const endTime = formatTimeOnly(evt.endTime);
                const cat = CALENDAR_CATEGORY_LABELS[evt.category];

                return (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition text-left relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          onClick={() => handleToggleEvent(evt)}
                          className="mt-0.5 text-zinc-500 hover:text-emerald-400 transition shrink-0"
                        >
                          {evt.isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 mb-1">
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

                          <h3 className={`text-xs font-semibold ${evt.isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                            {evt.title}
                          </h3>

                          {evt.description && (
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                              {evt.description}
                            </p>
                          )}

                          {evt.locationOrLink && (
                            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-zinc-400">
                              <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                              <span className="truncate">{evt.locationOrLink}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button
                          onClick={() => onOpenEventModal(evt)}
                          className="p-1 text-zinc-400 hover:text-white rounded"
                          title="Ubah"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt.id, evt.title)}
                          className="p-1 text-zinc-400 hover:text-rose-400 rounded"
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
