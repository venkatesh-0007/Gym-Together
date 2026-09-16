'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StopCircle, Play, ChevronLeft, Timer, Plus } from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { useAccount } from '@/lib/context/AccountContext';
import { formatElapsed, formatTime } from '@/lib/calculations/duration';
import StopWorkoutModal from '@/components/workout/StopWorkoutModal';
import RestTimer from '@/components/workout/RestTimer';
import ExerciseLogger from '@/components/workout/ExerciseLogger';
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
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
          <StopCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          No Active Workout
        </h2>
        <p className="text-sm text-zinc-400 mt-1 max-w-xs">
          Start a new session to begin tracking your workout duration and exercises.
        </p>
        <button
          type="button"
          onClick={async () => {
            await startWorkout(undefined, activeProfile.id);
          }}
          className="mt-6 w-full max-w-xs h-14 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all text-base"
        >
          <Play className="w-5 h-5 fill-current" />
          Start Workout
        </button>
      </div>
    );
  }

  const startTimeStr = formatTime(activeWorkout.startTime, settings.timeFormat);

  return (
    <div className="flex-1 flex flex-col px-5 py-4 gap-6 animate-in fade-in duration-200">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="flex items-center gap-1 text-zinc-400 hover:text-white text-xs font-semibold py-1.5 px-2.5 rounded-xl hover:bg-zinc-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/60 border border-emerald-500/30 rounded-full">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
            Recording
          </span>
        </div>

        {/* Quick Rest Timer Trigger */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsRestTimerOpen(true);
          }}
          className="p-2 text-zinc-400 hover:text-emerald-400 rounded-xl bg-zinc-900 border border-zinc-800 transition-colors"
          title="Open rest timer"
        >
          <Timer className="w-4 h-4" />
        </button>
      </div>

      {/* Routine Title if from Template */}
      {activeWorkout.templateName && (
        <div className="text-center -mb-2">
          <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-semibold text-zinc-300">
            {activeWorkout.templateName}
          </span>
        </div>
      )}

      {/* HERO LIVE TIMER CARD */}
      <div className="w-full flex flex-col items-center justify-center py-8 px-4 bg-zinc-900/60 border border-zinc-800/80 rounded-3xl shadow-xl relative overflow-hidden animate-pulse-glow">
        <span className="text-xs uppercase font-bold tracking-widest text-zinc-400 mb-1">
          Active Workout
        </span>

        {/* Big Live Clock */}
        <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white my-2 select-none">
          {formatElapsed(elapsedSeconds)}
        </div>

        {/* Started Time */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mt-1">
          <span>Started at</span>
          <span className="text-zinc-200 font-semibold">{startTimeStr}</span>
        </div>
      </div>

      {/* PRIMARY ACTION: LARGE STOP WORKOUT BUTTON */}
      <div className="w-full">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            setIsStopModalOpen(true);
          }}
          className="w-full h-16 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-black rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-rose-600/30 transition-all text-lg tracking-wide select-none"
        >
          <StopCircle className="w-6 h-6 stroke-[2.5]" />
          STOP WORKOUT
        </button>
      </div>

      {/* EXERCISE LOGGING (OPTIONAL) */}
      <div className="mt-2">
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
