'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Play, CheckCircle2, Trash2 } from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { formatDurationHuman, formatTime, formatDateLabel } from '@/lib/calculations/duration';

export default function RecoveryModal() {
  const router = useRouter();
  const { recoveryData, elapsedSeconds, dismissRecovery } = useWorkout();

  if (!recoveryData) return null;

  const { workout } = recoveryData;
  const startedLabel = `${formatDateLabel(workout.date)}, ${formatTime(workout.startTime)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 text-center animate-in slide-in-from-bottom-4 duration-300">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Unfinished Workout Found
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            You have an active workout session from earlier.
          </p>
        </div>

        {/* Workout Info Card */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4 text-left space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Started:</span>
            <span className="text-zinc-200 font-medium">{startedLabel}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500">Elapsed Time:</span>
            <span className="text-emerald-400 font-mono font-bold">
              {formatDurationHuman(elapsedSeconds)}
            </span>
          </div>
          {workout.templateName && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">Routine:</span>
              <span className="text-zinc-200 font-medium">{workout.templateName}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              dismissRecovery('resume');
              router.push('/active');
            }}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all text-base"
          >
            <Play className="w-5 h-5 fill-current" />
            Resume Workout
          </button>

          <button
            type="button"
            onClick={() => dismissRecovery('finish')}
            className="w-full h-13 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 font-semibold rounded-2xl flex items-center justify-center gap-2 border border-zinc-700 transition-all text-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Finish & Save Session
          </button>

          <button
            type="button"
            onClick={() => dismissRecovery('discard')}
            className="w-full py-2.5 text-zinc-400 hover:text-rose-400 active:scale-95 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Discard Workout
          </button>
        </div>
      </div>
    </div>
  );
}
