export type DefaultGoalCategory = 
  | 'Pendapatan (Revenue)' 
  | 'Pemasaran (Marketing)' 
  | 'Produk (Product)' 
  | 'Operasional (Operations)' 
  | 'Klien (Client & Sales)' 
  | 'Personal & Kepemimpinan';

export type GoalCategory = string;

export const DEFAULT_GOAL_CATEGORIES: string[] = [
  'Pendapatan (Revenue)', 
  'Pemasaran (Marketing)', 
  'Produk (Product)', 
  'Operasional (Operations)', 
  'Klien (Client & Sales)', 
  'Personal & Kepemimpinan'
];

export const DEFAULT_BUSINESS_CATEGORIES = DEFAULT_GOAL_CATEGORIES;

export type GoalStatus = 'on_track' | 'at_risk' | 'behind' | 'completed';
export type GoalPriority = 'high' | 'medium' | 'low';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetValue: number;
  currentValue: number;
  unit: string; // e.g. 'Rp', '%', 'Klien', 'Unit'
  deadline: string; // YYYY-MM-DD
  status: GoalStatus;
  priority: GoalPriority;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
export type ProjectPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface Project {
  id: string;
  goalId?: string; // Foreign key to Goal
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

export interface Task {
  id: string;
  projectId?: string; // Foreign key to Project
  goalId?: string; // Inherited or explicit link
  title: string;
  description?: string;
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
  goalId?: string;
  title: string;
  content: string;
  category: NoteCategory;
  isPinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type RoutineFrequency = 'daily' | 'workdays' | 'weekly';
export type RoutineTimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface Routine {
  id: string;
  title: string;
  description?: string;
  frequency: RoutineFrequency;
  timeOfDay: RoutineTimeOfDay;
  category: string;
  targetDaysPerWeek: number;
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
