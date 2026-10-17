import React, { useState, useEffect } from 'react';
import type { 
  ActiveTab, 
  Task, 
  Goal, 
  Project, 
  CalendarEvent, 
  Note, 
  Routine 
} from './types';
import { Menu, Search, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDatabase } from './db';
import { isSupabaseConfigured, syncSupabaseToLocal } from './lib/supabase';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalSearch } from './components/common/GlobalSearch';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { GoalsView } from './components/goals/GoalsView';
import { ProjectsView } from './components/projects/ProjectsView';
import { TasksView } from './components/tasks/TasksView';
import { CalendarView } from './components/calendar/CalendarView';
import { NotesView } from './components/notes/NotesView';
import { RoutinesView } from './components/routines/RoutinesView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';

// Modals
import { QuickCreateModal } from './components/modals/QuickCreateModal';
import { TaskModal } from './components/modals/TaskModal';
import { GoalModal } from './components/modals/GoalModal';
import { ProjectModal } from './components/modals/ProjectModal';
import { EventModal } from './components/modals/EventModal';
import { NoteModal } from './components/modals/NoteModal';
import { RoutineModal } from './components/modals/RoutineModal';

export default function App() {
  const settings = useLiveQuery(() => db.settings.get('user_default'));
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Modal states
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskDefaultProjectId, setTaskDefaultProjectId] = useState<string | undefined>(undefined);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [projectDefaultGoalId, setProjectDefaultGoalId] = useState<string | undefined>(undefined);

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [eventDefaultDate, setEventDefaultDate] = useState<string | undefined>(undefined);
  const [eventDefaultTime, setEventDefaultTime] = useState<string | undefined>(undefined);

  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);

  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [routineToEdit, setRoutineToEdit] = useState<Routine | null>(null);

  // Initialize DB and auto-pull from Supabase cloud on mount
  useEffect(() => {
    initializeDatabase()
      .then(async () => {
        if (isSupabaseConfigured()) {
          console.log('[Supabase Cloud] Inisialisasi sinkronisasi otomatis dari cloud...');
          await syncSupabaseToLocal();
        }
      })
      .catch(console.error);
  }, []);

  const handleNavigate = (tab: ActiveTab, itemId?: string) => {
    setActiveTab(tab);
    if (itemId) {
      setSelectedItemId(itemId);
    }
  };

  const handleOpenTaskModal = (task?: Task, defaultProjectId?: string) => {
    setTaskToEdit(task || null);
    setTaskDefaultProjectId(defaultProjectId);
    setTaskModalOpen(true);
  };

  const handleOpenGoalModal = (goal?: Goal) => {
    setGoalToEdit(goal || null);
    setGoalModalOpen(true);
  };

  const handleOpenProjectModal = (proj?: Project, defaultGoalId?: string) => {
    setProjectToEdit(proj || null);
    setProjectDefaultGoalId(defaultGoalId);
    setProjectModalOpen(true);
  };

  const handleOpenEventModal = (event?: CalendarEvent, defaultDate?: string, defaultTime?: string) => {
    setEventToEdit(event || null);
    setEventDefaultDate(defaultDate);
    setEventDefaultTime(defaultTime);
    setEventModalOpen(true);
  };

  const handleOpenNoteModal = (note?: Note) => {
    setNoteToEdit(note || null);
    setNoteModalOpen(true);
  };

  const handleOpenRoutineModal = (routine?: Routine) => {
    setRoutineToEdit(routine || null);
    setRoutineModalOpen(true);
  };

  const handleSelectQuickCreateType = (type: 'task' | 'goal' | 'project' | 'event' | 'note' | 'routine') => {
    setQuickCreateOpen(false);
    if (type === 'task') handleOpenTaskModal();
    if (type === 'goal') handleOpenGoalModal();
    if (type === 'project') handleOpenProjectModal();
    if (type === 'event') handleOpenEventModal();
    if (type === 'note') handleOpenNoteModal();
    if (type === 'routine') handleOpenRoutineModal();
  };

  return (
    <div className="min-h-screen bg-[#121316] text-zinc-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Mobile-only Top Bar (hidden on desktop to remove duplicate navigation) */}
      <header className="md:hidden sticky top-0 z-30 bg-[#181b20]/95 backdrop-blur-md border-b border-[#262b34] px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#20232a]"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-blue-400/30">
              P
            </div>
            <span className="text-sm font-bold text-white tracking-tight">
              {settings?.businessName || 'Personal Project'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#20232a]"
            title="Cari"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setQuickCreateOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Baru</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame: Full Height Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row w-full">
        {/* Workspace Sidebar (Unified primary navigation) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onOpenQuickCreate={() => setQuickCreateOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />

        {/* Primary Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={handleNavigate}
              onOpenTaskModal={handleOpenTaskModal}
              onOpenGoalModal={handleOpenGoalModal}
              onOpenProjectModal={handleOpenProjectModal}
              onOpenEventModal={handleOpenEventModal}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsView
              onOpenGoalModal={handleOpenGoalModal}
              onOpenProjectModal={handleOpenProjectModal}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              onOpenProjectModal={handleOpenProjectModal}
              onOpenTaskModal={handleOpenTaskModal}
              onNavigate={handleNavigate}
              selectedProjectId={selectedItemId}
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              onOpenTaskModal={handleOpenTaskModal}
              selectedTaskId={selectedItemId}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              onOpenEventModal={handleOpenEventModal}
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              onOpenNoteModal={handleOpenNoteModal}
              selectedNoteId={selectedItemId}
            />
          )}

          {activeTab === 'routines' && (
            <RoutinesView
              onOpenRoutineModal={handleOpenRoutineModal}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Offline Toast Indicator */}
      <OfflineIndicator />

      {/* Global Command / Quick Search */}
      <GlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Quick Action Selector Modal */}
      <QuickCreateModal
        isOpen={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onSelectType={handleSelectQuickCreateType}
      />

      {/* Entity Modals */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        defaultProjectId={taskDefaultProjectId}
      />

      <GoalModal
        isOpen={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false);
          setGoalToEdit(null);
        }}
        goalToEdit={goalToEdit}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => {
          setProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        projectToEdit={projectToEdit}
        defaultGoalId={projectDefaultGoalId}
      />

      <EventModal
        isOpen={eventModalOpen}
        onClose={() => {
          setEventModalOpen(false);
          setEventToEdit(null);
        }}
        eventToEdit={eventToEdit}
        defaultDate={eventDefaultDate}
        defaultTime={eventDefaultTime}
      />

      <NoteModal
        isOpen={noteModalOpen}
        onClose={() => {
          setNoteModalOpen(false);
          setNoteToEdit(null);
        }}
        noteToEdit={noteToEdit}
      />

      <RoutineModal
        isOpen={routineModalOpen}
        onClose={() => {
          setRoutineModalOpen(false);
          setRoutineToEdit(null);
        }}
        routineToEdit={routineToEdit}
      />
    </div>
  );
}
