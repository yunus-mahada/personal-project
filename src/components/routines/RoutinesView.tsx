import React from 'react';
import { 
  Repeat, 
  Plus, 
  Flame, 
  Sun, 
  Sunset, 
  Moon, 
  CheckCircle2, 
  Circle, 
  Edit3, 
  Trash2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  parseISO 
} from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { db } from '../../db';
import type { Routine, RoutineTimeOfDay } from '../../types';
import { cloudUpsertRoutine, cloudDeleteRoutine } from '../../lib/supabase';
import { 
  getRoutineStatus, 
  toggleRoutineCompletion, 
  isDayInMonthRange 
} from '../../utils/routineUtils';

interface RoutinesViewProps {
  onOpenRoutineModal: (routine?: Routine) => void;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  onOpenRoutineModal
}) => {
  const routines = useLiveQuery(() => db.routines.toArray()) ?? [];

  // Live dynamic current week days (Senin s/d Minggu)
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const currentWeekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayStr = format(day, 'yyyy-MM-dd');
    return {
      dayStr,
      dayObj: day,
      dayOfMonth: day.getDate(),
      label: weekDayLabels[i],
      dayNum: format(day, 'd'),
      isToday: isSameDay(day, now)
    };
  });

  const handleToggle = async (routine: Routine, dateToToggle?: Date | string) => {
    const targetDate = dateToToggle 
      ? (typeof dateToToggle === 'string' ? parseISO(dateToToggle) : dateToToggle) 
      : now;

    const { updatedRoutine, isNowCompleted } = toggleRoutineCompletion(routine, targetDate);

    if (isNowCompleted) {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
    }

    await db.routines.put(updatedRoutine);
    cloudUpsertRoutine(updatedRoutine).catch(console.error);
  };

  const handleDeleteRoutine = async (id: string, title: string) => {
    if (window.confirm(`Hapus rutinitas "${title}"?`)) {
      await db.routines.delete(id);
      cloudDeleteRoutine(id).catch(console.error);
    }
  };

  const timeSections: { timeOfDay: RoutineTimeOfDay; label: string; icon: any; color: string }[] = [
    { timeOfDay: 'morning', label: 'Ritual Pagi (Morning Focus)', icon: Sun, color: 'text-amber-400' },
    { timeOfDay: 'afternoon', label: 'Aksi Siang / Sore (Execution)', icon: Sunset, color: 'text-blue-400' },
    { timeOfDay: 'evening', label: 'Refleksi Malam (Evening Review)', icon: Moon, color: 'text-indigo-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Rutinitas & Kebiasaan Eksekutif</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Bangun kedisiplinan operasional melalui kebiasaan harian, review mingguan, dan rutinitas tanggal berkala (pajak, payroll, dll).
          </p>
        </div>

        <button
          onClick={() => onOpenRoutineModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Rutinitas</span>
        </button>
      </div>

      {/* Routine Sections Grouped by Time of Day */}
      <div className="space-y-6">
        {timeSections.map((sec) => {
          const sectionRoutines = routines.filter(r => r.timeOfDay === sec.timeOfDay);
          const Icon = sec.icon;

          if (sectionRoutines.length === 0) return null;

          return (
            <div key={sec.timeOfDay} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-4 border-b border-zinc-800">
                <Icon className={`w-4 h-4 ${sec.color}`} />
                <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  {sec.label}
                </h2>
              </div>

              <div className="divide-y divide-zinc-800">
                {sectionRoutines.map((routine) => {
                  const status = getRoutineStatus(routine, now);
                  const isCustom = routine.frequency === 'custom_range';
                  const startDay = routine.startDay ?? 1;
                  const endDay = routine.endDay ?? startDay;

                  // Progress calculation
                  const thisWeekCompletedCount = currentWeekDays.filter(d => routine.completedDates.includes(d.dayStr)).length;
                  const progressPercent = isCustom 
                    ? (status.isCompleted ? 100 : 0)
                    : Math.min(100, Math.round((thisWeekCompletedCount / routine.targetDaysPerWeek) * 100));

                  return (
                    <div 
                      key={routine.id}
                      className="py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                    >
                      {/* Routine Details */}
                      <div className="min-w-0 max-w-lg">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-xs font-semibold ${status.isCompleted ? 'text-zinc-100' : 'text-white'}`}>
                            {routine.title}
                          </h3>

                          {isCustom && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-950/80 border border-blue-800/60 text-blue-300 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-blue-400" />
                              <span>Tiap Tgl {startDay} - {endDay}</span>
                            </span>
                          )}

                          <div className="flex items-center gap-0.5 text-[11px] text-amber-400 font-semibold tabular-nums ml-1">
                            <Flame className="w-3 h-3 fill-amber-400" />
                            <span>{routine.streak}</span>
                          </div>
                        </div>

                        {routine.description && (
                          <p className="text-[11px] text-zinc-400 mt-1">
                            {routine.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-zinc-500">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-medium">{routine.category}</span>
                          <span aria-hidden="true">·</span>

                          {isCustom ? (
                            <>
                              <span>Target: 1x per bulan (Tgl {startDay} - {endDay})</span>
                              <span aria-hidden="true">·</span>
                              {status.isCompleted ? (
                                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Selesai siklus ini ({status.completedDateFormatted})</span>
                                </span>
                              ) : status.isInsideWindow ? (
                                <span className="font-semibold text-amber-400 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>Aktif hari ini (Tenggat tgl {endDay})</span>
                                </span>
                              ) : (
                                <span className="text-zinc-400">
                                  Dijadwalkan tiap tgl {startDay} - {endDay}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span>Target: {routine.targetDaysPerWeek} hari/minggu</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-zinc-300">
                                Tercapai: {thisWeekCompletedCount}/{routine.targetDaysPerWeek} ({progressPercent}%)
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right-hand Action & Weekly / Cycle Status */}
                      <div className="flex flex-wrap items-center gap-3 self-start xl:self-center">
                        {/* Custom Range: Dedicated Big Status Action Button */}
                        {isCustom && (
                          <button
                            onClick={() => handleToggle(routine, now)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs ${
                              status.isCompleted
                                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                                : status.isInsideWindow
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 ring-2 ring-blue-500/30'
                                : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/60'
                            }`}
                            title={status.isCompleted ? 'Klik untuk membatalkan status selesai siklus ini' : 'Klik untuk menandai rutinitas selesai untuk siklus ini'}
                          >
                            {status.isCompleted ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>Selesai ({status.completedDateFormatted})</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-4 h-4 text-zinc-400 shrink-0" />
                                <span>{status.isInsideWindow ? `Selesaikan (Tgl ${startDay}-${endDay})` : `Selesaikan Periode Tgl ${startDay}-${endDay}`}</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* 7-Day Checklist Buttons */}
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
                          {currentWeekDays.map((d) => {
                            const isSpecificDateDone = routine.completedDates.includes(d.dayStr);
                            const isInRange = isCustom 
                              ? isDayInMonthRange(d.dayOfMonth, startDay, endDay)
                              : true;

                            // Jika custom_range dan sudah selesai bulan ini, hari dalam rentang dianggap fulfilled
                            const isFulfilled = isCustom 
                              ? (isInRange && status.isCompleted)
                              : isSpecificDateDone;

                            return (
                              <button
                                key={d.dayStr}
                                onClick={() => handleToggle(routine, d.dayStr)}
                                className={`w-8 h-10 rounded-lg flex flex-col items-center justify-center transition cursor-pointer ${
                                  isFulfilled
                                    ? isSpecificDateDone
                                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                                      : 'bg-blue-900/40 text-blue-300 border border-blue-700/50'
                                    : d.isToday
                                    ? isInRange
                                      ? 'bg-blue-950/80 text-blue-400 border border-blue-500/80'
                                      : 'bg-zinc-850 text-zinc-300 border border-zinc-700'
                                    : isInRange && isCustom
                                    ? 'text-blue-400/80 hover:bg-blue-950/40 border border-dashed border-blue-800/40'
                                    : 'text-zinc-500 hover:bg-zinc-800'
                                }`}
                                title={
                                  isCustom
                                    ? `${d.label} (${d.dayStr}) - ${isInRange ? `Dalam rentang tgl ${startDay}-${endDay}` : 'Di luar rentang'}`
                                    : `${d.label} (${d.dayStr})`
                                }
                              >
                                <span className="text-[9px] font-medium leading-none mb-1">
                                  {d.label}
                                </span>
                                {isFulfilled ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <span className="text-[10px] tabular-nums font-mono">
                                    {d.dayNum}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            onClick={() => onOpenRoutineModal(routine)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                            title="Ubah"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoutine(routine.id, routine.title)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
