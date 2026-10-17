import React from 'react';
import { 
  LayoutDashboard, 
  Target, 
  FolderKanban, 
  CheckSquare, 
  Calendar, 
  FileText, 
  Repeat, 
  BarChart3, 
  Settings,
  Database,
  Plus,
  Search,
  X,
  Command
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { ActiveTab } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenQuickCreate?: () => void;
  onOpenSearch?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileMenuOpen,
  setMobileMenuOpen,
  onOpenQuickCreate,
  onOpenSearch
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Live counts for quick indicators
  const goalsCount = useLiveQuery(() => db.goals.count()) ?? 0;
  const projectsCount = useLiveQuery(() => db.projects.where('status').notEqual('completed').count()) ?? 0;
  const pendingTasksCount = useLiveQuery(() => db.tasks.where('isCompleted').equals(0 as any).count()) ?? 0;
  const settings = useLiveQuery(() => db.settings.get('user_default'));

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'goals' as ActiveTab, label: 'Sasaran Bisnis', icon: Target, badge: goalsCount > 0 ? goalsCount : undefined },
    { id: 'projects' as ActiveTab, label: 'Proyek', icon: FolderKanban, badge: projectsCount > 0 ? projectsCount : undefined },
    { id: 'tasks' as ActiveTab, label: 'Daftar Tugas', icon: CheckSquare, badge: pendingTasksCount > 0 ? pendingTasksCount : undefined },
    { id: 'calendar' as ActiveTab, label: 'Kalender Bisnis', icon: Calendar },
    { id: 'notes' as ActiveTab, label: 'Catatan & Dokumen', icon: FileText },
    { id: 'routines' as ActiveTab, label: 'Rutinitas Bisnis', icon: Repeat },
    { id: 'analytics' as ActiveTab, label: 'Analitik Performa', icon: BarChart3 },
    { id: 'settings' as ActiveTab, label: 'Pengaturan & Backup', icon: Settings },
  ];

  const handleSelect = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container: Charcoal Dark Theme (Abu Dark), Full Viewport Height */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-[#181b20] border-r border-[#262b34] flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto p-4">
          {/* Brand & Workspace Header */}
          <div className="mb-4 pb-3.5 border-b border-[#262b34] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0 tracking-tight shadow-md ring-1 ring-blue-400/30">
                M
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white tracking-tight truncate">
                  {settings?.businessName || 'Mahada Indonesia'}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {settings?.userName || 'Executive Hub'}
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg md:hidden hover:bg-[#20232a]"
              aria-label="Tutup menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action & Search Controls */}
          <div className="space-y-2 mb-4">
            {onOpenQuickCreate && (
              <button
                onClick={onOpenQuickCreate}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Buat Baru</span>
              </button>
            )}

            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-zinc-400 bg-[#121417] hover:bg-[#20232a] hover:text-zinc-200 rounded-lg transition border border-[#2a2f3a] cursor-pointer"
                title="Cari entitas bisnis (Shortcut: ⌘K atau Ctrl+K)"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Cari...</span>
                </div>
                <kbd className="text-[10px] text-zinc-500 bg-[#1c1f26] border border-[#2c323f] px-1.5 py-0.2 rounded font-mono">
                  ⌘K
                </kbd>
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <div className="space-y-1 flex-1">
            <p className="px-2.5 mb-1.5 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Menu Utama
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group cursor-pointer ${
                    isActive
                      ? 'bg-[#252932] text-white shadow-xs border border-[#373e4b]'
                      : 'text-zinc-400 hover:text-white hover:bg-[#20232a]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-[#333a47] text-zinc-200' : 'bg-[#131518] text-zinc-400 border border-[#2a2f39]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer: PWA Install & Database Status */}
          <div className="mt-auto pt-3 border-t border-[#262b34] space-y-2">
            <div className="w-full">
              <PWAInstallButton compact />
            </div>

            {/* Hari & Tanggal (Live Indonesian Day & Date) */}
            <div className="px-3 py-2 rounded-lg bg-[#14161a] border border-[#262b34] shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-zinc-100 capitalize">
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{format(currentDate, 'EEEE', { locale: id })}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono font-medium">
                  {format(currentDate, 'HH:mm')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 pl-5 font-medium">
                {format(currentDate, 'd MMMM yyyy', { locale: id })}
              </p>
            </div>

            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#20232a] border border-[#2d333f] text-[11px] text-zinc-300">
              <div className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-emerald-400" />
                <span className="font-medium text-[10px]">IndexedDB Aktif</span>
              </div>
              <span className="text-[10px] text-zinc-400">Offline-first</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
