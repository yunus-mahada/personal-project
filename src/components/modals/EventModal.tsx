import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../../db';
import type { CalendarEvent, CalendarEventCategory } from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { cloudUpsertCalendarEvent } from '../../lib/supabase';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
  defaultDate?: string;
  defaultTime?: string;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  defaultDate,
  defaultTime
}) => {
  const projects = useLiveQuery(() => db.projects.toArray()) ?? [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate || '2026-10-16');
  const [startTime, setStartTime] = useState(defaultTime || '09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<CalendarEventCategory>('deep_work');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [projectId, setProjectId] = useState('');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || '');
      const s = eventToEdit.startTime.split('T');
      setDate(s[0] || '2026-10-16');
      setStartTime(s[1]?.slice(0, 5) || '09:00');
      const e = eventToEdit.endTime.split('T');
      setEndTime(e[1]?.slice(0, 5) || '10:00');
      setCategory(eventToEdit.category);
      setLocationOrLink(eventToEdit.locationOrLink || '');
      setProjectId(eventToEdit.projectId || '');
      setColor(eventToEdit.color || '#3b82f6');
    } else {
      setTitle('');
      setDescription('');
      setDate(defaultDate || '2026-10-16');
      setStartTime(defaultTime || '09:00');
      setEndTime('10:00');
      setCategory('deep_work');
      setLocationOrLink('');
      setProjectId('');
      setColor('#3b82f6');
    }
  }, [eventToEdit, defaultDate, defaultTime, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startDateTime = `${date}T${startTime}:00`;
    const endDateTime = `${date}T${endTime}:00`;
    const nowIso = new Date().toISOString();

    const eventData: CalendarEvent = {
      id: eventToEdit?.id || `evt-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      startTime: startDateTime,
      endTime: endDateTime,
      category,
      locationOrLink: locationOrLink.trim() || undefined,
      projectId: projectId || undefined,
      isCompleted: eventToEdit?.isCompleted || false,
      color,
      createdAt: eventToEdit?.createdAt || nowIso,
      updatedAt: nowIso
    };

    await db.calendarEvents.put(eventData);
    cloudUpsertCalendarEvent(eventData).catch(console.error);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {eventToEdit ? 'Ubah Agenda Kalender' : 'Jadwalkan Agenda Bisnis'}
            </h2>
            <p className="text-xs text-zinc-400">
              Blok waktu kerja (Time Blocking), sesi fokus, atau rapat bisnis Personal Project
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Judul Agenda <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Sesi Deep Work — Review Arsitektur Sistem"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Kategori Agenda
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CalendarEventCategory)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
            >
              <option value="deep_work">Deep Work (Sesi Fokus Tanpa Gangguan)</option>
              <option value="meeting">Rapat Koordinasi Internal</option>
              <option value="client">Pertemuan Klien / Pitch</option>
              <option value="milestone">Milestone / Tenggat Kunci</option>
              <option value="review">Evaluasi & Tinjauan Kas</option>
              <option value="routine">Rutinitas Eksekutif</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Jam Mulai</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Jam Selesai</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Lokasi atau Link Pertemuan
            </label>
            <input
              type="text"
              placeholder="Google Meet, Zoom, atau Ruang Rapat Lt. 2"
              value={locationOrLink}
              onChange={(e) => setLocationOrLink(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Tautkan ke Proyek (Opsional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white"
            >
              <option value="">(Bukan Bagian Proyek Khusus)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Catatan Tambahan</label>
            <textarea
              rows={2}
              placeholder="Agenda poin, link referensi dokumen..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-700 bg-zinc-950 text-white focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

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
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition shadow-xs"
            >
              {eventToEdit ? 'Simpan Perubahan' : 'Jadwalkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
