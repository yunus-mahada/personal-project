import { createClient } from '@supabase/supabase-js';
import { db } from '../db';
import { 
  Project, 
  Task, 
  CalendarEvent, 
  Note, 
  Routine, 
  UserSettings,
  DEFAULT_BUSINESS_CATEGORIES
} from '../types';

// Ambil kredensial dari environment variable Vite (VITE_*)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('your-anon-key')
  );
};

// Buat client Supabase (fallback ke string dummy jika belum diisi agar aplikasi tidak crash)
export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-key'
);

/**
 * Tes koneksi ke Supabase
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: 'Kredensial Supabase (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) belum diisi pada file .env atau Environment Variables Vercel.'
    };
  }

  try {
    const { error } = await supabase.from('settings').select('id').limit(1);
    if (error) {
      return {
        success: false,
        message: `Terhubung ke Supabase namun query gagal: ${error.message}. Pastikan sudah menjalankan skrip schema.sql di SQL Editor Supabase.`
      };
    }
    return {
      success: true,
      message: 'Koneksi ke Supabase Cloud berhasil dan skema database siap digunakan!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi Supabase: ${err.message || 'Cek koneksi internet Anda.'}`
    };
  }
}

/**
 * Sync SEMUA data lokal (Dexie IndexedDB) ke Supabase Cloud (Push)
 */
