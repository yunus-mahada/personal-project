import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { DEFAULT_GOAL_CATEGORIES, type Goal, type GoalCategory, type GoalStatus, type GoalPriority } from '../../types';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit?: Goal | null;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  goalToEdit
}) => {
  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const availableCategories = settings?.goalCategories && settings.goalCategories.length > 0
    ? settings.goalCategories
    : DEFAULT_GOAL_CATEGORIES;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('Pendapatan (Revenue)');
  const [targetValue, setTargetValue] = useState(100);
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('Juta Rp');
  const [deadline, setDeadline] = useState('2026-12-31');
  const [status, setStatus] = useState<GoalStatus>('on_track');
  const [priority, setPriority] = useState<GoalPriority>('high');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (goalToEdit) {
      setTitle(goalToEdit.title);
      setDescription(goalToEdit.description);
      setCategory(goalToEdit.category);
      setTargetValue(goalToEdit.targetValue);
      setCurrentValue(goalToEdit.currentValue);
      setUnit(goalToEdit.unit);
      setDeadline(goalToEdit.deadline);
      setStatus(goalToEdit.status);
      setPriority(goalToEdit.priority);
      setColor(goalToEdit.color || '#3b82f6');
    } else {
      setTitle('');
      setDescription('');
      setCategory(availableCategories[0] || 'Pendapatan (Revenue)');
      setTargetValue(100);
      setCurrentValue(0);
      setUnit('Juta Rp');
      setDeadline('2026-12-31');
      setStatus('on_track');
      setPriority('high');
      setColor('#3b82f6');
    }
  }, [goalToEdit, isOpen, availableCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const nowIso = new Date().toISOString();
    const goalData: Goal = {
      id: goalToEdit?.id || `goal-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      targetValue: Number(targetValue) || 1,
      currentValue: Number(currentValue) || 0,
      unit: unit.trim() || 'Unit',
      deadline,
      status,
      priority,
      color,
      createdAt: goalToEdit?.createdAt || nowIso,
      updatedAt: nowIso
    };

    await db.goals.put(goalData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {goalToEdit ? 'Ubah Sasaran Bisnis' : 'Tambah Sasaran Bisnis Baru'}
            </h2>
            <p className="text-xs text-zinc-400">
              Sasaran utama (Goal) Mahada Indonesia memayungi proyek dan metrik target
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
              Judul Sasaran Bisnis <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Mencapai Omzet Rp 500 Juta di Q4 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Deskripsi Strategis
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan alasan, strategi utama, dan dampak pada pertumbuhan bisnis..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Kategori Bisnis
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              >
                {!availableCategories.includes(category) && (
                  <option value={category}>{category}</option>
                )}
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Tenggat Target (Deadline)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Quantitative Metrics Tracking */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Target Kuantitatif & Progres
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Nilai Sekarang</label>
                <input
                  type="number"
                  step="any"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-700 bg-zinc-900 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Nilai Target</label>
                <input
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-700 bg-zinc-900 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Satuan</label>
                <input
                  type="text"
                  placeholder="Juta Rp, Klien, %"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-700 bg-zinc-900 text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as GoalStatus)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              >
                <option value="on_track">Sesuai Target</option>
                <option value="at_risk">Perlu Perhatian</option>
                <option value="behind">Tertinggal</option>
                <option value="completed">Tercapai</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Prioritas</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as GoalPriority)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              >
                <option value="high">Tinggi</option>
                <option value="medium">Sedang</option>
                <option value="low">Rendah</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Warna Aksen</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-8 rounded-lg border border-zinc-700 bg-zinc-950 cursor-pointer p-0.5"
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
              {goalToEdit ? 'Simpan Perubahan' : 'Buat Sasaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
