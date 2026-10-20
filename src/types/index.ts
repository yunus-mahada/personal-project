export type BusinessCategory = string;

export const DEFAULT_BUSINESS_CATEGORIES: string[] = [];

export const DEFAULT_GOAL_CATEGORIES = DEFAULT_BUSINESS_CATEGORIES;

export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
export type ProjectPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  budget?: number;
  spent?: number;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'dont_do';
export type TaskCategory = 'Meeting' | 'Evaluasi' | 'Tugas';

export const TASK_CATEGORIES: TaskCategory[] = ['Meeting', 'Evaluasi', 'Tugas'];

export interface Task {
  id: string;
  projectId?: string; // Foreign key to Project
  title: string;
  description?: string;
  category?: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  eisenhower?: EisenhowerQuadrant;
  dueDate?: string; // YYYY-MM-DD
  estimatedMinutes?: number;
  actualMinutes?: number;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledStartTime?: string; // HH:mm
  scheduledEndTime?: string; // HH:mm
  calendarEventId?: string;
  isCompleted: boolean;
  completedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type CalendarEventCategory = 'meeting' | 'deep_work' | 'client' | 'milestone' | 'review' | 'routine';

export interface CalendarEvent {
  id: string;
  taskId?: string; // Optional link to Task
  projectId?: string;
  title: string;
  description?: string;
  startTime: string; // ISO string e.g. 2026-10-16T09:00:00
  endTime: string; // ISO string e.g. 2026-10-16T10:30:00
  category: CalendarEventCategory;
  locationOrLink?: string;
  isCompleted: boolean;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type NoteCategory = 'meeting_notes' | 'strategy' | 'sop' | 'idea' | 'brief';

export interface Note {
  id: string;
  projectId?: string;
  title: string;
  content: string;
  category: NoteCategory;
  isPinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type RoutineFrequency = 'daily' | 'workdays' | 'weekly' | 'custom_range' | 'custom_days';
export type RoutineTimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface Routine {
  id: string;
  title: string;
  description?: string;
  frequency: RoutineFrequency;
  timeOfDay: RoutineTimeOfDay;
  category: string;
  targetDaysPerWeek: number;
  startDay?: number; // Hari awal untuk rentang tanggal bulanan (1-31, contoh: 7)
  endDay?: number;   // Hari akhir untuk rentang tanggal bulanan (1-31, contoh: 10)
  customDays?: number[]; // Pilihan hari dalam seminggu (0 = Minggu, 1 = Senin, ..., 6 = Sabtu, contoh: [1, 4] untuk Sen & Kam)
  completedDates: string[]; // ['2026-10-14', '2026-10-15', ...]
  streak: number;
  createdAt: string;
}

export interface UserSettings {
  id: string;
  userName: string;
  businessName: string;
  currency: 'IDR' | 'USD' | 'EUR' | 'SGD';
  defaultWeeklyGoalHours: number;
  theme: 'light' | 'dark';
  hasCompletedOnboarding: boolean;
  goalCategories?: string[];
}

export type ActiveTab = 
  | 'dashboard' 
  | 'projects' 
  | 'tasks' 
  | 'calendar' 
  | 'notes' 
  | 'routines' 
  | 'analytics' 
  | 'settings';
