import Dexie, { type Table } from 'dexie';
import type { 
  Goal, 
  Project, 
  Task, 
  CalendarEvent, 
  Note, 
  Routine, 
  UserSettings 
} from '../types';

export class MahadaDatabase extends Dexie {
  goals!: Table<Goal, string>;
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  calendarEvents!: Table<CalendarEvent, string>;
  notes!: Table<Note, string>;
  routines!: Table<Routine, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super('MahadaBusinessDB');
    this.version(1).stores({
      goals: 'id, category, status, priority, deadline, createdAt',
      projects: 'id, goalId, status, priority, dueDate, createdAt',
      tasks: 'id, projectId, goalId, status, priority, dueDate, scheduledDate, isCompleted, createdAt',
      calendarEvents: 'id, taskId, projectId, category, startTime, isCompleted, createdAt',
      notes: 'id, projectId, goalId, category, isPinned, createdAt',
      routines: 'id, frequency, timeOfDay, createdAt',
      settings: 'id'
    });
  }
}

export const db = new MahadaDatabase();

export async function initializeDatabase() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await seedInitialData();
  } else {
    const existing = await db.settings.get('user_default');
    if (existing && (!existing.businessName || existing.businessName.includes('Nexora'))) {
      await db.settings.update('user_default', {
        businessName: 'Mahada Indonesia'
      });
    }
  }
}

