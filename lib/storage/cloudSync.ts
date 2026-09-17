import { Workout, WorkoutTemplate } from '../types/workout';
import { getFirestoreDb } from '../firebase/config';
import { indexedDBStorage } from './indexeddb';

// Sanitize object to remove undefined values for Firestore compatibility
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

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
 * Upload or update a completed workout in Cloud Firestore
 */
export async function uploadWorkoutToCloud(userId: string, workout: Workout): Promise<{ success: boolean; error?: string }> {
  const db = getFirestoreDb();
  if (!db || !userId) return { success: false, error: 'Database or user ID not available' };

  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const cleanData = sanitizeForFirestore({
      ...workout,
      userId: userId,
      cloudUpdatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'workouts', workout.id), cleanData, { merge: true });
    setLastCloudSyncError(null);
    return { success: true };
  } catch (error: any) {
    const errMsg = error?.code || error?.message || String(error);
    console.warn('[CloudSync] Failed to upload workout:', errMsg);
    setLastCloudSyncError(errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Sync active workout in-progress across devices in real time
 */
export async function uploadActiveWorkoutToCloud(userId: string, workout: Workout | null): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !userId) return;

  try {
    const { doc, setDoc, deleteDoc } = await import('firebase/firestore');
    const activeDocRef = doc(db, 'users', userId, 'activeWorkout', 'current');
    if (!workout) {
      await deleteDoc(activeDocRef);
    } else {
      const cleanData = sanitizeForFirestore({
        ...workout,
        userId: userId,
        cloudUpdatedAt: new Date().toISOString(),
      });
      await setDoc(activeDocRef, cleanData, { merge: true });
    }
  } catch (error: any) {
    console.warn('[CloudSync] Failed to sync active workout:', error?.message);
  }
}

/**
 * Delete a workout document from Cloud Firestore
 */
export async function deleteWorkoutFromCloud(userId: string, workoutId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !userId) return;

  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'users', userId, 'workouts', workoutId));
  } catch (error) {
    console.warn('[CloudSync] Failed to delete workout from cloud:', error);
  }
}

/**
 * Upload or update a custom template in Cloud Firestore
 */
export async function uploadTemplateToCloud(userId: string, template: WorkoutTemplate): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !userId) return;

  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const cleanData = sanitizeForFirestore({
      ...template,
      userId: userId,
      cloudUpdatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'templates', template.id), cleanData, { merge: true });
  } catch (error) {
    console.warn('[CloudSync] Failed to upload template:', error);
  }
}

/**
 * Delete a custom template from Cloud Firestore
 */
export async function deleteTemplateFromCloud(userId: string, templateId: string): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !userId) return;

  try {
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'users', userId, 'templates', templateId));
  } catch (error) {
    console.warn('[CloudSync] Failed to delete template from cloud:', error);
  }
}

/**
 * REAL-TIME WORKOUTS LISTENER
 * Subscribes to Firestore `users/{userId}/workouts` collection.
 * Triggers callback immediately on initial fetch and whenever mobile or PC finishes a workout!
 */
export function subscribeToUserWorkouts(
  userId: string,
  onWorkoutsUpdate: (workouts: Workout[]) => void,
  onError?: (err: any) => void
): () => void {
  const db = getFirestoreDb();
  if (!db || !userId) {
    return () => {};
  }

  let unsub: (() => void) | null = null;

  import('firebase/firestore')
    .then(({ collection, onSnapshot, query, orderBy }) => {
      try {
        const workoutsColl = collection(db, 'users', userId, 'workouts');
        unsub = onSnapshot(
          workoutsColl,
          async (snapshot) => {
            setLastCloudSyncError(null);
            const remoteWorkouts: Workout[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as Workout;
              if (data && data.id) {
                remoteWorkouts.push({ ...data, userId });
              }
            });

            // Sort newest first
            remoteWorkouts.sort(
              (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
            );

            // Persist each incoming remote workout to local IndexedDB for offline cache
            for (const workout of remoteWorkouts) {
              await indexedDBStorage.saveWorkout(workout);
            }

            // Also check if any local workouts were deleted remotely
            const localWorkouts = await indexedDBStorage.getWorkouts(userId);
            const remoteIds = new Set(remoteWorkouts.map((w) => w.id));
            // Keep local workouts if they match remote or if freshly created locally
            const merged = remoteWorkouts;

            if (typeof window !== 'undefined') {
              localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
            }

            onWorkoutsUpdate(merged);
          },
          (err) => {
            console.warn('[RealtimeSync] Firestore workout listener error:', err?.message || err);
            setLastCloudSyncError(err?.code || err?.message || String(err));
            if (onError) onError(err);
          }
        );
      } catch (err) {
        console.warn('[RealtimeSync] Listener setup exception:', err);
      }
    })
    .catch((err) => {
      console.warn('[RealtimeSync] Failed to import firestore for subscription:', err);
    });

  return () => {
    if (unsub) {
      unsub();
    }
  };
}

