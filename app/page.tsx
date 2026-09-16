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
              <div className="w-full bg-gradient-to-br from-[var(--primary-subtle)] via-[var(--card)] to-[var(--card)] border border-accent rounded-3xl p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden transition-all hover:border-accent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1 bg-accent-subtle rounded-full border border-accent-subtle">
                    <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                    <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
                      Session In Progress
                    </span>
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    Started {formatTime(activeWorkout.startTime, settings.timeFormat)}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-[var(--muted)] uppercase font-semibold tracking-wider">
                    Elapsed Time
                  </p>
                  <p className="text-5xl font-black font-mono tracking-tight text-[var(--foreground)] mt-1">
                    {formatElapsed(elapsedSeconds)}
                  </p>
                </div>

                <Link
                  href="/active"
                  className="w-full h-14 gym-btn-primary active:scale-[0.98] font-black rounded-2xl flex items-center justify-center gap-2 text-base select-none"
                >
                  <span>Continue Workout</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            ) : (
              /* Empty / Ready State with Hero Button */
              <div className="gym-card p-6 shadow-xl flex flex-col items-center text-center gap-5 transition-all">
                <div className="w-16 h-16 rounded-3xl bg-[var(--card-subtle)] border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] shadow-inner">
                  <Dumbbell className="w-8 h-8 text-accent" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                    {streak.hasWorkedOutToday ? 'Session Finished Today!' : 'Ready to Train?'}
                  </h2>
                  <p className="text-xs text-[var(--muted)] mt-1 max-w-xs mx-auto">
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
                  className="w-full h-16 gym-btn-primary active:scale-[0.98] font-black rounded-2xl flex items-center justify-center gap-2.5 text-lg tracking-wide select-none disabled:opacity-50 hover:-translate-y-0.5"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>{isStarting ? 'STARTING...' : 'START WORKOUT'}</span>
                </button>

                {/* Quick Templates Sub-bar */}
                {templates.length > 0 && (
                  <div className="w-full pt-3 border-t border-[var(--card-border)]">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Quick Routines
                      </span>
                      <Link
                        href="/templates"
                        className="text-[11px] font-semibold text-accent hover:underline"
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
                          className="p-3 bg-[var(--card-subtle)] hover:bg-[var(--card)] active:scale-95 border border-[var(--card-border)] hover:border-[var(--card-hover-border)] rounded-2xl text-left transition-all group"
                        >
                          <p className="text-xs font-bold text-[var(--foreground)] group-hover:text-accent transition-colors truncate">
                            {tmpl.name}
                          </p>
                          <p className="text-[10px] text-[var(--muted)] truncate">
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
            className="w-full bg-[var(--card)] border border-[var(--card-border)] hover:border-accent rounded-3xl p-4 flex items-center justify-between transition-all group hover:scale-[1.01] shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-accent-subtle border border-accent-subtle flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                <Users2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--foreground)] group-hover:text-accent transition-colors">
                  Duo Partner Workouts
                </h4>
                <p className="text-[11px] text-[var(--muted)]">
                  Train together in real time with a live synced timer
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--muted)] group-hover:text-accent transition-colors" />
          </Link>
        </div>

        {/* RIGHT COLUMN: WEEKLY PROGRESS, METRICS & RECENT WORKOUT */}
        <div className="flex flex-col gap-5 w-full">
          {/* WEEKLY GOAL PROGRESS */}
          <section className="w-full gym-card p-5 shadow-sm flex flex-col gap-3.5 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">
                Weekly Target
              </span>
              <span className="text-sm font-extrabold text-[var(--foreground)]">
                <span className="text-accent font-bold">{weeklyStats.workoutCount}</span> /{' '}
                {weeklyStats.weeklyGoal} workouts
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3.5 bg-[var(--card-subtle)] rounded-full overflow-hidden p-0.5 border border-[var(--card-border)]">
              <div
                className="h-full bg-accent rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${weeklyStats.goalProgressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--muted)]">
              <span>
                {weeklyStats.workoutsRemaining === 0 ? (
                  <span className="text-accent font-bold">Goal achieved this week! 🎉</span>
                ) : (
                  <span>
                    <strong className="text-[var(--foreground)]">{weeklyStats.workoutsRemaining}</strong> more to reach target
                  </span>
                )}
              </span>
              <span className="font-mono font-bold text-[var(--foreground)]">
                {weeklyStats.goalProgressPercent}%
              </span>
            </div>
          </section>

          {/* STREAK & QUICK STATS ROW */}
          <section className="grid grid-cols-2 gap-3">
            {/* Streak Card */}
            <div className="gym-card p-4 flex flex-col gap-1 transition-all">
              <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-semibold">
                <Flame
                  className={`w-4 h-4 ${
                    streak.currentStreak > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-zinc-600'
                  }`}
                />
                <span>Active Streak</span>
              </div>
              <p className="text-3xl font-black text-[var(--foreground)] mt-1">
                {streak.currentStreak}{' '}
                <span className="text-xs font-semibold text-[var(--muted)]">
                  {streak.currentStreak === 1 ? 'day' : 'days'}
                </span>
              </p>
              <p className="text-[11px] text-[var(--muted)] mt-auto">
                {streak.streakStatus === 'at_risk'
                  ? 'Train today to keep streak!'
                  : `Best: ${streak.bestStreak} days`}
              </p>
            </div>

            {/* Total Time This Week */}
            <div className="gym-card p-4 flex flex-col gap-1 transition-all">
              <div className="flex items-center gap-1.5 text-[var(--muted)] text-xs font-semibold">
                <Clock className="w-4 h-4 text-accent" />
                <span>Gym Time</span>
              </div>
              <p className="text-3xl font-black text-[var(--foreground)] mt-1">
                {formatDurationHuman(weeklyStats.totalDurationSeconds)}
              </p>
              <p className="text-[11px] text-[var(--muted)] mt-auto">
                Avg: {formatDurationHuman(weeklyStats.averageDurationSeconds)}
              </p>
            </div>
          </section>

          {/* RECENT WORKOUT / HISTORY TEASER */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[var(--muted)]">
                Recent Workout
              </span>
              <Link
                href="/history"
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-0.5"
              >
                <span>Full History</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentWorkout ? (
              <Link
                href={`/history/${recentWorkout.id}`}
                className="gym-card p-4 flex items-center justify-between group active:scale-[0.99] transition-all shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[var(--card-subtle)] flex items-center justify-center text-accent">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[var(--foreground)] group-hover:text-accent transition-colors">
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
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {formatDurationHuman(recentWorkout.duration)} ·{' '}
                      {formatTime(recentWorkout.startTime, settings.timeFormat)} →{' '}
                      {formatTime(recentWorkout.endTime, settings.timeFormat)}
                    </p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors" />
              </Link>
            ) : (
              <div className="bg-[var(--card-subtle)] border border-dashed border-[var(--card-border)] rounded-2xl p-5 text-center text-xs text-[var(--muted)]">
                No completed workouts yet. Hit &apos;START WORKOUT&apos; to begin!
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
