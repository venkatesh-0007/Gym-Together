'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Trophy,
  Dumbbell,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { WorkoutExercise, WorkoutSet, Workout } from '@/lib/types/workout';
import { checkSetIsPR } from '@/lib/calculations/pr';
import { triggerHaptic } from '@/lib/utils/haptics';

interface ExerciseLoggerProps {
  exercises: WorkoutExercise[];
  workoutId: string;
  allWorkouts: Workout[];
  weightUnit: 'kg' | 'lb';
  onUpdateExercises: (exercises: WorkoutExercise[]) => void;
  onSetCompleted?: () => void;
}

const COMMON_EXERCISES = [
  { name: 'Barbell Bench Press', muscleGroup: 'Chest' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
  { name: 'Barbell Squat', muscleGroup: 'Legs' },
  { name: 'Barbell Deadlift', muscleGroup: 'Back' },
  { name: 'Overhead Press', muscleGroup: 'Shoulders' },
  { name: 'Lat Pulldown', muscleGroup: 'Back' },
  { name: 'Barbell Bent Over Row', muscleGroup: 'Back' },
  { name: 'Dumbbell Bicep Curl', muscleGroup: 'Arms' },
  { name: 'Triceps Rope Pushdown', muscleGroup: 'Arms' },
  { name: 'Lateral Raises', muscleGroup: 'Shoulders' },
  { name: 'Leg Press', muscleGroup: 'Legs' },
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings' },
  { name: 'Plank / Core', muscleGroup: 'Core' },
];

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export default function ExerciseLogger({
  exercises,
  workoutId,
  allWorkouts,
  weightUnit,
  onUpdateExercises,
  onSetCompleted,
}: ExerciseLoggerProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Chest');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);

  // Add Exercise
  const handleAddExercise = (name: string, muscleGroup: string) => {
    const newEx: WorkoutExercise = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workoutId,
      name,
      muscleGroup,
      sets: [
        {
          id: `set_${Date.now()}_1`,
          exerciseId: '',
          setNumber: 1,
          weight: 0,
          reps: 0,
          completed: false,
        },
      ],
    };
    newEx.sets[0].exerciseId = newEx.id;

    onUpdateExercises([...exercises, newEx]);
    setExpandedExerciseId(newEx.id);
    setIsAddModalOpen(false);
    setNewExerciseName('');
    setSearchQuery('');
    triggerHaptic('light');
  };

  // Remove Exercise
  const handleRemoveExercise = (exId: string) => {
    triggerHaptic('warning');
    onUpdateExercises(exercises.filter((ex) => ex.id !== exId));
  };

  // Add Set
  const handleAddSet = (exId: string) => {
    const updated = exercises.map((ex) => {
      if (ex.id !== exId) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: WorkoutSet = {
        id: `set_${Date.now()}_${ex.sets.length + 1}`,
        exerciseId: ex.id,
        setNumber: ex.sets.length + 1,
        weight: lastSet ? lastSet.weight : 0,
        reps: lastSet ? lastSet.reps : 0,
        completed: false,
      };
      return {
        ...ex,
        sets: [...ex.sets, newSet],
      };
    });
    onUpdateExercises(updated);
    triggerHaptic('light');
  };

  // Remove Set
  const handleRemoveSet = (exId: string, setId: string) => {
    const updated = exercises.map((ex) => {
      if (ex.id !== exId) return ex;
      const filtered = ex.sets.filter((s) => s.id !== setId);
      // Renumber sets
      const renumbered = filtered.map((s, idx) => ({
        ...s,
        setNumber: idx + 1,
      }));
      return { ...ex, sets: renumbered };
    });
    onUpdateExercises(updated);
  };

  // Update Set fields
  const handleUpdateSet = (
    exId: string,
    setId: string,
    field: 'weight' | 'reps',
    val: number
  ) => {
    const updated = exercises.map((ex) => {
      if (ex.id !== exId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s) => {
          if (s.id !== setId) return s;
          const nextSet = { ...s, [field]: Math.max(0, val) };
          // If already completed, recalculate PR
          if (nextSet.completed) {
            const prCheck = checkSetIsPR(ex.name, nextSet, allWorkouts, workoutId);
            nextSet.isPR = prCheck.isNewPR;
          }
          return nextSet;
        }),
      };
    });
    onUpdateExercises(updated);
  };

  // Toggle Set Completion
  const handleToggleSetComplete = (ex: WorkoutExercise, set: WorkoutSet) => {
    const nextCompleted = !set.completed;
    triggerHaptic(nextCompleted ? 'medium' : 'light');

    let isPR = false;
    if (nextCompleted && set.weight > 0 && set.reps > 0) {
      const prCheck = checkSetIsPR(ex.name, { ...set, completed: true }, allWorkouts, workoutId);
      isPR = prCheck.isNewPR;
    }

    const updated = exercises.map((item) => {
      if (item.id !== ex.id) return item;
      return {
        ...item,
        sets: item.sets.map((s) => {
          if (s.id !== set.id) return s;
          return {
            ...s,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
            isPR,
          };
        }),
      };
    });

    onUpdateExercises(updated);

    if (nextCompleted && onSetCompleted) {
      onSetCompleted();
    }
  };

  const filteredPresets = COMMON_EXERCISES.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase font-bold tracking-wider text-zinc-400">
          Exercises ({exercises.length})
        </h3>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Exercise</span>
        </button>
      </div>

      {exercises.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-2xl p-6 text-center">
          <Dumbbell className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-300">No exercises added yet</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            Log exercises & sets or just track your time. It&apos;s optional!
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 border border-zinc-700"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            Add Exercise
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((ex) => {
            const isExpanded = expandedExerciseId === null || expandedExerciseId === ex.id;
            const completedCount = ex.sets.filter((s) => s.completed).length;

            return (
              <div
                key={ex.id}
                className="bg-zinc-900/90 border border-zinc-800/90 rounded-2xl overflow-hidden transition-all shadow-sm"
              >
                {/* Exercise Header */}
                <div
                  onClick={() =>
                    setExpandedExerciseId(isExpanded && expandedExerciseId ? null : ex.id)
                  }
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-2xl bg-emerald-400" />
                    <div>
                      <h4 className="font-bold text-sm text-white tracking-tight">
                        {ex.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        {ex.muscleGroup} · {completedCount}/{ex.sets.length} sets completed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExercise(ex.id);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg transition-colors"
                      title="Delete exercise"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Sets Table */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-zinc-800/60 flex flex-col gap-2">
                    {/* Column Labels */}
                    <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-zinc-500 px-1">
                      <span className="col-span-2 text-center">SET</span>
                      <span className="col-span-4 text-center">{weightUnit.toUpperCase()}</span>
                      <span className="col-span-3 text-center">REPS</span>
                      <span className="col-span-3 text-center">DONE</span>
                    </div>

                    {ex.sets.map((set) => (
                      <div
                        key={set.id}
                        className={`grid grid-cols-12 gap-2 items-center p-1.5 rounded-xl transition-colors ${
                          set.completed
                            ? 'bg-emerald-950/25 border border-emerald-900/40'
                            : 'bg-zinc-950/60 border border-zinc-800/60'
                        }`}
                      >
                        {/* Set Number */}
                        <div className="col-span-2 text-center font-bold text-xs text-zinc-400">
                          {set.setNumber}
                        </div>

                        {/* Weight Input */}
                        <div className="col-span-4">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={set.weight === 0 ? '' : set.weight}
                            onChange={(e) =>
                              handleUpdateSet(
                                ex.id,
                                set.id,
                                'weight',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="0"
                            className="w-full text-center bg-zinc-900 border border-zinc-700/80 rounded-lg py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Reps Input */}
                        <div className="col-span-3">
                          <input
                            type="number"
                            min="0"
                            value={set.reps === 0 ? '' : set.reps}
                            onChange={(e) =>
                              handleUpdateSet(
                                ex.id,
                                set.id,
                                'reps',
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            placeholder="0"
                            className="w-full text-center bg-zinc-900 border border-zinc-700/80 rounded-lg py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Complete Checkbox */}
                        <div className="col-span-3 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSetComplete(ex, set)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                              set.completed
                                ? 'bg-emerald-500 text-emerald-950 shadow-md shadow-emerald-500/20'
                                : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>

                          {ex.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(ex.id, set.id)}
                              className="p-1 text-zinc-600 hover:text-rose-400 transition-colors"
                              title="Delete set"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* PR Badge banner if set triggered PR */}
                        {set.isPR && set.completed && (
                          <div className="col-span-12 flex items-center justify-center gap-1.5 py-1 px-2 bg-amber-500/15 border border-amber-500/30 rounded-lg text-amber-400 text-[11px] font-bold">
                            <Trophy className="w-3.5 h-3.5 fill-current" />
                            <span>NEW PERSONAL RECORD!</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Set Button */}
                    <button
                      type="button"
                      onClick={() => handleAddSet(ex.id)}
                      className="w-full py-2 bg-zinc-950/80 hover:bg-zinc-800 active:scale-[0.99] border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors mt-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      Add Set
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Exercise Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">Select or Create Exercise</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xs font-semibold px-2 py-1"
              >
                Close
              </button>
            </div>

            {/* Custom Input */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-400">Exercise Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => {
                    setNewExerciseName(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="e.g. Incline Bench Press"
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  disabled={!newExerciseName.trim()}
                  onClick={() =>
                    handleAddExercise(newExerciseName.trim(), selectedMuscle)
                  }
                  className="px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-emerald-950 font-bold rounded-xl text-xs"
                >
                  Add
                </button>
              </div>

              {/* Muscle Group Chips */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {MUSCLE_GROUPS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMuscle(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedMuscle === m
                        ? 'bg-emerald-500 text-emerald-950'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets List */}
            <div className="flex flex-col gap-1.5 mt-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Popular Exercises
              </span>
              <div className="flex flex-col divide-y divide-zinc-800/60 max-h-60 overflow-y-auto">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      handleAddExercise(preset.name, preset.muscleGroup)
                    }
                    className="flex items-center justify-between py-2.5 px-2 hover:bg-zinc-800/50 rounded-xl text-left transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                        {preset.name}
                      </p>
                      <p className="text-[11px] text-zinc-500">{preset.muscleGroup}</p>
                    </div>
                    <Plus className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
