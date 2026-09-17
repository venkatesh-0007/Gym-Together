import { Workout, WorkoutTemplate } from '../types/workout';
import { supabase } from '../supabase/client';
import { indexedDBStorage } from './indexeddb';

export interface SyncStats {
  workoutsSynced: number;
  templatesSynced: number;
  lastSyncedAt: string;
  error?: string;
}

const LAST_SYNC_KEY = 'satatam_last_cloud_sync';
const SYNC_ERROR_KEY = 'satatam_cloud_sync_error';

export function getLastCloudSyncTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function getLastCloudSyncError(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SYNC_ERROR_KEY);
}

export function setLastCloudSyncError(err: string | null) {
  if (typeof window === 'undefined') return;
  if (!err) {
    localStorage.removeItem(SYNC_ERROR_KEY);
  } else {
    localStorage.setItem(SYNC_ERROR_KEY, err);
  }
}

/**
 * Upload or update a completed workout in Supabase
 */
export async function uploadWorkoutToCloud(userId: string, workout: Workout): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'User ID not available' };

  try {
    const dbWorkout = {
      id: workout.id,
      user_id: userId,
      start_time: workout.startTime,
      end_time: workout.endTime,
      status: workout.status,
      duration: workout.duration,
      date: workout.date,
      notes: workout.notes,
      mood: workout.mood,
      body_weight: workout.bodyWeight,
      template_id: workout.templateId,
      template_name: workout.templateName,
      exercises: workout.exercises,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('workouts').upsert(dbWorkout);
    if (error) throw error;

    setLastCloudSyncError(null);
    return { success: true };
  } catch (error: any) {
    console.warn('[CloudSync] Failed to upload workout:', error);
    setLastCloudSyncError(error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sync active workout in-progress across devices in real time using Supabase
 */
export async function uploadActiveWorkoutToCloud(userId: string, workout: Workout | null): Promise<void> {
  if (!userId) return;

  try {
    if (!workout) {
      await supabase.from('active_workouts').delete().eq('user_id', userId);
    } else {
      await supabase.from('active_workouts').upsert({
        user_id: userId,
        workout: workout,
        updated_at: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.warn('[CloudSync] Failed to sync active workout:', error?.message);
  }
}

/**
 * Delete a workout from Supabase
 */
export async function deleteWorkoutFromCloud(userId: string, workoutId: string): Promise<void> {
  if (!userId) return;

  try {
    await supabase.from('workouts').delete().match({ id: workoutId, user_id: userId });
  } catch (error) {
    console.warn('[CloudSync] Failed to delete workout from cloud:', error);
  }
}

/**
 * Upload or update a custom template in Supabase
 */
export async function uploadTemplateToCloud(userId: string, template: WorkoutTemplate): Promise<void> {
  if (!userId) return;

  try {
    const dbTemplate = {
      id: template.id,
      user_id: userId,
      name: template.name,
      description: template.description,
      muscle_groups: template.muscleGroups,
      exercises: template.exercises,
      updated_at: new Date().toISOString()
    };
    await supabase.from('templates').upsert(dbTemplate);
  } catch (error) {
    console.warn('[CloudSync] Failed to upload template:', error);
  }
}

/**
 * Delete a custom template from Supabase
 */
export async function deleteTemplateFromCloud(userId: string, templateId: string): Promise<void> {
  if (!userId) return;

  try {
    await supabase.from('templates').delete().match({ id: templateId, user_id: userId });
  } catch (error) {
    console.warn('[CloudSync] Failed to delete template from cloud:', error);
  }
}

/**
 * Map Supabase DB workout row back to App Workout format
 */
function mapDbWorkoutToApp(dbW: any): Workout {
  return {
    id: dbW.id,
    userId: dbW.user_id,
    startTime: dbW.start_time,
    endTime: dbW.end_time,
    status: dbW.status,
    duration: dbW.duration,
    date: dbW.date,
    notes: dbW.notes,
    mood: dbW.mood,
    bodyWeight: dbW.body_weight,
    templateId: dbW.template_id,
    templateName: dbW.template_name,
    exercises: dbW.exercises || []
  };
}

/**
 * REAL-TIME WORKOUTS LISTENER using Supabase Realtime
 */
export function subscribeToUserWorkouts(
  userId: string,
  onWorkoutsUpdate: (workouts: Workout[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!userId) return () => {};

  // First fetch the initial state
  supabase.from('workouts')
    .select('*')
    .eq('user_id', userId)
    .then(async ({ data, error }) => {
      if (error) {
        if (onError) onError(error);
        return;
      }
      if (data) {
        const remoteWorkouts = data.map(mapDbWorkoutToApp);
        
        // Save remote to IndexedDB
        for (const w of remoteWorkouts) {
          await indexedDBStorage.saveWorkout(w);
        }

        // Properly merge with local workouts!
        const localWorkouts = await indexedDBStorage.getWorkouts(userId);
        const remoteMap = new Map(remoteWorkouts.map(w => [w.id, w]));
        
        // Combine, preferring remote if exists, otherwise keep local (for pending uploads)
        const mergedMap = new Map<string, Workout>();
        localWorkouts.forEach(w => mergedMap.set(w.id, w));
        remoteWorkouts.forEach(w => mergedMap.set(w.id, w));

        const merged = Array.from(mergedMap.values());
        merged.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        onWorkoutsUpdate(merged);
      }
    });

  // Subscribe to realtime changes
  const channel = supabase.channel(`public:workouts:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workouts', filter: `user_id=eq.${userId}` },
      async (payload) => {
        // Re-fetch all or just merge payload. For simplicity and robustness, we just re-run the local merge logic
        // But since we just want to update the cache:
        if (payload.eventType === 'DELETE') {
           await indexedDBStorage.deleteWorkout(payload.old.id as string);
        } else {
           await indexedDBStorage.saveWorkout(mapDbWorkoutToApp(payload.new));
        }

        const localWorkouts = await indexedDBStorage.getWorkouts(userId);
        localWorkouts.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        onWorkoutsUpdate(localWorkouts);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * REAL-TIME ACTIVE WORKOUT LISTENER using Supabase Realtime
 */
export function subscribeToActiveWorkout(
  userId: string,
  onActiveUpdate: (active: Workout | null) => void
): () => void {
  if (!userId) return () => {};

  // Initial fetch
  supabase.from('active_workouts')
    .select('workout')
    .eq('user_id', userId)
    .single()
    .then(({ data }) => {
       if (data && data.workout) {
          onActiveUpdate(data.workout as Workout);
       } else {
          onActiveUpdate(null);
       }
    });

  const channel = supabase.channel(`public:active_workouts:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'active_workouts', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          onActiveUpdate(null);
        } else if (payload.new && payload.new.workout) {
          onActiveUpdate(payload.new.workout as Workout);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Two-way synchronization between local IndexedDB and Supabase.
 */
export async function performCloudSync(userId: string): Promise<SyncStats> {
  const nowIso = new Date().toISOString();
  if (!userId) {
    return { workoutsSynced: 0, templatesSynced: 0, lastSyncedAt: nowIso };
  }

  try {
    // 1. Sync Workouts
    const { data: cloudWorkoutsData } = await supabase.from('workouts').select('*').eq('user_id', userId);
    const cloudWorkouts: Workout[] = (cloudWorkoutsData || []).map(mapDbWorkoutToApp);
    
    const localWorkouts = await indexedDBStorage.getWorkouts(userId);
    const localWorkoutMap = new Map<string, Workout>(localWorkouts.map((w) => [w.id, w]));
    const cloudWorkoutMap = new Map<string, Workout>(cloudWorkouts.map((w) => [w.id, w]));

    let workoutsSyncedCount = 0;

    // Pull from cloud to local if missing locally
    for (const remoteWorkout of cloudWorkouts) {
      if (!localWorkoutMap.has(remoteWorkout.id)) {
        await indexedDBStorage.saveWorkout(remoteWorkout);
        workoutsSyncedCount++;
      }
    }

    // Push from local to cloud if missing in cloud
    for (const localWorkout of localWorkouts) {
      if (!cloudWorkoutMap.has(localWorkout.id)) {
        await uploadWorkoutToCloud(userId, localWorkout);
        workoutsSyncedCount++;
      }
    }

    // 2. Sync Custom Templates
    const { data: cloudTemplatesData } = await supabase.from('templates').select('*').eq('user_id', userId);
    const cloudTemplates: WorkoutTemplate[] = (cloudTemplatesData || []).map(t => ({
      id: t.id,
      userId: t.user_id,
      name: t.name,
      description: t.description,
      muscleGroups: t.muscle_groups,
      exercises: t.exercises
    }));

    const localTemplates = await indexedDBStorage.getTemplates(userId);
    const localTemplateMap = new Map<string, WorkoutTemplate>(localTemplates.map((t) => [t.id, t]));
    const cloudTemplateMap = new Map<string, WorkoutTemplate>(cloudTemplates.map((t) => [t.id, t]));

    let templatesSyncedCount = 0;

    for (const remoteTemplate of cloudTemplates) {
      if (!localTemplateMap.has(remoteTemplate.id)) {
        await indexedDBStorage.saveTemplate(remoteTemplate);
        templatesSyncedCount++;
      }
    }

    for (const localTemplate of localTemplates) {
      if (!cloudTemplateMap.has(localTemplate.id)) {
        await uploadTemplateToCloud(userId, localTemplate);
        templatesSyncedCount++;
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, nowIso);
      setLastCloudSyncError(null);
    }

    return {
      workoutsSynced: workoutsSyncedCount,
      templatesSynced: templatesSyncedCount,
      lastSyncedAt: nowIso,
    };
  } catch (error: any) {
    console.warn('[CloudSync] Sync failed or partially completed:', error);
    setLastCloudSyncError(error.message);
    return {
      workoutsSynced: 0,
      templatesSynced: 0,
      lastSyncedAt: nowIso,
      error: error.message,
    };
  }
}
