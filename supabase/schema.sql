-- ==============================================================================
-- Personal Project - Database Schema untuk Supabase
-- Eksekusi file SQL ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Tabel Settings (Pengaturan Profil Pengguna & Bisnis)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'user_default',
    user_name TEXT NOT NULL DEFAULT 'Yunus Mahada',
    business_name TEXT NOT NULL DEFAULT 'Personal Project',
    currency TEXT NOT NULL DEFAULT 'IDR',
    default_weekly_goal_hours INTEGER NOT NULL DEFAULT 40,
    theme TEXT NOT NULL DEFAULT 'dark',
    has_completed_onboarding BOOLEAN NOT NULL DEFAULT true,
    goal_categories JSONB DEFAULT '["Pendapatan (Revenue)", "Pemasaran (Marketing)", "Produk (Product)", "Operasional (Operations)", "Klien (Client & Sales)", "Personal & Kepemimpinan"]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migrasi aman untuk menambahkan kolom goal_categories jika tabel sudah ada:
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS goal_categories JSONB DEFAULT '["Pendapatan (Revenue)", "Pemasaran (Marketing)", "Produk (Product)", "Operasional (Operations)", "Klien (Client & Sales)", "Personal & Kepemimpinan"]'::jsonb;

-- 2. Tabel Goals (Sasaran / Target Bisnis Utama)
CREATE TABLE IF NOT EXISTS public.goals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'Operasional',
    target_value NUMERIC NOT NULL DEFAULT 0,
    current_value NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'Rp',
    deadline TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'on_track',
    priority TEXT NOT NULL DEFAULT 'medium',
    color TEXT DEFAULT '#2563eb',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Projects (Proyek Bisnis yang terikat ke Goal)
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    goal_id TEXT REFERENCES public.goals(id) ON DELETE SET NULL,
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

-- Migrasi aman jika tabel sudah dibuat sebelumnya di Supabase:
ALTER TABLE public.projects DROP COLUMN IF EXISTS budget;
ALTER TABLE public.projects DROP COLUMN IF EXISTS spent;

-- 4. Tabel Tasks (Tugas Proyek dengan Matriks Eisenhower)
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE,
    goal_id TEXT REFERENCES public.goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
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

-- 5. Tabel Calendar Events (Jadwal Kegiatan & Time Blocking)
CREATE TABLE IF NOT EXISTS public.calendar_events (
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

-- 6. Tabel Notes (Catatan Rapat, Ide, & SOP Bisnis)
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE SET NULL,
    goal_id TEXT REFERENCES public.goals(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL DEFAULT 'Catatan Umum',
    tags JSONB DEFAULT '[]'::jsonb,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabel Routines (Rutinitas & Habit Harian / Mingguan Bisnis)
CREATE TABLE IF NOT EXISTS public.routines (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    time_of_day TEXT DEFAULT 'morning',
    category TEXT DEFAULT 'Personal',
    target_days_per_week INTEGER DEFAULT 7,
    completed_dates JSONB DEFAULT '[]'::jsonb,
    streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabel Business Categories (Daftar Opsi Kategori Bisnis Dropdown)
CREATE TABLE IF NOT EXISTS public.business_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Isi kategori bawaan default ke Supabase:
INSERT INTO public.business_categories (id, name, color) VALUES
    ('cat-1', 'Pendapatan (Revenue)', '#2563eb'),
    ('cat-2', 'Pemasaran (Marketing)', '#7c3aed'),
    ('cat-3', 'Produk (Product)', '#059669'),
    ('cat-4', 'Operasional (Operations)', '#d97706'),
    ('cat-5', 'Klien (Client & Sales)', '#0891b2'),
    ('cat-6', 'Personal & Kepemimpinan', '#dc2626')
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- Indeks untuk Performa Query Cepat
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_projects_goal_id ON public.projects(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_task_id ON public.calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON public.notes(project_id);
CREATE INDEX IF NOT EXISTS idx_business_categories_name ON public.business_categories(name);

-- ==============================================================================
-- Row Level Security (RLS) Setup
-- Mengaktifkan RLS untuk keamanan data dan memberikan izin akses publik/anon untuk aplikasi personal
-- ==============================================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

-- Policy Akses Penuh untuk anon & authenticated users (Cocok untuk Personal Single-User App)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Akses Penuh Settings" ON public.settings;
    CREATE POLICY "Akses Penuh Settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Akses Penuh Goals" ON public.goals;
    CREATE POLICY "Akses Penuh Goals" ON public.goals FOR ALL USING (true) WITH CHECK (true);

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
