import React, { useState } from 'react';
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
  Trash2
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { db } from '../../db';
import type { Routine, RoutineTimeOfDay } from '../../types';

interface RoutinesViewProps {
  onOpenRoutineModal: (routine?: Routine) => void;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  onOpenRoutineModal
}) => {
  const routines = useLiveQuery(() => db.routines.toArray()) ?? [];

  const currentWeekDays = [
    { dayStr: '2026-10-12', label: 'Sen', dayNum: '12' },
    { dayStr: '2026-10-13', label: 'Sel', dayNum: '13' },
    { dayStr: '2026-10-14', label: 'Rab', dayNum: '14' },
    { dayStr: '2026-10-15', label: 'Kam', dayNum: '15' },
    { dayStr: '2026-10-16', label: 'Jum', dayNum: '16', isToday: true },
    { dayStr: '2026-10-17', label: 'Sab', dayNum: '17' },
    { dayStr: '2026-10-18', label: 'Min', dayNum: '18' },
  ];

  const handleToggleDay = async (routine: Routine, dateStr: string) => {
    const isCompleted = routine.completedDates.includes(dateStr);
    let nextDates = [...routine.completedDates];
    let nextStreak = routine.streak;

    if (isCompleted) {
      nextDates = nextDates.filter(d => d !== dateStr);
      nextStreak = Math.max(0, nextStreak - 1);
    } else {
      nextDates.push(dateStr);
      nextStreak += 1;
      confetti({ particleCount: 25, spread: 45, origin: { y: 0.7 } });
    }

    await db.routines.update(routine.id, {
      completedDates: nextDates,
      streak: nextStreak
    });
  };

  const handleDeleteRoutine = async (id: string, title: string) => {
    if (window.confirm(`Hapus rutinitas "${title}"?`)) {
      await db.routines.delete(id);
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
          <h1 className="text-xl font-bold tracking-tight text-white">
            Rutinitas & Kebiasaan Eksekutif
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Bangun kedisiplinan operasional melalui kebiasaan harian, review berkala, dan evaluasi fokus Personal Project.
          </p>
        </div>

        <button
          onClick={() => onOpenRoutineModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs self-start sm:self-auto"
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
                  const thisWeekCompletedCount = currentWeekDays.filter(d => routine.completedDates.includes(d.dayStr)).length;
                  const progressPercent = Math.round((thisWeekCompletedCount / routine.targetDaysPerWeek) * 100);

                  return (
                    <div 
                      key={routine.id}
                      className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Routine Details */}
                      <div className="min-w-0 max-w-md">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-semibold text-white">
                            {routine.title}
                          </h3>
                          <div className="flex items-center gap-0.5 text-[11px] text-amber-400 font-semibold tabular-nums">
                            <Flame className="w-3 h-3 fill-amber-400" />
                            <span>{routine.streak}</span>
                          </div>
                        </div>

                        {routine.description && (
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {routine.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-zinc-500">
                          <span>{routine.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>Target: {routine.targetDaysPerWeek} hari/minggu</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-zinc-300">
                            Tercapai: {thisWeekCompletedCount}/{routine.targetDaysPerWeek} ({progressPercent}%)
                          </span>
                        </div>
                      </div>

                      {/* 7-Day Checklist Buttons */}
                      <div className="flex items-center gap-2 self-start lg:self-center">
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
                          {currentWeekDays.map((d) => {
                            const isDone = routine.completedDates.includes(d.dayStr);

                            return (
                              <button
                                key={d.dayStr}
                                onClick={() => handleToggleDay(routine, d.dayStr)}
                                className={`w-8 h-10 rounded-lg flex flex-col items-center justify-center transition ${
                                  isDone
                                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                                    : d.isToday
                                    ? 'bg-blue-950/60 text-blue-400 border border-blue-800/80'
                                    : 'text-zinc-500 hover:bg-zinc-800'
                                }`}
                                title={`${d.label} (${d.dayStr})`}
                              >
                                <span className="text-[9px] font-medium leading-none mb-1">
                                  {d.label}
                                </span>
                                {isDone ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
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
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => onOpenRoutineModal(routine)}
                            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                            title="Ubah"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoutine(routine.id, routine.title)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition"
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