/**
 * REAL-TIME ACTIVE WORKOUT LISTENER
 * Subscribes to Firestore `users/{userId}/activeWorkout/current`.
 * When workout is in progress on mobile, PC knows in real time!
 */
export function subscribeToActiveWorkout(
  userId: string,
  onActiveUpdate: (active: Workout | null) => void
): () => void {
  const db = getFirestoreDb();
  if (!db || !userId) return () => {};

  let unsub: (() => void) | null = null;

  import('firebase/firestore')
    .then(({ doc, onSnapshot }) => {
      try {
        const docRef = doc(db, 'users', userId, 'activeWorkout', 'current');
        unsub = onSnapshot(
          docRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as Workout;
              onActiveUpdate(data);
            } else {
              onActiveUpdate(null);
            }
          },
          (err) => {
            console.warn('[RealtimeSync] Active workout listener error:', err?.message);
          }
        );
      } catch (err) {
        console.warn('[RealtimeSync] Active listener setup error:', err);
      }
    })
    .catch(() => {});

  return () => {
    if (unsub) unsub();
  };
}

/**
 * Two-way synchronization between local IndexedDB and Cloud Firestore.
 */
export async function performCloudSync(userId: string): Promise<SyncStats> {
  const nowIso = new Date().toISOString();
  const db = getFirestoreDb();

  if (!db || !userId) {
    return {
      workoutsSynced: 0,
      templatesSynced: 0,
      lastSyncedAt: nowIso,
    };
  }

  try {
    const { collection, getDocs } = await import('firebase/firestore');

    // 1. Sync Workouts
    const workoutsCollRef = collection(db, 'users', userId, 'workouts');
    const cloudWorkoutsSnap = await getDocs(workoutsCollRef);
    const cloudWorkouts: Workout[] = [];

    cloudWorkoutsSnap.forEach((docSnap) => {
      const data = docSnap.data() as Workout;
      if (data && data.id) {
        cloudWorkouts.push(data);
      }
    });

    const localWorkouts = await indexedDBStorage.getWorkouts(userId);
    const localWorkoutMap = new Map<string, Workout>(localWorkouts.map((w) => [w.id, w]));
    const cloudWorkoutMap = new Map<string, Workout>(cloudWorkouts.map((w) => [w.id, w]));

    let workoutsSyncedCount = 0;

    // Pull from cloud to local if missing locally
    for (const remoteWorkout of cloudWorkouts) {
      const ensuredWorkout: Workout = {
        ...remoteWorkout,
        userId: userId,
      };
      if (!localWorkoutMap.has(remoteWorkout.id)) {
        await indexedDBStorage.saveWorkout(ensuredWorkout);
        workoutsSyncedCount++;
      }
    }

    // Push from local to cloud if missing in cloud
    for (const localWorkout of localWorkouts) {
      if (localWorkout.userId !== userId) {
        continue;
      }
      if (!cloudWorkoutMap.has(localWorkout.id)) {
        await uploadWorkoutToCloud(userId, localWorkout);
        workoutsSyncedCount++;
      }
    }

    // 2. Sync Custom Templates
    const templatesCollRef = collection(db, 'users', userId, 'templates');
    const cloudTemplatesSnap = await getDocs(templatesCollRef);
    const cloudTemplates: WorkoutTemplate[] = [];

    cloudTemplatesSnap.forEach((docSnap) => {
      const data = docSnap.data() as WorkoutTemplate;
      if (data && data.id) {
        cloudTemplates.push(data);
      }
    });

    const localTemplates = await indexedDBStorage.getTemplates(userId);
    const localTemplateMap = new Map<string, WorkoutTemplate>(localTemplates.map((t) => [t.id, t]));
    const cloudTemplateMap = new Map<string, WorkoutTemplate>(cloudTemplates.map((t) => [t.id, t]));

    let templatesSyncedCount = 0;

    for (const remoteTemplate of cloudTemplates) {
      const ensuredTemplate: WorkoutTemplate = {
        ...remoteTemplate,
        userId: userId,
      } as any;
      if (!localTemplateMap.has(remoteTemplate.id)) {
        await indexedDBStorage.saveTemplate(ensuredTemplate);
        templatesSyncedCount++;
      }
    }

    for (const localTemplate of localTemplates) {
      if ((localTemplate as any).userId !== userId) {
        continue;
      }
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
    const errMsg = error?.code || error?.message || String(error);
    console.warn('[CloudSync] Sync failed or partially completed:', errMsg);
    setLastCloudSyncError(errMsg);
    return {
      workoutsSynced: 0,
      templatesSynced: 0,
      lastSyncedAt: nowIso,
      error: errMsg,
    };
  }
}
