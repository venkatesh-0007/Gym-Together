'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Clock, Calendar, Check, Trash2 } from 'lucide-react';
import { Mood, Workout } from '@/lib/types/workout';
import { formatDurationHuman, formatTime, formatDateLabel } from '@/lib/calculations/duration';
import NativeBottomSheet from '@/components/ui/NativeBottomSheet';
import NativeButton from '@/components/ui/NativeButton';
import { triggerHaptic } from '@/lib/utils/haptics';

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
    triggerHaptic('success');
    try {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#f59e0b', '#ffffff'],
        });
      } catch {}

      await onSave({
        mood: selectedMood,
        notes: notes.trim() || undefined,
        bodyWeight: bodyWeight ? parseFloat(bodyWeight) : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onCancel();
  };

  return (
    <NativeBottomSheet
      open={true}
      onOpenChange={handleOpenChange}
      title="Workout Complete 🎉"
      description="Great job! Review your workout summary before saving."
    >
      <div className="flex flex-col gap-6">
        {/* Time Summary Box */}
        <div className="bg-[var(--card-subtle)] border border-[var(--card-border)] rounded-[20px] p-4 divide-y divide-[var(--card-border)] shadow-sm">
          <div className="flex justify-between items-center pb-3">
            <span className="text-sm font-medium text-[var(--muted)] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[var(--primary)]" />
              Total Duration
            </span>
            <span className="text-xl font-bold font-mono text-[var(--primary)]">
              {durationLabel}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 text-sm">
            <span className="text-[var(--muted)] flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Date & Time
            </span>
            <span className="text-[var(--foreground)] font-medium">
              {formatDateLabel(workout.date)} · {startTimeLabel} → {finishTimeLabel}
            </span>
          </div>

          {workout.exercises && workout.exercises.length > 0 && (
            <div className="flex justify-between items-center pt-3 text-sm">
              <span className="text-[var(--muted)]">Exercises Completed</span>
              <span className="text-[var(--foreground)] font-medium">
                {workout.exercises.length} exercise{workout.exercises.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        {/* Workout Mood */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider pl-1">
            How did it feel?
          </label>
          <div className="grid grid-cols-5 gap-2">
            {MOODS.map((item) => {
              const isSelected = selectedMood === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedMood(item.value);
                  }}
                  className={`flex flex-col items-center justify-center py-3 rounded-[18px] border transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-sm'
                      : 'bg-[var(--card-subtle)] border-[var(--card-border)] hover:border-[var(--muted)]'
                  }`}
                >
                  <span className="text-2xl mb-1">{item.emoji}</span>
                  <span
                    className={`text-[10px] font-medium tracking-tight ${
                      isSelected ? 'text-[var(--primary)] font-bold' : 'text-[var(--muted)]'
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
        <div className="flex flex-col gap-2.5">
          <label
            htmlFor="workout-notes"
            className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider pl-1"
          >
            Workout Notes
          </label>
          <textarea
            id="workout-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Felt great on bench press..."
            rows={2}
            className="w-full bg-[var(--card-subtle)] border border-[var(--card-border)] rounded-[20px] p-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all resize-none"
          />
        </div>

        {/* Optional Body Weight */}
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center pl-1">
            <label
              htmlFor="body-weight-input"
              className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider"
            >
              Today's Body Weight
            </label>
            <span className="text-[11px] font-bold text-[var(--muted)] bg-[var(--card-border)] px-2 py-0.5 rounded-md">{weightUnit}</span>
          </div>
          <input
            id="body-weight-input"
            type="number"
            step="0.1"
            value={bodyWeight}
            onChange={(e) => setBodyWeight(e.target.value)}
            placeholder={`e.g. ${weightUnit === 'kg' ? '78.5' : '172.5'}`}
            className="w-full bg-[var(--card-subtle)] border border-[var(--card-border)] rounded-[20px] px-4 py-3.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-2">
          <NativeButton
            onClick={handleSave}
            disabled={isSaving}
            className="!bg-[#10b981] !shadow-[0_8px_20px_-5px_rgba(16,185,129,0.35)]"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            {isSaving ? 'Saving...' : 'Save Workout'}
          </NativeButton>

          {!showDiscardConfirm ? (
            <div className="flex gap-3">
              <NativeButton
                variant="secondary"
                onClick={onCancel}
              >
                Keep Going
              </NativeButton>
              <NativeButton
                variant="ghost"
                onClick={() => setShowDiscardConfirm(true)}
                className="!text-[var(--danger)]"
              >
                Discard
              </NativeButton>
            </div>
          ) : (
            <div className="p-4 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-[24px] flex flex-col gap-3 text-center animate-in fade-in zoom-in-95">
              <p className="text-xs text-[var(--danger)] font-bold">
                Permanently delete this session?
              </p>
              <div className="flex gap-2">
                <NativeButton
                  variant="secondary"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Cancel
                </NativeButton>
                <NativeButton
                  variant="danger"
                  onClick={onDiscard}
                >
                  <Trash2 className="w-4 h-4" />
                  Discard
                </NativeButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </NativeBottomSheet>
  );
}
