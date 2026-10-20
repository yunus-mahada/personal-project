import React, { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import { db } from '../../db';
import { cloudUpsertProject } from '../../lib/supabase';
import type { Project, ProjectPriority, ProjectStatus } from '../../types';
import { DEFAULT_GOAL_CATEGORIES } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit
}) => {
  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const availableCategories = (settings?.goalCategories && Array.isArray(settings.goalCategories))
    ? settings.goalCategories
    : [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('in_progress');
  const [priority, setPriority] = useState<ProjectPriority>('high');
  const [startDate, setStartDate] = useState('2026-10-16');
  const [dueDate, setDueDate] = useState('2026-11-30');
  const [category, setCategory] = useState(availableCategories[0] || 'Operasional');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (projectToEdit) {
      setTitle(projectToEdit.title);
      setDescription(projectToEdit.description);
      setStatus(projectToEdit.status);
      setPriority(projectToEdit.priority);
      setStartDate(projectToEdit.startDate);
      setDueDate(projectToEdit.dueDate);
      setCategory(projectToEdit.category || availableCategories[0] || 'Operasional');
      setTagsInput(projectToEdit.tags?.join(', ') || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus('in_progress');
      setPriority('high');
      setStartDate('2026-10-16');
      setDueDate('2026-11-30');
      setCategory(availableCategories[0] || 'Operasional');
      setTagsInput('');
    }
  }, [projectToEdit, isOpen, availableCategories]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const nowIso = new Date().toISOString();
    const projData: Project = {
      id: projectToEdit?.id || `proj-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      startDate,
      dueDate,
      category: category.trim() || availableCategories[0] || 'Operasional',
      tags,
      createdAt: projectToEdit?.createdAt || nowIso,
      updatedAt: nowIso
    };

    setIsSubmitting(true);
    try {
      // 1. Simpan langsung ke Supabase Cloud (Primary Store)
      await cloudUpsertProject(projData);
      // 2. Simpan ke local cache untuk responsivitas UI
      await db.projects.put(projData);
      onClose();
    } catch (err: any) {
      console.error('Error saving project to Supabase:', err);
      alert(`Gagal menyimpan proyek ke Supabase: ${err.message || 'Cek koneksi Supabase Anda'}`);
    } finally {
      setIsSubmitting(false);
    }
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
              Kelola inisiatif bisnis dengan kategori dari pengaturan & tugas operasional
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

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                <span>Kategori Bisnis (Dari Pengaturan)</span>
              </span>
              <span className="text-[10px] text-zinc-500">Kelola di menu Pengaturan</span>
            </label>
            {availableCategories.length > 0 ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Ketik kategori proyek (atau tambah di Pengaturan)..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            )}
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
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? 'Menyimpan ke Cloud...' : (projectToEdit ? 'Simpan Perubahan' : 'Buat Proyek')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
