import React, { useEffect } from 'react';
import { 
  X, 
  CheckSquare, 
  Target, 
  FolderKanban, 
  Calendar, 
  FileText, 
  Repeat 
} from 'lucide-react';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'task' | 'goal' | 'project' | 'event' | 'note' | 'routine') => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  onClose,
  onSelectType
}) => {
  const options = [
    { type: 'task' as const, label: 'Tugas Baru', desc: 'Rencanakan aksi operasional & integrasikan ke jadwal', icon: CheckSquare, color: 'text-blue-400 bg-blue-950/80 border border-blue-900/60', hotkey: '1' },
    { type: 'project' as const, label: 'Proyek Baru', desc: 'Inisiatif proyek baru dengan timeline & target', icon: FolderKanban, color: 'text-amber-400 bg-amber-950/80 border border-amber-900/60', hotkey: '2' },
    { type: 'goal' as const, label: 'Sasaran Bisnis (Goal)', desc: 'Target pencapaian strategis kuartal atau tahunan', icon: Target, color: 'text-emerald-400 bg-emerald-950/80 border border-emerald-900/60', hotkey: '3' },
    { type: 'event' as const, label: 'Agenda Kalender', desc: 'Blok waktu fokus (Deep Work) atau pertemuan klien', icon: Calendar, color: 'text-purple-400 bg-purple-950/80 border border-purple-900/60', hotkey: '4' },
    { type: 'note' as const, label: 'Catatan / SOP Baru', desc: 'Dokumentasi risalah rapat, ide, atau pedoman kerja', icon: FileText, color: 'text-indigo-400 bg-indigo-950/80 border border-indigo-900/60', hotkey: '5' },
    { type: 'routine' as const, label: 'Rutinitas Bisnis', desc: 'Kebiasaan eksekutif harian & pelacak disiplin', icon: Repeat, color: 'text-teal-400 bg-teal-950/80 border border-teal-900/60', hotkey: '6' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      const match = options.find(o => o.hotkey === e.key);
      if (match) {
        onSelectType(match.type);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelectType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-white">Buat Entitas Baru</h2>
            <p className="text-xs text-zinc-400">Pilih jenis data yang ingin Anda tambahkan ke Mahada Indonesia</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 divide-y divide-zinc-800/60">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.type}
                onClick={() => onSelectType(opt.type)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/60 transition text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${opt.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-100 group-hover:text-blue-400 transition">
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {opt.desc}
                    </p>
                  </div>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-950 border border-zinc-700 rounded text-zinc-400 group-hover:border-zinc-500">
                  {opt.hotkey}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
