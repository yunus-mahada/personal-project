import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../../db';
import type { Routine, RoutineFrequency, RoutineTimeOfDay } from '../../types';

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

  useEffect(() => {
    if (routineToEdit) {
      setTitle(routineToEdit.title);
      setDescription(routineToEdit.description || '');
      setFrequency(routineToEdit.frequency);
      setTimeOfDay(routineToEdit.timeOfDay);
      setCategory(routineToEdit.category);
      setTargetDaysPerWeek(routineToEdit.targetDaysPerWeek);
    } else {
      setTitle('');
      setDescription('');
      setFrequency('workdays');
      setTimeOfDay('morning');
      setCategory('Produktivitas');
      setTargetDaysPerWeek(5);
    }
  }, [routineToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const nowIso = new Date().toISOString();
    const routineData: Routine = {
      id: routineToEdit?.id || `rtn-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      frequency,
      timeOfDay,
      category: category.trim() || 'Bisnis',
      targetDaysPerWeek: Number(targetDaysPerWeek) || 5,
      completedDates: routineToEdit?.completedDates || [],
      streak: routineToEdit?.streak || 0,
      createdAt: routineToEdit?.createdAt || nowIso
    };

    await db.routines.put(routineData);
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
              placeholder="Mengapa kebiasaan ini krusial untuk performa bisnis Mahada Indonesia?"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Kategori</label>
              <input
                type="text"
                placeholder="Keuangan, Sales, Mindset"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Target Hari / Minggu</label>
              <input
                type="number"
                min="1"
                max="7"
                value={targetDaysPerWeek}
                onChange={(e) => setTargetDaysPerWeek(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
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