export async function syncLocalToSupabase(): Promise<{ success: boolean; message: string; counts?: Record<string, number> }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase belum dikonfigurasi.' };
  }

  try {
    const [settings, projects, tasks, calendarEvents, notes, routines] = await Promise.all([
      db.settings.toArray(),
      db.projects.toArray(),
      db.tasks.toArray(),
      db.calendarEvents.toArray(),
      db.notes.toArray(),
      db.routines.toArray(),
    ]);

    // 1. Settings
    if (settings.length > 0) {
      const dbSettings = settings.map(s => ({
        id: s.id,
        user_name: s.userName,
        business_name: s.businessName,
        currency: s.currency,
        default_weekly_goal_hours: s.defaultWeeklyGoalHours,
        theme: s.theme,
        has_completed_onboarding: s.hasCompletedOnboarding,
        goal_categories: s.goalCategories || DEFAULT_BUSINESS_CATEGORIES,
        updated_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('settings').upsert(dbSettings);
      if (error) throw new Error(`Settings sync error: ${error.message}`);
    }

    // 2. Projects
    if (projects.length > 0) {
      const dbProjects = projects.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        priority: p.priority,
        start_date: p.startDate,
        due_date: p.dueDate,
        category: p.category,
        tags: p.tags,
        created_at: p.createdAt,
        updated_at: p.updatedAt
      }));
      const { error } = await supabase.from('projects').upsert(dbProjects);
      if (error) throw new Error(`Projects sync error: ${error.message}`);
    }

    // 3. Tasks
    if (tasks.length > 0) {
      const dbTasks = tasks.map(t => ({
        id: t.id,
        project_id: t.projectId || null,
        title: t.title,
        description: t.description,
        category: t.category || 'Tugas',
        status: t.status,
        priority: t.priority,
        eisenhower: t.eisenhower,
        due_date: t.dueDate,
        estimated_minutes: t.estimatedMinutes,
        actual_minutes: t.actualMinutes,
        scheduled_date: t.scheduledDate,
        scheduled_start_time: t.scheduledStartTime,
        scheduled_end_time: t.scheduledEndTime,
        calendar_event_id: t.calendarEventId,
        is_completed: t.isCompleted,
        completed_at: t.completedAt,
        tags: t.tags,
        created_at: t.createdAt,
        updated_at: t.updatedAt
      }));
      const { error } = await supabase.from('tasks').upsert(dbTasks);
      if (error) throw new Error(`Tasks sync error: ${error.message}`);
    }

    // 4. Calendar Events
    if (calendarEvents.length > 0) {
      const dbEvents = calendarEvents.map(e => ({
        id: e.id,
        task_id: e.taskId || null,
        project_id: e.projectId || null,
        title: e.title,
        description: e.description,
        start_time: e.startTime,
        end_time: e.endTime,
        category: e.category,
        location_or_link: e.locationOrLink,
        is_completed: e.isCompleted,
        color: e.color,
        created_at: e.createdAt,
        updated_at: e.updatedAt || e.createdAt
      }));
      const { error } = await supabase.from('calendar_events').upsert(dbEvents);
      if (error) throw new Error(`Calendar events sync error: ${error.message}`);
    }

    // 5. Notes
    if (notes.length > 0) {
      const dbNotes = notes.map(n => ({
        id: n.id,
        project_id: n.projectId || null,
        title: n.title,
        content: n.content,
        category: n.category,
        tags: n.tags,
        is_pinned: n.isPinned,
        created_at: n.createdAt,
        updated_at: n.updatedAt
      }));
      const { error } = await supabase.from('notes').upsert(dbNotes);
      if (error) throw new Error(`Notes sync error: ${error.message}`);
    }

    // 6. Routines
    if (routines.length > 0) {
      const dbRoutines = routines.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        frequency: r.frequency,
        time_of_day: r.timeOfDay,
        category: r.category,
        target_days_per_week: r.targetDaysPerWeek,
        start_day: r.startDay ?? null,
        end_day: r.endDay ?? null,
        custom_days: r.customDays || [],
        completed_dates: r.completedDates,
        streak: r.streak,
        created_at: r.createdAt
      }));
      const { error } = await supabase.from('routines').upsert(dbRoutines);
      if (error) throw new Error(`Routines sync error: ${error.message}`);
    }

    // 7. Business Categories Table
    const activeCategories = (settings[0]?.goalCategories && Array.isArray(settings[0].goalCategories))
      ? settings[0].goalCategories
      : [];
    
    if (activeCategories.length > 0) {
      const dbCategories = activeCategories.map((cat, idx) => ({
        id: `cat-${idx + 1}`,
        name: cat,
        color: '#3b82f6'
      }));
      const { error } = await supabase.from('business_categories').upsert(dbCategories, { onConflict: 'name' });
      if (error) console.warn('Business categories sync note:', error.message);
    }

    return {
      success: true,
      message: 'Berhasil mengunggah semua data ke Supabase Cloud!',
      counts: {
        projects: projects.length,
        tasks: tasks.length,
        calendarEvents: calendarEvents.length,
        notes: notes.length,
        routines: routines.length,
        categories: activeCategories.length
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menyinkronkan data ke Supabase: ${err.message}`
    };
  }
}

/**
 * Unduh dan sinkronkan data dari Supabase Cloud ke Dexie Lokal (Pull)
 */
export async function syncSupabaseToLocal(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Supabase belum dikonfigurasi.' };
  }

  try {
    const [
      { data: settings },
      { data: projects },
      { data: tasks },
      { data: events },
      { data: notes },
      { data: routines },
      { data: categories }
    ] = await Promise.all([
      supabase.from('settings').select('*'),
      supabase.from('projects').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('calendar_events').select('*'),
      supabase.from('notes').select('*'),
      supabase.from('routines').select('*'),
      supabase.from('business_categories').select('*'),
    ]);

    // Categories priority from dedicated table if available
    let resolvedCategories: string[] = [];
    if (categories && categories.length > 0) {
      resolvedCategories = categories.map(c => c.name);
    } else if (settings && settings.length > 0 && Array.isArray(settings[0].goal_categories)) {
      resolvedCategories = settings[0].goal_categories;
    }

    if (settings && settings.length > 0) {
      for (const s of settings) {
        await db.settings.put({
          id: s.id,
          userName: s.user_name,
          businessName: s.business_name,
          currency: s.currency,
          defaultWeeklyGoalHours: s.default_weekly_goal_hours,
          theme: s.theme,
          hasCompletedOnboarding: s.has_completed_onboarding,
          goalCategories: resolvedCategories
        });
      }
    } else if (categories && categories.length > 0) {
      const existingSettings = await db.settings.get('user_default');
      if (existingSettings) {
        await db.settings.update('user_default', { goalCategories: resolvedCategories });
      }
    }

    if (projects) {
      const cloudIds = new Set(projects.map(p => p.id));
      const localProjects = await db.projects.toArray();
      for (const lp of localProjects) {
        if (!cloudIds.has(lp.id)) {
          await cloudUpsertProject(lp).catch(console.error);
        }
      }
      for (const p of projects) {
        await db.projects.put({
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          priority: p.priority,
          startDate: p.start_date,
          dueDate: p.due_date,
          category: p.category,
          tags: Array.isArray(p.tags) ? p.tags : [],
          createdAt: p.created_at,
          updatedAt: p.updated_at
        });
      }
    }

    if (tasks) {
      const cloudIds = new Set(tasks.map(t => t.id));
      const localTasks = await db.tasks.toArray();
      for (const lt of localTasks) {
        if (!cloudIds.has(lt.id)) {
          await cloudUpsertTask(lt).catch(console.error);
        }
      }
      for (const t of tasks) {
        await db.tasks.put({
          id: t.id,
          projectId: t.project_id,
          title: t.title,
          description: t.description,
          category: (t.category as any) || 'Tugas',
          status: t.status,
          priority: t.priority,
          eisenhower: t.eisenhower,
          dueDate: t.due_date,
          estimatedMinutes: Number(t.estimated_minutes),
          actualMinutes: Number(t.actual_minutes),
          scheduledDate: t.scheduled_date,
          scheduledStartTime: t.scheduled_start_time,
          scheduledEndTime: t.scheduled_end_time,
          calendarEventId: t.calendar_event_id,
          isCompleted: Boolean(t.is_completed),
          completedAt: t.completed_at,
          tags: Array.isArray(t.tags) ? t.tags : [],
          createdAt: t.created_at,
          updatedAt: t.updated_at
        });
      }
    }

    if (events) {
      const cloudIds = new Set(events.map(e => e.id));
      const localEvents = await db.calendarEvents.toArray();
      for (const le of localEvents) {
        if (!cloudIds.has(le.id)) {
          await cloudUpsertCalendarEvent(le).catch(console.error);
        }
      }
      for (const e of events) {
        await db.calendarEvents.put({
          id: e.id,
          taskId: e.task_id,
          projectId: e.project_id,
          title: e.title,
          description: e.description,
          startTime: e.start_time,
          endTime: e.end_time,
          category: e.category,
          locationOrLink: e.location_or_link,
          isCompleted: Boolean(e.is_completed),
          color: e.color,
          createdAt: e.created_at,
          updatedAt: e.updated_at || e.createdAt
        });
      }
    }

    if (notes) {
      const cloudIds = new Set(notes.map(n => n.id));
      const localNotes = await db.notes.toArray();
      for (const ln of localNotes) {
        if (!cloudIds.has(ln.id)) {
          await cloudUpsertNote(ln).catch(console.error);
        }
      }
      for (const n of notes) {
        await db.notes.put({
          id: n.id,
          projectId: n.project_id,
          title: n.title,
          content: n.content,
          category: n.category,
          tags: Array.isArray(n.tags) ? n.tags : [],
          isPinned: Boolean(n.is_pinned),
          createdAt: n.created_at,
          updatedAt: n.updated_at
        });
      }
    }

    if (routines) {
      const cloudIds = new Set(routines.map(r => r.id));
      const localRoutines = await db.routines.toArray();
      for (const lr of localRoutines) {
        if (!cloudIds.has(lr.id)) {
          await cloudUpsertRoutine(lr).catch(console.error);
        }
      }
      for (const r of routines) {
        await db.routines.put({
          id: r.id,
          title: r.title,
          description: r.description,
          frequency: r.frequency,
          timeOfDay: r.time_of_day,
          category: r.category || 'Personal',
          targetDaysPerWeek: Number(r.target_days_per_week || 7),
          startDay: r.start_day ? Number(r.start_day) : undefined,
          endDay: r.end_day ? Number(r.end_day) : undefined,
          customDays: Array.isArray(r.custom_days) ? r.custom_days : [],
          completedDates: Array.isArray(r.completed_dates) ? r.completed_dates : [],
          streak: Number(r.streak || 0),
          createdAt: r.created_at
        });
      }
    }

    return {
      success: true,
      message: 'Berhasil mengunduh dan menyinkronkan data dari Supabase Cloud ke perangkat lokal!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal mengunduh data dari Supabase: ${err.message}`
    };
  }
}

