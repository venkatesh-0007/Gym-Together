'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Clock,
  Calendar,
  Trash2,
  Edit2,
  Check,
  X,
  Trophy,
  Dumbbell,
  Scale,
} from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import {
  formatDurationHuman,
  formatDateLabel,
  formatTime,
} from '@/lib/calculations/duration';
import { Mood, Workout } from '@/lib/types/workout';

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'terrible', emoji: '😫', label: 'Tough' },
  { value: 'neutral', emoji: '😐', label: 'Normal' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'strong', emoji: '💪', label: 'Strong' },
  { value: 'beast', emoji: '🔥', label: 'Beast' },
];

export default function WorkoutDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.id as string;

  const { allWorkouts, updateWorkout, deleteWorkout, settings } = useWorkout();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editMood, setEditMood] = useState<Mood | undefined>(undefined);
  const [editBodyWeight, setEditBodyWeight] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const found = allWorkouts.find((w) => w.id === workoutId);
    if (found) {
      setWorkout(found);
      setEditNotes(found.notes || '');
      setEditMood(found.mood);
      setEditBodyWeight(found.bodyWeight ? String(found.bodyWeight) : '');
    }
  }, [allWorkouts, workoutId]);

  if (!workout) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-base font-bold text-zinc-300">Workout not found</h2>
        <button
          type="button"
          onClick={() => router.push('/history')}
          className="mt-4 px-4 py-2 bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl"
        >
          Return to History
        </button>
      </div>
    );
  }

  const handleSaveEdits = async () => {
    const updated: Workout = {
      ...workout,
      notes: editNotes.trim() || undefined,
      mood: editMood,
      bodyWeight: editBodyWeight ? parseFloat(editBodyWeight) : undefined,
    };
    await updateWorkout(updated);
    setWorkout(updated);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteWorkout(workout.id);
    router.push('/history');
  };

  const startTimeStr = formatTime(workout.startTime, settings.timeFormat);
  const endTimeStr = formatTime(workout.endTime, settings.timeFormat);
  const durationStr = formatDurationHuman(workout.duration);

  return (
    <div className="flex-1 flex flex-col px-5 py-5 gap-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/history')}
          className="flex items-center gap-1 text-zinc-400 hover:text-white text-xs font-semibold py-1.5 px-2.5 rounded-xl hover:bg-zinc-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>History</span>
        </button>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 bg-zinc-900 text-zinc-400 rounded-xl text-xs"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSaveEdits}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-emerald-950 rounded-xl text-xs font-bold"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Save</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-xl transition-colors"
            title="Delete workout"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4">
        <div>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {formatDateLabel(workout.date)}
          </span>
          <h1 className="text-3xl font-black font-mono text-emerald-400 mt-1">
            {durationStr}
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>
              {startTimeStr} → {endTimeStr}
            </span>
          </div>

          <div className="flex items-center gap-2 text-zinc-400">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>{workout.date}</span>
          </div>
        </div>

        {/* Mood Section */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400">Workout Mood</span>
          {isEditing ? (
            <div className="flex gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setEditMood(m.value)}
                  className={`p-1.5 rounded-lg border text-base transition-colors ${
                    editMood === m.value
                      ? 'bg-emerald-950 border-emerald-500'
                      : 'bg-zinc-950 border-zinc-800'
                  }`}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
              {workout.mood ? (
                <>
                  <span className="text-lg">
                    {MOODS.find((m) => m.value === workout.mood)?.emoji}
                  </span>
                  <span className="capitalize text-zinc-300">
                    {MOODS.find((m) => m.value === workout.mood)?.label}
                  </span>
                </>
              ) : (
                <span className="text-xs text-zinc-500 font-normal">Not recorded</span>
              )}
            </div>
          )}
        </div>

        {/* Body Weight Section */}
        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-zinc-500" />
            Body Weight
          </span>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={editBodyWeight}
                onChange={(e) => setEditBodyWeight(e.target.value)}
                placeholder="0.0"
                className="w-20 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-right text-xs text-white"
              />
              <span className="text-xs text-zinc-500">{settings.weightUnit}</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-zinc-300">
              {workout.bodyWeight
                ? `${workout.bodyWeight} ${settings.weightUnit}`
                : 'Not logged'}
            </span>
          )}
        </div>

        {/* Notes Section */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-zinc-400">Notes</span>
          {isEditing ? (
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this workout..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          ) : (
            <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60 min-h-[44px]">
              {workout.notes || 'No notes added for this workout.'}
            </p>
          )}
        </div>
      </div>

      {/* Exercises Breakdown */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400">
          Exercises ({workout.exercises ? workout.exercises.length : 0})
        </h3>

        {!workout.exercises || workout.exercises.length === 0 ? (
          <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-5 text-center text-xs text-zinc-500">
            No specific exercises were logged in this session.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {workout.exercises.map((ex) => (
              <div
                key={ex.id}
                className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-sm text-white">{ex.name}</h4>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    {ex.muscleGroup}
                  </span>
                </div>

                <div className="flex flex-col divide-y divide-zinc-800/50">
                  {ex.sets.map((s) => (
                    <div
                      key={s.id}
                      className="py-2 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-zinc-400">
                        Set {s.setNumber}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-zinc-200">
                          {s.weight} {settings.weightUnit} × {s.reps} reps
                        </span>
                        {s.isPR && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                            <Trophy className="w-3 h-3 fill-current" />
                            PR
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Workout?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Are you sure you want to delete this completed workout? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-zinc-800 text-zinc-300 font-semibold rounded-2xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl text-xs shadow-lg shadow-rose-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