export async function seedInitialData() {
  const now = new Date();
  const todayStr = '2026-10-16'; // Current anchor date

  // 1. Initial Settings
  const defaultSettings: UserSettings = {
    id: 'user_default',
    userName: 'Yunus Mahada',
    businessName: 'Mahada Indonesia',
    currency: 'IDR',
    defaultWeeklyGoalHours: 40,
    theme: 'dark',
    hasCompletedOnboarding: true
  };
  await db.settings.put(defaultSettings);

  // 2. Initial Goals
  const sampleGoals: Goal[] = [
    {
      id: 'goal-1',
      title: 'Mencapai Omzet Rp 500 Juta di Q4 2026',
      description: 'Meningkatkan pendapatan bisnis melalui penutupan kontrak enterprise dan ekspansi penjualan solusi SaaS.',
      category: 'Pendapatan',
      targetValue: 500,
      currentValue: 345,
      unit: 'Juta Rp',
      deadline: '2026-12-31',
      status: 'on_track',
      priority: 'high',
      color: '#2563eb',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-15T14:30:00Z'
    },
    {
      id: 'goal-2',
      title: 'Peluncuran Platform SaaS V2 & 50 Klien B2B Aktif',
      description: 'Menyelesaikan perombakan arsitektur, integrasi API perbankan, dan onboarding 50 perusahaan mitra.',
      category: 'Produk',
      targetValue: 50,
      currentValue: 32,
      unit: 'Klien',
      deadline: '2026-11-30',
      status: 'on_track',
      priority: 'high',
      color: '#059669',
      createdAt: '2026-10-01T08:30:00Z',
      updatedAt: '2026-10-14T10:00:00Z'
    },
    {
      id: 'goal-3',
      title: 'Optimalisasi Efisiensi Operasional & Pengurangan Biaya 15%',
      description: 'Audit infrastruktur cloud, konsolidasi subscription vendor, dan otomatisasi alur kerja internal.',
      category: 'Operasional',
      targetValue: 15,
      currentValue: 9.5,
      unit: '% Biaya',
      deadline: '2026-12-15',
      status: 'on_track',
      priority: 'medium',
      color: '#d97706',
      createdAt: '2026-10-02T09:00:00Z',
      updatedAt: '2026-10-12T16:00:00Z'
    },
    {
      id: 'goal-4',
      title: 'Bangun Otoritas Bisnis & 10.000 Pembaca Newsletter',
      description: 'Penerbitan studi kasus B2B industri berkala dan pendistribusian wawasan eksekutif.',
      category: 'Pemasaran',
      targetValue: 10000,
      currentValue: 6850,
      unit: 'Subscriber',
      deadline: '2026-11-25',
      status: 'at_risk',
      priority: 'medium',
      color: '#7c3aed',
      createdAt: '2026-10-03T11:00:00Z',
      updatedAt: '2026-10-15T11:20:00Z'
    }
  ];
  await db.goals.bulkPut(sampleGoals);

  // 3. Initial Projects
  const sampleProjects: Project[] = [
    {
      id: 'proj-1',
      goalId: 'goal-1',
      title: 'Kampanye Penjualan B2B Enterprise Q4',
      description: 'Pendekatan 30 akun korporat besar di sektor logistik dan manufaktur untuk lisensi tahunan.',
      status: 'in_progress',
      priority: 'urgent',
      startDate: '2026-10-05',
      dueDate: '2026-11-20',
      category: 'Penjualan',
      tags: ['B2B', 'Enterprise', 'Closing'],
      createdAt: '2026-10-05T09:00:00Z',
      updatedAt: '2026-10-15T15:00:00Z'
    },
    {
      id: 'proj-2',
      goalId: 'goal-2',
      title: 'Pembaruan UI/UX Desain Dashboard Versi 2.0',
      description: 'Sistem desain modular baru dengan dukungan tema terang/gelap dan navigasi keyboard terpadu.',
      status: 'review',
      priority: 'high',
      startDate: '2026-10-01',
      dueDate: '2026-10-25',
      category: 'Desain Produk',
      tags: ['UI/UX', 'Figma', 'Design System'],
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-15T17:00:00Z'
    },
    {
      id: 'proj-3',
      goalId: 'goal-2',
      title: 'Integrasi Payment Gateway Otomatis & Faktur Pajak',
      description: 'Menghubungkan API Midtrans/Xendit untuk penagihan berulang otomatis dan e-faktur instan.',
      status: 'in_progress',
      priority: 'high',
      startDate: '2026-10-10',
      dueDate: '2026-11-10',
      category: 'Engineering',
      tags: ['Billing', 'Payment', 'API'],
      createdAt: '2026-10-10T11:00:00Z',
      updatedAt: '2026-10-15T13:45:00Z'
    },
    {
      id: 'proj-4',
      goalId: 'goal-3',
      title: 'Migrasi & Penataan Arsitektur Cloud Hemat Biaya',
      description: 'Right-sizing instans database, pemanfaatan caching edge CDN, dan penutupan node server cadangan.',
      status: 'in_progress',
      priority: 'medium',
      startDate: '2026-10-08',
      dueDate: '2026-11-15',
      category: 'Infrastruktur',
      tags: ['Cloud', 'DevOps', 'Cost-Saving'],
      createdAt: '2026-10-08T08:00:00Z',
      updatedAt: '2026-10-14T09:30:00Z'
    },
    {
      id: 'proj-5',
      goalId: 'goal-4',
      title: 'Penerbitan Whitepaper Industri & Seri Artikel Riset',
      description: 'Menulis riset mendalam mengenai adopsi AI pada efisiensi rantai pasok Indonesia 2027.',
      status: 'planning',
      priority: 'medium',
      startDate: '2026-10-18',
      dueDate: '2026-11-28',
      category: 'Konten & Riset',
      tags: ['Whitepaper', 'Thought Leadership', 'LinkedIn'],
      createdAt: '2026-10-12T14:00:00Z',
      updatedAt: '2026-10-15T10:15:00Z'
    }
  ];
  await db.projects.bulkPut(sampleProjects);

  // 4. Initial Tasks
  const sampleTasks: Task[] = [
    {
      id: 'task-1',
      projectId: 'proj-1',
      goalId: 'goal-1',
      title: 'Finalisasi proposal kerja sama untuk PT Nusantara Logistik',
      description: 'Sesuaikan struktur diskon volume lisensi multi-cabang dan lampiran SLA 99.9%.',
      status: 'in_progress',
      priority: 'urgent',
      eisenhower: 'do_first',
      dueDate: '2026-10-16',
      estimatedMinutes: 90,
      actualMinutes: 45,
      scheduledDate: '2026-10-16',
      scheduledStartTime: '09:00',
      scheduledEndTime: '10:30',
      calendarEventId: 'evt-1',
      isCompleted: false,
      tags: ['Proposal', 'Klien', 'Legal'],
      createdAt: '2026-10-14T10:00:00Z',
      updatedAt: '2026-10-15T16:00:00Z'
    },
    {
      id: 'task-2',
      projectId: 'proj-1',
      goalId: 'goal-1',
      title: 'Meeting presentasi demo produk dengan Direktur Operasional',
      description: 'Jelaskan modul pelacakan armada otomatis dan penghematan biaya bulanan.',
      status: 'todo',
      priority: 'urgent',
      eisenhower: 'do_first',
      dueDate: '2026-10-16',
      estimatedMinutes: 60,
      scheduledDate: '2026-10-16',
      scheduledStartTime: '14:00',
      scheduledEndTime: '15:00',
      calendarEventId: 'evt-2',
      isCompleted: false,
      tags: ['Demo', 'Pitch', 'C-Level'],
      createdAt: '2026-10-14T11:00:00Z',
      updatedAt: '2026-10-15T11:00:00Z'
    },
    {
      id: 'task-3',
      projectId: 'proj-2',
      goalId: 'goal-2',
      title: 'Audit accessibility dan kontras rasio warna UI komponen',
      description: 'Pastikan seluruh elemen memenuhi standar WCAG AA dengan kontras minimal 4.5:1.',
      status: 'in_review',
      priority: 'high',
      eisenhower: 'schedule',
      dueDate: '2026-10-17',
      estimatedMinutes: 75,
      actualMinutes: 70,
      scheduledDate: '2026-10-17',
      scheduledStartTime: '10:00',
      scheduledEndTime: '11:15',
      isCompleted: false,
      tags: ['Design QA', 'WCAG', 'Frontend'],
      createdAt: '2026-10-12T15:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z'
    },
    {
      id: 'task-4',
      projectId: 'proj-3',
      goalId: 'goal-2',
      title: 'Uji coba webhook callback pelunasan faktur berulang',
      description: 'Simulasikan skenario kegagalan kartu kredit dan sistem notifikasi retry 3x.',
      status: 'in_progress',
      priority: 'high',
      eisenhower: 'schedule',
      dueDate: '2026-10-18',
      estimatedMinutes: 120,
      actualMinutes: 40,
      isCompleted: false,
      tags: ['Webhook', 'Payment', 'Testing'],
      createdAt: '2026-10-13T09:30:00Z',
      updatedAt: '2026-10-15T18:00:00Z'
    },
    {
      id: 'task-5',
      projectId: 'proj-4',
      goalId: 'goal-3',
      title: 'Analisis laporan tagihan cloud provider bulan September',
      description: 'Identifikasi alokasi storage tak terpakai dan log retention yang berlebihan.',
      status: 'done',
      priority: 'medium',
      eisenhower: 'delegate',
      dueDate: '2026-10-14',
      estimatedMinutes: 45,
      actualMinutes: 40,
      isCompleted: true,
      completedAt: '2026-10-14T11:30:00Z',
      tags: ['Audit', 'Cost', 'Infra'],
      createdAt: '2026-10-11T13:00:00Z',
      updatedAt: '2026-10-14T11:30:00Z'
    },
    {
      id: 'task-6',
      projectId: 'proj-5',
      goalId: 'goal-4',
      title: 'Riset data tren adopsi AI di sektor logistik Indonesia',
      description: 'Kumpulkan sumber data resmi dari Asosiasi Logistik Indonesia dan BPS.',
      status: 'todo',
      priority: 'low',
      eisenhower: 'schedule',
      dueDate: '2026-10-20',
      estimatedMinutes: 90,
      isCompleted: false,
      tags: ['Research', 'Whitepaper'],
      createdAt: '2026-10-15T08:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z'
    },
    {
      id: 'task-7',
      projectId: 'proj-2',
      goalId: 'goal-2',
      title: 'Export icon asset SVG dan panduan warna komponen ke Figma Tokens',
      description: 'Sinkronisasi token variabel warna dengan kode CSS sistem proyek.',
      status: 'done',
      priority: 'medium',
      eisenhower: 'delegate',
      dueDate: '2026-10-13',
      estimatedMinutes: 60,
      actualMinutes: 55,
      isCompleted: true,
      completedAt: '2026-10-13T16:20:00Z',
      tags: ['Tokens', 'Assets'],
      createdAt: '2026-10-10T14:00:00Z',
      updatedAt: '2026-10-13T16:20:00Z'
    }
  ];
  await db.tasks.bulkPut(sampleTasks);

  // 5. Initial Calendar Events
  const sampleEvents: CalendarEvent[] = [
    {
      id: 'evt-1',
      taskId: 'task-1',
      projectId: 'proj-1',
      title: 'Sesi Fokus: Finalisasi Proposal PT Nusantara Logistik',
      description: 'Penulisan ringkasan eksekutif dan klausul SLA diskon volume.',
      startTime: '2026-10-16T09:00:00',
      endTime: '2026-10-16T10:30:00',
      category: 'deep_work',
      locationOrLink: 'Ruang Kerja Utama',
      isCompleted: false,
      color: '#2563eb',
      createdAt: '2026-10-14T10:00:00Z',
      updatedAt: '2026-10-15T16:00:00Z'
    },
    {
      id: 'evt-2',
      taskId: 'task-2',
      projectId: 'proj-1',
      title: 'Demo Produk & Negosiasi — Direktur PT Nusantara',
      description: 'Presentasi langsung solusi arsitektur SaaS dan kalkulator ROI.',
      startTime: '2026-10-16T14:00:00',
      endTime: '2026-10-16T15:00:00',
      category: 'client',
      locationOrLink: 'Google Meet: meet.google.com/nex-biz-demo',
      isCompleted: false,
      color: '#059669',
      createdAt: '2026-10-14T11:00:00Z',
      updatedAt: '2026-10-15T11:00:00Z'
    },
    {
      id: 'evt-3',
      title: 'Review Mingguan Kinerja Bisnis & Arus Kas',
      description: 'Evaluasi pencapaian target minggu ini dan perencanaan prioritas minggu depan.',
      startTime: '2026-10-16T16:30:00',
      endTime: '2026-10-16T17:30:00',
      category: 'review',
      locationOrLink: 'Meja Eksekutif',
      isCompleted: false,
      color: '#d97706',
      createdAt: '2026-10-12T08:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z'
    },
    {
      id: 'evt-4',
      title: 'Sesi Deep Work: Code Review API Payment Gateway',
      description: 'Verifikasi enkripsi payload dan idempotency token transaksi.',
      startTime: '2026-10-17T09:00:00',
      endTime: '2026-10-17T11:00:00',
      category: 'deep_work',
      locationOrLink: 'Dev Studio',
      isCompleted: false,
      color: '#2563eb',
      createdAt: '2026-10-13T09:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z'
    }
  ];
  await db.calendarEvents.bulkPut(sampleEvents);

  // 6. Initial Notes
  const sampleNotes: Note[] = [
    {
      id: 'note-1',
      projectId: 'proj-1',
      goalId: 'goal-1',
      title: 'Strategi Negosiasi & Pricing Tier Akun Enterprise B2B',
      content: `## Kerangka Negosiasi Enterprise 2026
1. **Nilai Inti yang Ditawarkan**:
   - Pengurangan waktu rekonsiliasi manual hingga 70%.
   - Kepatuhan audit data finansial real-time.
   - Dedicated Support Engineer 24/7.

2. **Batasan Diskon**:
   - Maksimum diskon volume tahunan: 15% jika pembayaran dibayar di muka (upfront).
   - Layanan kustomisasi integrasi dikenakan biaya terpisah (minimal Rp 10 Juta).

3. **Langkah Penutupan Kontrak**:
   - Kirim draf kontrak ke bagian Legal klien maksimal 24 jam setelah demo.
   - Konfirmasi penandatanganan sebelum akhir bulan Oktober.`,
      category: 'strategy',
      isPinned: true,
      tags: ['Sales', 'Pricing', 'Enterprise'],
      createdAt: '2026-10-10T11:00:00Z',
      updatedAt: '2026-10-15T14:00:00Z'
    },
    {
      id: 'note-2',
      projectId: 'proj-2',
      title: 'Catatan Rapat Desain UI/UX V2 — Masukan Pengguna Beta',
      content: `## Ringkasan Rapat dengan 5 Pengguna Beta
- **Feedback Utama**:
  - Pengguna sangat menyukai kecepatan keyboard shortcut (Cmd+K).
  - Tampilan tabel perlu opsi dense mode untuk melihat 30+ baris data tanpa scrolling panjang.
  - Warna status perlu teks pendamping yang jelas agar ramah aksesibilitas.
- **Rencana Tindak Lanjut**:
  - Terapkan tabular numerals pada seluruh angka metrik.
  - Tambahkan tombol pintasan cepat di header proyek.`,
      category: 'meeting_notes',
      isPinned: true,
      tags: ['UX', 'Feedback', 'Beta'],
      createdAt: '2026-10-12T16:00:00Z',
      updatedAt: '2026-10-14T18:00:00Z'
    },
    {
      id: 'note-3',
      title: 'SOP Standar Operasional: Rilis Pembaruan Aplikasi PWA',
      content: `## Checklist Rilis Produksi
1. Pastikan audit TypeScript \`npm run lint\` lulus tanpa error.
2. Validasi service worker cache versi terbaru diperbarui otomatis.
3. Uji fungsi offline IndexedDB pada mode Airplane.
4. Verifikasi icon PWA 192px dan 512px tampil sempurna pada launcher mobile.`,
      category: 'sop',
      isPinned: false,
      tags: ['SOP', 'DevOps', 'PWA'],
      createdAt: '2026-10-08T09:00:00Z',
      updatedAt: '2026-10-13T10:00:00Z'
    }
  ];
  await db.notes.bulkPut(sampleNotes);

  // 7. Initial Routines
  const sampleRoutines: Routine[] = [
    {
      id: 'rtn-1',
      title: 'Tinjauan Ringkasan Kas & Invoice Pagi (15 Menit)',
      description: 'Memeriksa saldo rekening operasional, piutang jatuh tempo, dan otorisasi pengeluaran.',
      frequency: 'workdays',
      timeOfDay: 'morning',
      category: 'Keuangan',
      targetDaysPerWeek: 5,
      completedDates: ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'],
      streak: 4,
      createdAt: '2026-10-01T07:00:00Z'
    },
    {
      id: 'rtn-2',
      title: 'Blok Sesi Deep Work Bebas Notifikasi (90 Menit)',
      description: 'Mengerjakan tugas prioritas tertinggi bisnis tanpa distraksi pesan instan.',
      frequency: 'workdays',
      timeOfDay: 'morning',
      category: 'Produktivitas',
      targetDaysPerWeek: 5,
      completedDates: ['2026-10-13', '2026-10-14', '2026-10-15'],
      streak: 3,
      createdAt: '2026-10-01T07:30:00Z'
    },
    {
      id: 'rtn-3',
      title: 'Follow-up 3 Prospek Klien Potensial',
      description: 'Menjaga hubungan dengan calon klien korporat dan mengirim pembaruan proposal.',
      frequency: 'workdays',
      timeOfDay: 'afternoon',
      category: 'Penjualan',
      targetDaysPerWeek: 5,
      completedDates: ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'],
      streak: 4,
      createdAt: '2026-10-01T08:00:00Z'
    },
    {
      id: 'rtn-4',
      title: 'Refleksi Akhir Hari & Penentuan 3 Prioritas Esok',
      description: 'Menutup seluruh tab kerja, mencatat evaluasi hari ini, dan menjadwalkan agenda esok.',
      frequency: 'daily',
      timeOfDay: 'evening',
      category: 'Mindset',
      targetDaysPerWeek: 7,
      completedDates: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'],
      streak: 4,
      createdAt: '2026-10-01T17:00:00Z'
    }
  ];
  await db.routines.bulkPut(sampleRoutines);
}

