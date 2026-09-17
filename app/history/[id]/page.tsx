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
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-6 gap-6 max-w-5xl mx-auto w-full animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/history')}
          className="flex items-center gap-1 text-zinc-400 hover:text-white text-xs font-semibold py-2 px-3 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to History</span>
        </button>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Log</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-semibold transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSaveEdits}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-500/20"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Save</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-xl transition-colors active:scale-95"
            title="Delete workout"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Responsive Two-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column (Details & Metadata) */}
        <div className="md:col-span-5 flex flex-col gap-5">
          <div className="gym-card p-6 shadow-xl flex flex-col gap-5">
            <div>
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                {formatDateLabel(workout.date)}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold font-mono text-emerald-400 mt-1 tracking-tight">
                {durationStr}
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/80 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="truncate">
                  {startTimeStr} → {endTimeStr}
                </span>
              </div>

              <div className="flex items-center gap-2 text-zinc-300">
                <Calendar className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{workout.date}</span>
              </div>
            </div>

            {/* Mood Section */}
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Workout Mood</span>
              {isEditing ? (
                <div className="flex gap-1.5">
                  {MOODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setEditMood(m.value)}
                      className={`p-1.5 rounded-xl border text-base transition-all active:scale-90 ${
                        editMood === m.value
                          ? 'bg-emerald-950 border-emerald-500 scale-105'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  {workout.mood ? (
                    <>
                      <span className="text-xl">
                        {MOODS.find((m) => m.value === workout.mood)?.emoji}
                      </span>
                      <span className="capitalize text-zinc-200">
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
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-zinc-500" />
                Body Weight
              </span>
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={editBodyWeight}
                    onChange={(e) => setEditBodyWeight(e.target.value)}
                    placeholder="0.0"
                    className="w-20 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-right text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-zinc-500 font-semibold">{settings.weightUnit}</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-zinc-200">
                  {workout.bodyWeight
                    ? `${workout.bodyWeight} ${settings.weightUnit}`
                    : 'Not logged'}
                </span>
              )}
            </div>

            {/* Notes Section */}
            <div className="pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
              <span className="text-xs font-semibold text-zinc-400">Notes & Reflections</span>
              {isEditing ? (
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about energy, form, fatigue..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800/60 min-h-[50px]">
                  {workout.notes || 'No notes logged for this workout.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Exercises & Sets) */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400">
              Exercises Completed ({workout.exercises ? workout.exercises.length : 0})
            </h3>
            {workout.exercises && workout.exercises.length > 0 && (
              <span className="text-xs font-medium text-emerald-400">
                {workout.exercises.reduce((acc, curr) => acc + curr.sets.length, 0)} Total Sets
              </span>
            )}
          </div>

          {!workout.exercises || workout.exercises.length === 0 ? (
            <div className="gym-card p-8 text-center text-xs text-zinc-500 border-dashed">
              <Dumbbell className="w-8 h-8 text-zinc-700 mx-auto mb-2 opacity-50" />
              <p className="text-zinc-400 font-semibold">No specific exercises recorded</p>
              <p className="text-zinc-600 text-[11px] mt-1">This was logged as a duration-only workout session.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {workout.exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="gym-card p-5 flex flex-col gap-3 transition-all duration-300 hover:border-zinc-700"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <h4 className="font-extrabold text-sm text-white">{ex.name}</h4>
                    </div>
                    <span className="text-[11px] text-zinc-400 font-semibold px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                      {ex.muscleGroup}
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-zinc-800/50">
                    {ex.sets.map((s) => (
                      <div
                        key={s.id}
                        className="py-2.5 flex items-center justify-between text-xs group"
                      >
                        <span className="font-bold text-zinc-400">
                          Set {s.setNumber}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-zinc-100 font-semibold">
                            {s.weight} {settings.weightUnit} × {s.reps} reps
                          </span>
                          {s.isPR && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 shadow-sm shadow-amber-500/10">
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
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Workout Record?</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Are you sure you want to permanently delete this workout? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-2xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold rounded-2xl text-xs shadow-lg shadow-rose-600/20 transition-all"
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
