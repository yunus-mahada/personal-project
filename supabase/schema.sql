-- ==============================================================================
-- PERSONAL PROJECT MANAGEMENT - FRESH DATABASE SCHEMA (NO GOALS & CLEAN CATEGORIES)
-- Petunjuk Eksekusi:
-- 1. Buka Supabase Dashboard -> Proyek Anda
-- 2. Pilih menu "SQL Editor" di bilah navigasi kiri
-- 3. Buat "New Query", paste seluruh isi skrip ini, lalu klik "Run"
-- ==============================================================================

-- 1. Hapus tabel lama (beserta constraint & relasi foreign key)
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.routines CASCADE;
DROP TABLE IF EXISTS public.business_categories CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- 2. Tabel Settings (Profil & Pengaturan Bisnis)
CREATE TABLE public.settings (
    id TEXT PRIMARY KEY DEFAULT 'user_default',
    user_name TEXT NOT NULL DEFAULT 'Yunus Mahada',
    business_name TEXT NOT NULL DEFAULT 'Personal Project',
    currency TEXT NOT NULL DEFAULT 'IDR',
    default_weekly_goal_hours INTEGER NOT NULL DEFAULT 40,
    theme TEXT NOT NULL DEFAULT 'dark',
    has_completed_onboarding BOOLEAN NOT NULL DEFAULT true,
    goal_categories JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Projects (Proyek Bisnis)
CREATE TABLE public.projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planning',
    priority TEXT NOT NULL DEFAULT 'medium',
    start_date TEXT,
    due_date TEXT,
    category TEXT DEFAULT 'Umum',
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Tasks (Tugas Proyek & Matriks Eisenhower)
CREATE TABLE public.tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Tugas',
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    eisenhower TEXT DEFAULT 'schedule',
    due_date TEXT,
    estimated_minutes INTEGER DEFAULT 0,
    actual_minutes INTEGER DEFAULT 0,
    scheduled_date TEXT,
    scheduled_start_time TEXT,
    scheduled_end_time TEXT,
    calendar_event_id TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabel Calendar Events (Kalender Agenda & Time Blocking)
CREATE TABLE public.calendar_events (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL,
    project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'meeting',
    location_or_link TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabel Notes (Catatan, Ide, & SOP Bisnis)
CREATE TABLE public.notes (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL DEFAULT 'Catatan Umum',
    tags JSONB DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabel Routines (Rutinitas Bisnis Harian, Rentang Tanggal, & Custom Hari)
CREATE TABLE public.routines (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    time_of_day TEXT DEFAULT 'morning',
    category TEXT DEFAULT 'Personal',
    target_days_per_week INTEGER DEFAULT 7,
    start_day INTEGER,
    end_day INTEGER,
    custom_days JSONB DEFAULT '[]'::jsonb,
    completed_dates JSONB DEFAULT '[]'::jsonb,
    streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabel Business Categories (Daftar Kategori Bisnis - Bersih / Kosong)
CREATE TABLE public.business_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Data Awal Pengaturan Default (Tanpa kategori dummy bawaan sistem)
INSERT INTO public.settings (id, user_name, business_name, currency, default_weekly_goal_hours, theme, has_completed_onboarding, goal_categories)
VALUES ('user_default', 'Yunus Mahada', 'Personal Project', 'IDR', 40, 'dark', true, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- Indeks Performa Query Cepat
-- ==============================================================================
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_calendar_events_task_id ON public.calendar_events(task_id);
CREATE INDEX idx_calendar_events_project_id ON public.calendar_events(project_id);
CREATE INDEX idx_notes_project_id ON public.notes(project_id);
CREATE INDEX idx_business_categories_name ON public.business_categories(name);

-- ==============================================================================
-- Row Level Security (RLS) Setup
-- ==============================================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Akses Penuh Settings" ON public.settings;
    CREATE POLICY "Akses Penuh Settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Akses Penuh Projects" ON public.projects;
    CREATE POLICY "Akses Penuh Projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Akses Penuh Tasks" ON public.tasks;
    CREATE POLICY "Akses Penuh Tasks" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Akses Penuh Calendar Events" ON public.calendar_events;
    CREATE POLICY "Akses Penuh Calendar Events" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Akses Penuh Notes" ON public.notes;
    CREATE POLICY "Akses Penuh Notes" ON public.notes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Akses Penuh Routines" ON public.routines;
    CREATE POLICY "Akses Penuh Routines" ON public.routines FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Akses Penuh Business Categories" ON public.business_categories;
    CREATE POLICY "Akses Penuh Business Categories" ON public.business_categories FOR ALL USING (true) WITH CHECK (true);
END $$;
