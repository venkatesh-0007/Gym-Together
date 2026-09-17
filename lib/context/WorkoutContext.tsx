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
import { useAccount } from './AccountContext';
import {
  uploadWorkoutToCloud,
  deleteWorkoutFromCloud,
  uploadTemplateToCloud,
  deleteTemplateFromCloud,
  performCloudSync,
  getLastCloudSyncTime,
} from '../storage/cloudSync';

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
  isSyncingCloud: boolean;
  lastCloudSyncTime: string | null;

  startWorkout: (template?: WorkoutTemplate, userId?: string) => Promise<Workout>;
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
  saveTemplate: (template: WorkoutTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  triggerCloudSync: () => Promise<void>;
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

  const { currentUser, activeProfile } = useAccount();
  const activeUserId = currentUser?.id || activeProfile?.id;
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string | null>(getLastCloudSyncTime());

  const activeWorkoutRef = useRef<Workout | null>(null);
  activeWorkoutRef.current = activeWorkout;

  // Recalculates elapsed seconds directly from start timestamp
  const calculateElapsed = useCallback((startTimeIso: string): number => {
    const startMs = new Date(startTimeIso).getTime();
    const nowMs = Date.now();
    return Math.max(0, Math.floor((nowMs - startMs) / 1000));
  }, []);

  // Refresh lists with strict user-scoping
  const refreshWorkouts = useCallback(async (targetUserId?: string) => {
    try {
      const uId = targetUserId || currentUser?.id || activeProfile?.id;
      const list = await storage.getWorkouts(uId);
      setAllWorkouts(list);
    } catch (e) {
      console.error('Failed to load workouts:', e);
    }
  }, [currentUser?.id, activeProfile?.id]);

  const refreshTemplates = useCallback(async (targetUserId?: string) => {
    try {
      const uId = targetUserId || currentUser?.id || activeProfile?.id;
      const list = await storage.getTemplates(uId);
      setTemplates(list);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }, [currentUser?.id, activeProfile?.id]);

  // Perform two-way sync with Cloud Firestore
  const triggerCloudSync = useCallback(async () => {
    const uId = currentUser?.id;
    if (!uId) return;
    setIsSyncingCloud(true);
    try {
      const stats = await performCloudSync(uId);
      setLastCloudSyncTime(stats.lastSyncedAt);
      await refreshWorkouts(uId);
      await refreshTemplates(uId);
    } catch (e) {
      console.warn('Cloud sync error:', e);
    } finally {
      setIsSyncingCloud(false);
    }
  }, [currentUser?.id, refreshWorkouts, refreshTemplates]);

  // When active account changes (log in, switch profile, or log out), immediately isolate data
  useEffect(() => {
    const uId = currentUser?.id || activeProfile?.id;
    if (uId) {
      refreshWorkouts(uId);
      refreshTemplates(uId);

      // Verify active workout belongs to this user
      storage.getActiveWorkout(uId).then((savedActive) => {
        if (savedActive && savedActive.status === 'active' && (!savedActive.userId || savedActive.userId === uId)) {
          setActiveWorkout(savedActive);
          setElapsedSeconds(calculateElapsed(savedActive.startTime));
        } else {
          setActiveWorkout(null);
          setElapsedSeconds(0);
          setRecoveryData(null);
        }
      });

      if (currentUser?.id) {
        triggerCloudSync();
      }
    }
  }, [currentUser?.id, activeProfile?.id, refreshWorkouts, refreshTemplates, calculateElapsed, triggerCloudSync]);

  // Apply theme & accent to DOM immediately and mirror to localStorage
  const applyThemeAndAccent = useCallback((themeMode?: 'dark' | 'light' | 'system', accent?: string) => {
    if (typeof document === 'undefined') return;
    const activeTheme = themeMode || 'dark';
    const activeAccent = accent || 'red';

    let resolvedTheme = activeTheme;
    if (activeTheme === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolvedTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.setAttribute('data-accent', activeAccent);

    try {
      localStorage.setItem('satatam_theme', activeTheme);
      localStorage.setItem('satatam_accent', activeAccent);
    } catch (_) {}
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await storage.getSettings();
      setSettings(s);
      applyThemeAndAccent(s.theme, s.accentColor);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, [applyThemeAndAccent]);

  const updateSettings = useCallback(async (newSettings: UserSettings) => {
    try {
      applyThemeAndAccent(newSettings.theme, newSettings.accentColor);
      await storage.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [applyThemeAndAccent]);

  // Initial load from IndexedDB on mount
  useEffect(() => {
    async function init() {
      try {
        setIsLoading(true);
        const uId = currentUser?.id || activeProfile?.id;
        const [savedActive, workoutsList, templatesList, loadedSettings] =
          await Promise.all([
            storage.getActiveWorkout(uId),
            storage.getWorkouts(uId),
            storage.getTemplates(uId),
            storage.getSettings(),
          ]);

        setAllWorkouts(workoutsList);
        setTemplates(templatesList);
        setSettings(loadedSettings);
        applyThemeAndAccent(loadedSettings.theme, loadedSettings.accentColor);

        if (savedActive && savedActive.status === 'active' && (!savedActive.userId || savedActive.userId === uId)) {
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
  }, [calculateElapsed, currentUser?.id, activeProfile?.id, applyThemeAndAccent]);

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
    async (template?: WorkoutTemplate, userId?: string): Promise<Workout> => {
      const uId = userId || currentUser?.id || activeProfile?.id;
      // Prevent starting if another workout is already active for this user
      const current = activeWorkoutRef.current;
      if (current && current.status === 'active' && (!current.userId || current.userId === uId)) {
        return current;
      }

      const now = new Date();
      const newWorkout: Workout = {
        id: `workout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: uId,
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
    [currentUser?.id, activeProfile?.id]
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
      const uId = current.userId || currentUser?.id || activeProfile?.id;

      const completedWorkout: Workout = {
        ...current,
        userId: uId,
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

      // Cloud backup
      if (uId) {
        uploadWorkoutToCloud(uId, completedWorkout).catch((e) =>
          console.warn('Failed to upload workout to cloud:', e)
        );
      }

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
      await refreshWorkouts(uId);
    },
    [refreshWorkouts, settings.weightUnit, currentUser?.id, activeProfile?.id]
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
      const uId = currentUser?.id || activeProfile?.id;
      if (uId) {
        deleteWorkoutFromCloud(uId, id).catch((e) =>
          console.warn('Failed to delete workout from cloud:', e)
        );
      }
      await refreshWorkouts(uId);
    },
    [refreshWorkouts, currentUser?.id, activeProfile?.id]
  );

  // Update completed workout (notes, mood, etc.)
  const updateWorkout = useCallback(
    async (workout: Workout) => {
      await storage.updateWorkout(workout);
      const uId = workout.userId || currentUser?.id || activeProfile?.id;
      if (uId) {
        uploadWorkoutToCloud(uId, workout).catch((e) =>
          console.warn('Failed to upload updated workout to cloud:', e)
        );
      }
      await refreshWorkouts(uId);
    },
    [refreshWorkouts, currentUser?.id, activeProfile?.id]
  );

  // Save or update custom template
  const saveTemplate = useCallback(
    async (template: WorkoutTemplate) => {
      const uId = (template as any).userId || currentUser?.id || activeProfile?.id;
      const templWithUser: WorkoutTemplate = {
        ...template,
        userId: uId,
      } as any;
      await storage.saveTemplate(templWithUser);
      if (uId) {
        uploadTemplateToCloud(uId, templWithUser).catch((e) =>
          console.warn('Failed to upload template to cloud:', e)
        );
      }
      await refreshTemplates(uId);
    },
    [refreshTemplates, currentUser?.id, activeProfile?.id]
  );

  // Delete custom template
  const deleteTemplate = useCallback(
    async (id: string) => {
      triggerHaptic('warning');
      await storage.deleteTemplate(id);
      const uId = currentUser?.id || activeProfile?.id;
      if (uId) {
        deleteTemplateFromCloud(uId, id).catch((e) =>
          console.warn('Failed to delete template from cloud:', e)
        );
      }
      await refreshTemplates(uId);
    },
    [refreshTemplates, currentUser?.id, activeProfile?.id]
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
        isSyncingCloud,
        lastCloudSyncTime,
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
        saveTemplate,
        deleteTemplate,
        triggerCloudSync,
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