// ==============================================================================
// REAL-TIME AUTO-SAVE KE SUPABASE CLOUD (Direct Persistence)
// Fungsi-fungsi berikut otomatis mengirim data ke Supabase seketika saat user simpan
// ==============================================================================

export async function cloudUpsertProject(project: Project): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Kredensial Supabase belum terkonfigurasi pada .env');
  }
  const { error } = await supabase.from('projects').upsert({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    priority: project.priority,
    start_date: project.startDate,
    due_date: project.dueDate,
    category: project.category,
    tags: project.tags,
    created_at: project.createdAt,
    updated_at: project.updatedAt
  });
  if (error) {
    console.error('[Supabase Error] Gagal menyimpan Project ke Cloud:', error);
    throw new Error(`Gagal menyimpan Proyek ke Supabase: ${error.message}`);
  }
}

export async function cloudDeleteProject(projectId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) {
    console.error('[Supabase Error] Gagal menghapus Project dari Cloud:', error);
    throw new Error(`Gagal menghapus Proyek dari Supabase: ${error.message}`);
  }
}

export async function cloudUpsertTask(task: Task): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Kredensial Supabase belum terkonfigurasi pada .env');
  }
  const { error } = await supabase.from('tasks').upsert({
    id: task.id,
    project_id: task.projectId || null,
    title: task.title,
    description: task.description,
    category: task.category || 'Tugas',
    status: task.status,
    priority: task.priority,
    eisenhower: task.eisenhower,
    due_date: task.dueDate,
    estimated_minutes: task.estimatedMinutes,
    actual_minutes: task.actualMinutes,
    scheduled_date: task.scheduledDate,
    scheduled_start_time: task.scheduledStartTime,
    scheduled_end_time: task.scheduledEndTime,
    calendar_event_id: task.calendarEventId,
    is_completed: task.isCompleted,
    completed_at: task.completedAt,
    tags: task.tags,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  });
  if (error) {
    console.error('[Supabase Error] Gagal menyimpan Task ke Cloud:', error);
    throw new Error(`Gagal menyimpan Tugas ke Supabase: ${error.message}`);
  }
}

