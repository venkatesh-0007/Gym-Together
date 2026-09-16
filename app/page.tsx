'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Flame,
  Clock,
  Calendar,
  ChevronRight,
  Dumbbell,
  Sparkles,
  ArrowRight,
  Users2,
  Trophy,
} from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { useAccount } from '@/lib/context/AccountContext';
import {
  formatDurationHuman,
  formatElapsed,
  formatDateLabel,
  formatTime,
} from '@/lib/calculations/duration';
import { calculateStreak } from '@/lib/calculations/streak';
import { calculateWeeklyStats } from '@/lib/calculations/stats';
import RecoveryModal from '@/components/workout/RecoveryModal';
import { WorkoutTemplate } from '@/lib/types/workout';

export default function HomePage() {
  const router = useRouter();
  const { activeProfile } = useAccount();
  const {
    activeWorkout,
    elapsedSeconds,
    allWorkouts,
    templates,
    settings,
    startWorkout,
  } = useWorkout();

  const [isStarting, setIsStarting] = useState(false);

  // Stats calculations
  const streak = calculateStreak(allWorkouts);
  const weeklyStats = calculateWeeklyStats(allWorkouts, settings.weeklyGoal);

  // Most recent completed workout
  const recentWorkout = allWorkouts.find((w) => w.status === 'completed');

  // Start plain workout
  const handleStartWorkout = async (template?: WorkoutTemplate) => {
    setIsStarting(true);
    try {
      await startWorkout(template, activeProfile.id);
      router.push('/active');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6 gap-6 animate-page-enter">
      {/* Recovery Prompt Modal if crash/unfinished session detected */}
      <RecoveryModal />

      {/* Structured Responsive Grid: 1 col on mobile, 2 cols on tablet/desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: HERO WORKOUT ACTION & TEMPLATES */}
        <div className="flex flex-col gap-5 w-full">
          {/* TODAY'S STATUS & HERO ACTION */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">
                Today&apos;s Training
              </span>
              <span
                suppressHydrationWarning
                className="text-xs font-semibold text-zinc-400"
              >
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            {activeWorkout ? (
              /* Running Active Workout Card */
              <div className="w-full bg-gradient-to-br from-emerald-950/90 via-zinc-900 to-zinc-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden transition-all hover:border-emerald-400">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                      Session In Progress
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    Started {formatTime(activeWorkout.startTime, settings.timeFormat)}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">
                    Elapsed Time
                  </p>
                  <p className="text-5xl font-black font-mono tracking-tight text-white mt-1">
                    {formatElapsed(elapsedSeconds)}
                  </p>
                </div>

                <Link
                  href="/active"
                  className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all text-base select-none"
                >
                  <span>Continue Workout</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            ) : (
              /* Empty / Ready State with Hero Button */
              <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center gap-5 transition-all hover:border-zinc-700">
                <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 shadow-inner">
                  <Dumbbell className="w-8 h-8 text-emerald-400" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {streak.hasWorkedOutToday ? 'Session Finished Today!' : 'Ready to Train?'}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    {streak.hasWorkedOutToday
                      ? 'You already logged a workout today. You can start another anytime.'
                      : 'Step on the gym floor, tap start, and begin tracking your session.'}
                  </p>
                </div>

                {/* HERO START BUTTON */}
                <button
                  type="button"
                  onClick={() => handleStartWorkout()}
                  disabled={isStarting}
                  className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-black rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all text-lg tracking-wide select-none disabled:opacity-50 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>{isStarting ? 'STARTING...' : 'START WORKOUT'}</span>
                </button>

                {/* Quick Templates Sub-bar */}
                {templates.length > 0 && (
                  <div className="w-full pt-3 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Quick Routines
                      </span>
                      <Link
                        href="/templates"
                        className="text-[11px] font-semibold text-emerald-400 hover:underline"
                      >
                        View All
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {templates.slice(0, 2).map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => handleStartWorkout(tmpl)}
                          className="p-3 bg-zinc-950/70 hover:bg-zinc-800/80 active:scale-95 border border-zinc-800 hover:border-zinc-700 rounded-2xl text-left transition-all group"
                        >
                          <p className="text-xs font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">
                            {tmpl.name}
                          </p>
                          <p className="text-[10px] text-zinc-500 truncate">
                            {tmpl.exercises.length} exercises
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* DUO PARTNER WORKOUT BANNER */}
          <Link
            href="/duo"
            className="w-full bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-emerald-500/40 rounded-3xl p-4 flex items-center justify-between transition-all group hover:scale-[1.01] shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Users2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                  Duo Partner Workouts
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Train together in real time with a live synced timer
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
          </Link>
        </div>

        {/* RIGHT COLUMN: WEEKLY PROGRESS, METRICS & RECENT WORKOUT */}
        <div className="flex flex-col gap-5 w-full">
          {/* WEEKLY GOAL PROGRESS */}
          <section className="w-full bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-3.5 transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                Weekly Target
              </span>
              <span className="text-sm font-extrabold text-white">
                <span className="text-emerald-400 font-bold">{weeklyStats.workoutCount}</span> /{' '}
                {weeklyStats.weeklyGoal} workouts
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3.5 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${weeklyStats.goalProgressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                {weeklyStats.workoutsRemaining === 0 ? (
                  <span className="text-emerald-400 font-bold">Goal achieved this week! 🎉</span>
                ) : (
                  <span>
                    <strong className="text-zinc-200">{weeklyStats.workoutsRemaining}</strong> more to reach target
                  </span>
                )}
              </span>
              <span className="font-mono font-bold text-zinc-300">
                {weeklyStats.goalProgressPercent}%
              </span>
            </div>
          </section>

          {/* STREAK & QUICK STATS ROW */}
          <section className="grid grid-cols-2 gap-3">
            {/* Streak Card */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-4 flex flex-col gap-1 transition-all hover:border-zinc-700">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                <Flame
                  className={`w-4 h-4 ${
                    streak.currentStreak > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-zinc-600'
                  }`}
                />
                <span>Active Streak</span>
              </div>
              <p className="text-3xl font-black text-white mt-1">
                {streak.currentStreak}{' '}
                <span className="text-xs font-semibold text-zinc-400">
                  {streak.currentStreak === 1 ? 'day' : 'days'}
                </span>
              </p>
              <p className="text-[11px] text-zinc-500 mt-auto">
                {streak.streakStatus === 'at_risk'
                  ? 'Train today to keep streak!'
                  : `Best: ${streak.bestStreak} days`}
              </p>
            </div>

            {/* Total Time This Week */}
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-4 flex flex-col gap-1 transition-all hover:border-zinc-700">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Gym Time</span>
              </div>
              <p className="text-3xl font-black text-white mt-1">
                {formatDurationHuman(weeklyStats.totalDurationSeconds)}
              </p>
              <p className="text-[11px] text-zinc-500 mt-auto">
                Avg: {formatDurationHuman(weeklyStats.averageDurationSeconds)}
              </p>
            </div>
          </section>

          {/* RECENT WORKOUT / HISTORY TEASER */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">
                Recent Workout
              </span>
              <Link
                href="/history"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
              >
                <span>Full History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentWorkout ? (
              <Link
                href={`/history/${recentWorkout.id}`}
                className="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 rounded-3xl p-4 flex items-center justify-between group active:scale-[0.99] transition-all shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                        {formatDateLabel(recentWorkout.date)}
                      </h4>
                      {recentWorkout.mood && (
                        <span className="text-sm">
                          {recentWorkout.mood === 'terrible' && '😫'}
                          {recentWorkout.mood === 'neutral' && '😐'}
                          {recentWorkout.mood === 'good' && '🙂'}
                          {recentWorkout.mood === 'strong' && '💪'}
                          {recentWorkout.mood === 'beast' && '🔥'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatDurationHuman(recentWorkout.duration)} ·{' '}
                      {formatTime(recentWorkout.startTime, settings.timeFormat)} →{' '}
                      {formatTime(recentWorkout.endTime, settings.timeFormat)}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
              </Link>
            ) : (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800/80 rounded-2xl p-5 text-center text-xs text-zinc-500">
                No completed workouts yet. Hit &apos;START WORKOUT&apos; to begin!
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
