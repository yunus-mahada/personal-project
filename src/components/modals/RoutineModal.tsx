import React, { useState, useEffect } from 'react';
import { X, Calendar, Info } from 'lucide-react';
import { db } from '../../db';
import type { Routine, RoutineFrequency, RoutineTimeOfDay } from '../../types';
import { cloudUpsertRoutine } from '../../lib/supabase';

interface RoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  routineToEdit?: Routine | null;
}

export const RoutineModal: React.FC<RoutineModalProps> = ({
  isOpen,
  onClose,
  routineToEdit
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<RoutineFrequency>('workdays');
  const [timeOfDay, setTimeOfDay] = useState<RoutineTimeOfDay>('morning');
  const [category, setCategory] = useState('Produktivitas');
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(5);
  const [startDay, setStartDay] = useState<number>(7);
  const [endDay, setEndDay] = useState<number>(10);

  useEffect(() => {
    if (routineToEdit) {
      setTitle(routineToEdit.title);
      setDescription(routineToEdit.description || '');
      setFrequency(routineToEdit.frequency);
      setTimeOfDay(routineToEdit.timeOfDay);
      setCategory(routineToEdit.category);
      setTargetDaysPerWeek(routineToEdit.targetDaysPerWeek);
      setStartDay(routineToEdit.startDay ?? 7);
      setEndDay(routineToEdit.endDay ?? 10);
    } else {
      setTitle('');
      setDescription('');
      setFrequency('workdays');
      setTimeOfDay('morning');
      setCategory('Produktivitas');
      setTargetDaysPerWeek(5);
      setStartDay(7);
      setEndDay(10);
    }
  }, [routineToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const parsedStart = Math.min(31, Math.max(1, Number(startDay) || 1));
    const parsedEnd = Math.min(31, Math.max(1, Number(endDay) || parsedStart));
    const actualStart = Math.min(parsedStart, parsedEnd);
    const actualEnd = Math.max(parsedStart, parsedEnd);

    const nowIso = new Date().toISOString();
    const routineData: Routine = {
      id: routineToEdit?.id || `rtn-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      frequency,
      timeOfDay,
      category: category.trim() || 'Bisnis',
      targetDaysPerWeek: frequency === 'custom_range' ? 1 : (Number(targetDaysPerWeek) || 5),
      startDay: frequency === 'custom_range' ? actualStart : undefined,
      endDay: frequency === 'custom_range' ? actualEnd : undefined,
      completedDates: routineToEdit?.completedDates || [],
      streak: routineToEdit?.streak || 0,
      createdAt: routineToEdit?.createdAt || nowIso
    };

    await db.routines.put(routineData);
    cloudUpsertRoutine(routineData).catch(console.error);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {routineToEdit ? 'Ubah Rutinitas Bisnis' : 'Tambah Rutinitas Harian Baru'}
            </h2>
            <p className="text-xs text-zinc-400">
              Kebiasaan dan ritual eksekutif harian berulang
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Nama Rutinitas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Tinjauan Saldo Kas Pagi (15 Menit)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Tujuan & Manfaat Bisnis
            </label>
            <textarea
              rows={2}
              placeholder="Mengapa kebiasaan ini krusial untuk performa bisnis Personal Project?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Frekuensi</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RoutineFrequency)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              >
                <option value="workdays">Hari Kerja (Senin - Jumat)</option>
                <option value="daily">Setiap Hari (7 Hari)</option>
                <option value="weekly">Mingguan (Sekali Seminggu)</option>
                <option value="custom_range">📅 Custom Tanggal Bulanan (Misal Tgl 7 - 10)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Waktu Pelaksanaan</label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value as RoutineTimeOfDay)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              >
                <option value="morning">Pagi Hari (Morning Ritual)</option>
                <option value="afternoon">Siang / Sore Hari</option>
                <option value="evening">Malam Hari (Evening Reflection)</option>
              </select>
            </div>
          </div>

          {/* Konfigurasi Rentang Tanggal jika custom_range */}
          {frequency === 'custom_range' && (
            <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-800/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Pengaturan Rentang Tanggal Bulanan</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Mulai Tanggal (1 - 31) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={startDay}
                    onChange={(e) => setStartDay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Contoh: 7"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Sampai Tanggal (1 - 31) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={endDay}
                    onChange={(e) => setEndDay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Contoh: 10"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1.5">Preset Rutinitas Bulanan:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setStartDay(7); setEndDay(10); }}
                    className="px-2 py-1 text-[10px] rounded-md bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition cursor-pointer"
                  >
                    📌 Tgl 7 - 10 (Pajak PPh / PPN)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStartDay(1); setEndDay(5); }}
                    className="px-2 py-1 text-[10px] rounded-md bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition cursor-pointer"
                  >
                    📊 Tgl 1 - 5 (Review Awal Bulan)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStartDay(25); setEndDay(25); }}
                    className="px-2 py-1 text-[10px] rounded-md bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition cursor-pointer"
                  >
                    💼 Tgl 25 (Payroll / Gaji)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStartDay(28); setEndDay(31); }}
                    className="px-2 py-1 text-[10px] rounded-md bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/60 transition cursor-pointer"
                  >
                    📑 Tgl 28 - 31 (Tutup Buku)
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800/80 text-[11px] text-zinc-300 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Logika Penyelesaian Fleksibel:</p>
                  <p className="text-zinc-400 mt-0.5">
                    Rutinitas berlaku setiap bulan dari tanggal <strong className="text-blue-300">{Math.min(startDay, endDay)} s/d {Math.max(startDay, endDay)}</strong>. Jika Anda menyelesaikan di salah satu tanggal tersebut (misal tgl 8), maka rutinitas untuk siklus bulan tersebut otomatis berstatus <span className="text-emerald-400 font-semibold">Selesai</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Kategori</label>
              <input
                type="text"
                placeholder="Keuangan, Pajak, Sales, Mindset"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                {frequency === 'custom_range' ? 'Target Penyelesaian' : 'Target Hari / Minggu'}
              </label>
              {frequency === 'custom_range' ? (
                <div className="px-3 py-2 text-xs rounded-lg border border-zinc-800 bg-zinc-950/80 text-emerald-400 font-medium">
                  ✓ 1x per siklus bulan
                </div>
              ) : (
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={targetDaysPerWeek}
                  onChange={(e) => setTargetDaysPerWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs"
            >
              {routineToEdit ? 'Simpan Perubahan' : 'Buat Rutinitas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
