'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Plus, Trash2, Dumbbell, Sparkles } from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { useAccount } from '@/lib/context/AccountContext';
import { WorkoutTemplate } from '@/lib/types/workout';
import { storage } from '@/lib/storage';
import { triggerHaptic } from '@/lib/utils/haptics';

export default function TemplatesPage() {
  const router = useRouter();
  const { activeProfile } = useAccount();
  const { templates, refreshTemplates, startWorkout, saveTemplate, deleteTemplate } = useWorkout();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [exercisesList, setExercisesList] = useState<
    { name: string; muscleGroup: string; defaultSets: number }[]
  >([
    { name: 'Bench Press', muscleGroup: 'Chest', defaultSets: 3 },
  ]);

  const handleStartTemplate = async (tmpl: WorkoutTemplate) => {
    triggerHaptic('medium');
    await startWorkout(tmpl, activeProfile.id);
    router.push('/active');
  };

  const handleAddExerciseRow = () => {
    setExercisesList((prev) => [
      ...prev,
      { name: '', muscleGroup: 'Chest', defaultSets: 3 },
    ]);
  };

  const handleRemoveExerciseRow = (index: number) => {
    setExercisesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveNewTemplate = async () => {
    if (!templateName.trim()) return;

    const validExercises = exercisesList.filter((e) => e.name.trim().length > 0);
    if (validExercises.length === 0) return;

    const newTmpl: WorkoutTemplate = {
      id: `tmpl_${Date.now()}`,
      name: templateName.trim(),
      description: templateDesc.trim() || undefined,
      muscleGroups: Array.from(new Set(validExercises.map((e) => e.muscleGroup))),
      exercises: validExercises,
    };

    await saveTemplate(newTmpl);

    setTemplateName('');
    setTemplateDesc('');
    setExercisesList([{ name: '', muscleGroup: 'Chest', defaultSets: 3 }]);
    setIsCreateOpen(false);
    triggerHaptic('success');
  };

  const handleDeleteTemplate = async (id: string) => {
    triggerHaptic('warning');
    await deleteTemplate(id);
  };

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-6 gap-6 max-w-5xl mx-auto w-full animate-page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Workout Routines
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Quick-start routines with predefined exercises and target sets
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold rounded-xl transition-all active:scale-95 shadow-sm shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>New Routine</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {templates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="gym-card p-5 shadow-sm flex flex-col justify-between gap-4 transition-all duration-300 hover:border-zinc-750 hover:shadow-xl hover:shadow-emerald-950/20 group"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white group-hover:text-emerald-300 transition-colors">
                      {tmpl.name}
                    </h3>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  </div>
                  {tmpl.description && (
                    <p className="text-xs text-zinc-400 mt-0.5 leading-snug">{tmpl.description}</p>
                  )}
                </div>

                {/* Delete custom templates */}
                {!['push-day', 'pull-day', 'leg-day', 'full-body'].includes(tmpl.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tmpl.id)}
                    className="p-1.5 text-zinc-600 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                    title="Delete routine"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Muscle Group tags */}
              <div className="flex flex-wrap gap-1.5">
                {tmpl.muscleGroups.map((mg) => (
                  <span
                    key={mg}
                    className="px-2.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[10px] font-semibold text-zinc-300"
                  >
                    {mg}
                  </span>
                ))}
              </div>

              {/* Exercises List Preview */}
              <div className="bg-zinc-950/70 border border-zinc-850 rounded-2xl p-3 flex flex-col divide-y divide-zinc-850">
                {tmpl.exercises.map((ex, idx) => (
                  <div
                    key={idx}
                    className="py-1.5 flex items-center justify-between text-xs first:pt-0 last:pb-0"
                  >
                    <span className="text-zinc-300 font-medium truncate pr-2">{ex.name}</span>
                    <span className="text-zinc-500 font-mono text-[11px] flex-shrink-0">
                      {ex.defaultSets} sets
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="button"
              onClick={() => handleStartTemplate(tmpl)}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-extrabold rounded-xl flex items-center justify-center gap-2 text-xs shadow-md shadow-emerald-500/20 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Routine</span>
            </button>
          </div>
        ))}
      </div>

      {/* Create Custom Template Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-white text-base">Create Routine Template</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Routine Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Upper Body Hypertrophy"
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Description</label>
              <input
                type="text"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="e.g. Chest and arms pump focus"
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400">Exercises</label>
                <button
                  type="button"
                  onClick={handleAddExerciseRow}
                  className="text-xs font-bold text-emerald-400 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {exercisesList.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => {
                        const next = [...exercisesList];
                        next[idx].name = e.target.value;
                        setExercisesList(next);
                      }}
                      placeholder="Exercise Name"
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <select
                      value={row.muscleGroup}
                      onChange={(e) => {
                        const next = [...exercisesList];
                        next[idx].muscleGroup = e.target.value;
                        setExercisesList(next);
                      }}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-2 text-xs text-zinc-300 focus:outline-none"
                    >
                      <option value="Chest">Chest</option>
                      <option value="Back">Back</option>
                      <option value="Legs">Legs</option>
                      <option value="Shoulders">Shoulders</option>
                      <option value="Arms">Arms</option>
                      <option value="Core">Core</option>
                    </select>
                    {exercisesList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveExerciseRow(idx)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveNewTemplate}
              disabled={!templateName.trim()}
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-emerald-950 font-bold rounded-2xl text-sm mt-2"
            >
              Save Routine
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
