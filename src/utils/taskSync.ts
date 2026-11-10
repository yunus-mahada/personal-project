import { db } from '../db';
import type { Task, CalendarEvent, TaskStatus } from '../types';
import { cloudUpsertTask, cloudUpsertCalendarEvent } from '../lib/supabase';

/**
 * Menyinkronkan status penyelesaian tugas ke kalender bisnis dan sebaliknya.
 * Memastikan bila tugas diselesaikan, agenda kalender bisnis yang terhubung ikut selesai.
 */

export async function toggleTaskCompletion(
  task: Task, 
  forceState?: boolean
): Promise<{ updatedTask: Task; isCompleted: boolean }> {
  const nextCompleted = forceState !== undefined ? forceState : !task.isCompleted;
  const nowIso = new Date().toISOString();

  const updatedTask: Task = {
    ...task,
    isCompleted: nextCompleted,
    status: nextCompleted ? 'done' : 'todo',
    completedAt: nextCompleted ? nowIso : undefined,
    updatedAt: nowIso
  };

  // 1. Simpan Task ke Supabase Cloud dan Dexie IndexedDB
  await cloudUpsertTask(updatedTask);
  await db.tasks.put(updatedTask);

  // 2. Cari semua event kalender bisnis yang terhubung dengan tugas ini
  const relatedEvents: CalendarEvent[] = [];

  if (task.calendarEventId) {
    const ev = await db.calendarEvents.get(task.calendarEventId);
    if (ev) relatedEvents.push(ev);
  }

  const eventsByTaskId = await db.calendarEvents.where('taskId').equals(task.id).toArray();
  for (const ev of eventsByTaskId) {
    if (!relatedEvents.some(e => e.id === ev.id)) {
      relatedEvents.push(ev);
    }
  }

  // 3. Sinkronkan status isCompleted pada seluruh event kalender yang terhubung
  for (const ev of relatedEvents) {
    const updatedEv: CalendarEvent = {
      ...ev,
      isCompleted: nextCompleted,
      updatedAt: nowIso
    };
    try {
      await cloudUpsertCalendarEvent(updatedEv);
      await db.calendarEvents.put(updatedEv);
    } catch (e) {
      console.error('Error syncing calendar event completion from task:', e);
    }
  }

  return { updatedTask, isCompleted: nextCompleted };
}

export async function updateTaskStatus(
  task: Task, 
  nextStatus: TaskStatus
): Promise<Task> {
  const isDone = nextStatus === 'done';
  const nowIso = new Date().toISOString();

  const updatedTask: Task = {
    ...task,
    status: nextStatus,
    isCompleted: isDone,
    completedAt: isDone ? (task.completedAt || nowIso) : undefined,
    updatedAt: nowIso
  };

  // 1. Simpan Task ke Supabase Cloud dan Dexie IndexedDB
  await cloudUpsertTask(updatedTask);
  await db.tasks.put(updatedTask);

  // 2. Cari semua event kalender bisnis yang terhubung dengan tugas ini
  const relatedEvents: CalendarEvent[] = [];

  if (task.calendarEventId) {
    const ev = await db.calendarEvents.get(task.calendarEventId);
    if (ev) relatedEvents.push(ev);
  }

  const eventsByTaskId = await db.calendarEvents.where('taskId').equals(task.id).toArray();
  for (const ev of eventsByTaskId) {
    if (!relatedEvents.some(e => e.id === ev.id)) {
      relatedEvents.push(ev);
    }
  }

  // 3. Sinkronkan status isCompleted pada seluruh event kalender yang terhubung
  for (const ev of relatedEvents) {
    const updatedEv: CalendarEvent = {
      ...ev,
      isCompleted: isDone,
      updatedAt: nowIso
    };
    try {
      await cloudUpsertCalendarEvent(updatedEv);
      await db.calendarEvents.put(updatedEv);
    } catch (e) {
      console.error('Error syncing calendar event completion from task status:', e);
    }
  }

  return updatedTask;
}

export async function toggleEventCompletion(
  event: CalendarEvent, 
  forceState?: boolean
): Promise<{ updatedEvent: CalendarEvent; isCompleted: boolean }> {
  const nextCompleted = forceState !== undefined ? forceState : !event.isCompleted;
  const nowIso = new Date().toISOString();

  const updatedEvent: CalendarEvent = {
    ...event,
    isCompleted: nextCompleted,
    updatedAt: nowIso
  };

  // 1. Simpan Event ke Supabase Cloud dan Dexie IndexedDB
  await cloudUpsertCalendarEvent(updatedEvent);
  await db.calendarEvents.put(updatedEvent);

  // 2. Cari tugas yang terhubung (baik lewat event.taskId atau task.calendarEventId)
  let targetTask: Task | undefined;
  if (event.taskId) {
    targetTask = await db.tasks.get(event.taskId);
  }
  if (!targetTask) {
    targetTask = await db.tasks.filter(t => t.calendarEventId === event.id).first();
  }

  // 3. Sinkronkan status penyelesaian ke tugas
  if (targetTask) {
    const updatedTask: Task = {
      ...targetTask,
      isCompleted: nextCompleted,
      status: nextCompleted ? 'done' : 'todo',
      completedAt: nextCompleted ? nowIso : undefined,
      updatedAt: nowIso
    };
    try {
      await cloudUpsertTask(updatedTask);
      await db.tasks.put(updatedTask);
    } catch (e) {
      console.error('Error syncing task completion from calendar event:', e);
    }
  }

  return { updatedEvent, isCompleted: nextCompleted };
}

