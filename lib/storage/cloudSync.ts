import { Workout, WorkoutTemplate, BodyWeightEntry } from '../types/workout';
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
}

const LAST_SYNC_KEY = 'satatam_last_cloud_sync';

export function getLastCloudSyncTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_SYNC_KEY);
}

/**
 * Upload or update a workout document in Cloud Firestore
 */
export async function uploadWorkoutToCloud(userId: string, workout: Workout): Promise<void> {
  const db = getFirestoreDb();
  if (!db || !userId) return;

  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const cleanData = sanitizeForFirestore({
      ...workout,
      userId: userId,
      cloudUpdatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', userId, 'workouts', workout.id), cleanData, { merge: true });
  } catch (error) {
    console.warn('[CloudSync] Failed to upload workout:', error);
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
 * Two-way synchronization between local IndexedDB and Cloud Firestore.
 * Ensures user has full offline capability with complete cross-device cloud persistence.
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
      // STRICT FILTER: Only sync workouts that belong to this user
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

    // Pull cloud templates to local
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

    // Push local custom templates created by this user to cloud
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
    }

    return {
      workoutsSynced: workoutsSyncedCount,
      templatesSynced: templatesSyncedCount,
      lastSyncedAt: nowIso,
    };
  } catch (error) {
    console.warn('[CloudSync] Sync failed or partially completed:', error);
    return {
      workoutsSynced: 0,
      templatesSynced: 0,
      lastSyncedAt: nowIso,
    };
  }
}
