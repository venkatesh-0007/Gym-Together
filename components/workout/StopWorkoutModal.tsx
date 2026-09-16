'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Clock, Calendar, Check, ArrowLeft, Trash2 } from 'lucide-react';
import { Mood, Workout } from '@/lib/types/workout';
import { formatDurationHuman, formatTime, formatDateLabel } from '@/lib/calculations/duration';

interface StopWorkoutModalProps {
  workout: Workout;
  elapsedSeconds: number;
  weightUnit: 'kg' | 'lb';
  onSave: (data: {
    mood?: Mood;
    notes?: string;
    bodyWeight?: number;
  }) => Promise<void>;
  onCancel: () => void;
  onDiscard: () => Promise<void>;
}

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'terrible', emoji: '😫', label: 'Tough' },
  { value: 'neutral', emoji: '😐', label: 'Normal' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'strong', emoji: '💪', label: 'Strong' },
  { value: 'beast', emoji: '🔥', label: 'Beast' },
];

export default function StopWorkoutModal({
  workout,
  elapsedSeconds,
  weightUnit,
  onSave,
  onCancel,
  onDiscard,
}: StopWorkoutModalProps) {
  const [selectedMood, setSelectedMood] = useState<Mood | undefined>(workout.mood);
  const [notes, setNotes] = useState<string>(workout.notes || '');
  const [bodyWeight, setBodyWeight] = useState<string>(
    workout.bodyWeight ? String(workout.bodyWeight) : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const nowIso = new Date().toISOString();
  const startTimeLabel = formatTime(workout.startTime);
  const finishTimeLabel = formatTime(nowIso);
  const durationLabel = formatDurationHuman(elapsedSeconds);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#f59e0b', '#ffffff'],
        });
      } catch {
        // Safe fallback
      }

      await onSave({
        mood: selectedMood,
        notes: notes.trim() || undefined,
        bodyWeight: bodyWeight ? parseFloat(bodyWeight) : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-semibold py-1.5 px-2.5 rounded-xl hover:bg-zinc-800 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Resume</span>
          </button>
          <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
            Finish Session
          </span>
          <div className="w-16" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-black text-white tracking-tight">
            Workout Complete 🎉
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Great job! Review your workout summary before saving.
          </p>
        </div>

        {/* Time Summary Box */}
        <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 divide-y divide-zinc-800/60">
          <div className="flex justify-between items-center pb-3">
            <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Total Duration
            </span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              {durationLabel}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5 text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Date & Time
            </span>
            <span className="text-zinc-300 font-medium">
              {formatDateLabel(workout.date)} · {startTimeLabel} → {finishTimeLabel}
            </span>
          </div>

          {workout.exercises && workout.exercises.length > 0 && (
            <div className="flex justify-between items-center pt-2.5 text-xs">
              <span className="text-zinc-500">Exercises Completed</span>
              <span className="text-zinc-300 font-medium">
                {workout.exercises.length} exercise{workout.exercises.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        {/* Workout Mood */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            How did it feel?
          </label>
          <div className="grid grid-cols-5 gap-2">
            {MOODS.map((item) => {
              const isSelected = selectedMood === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedMood(item.value)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span
                    className={`text-[10px] mt-1 font-medium ${
                      isSelected ? 'text-emerald-300 font-semibold' : 'text-zinc-500'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workout Notes */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="workout-notes"
            className="text-xs font-semibold text-zinc-400 uppercase tracking-wider"
          >
            Workout Notes (Optional)
          </label>
          <textarea
            id="workout-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Felt great on bench press, increased weight on second set..."
            rows={3}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </div>

        {/* Optional Body Weight */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label
              htmlFor="body-weight-input"
              className="text-xs font-semibold text-zinc-400 uppercase tracking-wider"
            >
              Today's Body Weight (Optional)
            </label>
            <span className="text-[11px] text-zinc-500">{weightUnit}</span>
          </div>
          <div className="relative">
            <input
              id="body-weight-input"
              type="number"
              step="0.1"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              placeholder={`e.g. ${weightUnit === 'kg' ? '78.5' : '172.5'}`}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-2xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all text-base disabled:opacity-50"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            {isSaving ? 'Saving...' : 'Save Workout'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full h-11 text-zinc-400 hover:text-zinc-200 active:scale-95 text-xs font-semibold flex items-center justify-center transition-colors"
          >
            Cancel & Keep Working Out
          </button>

          {!showDiscardConfirm ? (
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              className="text-rose-400/70 hover:text-rose-400 text-xs font-medium py-1 transition-colors"
            >
              Discard this workout
            </button>
          ) : (
            <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-2xl flex flex-col gap-2 text-center animate-in fade-in">
              <p className="text-xs text-rose-300 font-medium">
                Are you sure? This session will be permanently deleted.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-1.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  No, Keep It
                </button>
                <button
                  type="button"
                  onClick={onDiscard}
                  className="flex-1 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
