import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Pin, 
  Search, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  FolderKanban 
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { Note, NoteCategory } from '../../types';
import { formatDateIndo } from '../../utils/formatters';
import { cloudUpsertNote, cloudDeleteNote } from '../../lib/supabase';

interface NotesViewProps {
  onOpenNoteModal: (note?: Note) => void;
  selectedNoteId?: string | null;
}

export const NotesView: React.FC<NotesViewProps> = ({
  onOpenNoteModal,
  selectedNoteId
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const notes = useLiveQuery(() => db.notes.toArray()) ?? [];
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];

  const filteredNotes = notes.filter(n => {
    if (selectedCategory !== 'all' && n.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTags = n.tags?.some(tag => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTags) return false;
    }
    return true;
  });

  const pinnedNotes = filteredNotes.filter(n => n.isPinned);
  const regularNotes = filteredNotes.filter(n => !n.isPinned);

  const handleTogglePin = async (note: Note) => {
    const updatedNote: Note = {
      ...note,
      isPinned: !note.isPinned,
      updatedAt: new Date().toISOString()
    };
    try {
      await cloudUpsertNote(updatedNote);
      await db.notes.put(updatedNote);
    } catch (err: any) {
      console.error('Gagal memperbarui pin catatan di Supabase:', err);
      alert(`Gagal menyimpan perubahan ke Supabase: ${err.message || 'Cek koneksi internet'}`);
    }
  };

  const handleDeleteNote = async (id: string, title: string) => {
    if (window.confirm(`Hapus catatan "${title}"?`)) {
      try {
        await cloudDeleteNote(id);
        await db.notes.delete(id);
      } catch (err: any) {
        console.error('Gagal menghapus catatan dari Supabase:', err);
        alert(`Gagal menghapus catatan dari Supabase: ${err.message || 'Cek koneksi internet'}`);
      }
    }
  };

  const handleCopyContent = (note: Note) => {
    navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories: { id: NoteCategory; label: string }[] = [
    { id: 'strategy', label: 'Strategi Bisnis' },
    { id: 'meeting_notes', label: 'Risalah Rapat' },
    { id: 'sop', label: 'Standar Operasional (SOP)' },
    { id: 'idea', label: 'Ide & Inovasi' },
    { id: 'brief', label: 'Brief Proyek' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Catatan & Dokumen Bisnis
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Knowledge base terpusat Personal Project untuk SOP, strategi penetrasi pasar, risalah rapat, dan dokumentasi operasional.
          </p>
        </div>

        <button
          onClick={() => onOpenNoteModal()}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Buat Catatan Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Semua Dokumen ({notes.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs w-full sm:w-60 bg-zinc-950">
          <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Cari dalam dokumen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Pinned Notes Section */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Pin className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Dokumen Disematkan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pinnedNotes.map((note) => {
              const proj = projects.find(p => p.id === note.projectId);

              return (
                <div 
                  key={note.id}
                  className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-3 border-b border-zinc-800">
                      <span className="font-semibold text-zinc-200 capitalize">
                        {categories.find(c => c.id === note.category)?.label || note.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePin(note)}
                          className="p-1 text-amber-400 hover:text-amber-300 rounded"
                          title="Lepas sematan"
                        >
                          <Pin className="w-3.5 h-3.5 fill-amber-400" />
                        </button>
                        <button
                          onClick={() => handleCopyContent(note)}
                          className="p-1 text-zinc-400 hover:text-white rounded"
                          title="Salin teks"
                        >
                          {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onOpenNoteModal(note)}
                          className="p-1 text-zinc-400 hover:text-white rounded"
                          title="Ubah"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id, note.title)}
                          className="p-1 text-zinc-400 hover:text-rose-400 rounded"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h2 className="text-sm font-bold text-white mt-3">
                      {note.title}
                    </h2>

                    {proj && (
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-medium mt-1">
                        <FolderKanban className="w-3 h-3" />
                        <span>{proj.title}</span>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-zinc-300 line-clamp-6 whitespace-pre-line font-sans leading-relaxed">
                      {note.content}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>Diperbarui {formatDateIndo(note.updatedAt)}</span>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {note.tags.map(t => (
                          <span key={t} className="text-zinc-400">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Regular Notes Grid */}
      <div className="space-y-3">
        {pinnedNotes.length > 0 && (
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Dokumen Lainnya
          </p>
        )}

        {regularNotes.length === 0 && pinnedNotes.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-zinc-900 border border-zinc-800">
            <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">Belum Ada Catatan</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Dokumentasikan strategi, keputusan rapat, atau ide baru dengan membuat catatan pertama.
            </p>
            <button
              onClick={() => onOpenNoteModal()}
              className="mt-4 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition"
            >
              + Buat Catatan Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {regularNotes.map((note) => {
              const proj = projects.find(p => p.id === note.projectId);

              return (
                <div 
                  key={note.id}
                  className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition flex flex-col justify-between group shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-3 border-b border-zinc-800">
                      <span className="font-semibold text-zinc-200 capitalize">
                        {categories.find(c => c.id === note.category)?.label || note.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTogglePin(note)}
                          className="p-1 text-zinc-500 hover:text-amber-400 rounded"
                          title="Sematkan di atas"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopyContent(note)}
                          className="p-1 text-zinc-400 hover:text-white rounded"
                          title="Salin teks"
                        >
                          {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onOpenNoteModal(note)}
                          className="p-1 text-zinc-400 hover:text-white rounded"
                          title="Ubah"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id, note.title)}
                          className="p-1 text-zinc-400 hover:text-rose-400 rounded"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h2 className="text-sm font-bold text-white mt-3">
                      {note.title}
                    </h2>

                    {proj && (
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-medium mt-1">
                        <FolderKanban className="w-3 h-3" />
                        <span>{proj.title}</span>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-zinc-300 line-clamp-5 whitespace-pre-line leading-relaxed">
                      {note.content}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{formatDateIndo(note.updatedAt)}</span>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {note.tags.map(t => (
                          <span key={t} className="text-zinc-400">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
