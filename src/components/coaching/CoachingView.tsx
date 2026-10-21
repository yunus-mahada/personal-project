import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  Users,
  BookOpen,
  Zap,
  Clock
} from 'lucide-react';

export const CoachingView: React.FC = () => {
  const [dots, setDots] = useState('');
  const [progress, setProgress] = useState(0);

  // Animasi titik-titik loading
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(dotsInterval);
  }, []);

  // Animasi progress bar (berhenti di 72%)
  useEffect(() => {
    const target = 72;
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setProgress(Math.round(current));
    }, 16);
    return () => clearInterval(timer);
  }, []);

  const upcomingFeatures = [
    {
      icon: Brain,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
      title: 'AI Personal Coach',
      desc: 'Analisis pola kerja & rekomendasi strategi produktivitas berbasis AI'
    },
    {
      icon: Target,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      title: 'Goal Tracking & OKR',
      desc: 'Pantau pencapaian tujuan dengan framework OKR terintegrasi'
    },
    {
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      title: 'Progress Analytics',
      desc: 'Dashboard performa mingguan & bulanan dengan insight mendalam'
    },
    {
      icon: Users,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      title: 'Team Coaching Board',
      desc: 'Pantau pertumbuhan tim dan distribusi beban kerja secara real-time'
    },
    {
      icon: BookOpen,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      title: 'Learning Path',
      desc: 'Kurikulum pengembangan diri yang disesuaikan dengan peran & tujuan Anda'
    },
    {
      icon: Zap,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      title: 'Habit Acceleration',
      desc: 'Sistem pembentukan kebiasaan produktif berbasis ilmu perilaku'
    },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-10 py-10">

      {/* === Hero Maintenance Card === */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-[#262b34] bg-gradient-to-br from-[#181b20] via-[#1a1d24] to-[#14161a] shadow-2xl p-8 sm:p-12 text-center">

        {/* Ambient glow accents */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-blue-600/8 blur-3xl" />

        {/* Icon animasi */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg">
            <Wrench className="w-9 h-9 text-amber-400" strokeWidth={1.5} />
          </div>
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </span>
          </span>
        </div>

        {/* Judul */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
          Coaching & Pengembangan Diri
        </h1>
        <p className="text-sm font-semibold text-amber-400 mb-4 flex items-center justify-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Sedang dalam pemeliharaan{dots}</span>
        </p>

        <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto mb-8">
          Kami sedang membangun fitur{' '}
          <span className="text-white font-semibold">Coaching & Pengembangan Diri</span>{' '}
          yang akan membantu Anda mencapai potensi terbaik melalui panduan personal berbasis data dan AI.
        </p>

        {/* Progress bar */}
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
          <span>Progress pengembangan</span>
          <span className="font-mono font-semibold text-amber-400">{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Badge status */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          Maintenance aktif — Tim sedang bekerja keras
        </div>
      </div>

      {/* === Fitur yang Akan Datang === */}
      <div className="w-full max-w-2xl">
        <p className="text-center text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-5">
          Fitur yang akan hadir
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {upcomingFeatures.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-xl border ${feat.bg} backdrop-blur-sm hover:scale-[1.02] transition-transform duration-200`}
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-zinc-900/60">
                  <Icon className={`w-4 h-4 ${feat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white mb-0.5">{feat.title}</p>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-zinc-600 text-center">
        Notifikasi akan dikirimkan saat fitur ini siap digunakan.
      </p>
    </div>
  );
};
