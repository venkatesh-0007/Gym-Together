'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Workout,
  WorkoutTemplate,
  Mood,
  DEFAULT_SETTINGS,
  UserSettings,
} from '../types/workout';
import { storage } from '../storage';
import { getLocalDateString } from '../calculations/duration';
import { triggerHaptic, playSuccessChime } from '../utils/haptics';

interface WorkoutSummaryData {
  duration: number;
  startTime: string;
  endTime: string;
}

interface RecoveryData {
  type: 'stale' | 'today';
  workout: Workout;
}

interface WorkoutContextType {
  activeWorkout: Workout | null;
  elapsedSeconds: number;
  isLoading: boolean;
  recoveryData: RecoveryData | null;
  allWorkouts: Workout[];
  templates: WorkoutTemplate[];
  settings: UserSettings;

  startWorkout: (template?: WorkoutTemplate) => Promise<Workout>;
  updateActiveWorkout: (updated: Workout) => Promise<void>;
  saveCompletedWorkout: (details: {
    mood?: Mood;
    notes?: string;
    bodyWeight?: number;
    endTime?: string;
  }) => Promise<void>;
  cancelStopWorkout: () => void;
  discardActiveWorkout: () => Promise<void>;
  dismissRecovery: (action: 'resume' | 'finish' | 'discard') => Promise<void>;