export async function resetDatabaseWithSamples() {
  await db.goals.clear();
  await db.projects.clear();
  await db.tasks.clear();
  await db.calendarEvents.clear();
  await db.notes.clear();
  await db.routines.clear();
  await seedInitialData();
}

export async function exportDatabaseBackup(): Promise<string> {
  const settings = await db.settings.toArray();
  const goals = await db.goals.toArray();
  const projects = await db.projects.toArray();
  const tasks = await db.tasks.toArray();
  const calendarEvents = await db.calendarEvents.toArray();
  const notes = await db.notes.toArray();
  const routines = await db.routines.toArray();

  const backupData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: {
      settings,
      goals,
      projects,
      tasks,
      calendarEvents,
      notes,
      routines
    }
  };

  return JSON.stringify(backupData, null, 2);
}

export async function importDatabaseBackup(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.data) return false;

    if (parsed.data.settings) await db.settings.bulkPut(parsed.data.settings);
    if (parsed.data.goals) await db.goals.bulkPut(parsed.data.goals);
    if (parsed.data.projects) await db.projects.bulkPut(parsed.data.projects);
    if (parsed.data.tasks) await db.tasks.bulkPut(parsed.data.tasks);
    if (parsed.data.calendarEvents) await db.calendarEvents.bulkPut(parsed.data.calendarEvents);
    if (parsed.data.notes) await db.notes.bulkPut(parsed.data.notes);
    if (parsed.data.routines) await db.routines.bulkPut(parsed.data.routines);

    return true;
  } catch (err) {
    console.error('Import error:', err);
    return false;
  }
}