export async function cloudDeleteTask(taskId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) {
    console.error('[Supabase Error] Gagal menghapus Task dari Cloud:', error);
    throw new Error(`Gagal menghapus Tugas dari Supabase: ${error.message}`);
  }
}

export async function cloudUpsertCalendarEvent(event: CalendarEvent): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Kredensial Supabase belum terkonfigurasi pada .env');
  }
  const { error } = await supabase.from('calendar_events').upsert({
    id: event.id,
    task_id: event.taskId || null,
    project_id: event.projectId || null,
    title: event.title,
    description: event.description,
    start_time: event.startTime,
    end_time: event.endTime,
    category: event.category,
    location_or_link: event.locationOrLink,
    is_completed: event.isCompleted,
    color: event.color,
    created_at: event.createdAt,
    updated_at: event.updatedAt || event.createdAt
  });
  if (error) {
    console.error('[Supabase Error] Gagal menyimpan CalendarEvent ke Cloud:', error);
    throw new Error(`Gagal menyimpan Agenda ke Supabase: ${error.message}`);
  }
}

export async function cloudDeleteCalendarEvent(eventId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
  if (error) {
    console.error('[Supabase Error] Gagal menghapus CalendarEvent dari Cloud:', error);
    throw new Error(`Gagal menghapus Agenda dari Supabase: ${error.message}`);
  }
}

export async function cloudUpsertNote(note: Note): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Kredensial Supabase belum terkonfigurasi pada .env');
  }
  const { error } = await supabase.from('notes').upsert({
    id: note.id,
    project_id: note.projectId || null,
    title: note.title,
    content: note.content,
    category: note.category,
    tags: note.tags,
    is_pinned: note.isPinned,
    created_at: note.createdAt,
    updated_at: note.updatedAt
  });
  if (error) {
    console.error('[Supabase Error] Gagal menyimpan Note ke Cloud:', error);
    throw new Error(`Gagal menyimpan Catatan ke Supabase: ${error.message}`);
  }
}

