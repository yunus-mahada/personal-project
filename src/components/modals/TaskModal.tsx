import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../../db';
import type { Task, TaskPriority, TaskStatus, EisenhowerQuadrant, CalendarEvent, TaskCategory } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { cloudUpsertTask, cloudUpsertCalendarEvent, cloudDeleteCalendarEvent } from '../../lib/supabase';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultProjectId?: string;
  defaultDate?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultProjectId,
  defaultDate
}) => {
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];

  const todayIso = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [category, setCategory] = useState<TaskCategory>('Tugas');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [eisenhower, setEisenhower] = useState<EisenhowerQuadrant>('do_first');
  const [dueDate, setDueDate] = useState(defaultDate || todayIso);
  const [estimatedMinutes, setEstimatedMinutes] = useState(60);
  const [tagsInput, setTagsInput] = useState('');
  
  // Schedule on calendar
  const [scheduleOnCalendar, setScheduleOnCalendar] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  useEffect(() => {
    if (!isOpen) return;

    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setProjectId(taskToEdit.projectId || '');
      setCategory(taskToEdit.category || 'Tugas');
      setStatus(taskToEdit.status);
      setPriority(taskToEdit.priority);
      setEisenhower(taskToEdit.eisenhower || 'do_first');
      setDueDate(taskToEdit.dueDate || todayIso);
      setEstimatedMinutes(taskToEdit.estimatedMinutes || 60);
      setTagsInput(taskToEdit.tags?.join(', ') || '');
      if (taskToEdit.scheduledStartTime && taskToEdit.scheduledEndTime) {
        setScheduleOnCalendar(true);
        setStartTime(taskToEdit.scheduledStartTime);
        setEndTime(taskToEdit.scheduledEndTime);
      } else {
        setScheduleOnCalendar(false);
      }
    } else {
      setTitle('');
      setDescription('');
      setProjectId(defaultProjectId || '');
      setCategory('Tugas');
      setStatus('todo');
      setPriority('medium');
      setEisenhower('do_first');
      setDueDate(defaultDate || todayIso);
      setEstimatedMinutes(60);
      setTagsInput('');
      setScheduleOnCalendar(false);
      setStartTime('09:00');
      setEndTime('10:00');
    }
  }, [taskToEdit, defaultProjectId, defaultDate, isOpen, todayIso]);

  const handleProjectChange = (selectedProjId: string) => {
    setProjectId(selectedProjId);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const nowIso = new Date().toISOString();
    const taskId = taskToEdit?.id || `task-${Date.now()}`;
    const calEventId = taskToEdit?.calendarEventId || (scheduleOnCalendar ? `evt-${Date.now()}` : undefined);

    const taskData: Task = {
      id: taskId,
      title: title.trim(),
      description: description.trim() || undefined,
      projectId: projectId || undefined,
      category: category,
      status: status,
      priority: priority,
      eisenhower: eisenhower,
      dueDate: dueDate || undefined,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      scheduledDate: scheduleOnCalendar ? dueDate : undefined,
      scheduledStartTime: scheduleOnCalendar ? startTime : undefined,
      scheduledEndTime: scheduleOnCalendar ? endTime : undefined,
      calendarEventId: calEventId,
      isCompleted: status === 'done',
      completedAt: status === 'done' ? (taskToEdit?.completedAt || nowIso) : undefined,
      tags: tags,
      createdAt: taskToEdit?.createdAt || nowIso,
      updatedAt: nowIso
    };

    setIsSubmitting(true);
    try {
      // 1. Simpan langsung ke Supabase Cloud (Primary Store)
      await cloudUpsertTask(taskData);

      // 2. Sync with calendar event di Supabase Cloud
      if (scheduleOnCalendar && dueDate && startTime && endTime) {
        const startDateTime = `${dueDate}T${startTime}:00`;
        const endDateTime = `${dueDate}T${endTime}:00`;
        
        const calCat = category === 'Meeting' ? 'meeting' : category === 'Evaluasi' ? 'review' : 'deep_work';
        const calColor = category === 'Meeting' ? '#7c3aed' : category === 'Evaluasi' ? '#d97706' : (priority === 'urgent' ? '#dc2626' : '#2563eb');

        const eventData: CalendarEvent = {
          id: calEventId!,
          taskId: taskId,
          projectId: projectId || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          category: calCat,
          isCompleted: status === 'done',
          color: calColor,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        await cloudUpsertCalendarEvent(eventData);
        await db.calendarEvents.put(eventData);
      } else if (taskToEdit?.calendarEventId && !scheduleOnCalendar) {
        await cloudDeleteCalendarEvent(taskToEdit.calendarEventId);
        await db.calendarEvents.delete(taskToEdit.calendarEventId);
      }

      // 3. Simpan ke local cache untuk responsivitas UI
      await db.tasks.put(taskData);
      onClose();
    } catch (err: any) {
      console.error('Error saving task to Supabase:', err);
      alert(`Gagal menyimpan tugas ke Supabase: ${err.message || 'Cek koneksi internet/Supabase Anda.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {taskToEdit ? 'Ubah Rincian Tugas' : 'Tambah Tugas Baru'}
            </h2>
            <p className="text-xs text-zinc-400">
              Sinkronisasi otomatis dengan Proyek & Kalender Personal Project
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Judul Tugas <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Finalisasi draf proposal kemitraan Q4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Deskripsi & Catatan Eksekusi
            </label>
            <textarea
              rows={2}
              placeholder="Rincian teknis, deliverable, atau konteks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Proyek Terkait
            </label>
            <select
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="">(Tanpa Proyek Khusus - Tugas Bebas)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Kategori Tugas <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Tugas', 'Meeting', 'Evaluasi'] as TaskCategory[]).map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategory(cat);
                      if (cat === 'Meeting' || cat === 'Evaluasi') {
                        setScheduleOnCalendar(true);
                      }
                    }}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? cat === 'Meeting'
                          ? 'bg-purple-950/80 border-purple-500 text-purple-200 font-semibold shadow-xs ring-1 ring-purple-500/50'
                          : cat === 'Evaluasi'
                          ? 'bg-amber-950/80 border-amber-500 text-amber-200 font-semibold shadow-xs ring-1 ring-amber-500/50'
                          : 'bg-blue-950/80 border-blue-500 text-blue-200 font-semibold shadow-xs ring-1 ring-blue-500/50'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-white hover:border-zinc-600'
                    }`}
                  >
                    <span>{cat === 'Meeting' ? '👥' : cat === 'Evaluasi' ? '📊' : '✅'}</span>
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              {category === 'Meeting' 
                ? '📌 Rapat koordinasi, pitching, atau agenda tatap muka (otomatis diberi penanda rapat).' 
                : category === 'Evaluasi' 
                ? '📌 Review sprint, tinjauan metrik bisnis, atau audit kas bulanan (otomatis diberi penanda evaluasi).' 
                : '📌 Tugas eksekusi teknis dan operasional harian.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="todo">Untuk Dikerjakan</option>
                <option value="in_progress">Sedang Berjalan</option>
                <option value="in_review">Dalam Tinjauan</option>
                <option value="done">Selesai</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="urgent">Mendesak</option>
                <option value="high">Tinggi</option>
                <option value="medium">Sedang</option>
                <option value="low">Rendah</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Matrix Eisenhower
              </label>
              <select
                value={eisenhower}
                onChange={(e) => setEisenhower(e.target.value as EisenhowerQuadrant)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="do_first">Prioritas Utama (Do First)</option>
                <option value="schedule">Jadwalkan (Schedule)</option>
                <option value="delegate">Delegasikan (Delegate)</option>
                <option value="dont_do">Eliminasi (Don't Do)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Tenggat Waktu (Due Date)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Estimasi Durasi (Menit)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Tag (Pisahkan dengan koma)
            </label>
            <input
              type="text"
              placeholder="Proposal, Klien, Review"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Schedule to Business Calendar */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleOnCalendar}
                onChange={(e) => setScheduleOnCalendar(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-0"
              />
              <span>Jadwalkan ke Kalender Bisnis (Time Blocking)</span>
            </label>

            {scheduleOnCalendar && (
              <div className="grid grid-cols-2 gap-3 mt-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-zinc-700 bg-zinc-900 text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? 'Menyimpan ke Cloud...' : (taskToEdit ? 'Simpan Perubahan' : 'Buat Tugas')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
