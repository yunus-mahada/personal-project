import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Routine } from '../types';

export interface RoutineStatusResult {
  isDueToday: boolean;
  isCompleted: boolean;
  completedDate?: string;
  completedDateFormatted?: string;
  badgeText: string;
  scheduleDescription: string;
  isCustomRange: boolean;
  isInsideWindow: boolean;
}

/**
 * Memeriksa apakah tanggal berada di dalam rentang hari bulanan (startDay s/d endDay).
 */
export function isDayInMonthRange(dayOfMonth: number, startDay: number, endDay: number): boolean {
  if (startDay <= endDay) {
    return dayOfMonth >= startDay && dayOfMonth <= endDay;
  }
  // Menangani kasus cross-month jika ada (contoh: tgl 28 s/d tgl 5)
  return dayOfMonth >= startDay || dayOfMonth <= endDay;
}

/**
 * Mendapatkan status lengkap rutinitas untuk tanggal tertentu (default: hari ini).
 */
export function getRoutineStatus(routine: Routine, date: Date = new Date()): RoutineStatusResult {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu

  if (routine.frequency === 'custom_range') {
    const start = routine.startDay ?? 1;
    const end = routine.endDay ?? start;
    const isInsideWindow = isDayInMonthRange(dayOfMonth, start, end);
    const currentYearMonth = format(date, 'yyyy-MM');

    // Cari tanggal penyelesaian pada bulan yang sama
    const completedDate = routine.completedDates?.find(d => d.startsWith(currentYearMonth));
    const isCompleted = Boolean(completedDate);

    let completedDateFormatted: string | undefined;
    if (completedDate) {
      try {
        completedDateFormatted = format(parseISO(completedDate), 'd MMM', { locale: id });
      } catch {
        completedDateFormatted = completedDate;
      }
    }

    const rangeText = start === end ? `Tgl ${start}` : `Tgl ${start} - ${end}`;
    const scheduleDesc = start === end 
      ? `Setiap tgl ${start} bulanan` 
      : `Setiap tgl ${start} - ${end} bulanan`;

    return {
      isDueToday: isInsideWindow || isCompleted,
      isCompleted,
      completedDate,
      completedDateFormatted,
      badgeText: rangeText,
      scheduleDescription: scheduleDesc,
      isCustomRange: true,
      isInsideWindow
    };
  }

  if (routine.frequency === 'weekly') {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

    const completedDate = routine.completedDates?.find(d => {
      try {
        const itemDate = parseISO(d);
        return isWithinInterval(itemDate, { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });

    const isCompleted = Boolean(completedDate);
    let completedDateFormatted: string | undefined;
    if (completedDate) {
      try {
        completedDateFormatted = format(parseISO(completedDate), 'd MMM', { locale: id });
      } catch {
        completedDateFormatted = completedDate;
      }
    }

    return {
      isDueToday: true,
      isCompleted,
      completedDate,
      completedDateFormatted,
      badgeText: 'Mingguan',
      scheduleDescription: 'Sekali seminggu',
      isCustomRange: false,
      isInsideWindow: true
    };
  }

  if (routine.frequency === 'workdays') {
    const isWorkday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isCompleted = routine.completedDates?.includes(dateStr) ?? false;

    return {
      isDueToday: isWorkday,
      isCompleted,
      completedDate: isCompleted ? dateStr : undefined,
      completedDateFormatted: isCompleted ? format(date, 'd MMM', { locale: id }) : undefined,
      badgeText: 'Hari Kerja',
      scheduleDescription: 'Senin - Jumat',
      isCustomRange: false,
      isInsideWindow: isWorkday
    };
  }

  // Default: daily
  const isCompleted = routine.completedDates?.includes(dateStr) ?? false;
  return {
    isDueToday: true,
    isCompleted,
    completedDate: isCompleted ? dateStr : undefined,
    completedDateFormatted: isCompleted ? format(date, 'd MMM', { locale: id }) : undefined,
    badgeText: 'Setiap Hari',
    scheduleDescription: '7 hari seminggu',
    isCustomRange: false,
    isInsideWindow: true
  };
}

/**
 * Toggle penyelesaian rutinitas (mendukung harian, hari kerja, mingguan, & custom_range).
 * Mengembalikan objek routine yang sudah diperbarui dan boolean apakah baru saja diselesaikan.
 */
export function toggleRoutineCompletion(
  routine: Routine, 
  targetDate: Date = new Date()
): { updatedRoutine: Routine; isNowCompleted: boolean } {
  const targetDateStr = format(targetDate, 'yyyy-MM-dd');

  if (routine.frequency === 'custom_range') {
    const currentYearMonth = format(targetDate, 'yyyy-MM');
    const existingDate = routine.completedDates?.find(d => d.startsWith(currentYearMonth));

    let nextDates = [...(routine.completedDates || [])];
    let nextStreak = routine.streak || 0;
    let isNowCompleted = false;

    if (existingDate) {
      // Batalkan penyelesaian untuk siklus bulan ini
      nextDates = nextDates.filter(d => d !== existingDate);
      nextStreak = Math.max(0, nextStreak - 1);
      isNowCompleted = false;
    } else {
      // Tandai selesai untuk siklus bulan ini pada tanggal targetDate (misal tgl 8)
      nextDates.push(targetDateStr);
      nextStreak += 1;
      isNowCompleted = true;
    }

    return {
      updatedRoutine: {
        ...routine,
        completedDates: nextDates,
        streak: nextStreak
      },
      isNowCompleted
    };
  }

  if (routine.frequency === 'weekly') {
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    const existingDate = routine.completedDates?.find(d => {
      try {
        return isWithinInterval(parseISO(d), { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });

    let nextDates = [...(routine.completedDates || [])];
    let nextStreak = routine.streak || 0;
    let isNowCompleted = false;

    if (existingDate) {
      nextDates = nextDates.filter(d => d !== existingDate);
      nextStreak = Math.max(0, nextStreak - 1);
      isNowCompleted = false;
    } else {
      nextDates.push(targetDateStr);
      nextStreak += 1;
      isNowCompleted = true;
    }

    return {
      updatedRoutine: {
        ...routine,
        completedDates: nextDates,
        streak: nextStreak
      },
      isNowCompleted
    };
  }

  // Daily or Workdays
  const isDone = routine.completedDates?.includes(targetDateStr) ?? false;
  let nextDates = [...(routine.completedDates || [])];
  let nextStreak = routine.streak || 0;

  if (isDone) {
    nextDates = nextDates.filter(d => d !== targetDateStr);
    nextStreak = Math.max(0, nextStreak - 1);
  } else {
    nextDates.push(targetDateStr);
    nextStreak += 1;
  }

  return {
    updatedRoutine: {
      ...routine,
      completedDates: nextDates,
      streak: nextStreak
    },
    isNowCompleted: !isDone
  };
}
