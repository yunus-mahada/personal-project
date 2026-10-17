import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../../db';
import type { Project, ProjectPriority, ProjectStatus } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  defaultGoalId?: string;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  defaultGoalId
}) => {
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalId, setGoalId] = useState(defaultGoalId || '');
  const [status, setStatus] = useState<ProjectStatus>('in_progress');
  const [priority, setPriority] = useState<ProjectPriority>('high');
  const [startDate, setStartDate] = useState('2026-10-16');
  const [dueDate, setDueDate] = useState('2026-11-30');
  const [category, setCategory] = useState('Inisiatif Strategis');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (projectToEdit) {
      setTitle(projectToEdit.title);
      setDescription(projectToEdit.description);
      setGoalId(projectToEdit.goalId || '');
      setStatus(projectToEdit.status);
      setPriority(projectToEdit.priority);
      setStartDate(projectToEdit.startDate);
      setDueDate(projectToEdit.dueDate);
      setCategory(projectToEdit.category);
      setTagsInput(projectToEdit.tags?.join(', ') || '');
    } else {
      setTitle('');
      setDescription('');
      setGoalId(defaultGoalId || '');
      setStatus('in_progress');
      setPriority('high');
      setStartDate('2026-10-16');
      setDueDate('2026-11-30');
      setCategory('Inisiatif Strategis');
      setTagsInput('');
    }
  }, [projectToEdit, defaultGoalId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const nowIso = new Date().toISOString();
    const projData: Project = {
      id: projectToEdit?.id || `proj-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      goalId: goalId || undefined,
      status,
      priority,
      startDate,
      dueDate,
      category: category.trim() || 'Inisiatif',
      tags,
      createdAt: projectToEdit?.createdAt || nowIso,
      updatedAt: nowIso
    };

    await db.projects.put(projData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {projectToEdit ? 'Ubah Rincian Proyek' : 'Tambah Proyek Baru'}
            </h2>
            <p className="text-xs text-zinc-400">
              Proyek menampung sekumpulan tugas dan dapat ditautkan ke Sasaran Bisnis
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
              Nama Proyek <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Redesain UI/UX Dashboard V2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Deskripsi & Lingkup Kerja
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan tujuan akhir proyek, deliverable kunci..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Tautkan ke Sasaran (Goal)
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">(Proyek Independen)</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Kategori
              </label>
              <input
                type="text"
                placeholder="Penjualan, Engineering, Marketing"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              >
                <option value="planning">Perencanaan</option>
                <option value="in_progress">Sedang Berjalan</option>
                <option value="review">Dalam Tinjauan</option>
                <option value="completed">Selesai</option>
                <option value="on_hold">Ditunda</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Prioritas</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              >
                <option value="urgent">Mendesak</option>
                <option value="high">Tinggi</option>
                <option value="medium">Sedang</option>
                <option value="low">Rendah</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Tenggat Waktu</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Tag Proyek (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              placeholder="Enterprise, SaaS, Q4"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
            />
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
              {projectToEdit ? 'Simpan Perubahan' : 'Buat Proyek'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
