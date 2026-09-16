import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Workout,
  WorkoutTemplate,
  BodyWeightEntry,
  UserSettings,
  ExportData,
  DEFAULT_SETTINGS,
} from '../types/workout';
import { StorageAdapter } from './interface';

interface GymTrackerDB extends DBSchema {
  active_workout: {
    key: string;
    value: Workout;
  };
  workouts: {
    key: string;
    value: Workout;
    indexes: {
      'by-date': string;
      'by-status': string;
    };
  };
  templates: {
    key: string;
    value: WorkoutTemplate;
  };
  bodyweight: {
    key: string;
    value: BodyWeightEntry;
    indexes: {
      'by-date': string;
    };
  };
  settings: {
    key: string;
    value: UserSettings;
  };
}

const DB_NAME = 'gym_tracker_db';
const DB_VERSION = 1;

export const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'push-day',
    name: 'Push Day',
    description: 'Chest, Shoulders & Triceps focus',
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    exercises: [
      { name: 'Barbell Bench Press', muscleGroup: 'Chest', defaultSets: 3 },
      { name: 'Incline Dumbbell Press', muscleGroup: 'Chest', defaultSets: 3 },
      { name: 'Overhead Shoulder Press', muscleGroup: 'Shoulders', defaultSets: 3 },
      { name: 'Lateral Raises', muscleGroup: 'Shoulders', defaultSets: 3 },
      { name: 'Triceps Rope Pushdown', muscleGroup: 'Triceps', defaultSets: 3 },
    ],
  },
  {
    id: 'pull-day',
    name: 'Pull Day',
    description: 'Back, Rear Delts & Biceps focus',
    muscleGroups: ['Back', 'Biceps'],
    exercises: [
      { name: 'Barbell Deadlift', muscleGroup: 'Back', defaultSets: 3 },
      { name: 'Lat Pulldown', muscleGroup: 'Back', defaultSets: 3 },
      { name: 'Barbell Bent Over Row', muscleGroup: 'Back', defaultSets: 3 },
      { name: 'Face Pulls', muscleGroup: 'Shoulders', defaultSets: 3 },
      { name: 'Dumbbell Bicep Curls', muscleGroup: 'Biceps', defaultSets: 3 },
    ],
  },
  {
    id: 'leg-day',
    name: 'Leg Day',
    description: 'Quads, Hamstrings & Calves focus',
    muscleGroups: ['Quads', 'Hamstrings', 'Calves'],
    exercises: [
      { name: 'Barbell Squat', muscleGroup: 'Quads', defaultSets: 4 },
      { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings', defaultSets: 3 },
      { name: 'Leg Press', muscleGroup: 'Quads', defaultSets: 3 },
      { name: 'Leg Curls', muscleGroup: 'Hamstrings', defaultSets: 3 },
      { name: 'Standing Calf Raises', muscleGroup: 'Calves', defaultSets: 4 },
    ],
  },
  {
    id: 'full-body',
    name: 'Full Body',
    description: 'Compound full-body workout',
    muscleGroups: ['Chest', 'Back', 'Legs', 'Shoulders'],
    exercises: [
      { name: 'Barbell Squat', muscleGroup: 'Legs', defaultSets: 3 },
      { name: 'Bench Press', muscleGroup: 'Chest', defaultSets: 3 },
      { name: 'Pull-ups / Lat Pulldown', muscleGroup: 'Back', defaultSets: 3 },
      { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', defaultSets: 3 },
    ],
  },
];

class IndexedDBStorageAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBPDatabase<GymTrackerDB>> | null = null;

  private async getDB(): Promise<IDBPDatabase<GymTrackerDB>> {
    if (typeof window === 'undefined') {
      throw new Error('IndexedDB is only accessible in the browser environment.');
    }

    if (!this.dbPromise) {
      this.dbPromise = openDB<GymTrackerDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Active workout store
          if (!db.objectStoreNames.contains('active_workout')) {
            db.createObjectStore('active_workout');
          }

          // Workouts store
          if (!db.objectStoreNames.contains('workouts')) {
            const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
            workoutStore.createIndex('by-date', 'date');
            workoutStore.createIndex('by-status', 'status');
          }

          // Templates store
          if (!db.objectStoreNames.contains('templates')) {
            db.createObjectStore('templates', { keyPath: 'id' });
          }

          // Body weight store
          if (!db.objectStoreNames.contains('bodyweight')) {
            const bwStore = db.createObjectStore('bodyweight', { keyPath: 'id' });
            bwStore.createIndex('by-date', 'date');
          }

          // Settings store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }
        },
      });

      // Seed default templates if first time
      const db = await this.dbPromise;
      const count = await db.count('templates');
      if (count === 0) {
        const tx = db.transaction('templates', 'readwrite');
        for (const tmpl of DEFAULT_TEMPLATES) {
          await tx.store.put(tmpl);
        }
        await tx.done;
      }
    }

    return this.dbPromise;
  }

  // Active Workout
  async getActiveWorkout(): Promise<Workout | null> {
    try {
      const db = await this.getDB();
      const active = await db.get('active_workout', 'current');
      return active || null;
    } catch (e) {
      console.error('Error fetching active workout from IndexedDB:', e);
      return null;
    }
  }

  async saveActiveWorkout(workout: Workout): Promise<void> {
    const db = await this.getDB();
    await db.put('active_workout', workout, 'current');
  }

  async clearActiveWorkout(): Promise<void> {
    const db = await this.getDB();
    await db.delete('active_workout', 'current');
  }

  // Completed Workouts
  async getWorkouts(): Promise<Workout[]> {
    try {
      const db = await this.getDB();
      const workouts = await db.getAll('workouts');
      // Sort newest first
      return workouts.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (e) {
      console.error('Error getting workouts from IndexedDB:', e);
      return [];
    }
  }

  async getWorkoutById(id: string): Promise<Workout | null> {
    const db = await this.getDB();
    const workout = await db.get('workouts', id);
    return workout || null;
  }

  async saveWorkout(workout: Workout): Promise<void> {
    const db = await this.getDB();
    await db.put('workouts', workout);
  }

  async updateWorkout(workout: Workout): Promise<void> {
    const db = await this.getDB();
    await db.put('workouts', workout);
  }

  async deleteWorkout(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('workouts', id);
  }

  // Templates
  async getTemplates(): Promise<WorkoutTemplate[]> {
    try {
      const db = await this.getDB();
      const templates = await db.getAll('templates');
      return templates.length > 0 ? templates : DEFAULT_TEMPLATES;
    } catch (e) {
      console.error('Error getting templates:', e);
      return DEFAULT_TEMPLATES;
    }
  }

  async saveTemplate(template: WorkoutTemplate): Promise<void> {
    const db = await this.getDB();
    await db.put('templates', template);
  }

  async deleteTemplate(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('templates', id);
  }

  // Body weight
  async getBodyWeightLogs(): Promise<BodyWeightEntry[]> {
    try {
      const db = await this.getDB();
      const logs = await db.getAll('bodyweight');
      return logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (e) {
      console.error('Error fetching body weight logs:', e);
      return [];
    }
  }

  async saveBodyWeight(entry: BodyWeightEntry): Promise<void> {
    const db = await this.getDB();
    await db.put('bodyweight', entry);
  }

  async deleteBodyWeight(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('bodyweight', id);
  }

  // Settings
  async getSettings(): Promise<UserSettings> {
    try {
      const db = await this.getDB();
      const settings = await db.get('settings', 'user_settings');
      return settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS;
    } catch (e) {
      console.error('Error reading settings:', e);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    const db = await this.getDB();
    await db.put('settings', settings, 'user_settings');
  }

  // Backup / Restore
  async exportAllData(): Promise<ExportData> {
    const db = await this.getDB();
    const workouts = await db.getAll('workouts');
    const templates = await db.getAll('templates');
    const bodyWeightLogs = await db.getAll('bodyweight');
    const settings = await this.getSettings();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      workouts,
      templates,
      bodyWeightLogs,
      settings,
    };
  }

  async importAllData(data: ExportData): Promise<void> {
    if (!data || !Array.isArray(data.workouts)) {
      throw new Error('Invalid export data format.');
    }

    const db = await this.getDB();
    const tx = db.transaction(
      ['workouts', 'templates', 'bodyweight', 'settings'],
      'readwrite'
    );

    // Clear existing
    await tx.objectStore('workouts').clear();
    await tx.objectStore('templates').clear();
    await tx.objectStore('bodyweight').clear();

    // Import workouts
    for (const w of data.workouts) {
      await tx.objectStore('workouts').put(w);
    }

    // Import templates
    if (data.templates && Array.isArray(data.templates)) {
      for (const t of data.templates) {
        await tx.objectStore('templates').put(t);
      }
    }

    // Import body weight
    if (data.bodyWeightLogs && Array.isArray(data.bodyWeightLogs)) {
      for (const bw of data.bodyWeightLogs) {
        await tx.objectStore('bodyweight').put(bw);
      }
    }

    // Import settings
    if (data.settings) {
      await tx.objectStore('settings').put(data.settings, 'user_settings');
    }

    await tx.done;
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(
      ['active_workout', 'workouts', 'templates', 'bodyweight', 'settings'],
      'readwrite'
    );
    await tx.objectStore('active_workout').clear();
    await tx.objectStore('workouts').clear();
    await tx.objectStore('templates').clear();
    await tx.objectStore('bodyweight').clear();
    await tx.objectStore('settings').clear();
    await tx.done;

    // Reseed templates
    const seedTx = db.transaction('templates', 'readwrite');
    for (const tmpl of DEFAULT_TEMPLATES) {
      await seedTx.store.put(tmpl);
    }
    await seedTx.done;
  }
}

export const indexedDBStorage = new IndexedDBStorageAdapter();
