import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export function formatCurrency(amount: number, currency: 'IDR' | 'USD' | 'EUR' | 'SGD' = 'IDR'): string {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDateIndo(dateStr?: string | Date): string {
  if (!dateStr) return '-';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (isNaN(d.getTime())) return '-';

    if (isToday(d)) return 'Hari ini';
    if (isTomorrow(d)) return 'Besok';
    if (isYesterday(d)) return 'Kemarin';

    return format(d, 'd MMM yyyy', { locale: id });
  } catch {
    return '-';
  }
}

export function formatDateTimeIndo(dateTimeStr?: string): string {
  if (!dateTimeStr) return '-';
  try {
    const d = parseISO(dateTimeStr);
    if (isNaN(d.getTime())) return '-';
    return format(d, 'd MMM yyyy, HH:mm', { locale: id });
  } catch {
    return '-';
  }
}

export function formatTimeOnly(dateTimeStr?: string): string {
  if (!dateTimeStr) return '';
  try {
    const d = parseISO(dateTimeStr);
    if (isNaN(d.getTime())) return '';
    return format(d, 'HH:mm', { locale: id });
  } catch {
    return '';
  }
}

export function formatMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}j ${remainingMinutes}m` : `${hours}j`;
}

// Status labels & badges in Indonesian

export const PROJECT_STATUS_LABELS: Record<string, { label: string; textClass: string }> = {
  planning: { label: 'Perencanaan', textClass: 'text-zinc-400' },
  in_progress: { label: 'Sedang Berjalan', textClass: 'text-blue-400' },
  review: { label: 'Dalam Tinjauan', textClass: 'text-amber-400' },
  completed: { label: 'Selesai', textClass: 'text-emerald-400' },
  on_hold: { label: 'Ditunda', textClass: 'text-zinc-400' }
};

export const TASK_STATUS_LABELS: Record<string, { label: string; textClass: string }> = {
  todo: { label: 'Untuk Dikerjakan', textClass: 'text-zinc-400' },
  in_progress: { label: 'Sedang Berjalan', textClass: 'text-blue-400' },
  in_review: { label: 'Dalam Tinjauan', textClass: 'text-amber-400' },
  done: { label: 'Selesai', textClass: 'text-emerald-400' }
};

export const PRIORITY_LABELS: Record<string, { label: string; textClass: string }> = {
  urgent: { label: 'Mendesak', textClass: 'text-rose-400' },
  high: { label: 'Tinggi', textClass: 'text-amber-400' },
  medium: { label: 'Sedang', textClass: 'text-blue-400' },
  low: { label: 'Rendah', textClass: 'text-zinc-400' }
};

export const CALENDAR_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  deep_work: { label: 'Deep Work', color: '#2563eb' },
  meeting: { label: 'Rapat / Koordinasi', color: '#7c3aed' },
  client: { label: 'Pertemuan Klien', color: '#059669' },
  milestone: { label: 'Milestone Bisnis', color: '#d97706' },
  review: { label: 'Evaluasi & Tinjauan', color: '#0284c7' },
  routine: { label: 'Rutinitas Bisnis', color: '#0d9488' }
};

export const EISENHOWER_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  do_first: { label: 'Prioritas Utama', desc: 'Mendesak & Penting (Lakukan Segera)', color: '#dc2626' },
  schedule: { label: 'Jadwalkan', desc: 'Penting, Tidak Mendesak (Rencanakan Waktu)', color: '#2563eb' },
  delegate: { label: 'Delegasikan', desc: 'Mendesak, Kurang Penting (Alihkan jika bisa)', color: '#d97706' },
  dont_do: { label: 'Eliminasi', desc: 'Tidak Mendesak & Tidak Penting (Tinggalkan)', color: '#6b7280' }
};

export const TASK_CATEGORY_LABELS: Record<string, { label: string; textClass: string; bgClass: string; borderClass: string; dotColor: string; color: string }> = {
  Meeting: {
    label: 'Meeting',
    textClass: 'text-purple-300',
    bgClass: 'bg-purple-950/60',
    borderClass: 'border-purple-800/80',
    dotColor: '#a855f7',
    color: '#9333ea'
  },
  Evaluasi: {
    label: 'Evaluasi',
    textClass: 'text-amber-300',
    bgClass: 'bg-amber-950/60',
    borderClass: 'border-amber-800/80',
    dotColor: '#f59e0b',
    color: '#d97706'
  },
  Tugas: {
    label: 'Tugas',
    textClass: 'text-blue-300',
    bgClass: 'bg-blue-950/60',
    borderClass: 'border-blue-800/80',
    dotColor: '#3b82f6',
    color: '#2563eb'
  }
};
