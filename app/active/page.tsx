'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StopCircle, Play, ChevronLeft, Timer, Plus, Dumbbell } from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { useAccount } from '@/lib/context/AccountContext';
import { formatElapsed, formatTime } from '@/lib/calculations/duration';
import StopWorkoutModal from '@/components/workout/StopWorkoutModal';
import RestTimer from '@/components/workout/RestTimer';
import ExerciseLogger from '@/components/workout/ExerciseLogger';
import NativeButton from '@/components/ui/NativeButton';
import { triggerHaptic } from '@/lib/utils/haptics';

export default function ActiveWorkoutPage() {
  const router = useRouter();
  const { activeProfile } = useAccount();
  const {
    activeWorkout,
    elapsedSeconds,
    allWorkouts,
    settings,
    startWorkout,
    updateActiveWorkout,
    saveCompletedWorkout,
    discardActiveWorkout,
  } = useWorkout();

  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);

  // If no active workout is currently running
  if (!activeWorkout) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-page-enter">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 shadow-xl">
          <StopCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          No Active Workout
        </h2>
        <p className="text-sm text-zinc-400 mt-1 max-w-xs">
          Start a new session to begin tracking your workout duration and exercises.
        </p>
        <NativeButton
          variant="primary"
          hapticFeedback="medium"
          onClick={async () => {
            await startWorkout(undefined, activeProfile.id);
          }}
          className="mt-6 max-w-xs"
        >
          <Play className="w-5 h-5 fill-current" />
          Start Workout
        </NativeButton>
      </div>
    );
  }

  const startTimeStr = formatTime(activeWorkout.startTime, settings.timeFormat);

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6 gap-6 animate-page-enter">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--foreground)] text-xs font-semibold py-1.5 px-2.5 rounded-xl hover:bg-[var(--card-subtle)] transition-colors active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 bg-accent-subtle border border-accent-subtle rounded-2xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-2xl h-2.5 w-2.5 bg-accent"></span>
          </span>
          <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
            Recording Live
          </span>
        </div>

        {/* Quick Rest Timer Trigger */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsRestTimerOpen(true);
          }}
          className="p-2 text-[var(--muted)] hover:text-accent rounded-xl bg-[var(--card-subtle)] border border-[var(--card-border)] transition-all hover:scale-105 active:scale-95 shadow-sm"
          title="Open rest timer"
        >
          <Timer className="w-4 h-4" />
        </button>
      </div>

      {/* Routine Title if from Template */}
      {activeWorkout.templateName && (
        <div className="text-center -mb-2">
          <span className="px-3 py-1 bg-[var(--card-subtle)] border border-[var(--card-border)] rounded-2xl text-xs font-semibold text-[var(--foreground)]">
            {activeWorkout.templateName}
          </span>
        </div>
      )}

      {/* Structured Responsive Grid: 1 col on mobile, 2 cols on tablet/desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: HERO LIVE TIMER & STOP WORKOUT */}
        <div className="md:col-span-5 flex flex-col gap-5">
          {/* HERO LIVE TIMER CARD */}
          <div className="w-full flex flex-col items-center justify-center py-8 px-4 gym-card shadow-2xl relative overflow-hidden animate-pulse-glow transition-all">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[var(--muted)] mb-1">
              Active Workout Time
            </span>

            {/* Big Live Clock */}
            <div className="text-5xl sm:text-6xl font-bold font-mono tracking-tight text-[var(--foreground)] my-2 select-none">
              {formatElapsed(elapsedSeconds)}
            </div>

            {/* Started Time */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] font-medium mt-1">
              <span>Started at</span>
              <span className="text-[var(--foreground)] font-semibold">{startTimeStr}</span>
            </div>
          </div>

          {/* PRIMARY ACTION: LARGE STOP WORKOUT BUTTON */}
          <NativeButton
            variant="danger"
            hapticFeedback="medium"
            onClick={() => setIsStopModalOpen(true)}
            className="!h-16 text-lg"
          >
            <StopCircle className="w-6 h-6 stroke-[2.5]" />
            STOP WORKOUT
          </NativeButton>
        </div>

        {/* RIGHT COLUMN: EXERCISES & SETS LOGGER */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <ExerciseLogger
            exercises={activeWorkout.exercises || []}
            workoutId={activeWorkout.id}
            allWorkouts={allWorkouts}
            weightUnit={settings.weightUnit}
            onUpdateExercises={(newExercises) => {
              updateActiveWorkout({
                ...activeWorkout,
                exercises: newExercises,
              });
            }}
            onSetCompleted={() => {
              // Automatically open rest timer
              setIsRestTimerOpen(true);
            }}
          />
        </div>
      </div>

      {/* Floating Rest Timer */}
      <RestTimer
        isOpen={isRestTimerOpen}
        initialSeconds={settings.restTimerDefaultSeconds || 90}
        soundEnabled={settings.soundEnabled}
        onClose={() => setIsRestTimerOpen(false)}
      />

      {/* Stop & Summary Modal */}
      {isStopModalOpen && (
        <StopWorkoutModal
          workout={activeWorkout}
          elapsedSeconds={elapsedSeconds}
          weightUnit={settings.weightUnit}
          onSave={async (details) => {
            await saveCompletedWorkout(details);
            setIsStopModalOpen(false);
            router.push('/history');
          }}
          onCancel={() => setIsStopModalOpen(false)}
          onDiscard={async () => {
            await discardActiveWorkout();
            setIsStopModalOpen(false);
            router.push('/');
          }}
        />
      )}
    </div>
  );
}
