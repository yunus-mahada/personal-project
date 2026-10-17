import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Target, FolderKanban, CheckSquare, FileText, ArrowRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import type { ActiveTab } from '../../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: ActiveTab, itemId?: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');

  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) ?? [];
  const notes = useLiveQuery(() => db.notes.toArray()) ?? [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        projects: projects.slice(0, 3),
        tasks: tasks.slice(0, 4),
        notes: notes.slice(0, 2)
      };
    }

    return {
      projects: projects.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)),
      tasks: tasks.filter(t => t.title.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q))),
      notes: notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    };
  }, [query, projects, tasks, notes]);

  const totalResults = results.projects.length + results.tasks.length + results.notes.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-xl bg-zinc-900 shadow-2xl border border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Cari sasaran, proyek, tugas, catatan Mahada..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full text-sm bg-transparent outline-none placeholder:text-zinc-500 text-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-zinc-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-950 border border-zinc-700 rounded text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-zinc-800/60">
          {totalResults === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Tidak ada hasil ditemukan untuk "{query}".
            </div>
          ) : (
            <>
              {/* Tasks Results */}
              {results.tasks.length > 0 && (
                <div className="py-2">
                  <p className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                    Tugas ({results.tasks.length})
                  </p>
                  {results.tasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => {
                        onNavigate('tasks', task.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-zinc-800 text-left transition group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate text-zinc-200 font-medium">{task.title}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 shrink-0 capitalize">
                        {task.status.replace('_', ' ')}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Projects Results */}
              {results.projects.length > 0 && (
                <div className="py-2">
                  <p className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                    Proyek ({results.projects.length})
                  </p>
                  {results.projects.map(proj => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        onNavigate('projects', proj.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-zinc-800 text-left transition group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderKanban className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate text-zinc-200 font-medium">{proj.title}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Notes Results */}
              {results.notes.length > 0 && (
                <div className="py-2">
                  <p className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                    Catatan ({results.notes.length})
                  </p>
                  {results.notes.map(note => (
                    <button
                      key={note.id}
                      onClick={() => {
                        onNavigate('notes', note.id);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-zinc-800 text-left transition group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate text-zinc-200 font-medium">{note.title}</span>
                      </div>
                      <ArrowRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Gunakan <strong>↑↓</strong> untuk navigasi, <strong>Enter</strong> untuk memilih</span>
          <span>IndexedDB Search</span>
        </div>
      </div>
    </div>
  );
};