  refreshWorkouts: () => Promise<void>;
  refreshTemplates: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: UserSettings) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  updateWorkout: (workout: Workout) => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recoveryData, setRecoveryData] = useState<RecoveryData | null>(null);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  const activeWorkoutRef = useRef<Workout | null>(null);
  activeWorkoutRef.current = activeWorkout;

  // Recalculates elapsed seconds directly from start timestamp
  const calculateElapsed = useCallback((startTimeIso: string): number => {
    const startMs = new Date(startTimeIso).getTime();
    const nowMs = Date.now();
    return Math.max(0, Math.floor((nowMs - startMs) / 1000));
  }, []);

  // Refresh lists
  const refreshWorkouts = useCallback(async () => {
    try {
      const list = await storage.getWorkouts();
      setAllWorkouts(list);
    } catch (e) {
      console.error('Failed to load workouts:', e);
    }
  }, []);

  const refreshTemplates = useCallback(async () => {
    try {
      const list = await storage.getTemplates();
      setTemplates(list);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await storage.getSettings();
      setSettings(s);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      await storage.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, []);

  // Initial load from IndexedDB on mount
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const [savedActive, workoutsList, templatesList, loadedSettings] =
          await Promise.all([
            storage.getActiveWorkout(),
            storage.getWorkouts(),
            storage.getTemplates(),
            storage.getSettings(),
          ]);

        setAllWorkouts(workoutsList);
        setTemplates(templatesList);
        setSettings(loadedSettings);

        if (savedActive && savedActive.status === 'active') {
          const now = Date.now();
          const startMs = new Date(savedActive.startTime).getTime();
          const hoursAgo = (now - startMs) / (1000 * 60 * 60);
          const workoutDate = savedActive.date;
          const todayDate = getLocalDateString(new Date());

          // If workout is from a previous day or started > 14 hours ago
          if (workoutDate !== todayDate || hoursAgo > 14) {
            setRecoveryData({ type: 'stale', workout: savedActive });
            setActiveWorkout(savedActive);
            setElapsedSeconds(calculateElapsed(savedActive.startTime));
          } else {
            setActiveWorkout(savedActive);
            setElapsedSeconds(calculateElapsed(savedActive.startTime));
          }
        }
      } catch (err) {
        console.error('Failed to initialize workout state from storage:', err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [calculateElapsed]);

  // Live timer interval: recalibrates strictly using timestamp
  useEffect(() => {
    if (!activeWorkout || activeWorkout.status !== 'active') {
      setElapsedSeconds(0);
      return;
    }

    // Set initial
    setElapsedSeconds(calculateElapsed(activeWorkout.startTime));

    const interval = setInterval(() => {
      if (activeWorkoutRef.current) {
        setElapsedSeconds(calculateElapsed(activeWorkoutRef.current.startTime));
      }
    }, 1000);

    // Resynchronize immediately when tab returns to focus / phone is unlocked
    const handleVisibilityOrFocus = () => {
      if (activeWorkoutRef.current && document.visibilityState === 'visible') {
        setElapsedSeconds(calculateElapsed(activeWorkoutRef.current.startTime));
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [activeWorkout?.id, activeWorkout?.startTime, calculateElapsed]);

  // Start new workout
  const startWorkout = useCallback(
    async (template?: WorkoutTemplate): Promise<Workout> => {
      // Prevent starting if another workout is already active
      const current = activeWorkoutRef.current;
      if (current && current.status === 'active') {
        return current;
      }

      const now = new Date();
      const newWorkout: Workout = {
        id: `workout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        startTime: now.toISOString(),
        endTime: null,
        status: 'active',
        duration: 0,
        date: getLocalDateString(now),
        notes: '',
        exercises: template
          ? template.exercises.map((tEx, idx) => ({
              id: `ex_${Date.now()}_${idx}`,
              workoutId: '',
              name: tEx.name,
              muscleGroup: tEx.muscleGroup,
              sets: Array.from({ length: tEx.defaultSets || 3 }, (_, sIdx) => ({
                id: `set_${Date.now()}_${idx}_${sIdx}`,
                exerciseId: `ex_${Date.now()}_${idx}`,
                setNumber: sIdx + 1,
                weight: 0,
                reps: 0,
                completed: false,
              })),
            }))
          : [],
        templateId: template?.id,
        templateName: template?.name,
      };

      // Set workoutId in exercises
      newWorkout.exercises.forEach((ex) => {
        ex.workoutId = newWorkout.id;
      });

      triggerHaptic('medium');
      await storage.saveActiveWorkout(newWorkout);
      setActiveWorkout(newWorkout);
      setElapsedSeconds(0);
      setRecoveryData(null);

      return newWorkout;
    },
    []
  );

  // Update in-progress workout (exercises, notes, sets)
  const updateActiveWorkout = useCallback(async (updated: Workout) => {
    setActiveWorkout(updated);
    await storage.saveActiveWorkout(updated);
  }, []);

  // Save completed workout
  const saveCompletedWorkout = useCallback(
    async (details: {
      mood?: Mood;
      notes?: string;
      bodyWeight?: number;
      endTime?: string;
    }) => {
      const current = activeWorkoutRef.current;
      if (!current) return;

      const finishTime = details.endTime || new Date().toISOString();
      const startMs = new Date(current.startTime).getTime();
      const endMs = new Date(finishTime).getTime();
      const durationSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));

      const completedWorkout: Workout = {
        ...current,
        endTime: finishTime,
        status: 'completed',
        duration: durationSeconds,
        mood: details.mood,
        notes: details.notes !== undefined ? details.notes : current.notes,
        bodyWeight: details.bodyWeight !== undefined ? details.bodyWeight : current.bodyWeight,
      };

      // Save to completed workouts and clear active
      await storage.saveWorkout(completedWorkout);
      await storage.clearActiveWorkout();

      // If body weight provided, also record to bodyweight log
      if (details.bodyWeight && details.bodyWeight > 0) {
        await storage.saveBodyWeight({
          id: `bw_${Date.now()}`,
          date: completedWorkout.date,
          weight: details.bodyWeight,
          unit: settings.weightUnit,
        });
      }

      playSuccessChime();
      triggerHaptic('success');

      setActiveWorkout(null);
      setElapsedSeconds(0);
      setRecoveryData(null);

      // Refresh list
      await refreshWorkouts();
    },
    [refreshWorkouts, settings.weightUnit]
  );

  const cancelStopWorkout = useCallback(() => {
    // Just dismiss the stop modal
  }, []);

  // Discard current active workout
  const discardActiveWorkout = useCallback(async () => {
    triggerHaptic('warning');
    await storage.clearActiveWorkout();
    setActiveWorkout(null);
    setElapsedSeconds(0);
    setRecoveryData(null);
  }, []);

  // Recovery dialog actions
  const dismissRecovery = useCallback(
    async (action: 'resume' | 'finish' | 'discard') => {
      const rec = recoveryData?.workout;
      if (!rec) return;

      if (action === 'resume') {
        setRecoveryData(null);
      } else if (action === 'finish') {
        // Finish with current elapsed duration
        await saveCompletedWorkout({
          notes: 'Auto-finished recovered workout',
        });
      } else if (action === 'discard') {
        await discardActiveWorkout();
      }
    },
    [recoveryData, saveCompletedWorkout, discardActiveWorkout]
  );

  // Delete completed workout
  const deleteWorkout = useCallback(
    async (id: string) => {
      triggerHaptic('warning');
      await storage.deleteWorkout(id);
      await refreshWorkouts();
    },
    [refreshWorkouts]
  );

  // Update completed workout (notes, mood, etc.)
  const updateWorkout = useCallback(
    async (workout: Workout) => {
      await storage.updateWorkout(workout);
      await refreshWorkouts();
    },
    [refreshWorkouts]
  );

  return (
    <WorkoutContext.Provider
      value={{
        activeWorkout,
        elapsedSeconds,
        isLoading,
        recoveryData,
        allWorkouts,
        templates,
        settings,
        startWorkout,
        updateActiveWorkout,
        saveCompletedWorkout,
        cancelStopWorkout,
        discardActiveWorkout,
        dismissRecovery,
        refreshWorkouts,
        refreshTemplates,
        refreshSettings,
        updateSettings,
        deleteWorkout,
        updateWorkout,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