export async function cloudDeleteNote(noteId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('notes').delete().eq('id', noteId);
  if (error) {
    console.error('[Supabase Error] Gagal menghapus Note dari Cloud:', error);
    throw new Error(`Gagal menghapus Catatan dari Supabase: ${error.message}`);
  }
}

export async function cloudUpsertRoutine(routine: Routine): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Kredensial Supabase belum terkonfigurasi pada .env');
  }
  const { error } = await supabase.from('routines').upsert({
    id: routine.id,
    title: routine.title,
    description: routine.description,
    frequency: routine.frequency,
    time_of_day: routine.timeOfDay,
    category: routine.category,
    target_days_per_week: routine.targetDaysPerWeek,
    start_day: routine.startDay ?? null,
    end_day: routine.endDay ?? null,
    custom_days: routine.customDays || [],
    completed_dates: routine.completedDates,
    streak: routine.streak,
    created_at: routine.createdAt
  });
  if (error) {
    console.error('[Supabase Error] Gagal menyimpan Routine ke Cloud:', error);
    throw new Error(`Gagal menyimpan Rutinitas ke Supabase: ${error.message}`);
  }
}

export async function cloudDeleteRoutine(routineId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('routines').delete().eq('id', routineId);
  if (error) {
    console.error('[Supabase Error] Gagal menghapus Routine dari Cloud:', error);
    throw new Error(`Gagal menghapus Rutinitas dari Supabase: ${error.message}`);
  }
}

export async function cloudUpsertSettings(settings: UserSettings): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error('Kredensial Supabase belum terkonfigurasi pada .env');
  }
  const { error } = await supabase.from('settings').upsert({
    id: settings.id,
    user_name: settings.userName,
    business_name: settings.businessName,
    currency: settings.currency,
    default_weekly_goal_hours: settings.defaultWeeklyGoalHours,
    theme: settings.theme,
    has_completed_onboarding: settings.hasCompletedOnboarding,
    goal_categories: settings.goalCategories,
    updated_at: new Date().toISOString()
  });
  if (error) {
    console.error('[Supabase Error] Gagal menyimpan Settings ke Cloud:', error);
    throw new Error(`Gagal menyimpan Pengaturan ke Supabase: ${error.message}`);
  }
}

export async function cloudUpsertCategory(categoryName: string, color?: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('business_categories').upsert({
    id: `cat-${Date.now()}`,
    name: categoryName,
    color: color || '#3b82f6',
    created_at: new Date().toISOString()
  }, { onConflict: 'name' });
  if (error) {
    console.error('[Supabase Error] Gagal menyimpan Category ke Cloud:', error);
    throw new Error(`Gagal menyimpan Kategori ke Supabase: ${error.message}`);
  }
}

export async function cloudDeleteCategory(categoryName: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('business_categories').delete().eq('name', categoryName);
  if (error) {
    console.error('[Supabase Error] Gagal menghapus Category dari Cloud:', error);
    throw new Error(`Gagal menghapus Kategori dari Supabase: ${error.message}`);
  }
}

export async function cloudResetCategories(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  // Hapus semua data di tabel business_categories di Supabase
  const { error: delError } = await supabase.from('business_categories').delete().neq('id', '___empty_reset___');
  if (delError) {
    console.error('[Supabase Error] Gagal mereset tabel business_categories:', delError);
    throw new Error(`Gagal mereset tabel kategori di Supabase: ${delError.message}`);
  }
  // Kosongkan array goal_categories pada settings
  const { error: setErr } = await supabase.from('settings').update({
    goal_categories: [],
    updated_at: new Date().toISOString()
  }).eq('id', 'user_default');
  if (setErr) {
    console.warn('[Supabase Warning] Gagal mengupdate settings goal_categories:', setErr.message);
  }
}

/**
 * Langganan event realtime Supabase untuk sinkronisasi otomatis multi-tab / multi-device
 */
export function subscribeToSupabaseRealtime(onSync?: () => void) {
  if (!isSupabaseConfigured()) return () => {};

  try {
    const channel = supabase
      .channel('supabase-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        syncSupabaseToLocal().then(() => {
          if (onSync) onSync();
        }).catch(console.error);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}
