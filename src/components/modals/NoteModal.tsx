import React, { useState, useEffect } from 'react';
import { X, Pin } from 'lucide-react';
import { db } from '../../db';
import type { Note, NoteCategory } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteToEdit?: Note | null;
  defaultProjectId?: string;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  noteToEdit,
  defaultProjectId
}) => {
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoteCategory>('strategy');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [isPinned, setIsPinned] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (noteToEdit) {
      setTitle(noteToEdit.title);
      setContent(noteToEdit.content);
      setCategory(noteToEdit.category);
      setProjectId(noteToEdit.projectId || '');
      setIsPinned(noteToEdit.isPinned);
      setTagsInput(noteToEdit.tags?.join(', ') || '');
    } else {
      setTitle('');
      setContent('');
      setCategory('strategy');
      setProjectId(defaultProjectId || '');
      setIsPinned(false);
      setTagsInput('');
    }
  }, [noteToEdit, defaultProjectId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const nowIso = new Date().toISOString();
    const noteData: Note = {
      id: noteToEdit?.id || `note-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      category,
      projectId: projectId || undefined,
      isPinned,
      tags,
      createdAt: noteToEdit?.createdAt || nowIso,
      updatedAt: nowIso
    };

    await db.notes.put(noteData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {noteToEdit ? 'Ubah Catatan / Dokumen' : 'Buat Catatan Bisnis Baru'}
            </h2>
            <p className="text-xs text-zinc-400">
              Dokumentasikan strategi, SOP, risalah rapat, atau ide cepat Mahada Indonesia
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
              Judul Catatan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Strategi Penetrasi Pasar B2B Q4 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Kategori Dokumen
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NoteCategory)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              >
                <option value="strategy">Strategi Bisnis (Strategy)</option>
                <option value="meeting_notes">Risalah Rapat (Meeting Notes)</option>
                <option value="sop">Standar Operasional (SOP)</option>
                <option value="idea">Ide & Brainstorming</option>
                <option value="brief">Brief Proyek & Klien</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Tautkan ke Proyek (Opsional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              >
                <option value="">(Catatan Umum / Perusahaan)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-zinc-300">
                Isi Dokumen (Mendukung Markdown)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-blue-600 focus:ring-0"
                />
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-400 fill-amber-400' : 'text-zinc-500'}`} />
                <span>Sematkan di Atas (Pin)</span>
              </label>
            </div>
            <textarea
              rows={8}
              required
              placeholder="Tuliskan poin penting, kerangka tindakan, keputusan, atau ringkasan diskusi..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 focus:border-blue-500 focus:outline-none resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Tag (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              placeholder="Finansial, Sales, SOP, Q4"
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
              {noteToEdit ? 'Simpan Perubahan' : 'Simpan Catatan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
