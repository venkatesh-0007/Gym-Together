import {
  Workout,
  WorkoutTemplate,
  BodyWeightEntry,
  UserSettings,
  ExportData,
} from '../types/workout';

export interface StorageAdapter {
  // Active workout
  getActiveWorkout(userId?: string): Promise<Workout | null>;
  saveActiveWorkout(workout: Workout): Promise<void>;
  clearActiveWorkout(): Promise<void>;

  // Completed Workouts
  getWorkouts(userId?: string): Promise<Workout[]>;
  getWorkoutById(id: string): Promise<Workout | null>;
  saveWorkout(workout: Workout): Promise<void>;
  updateWorkout(workout: Workout): Promise<void>;
  deleteWorkout(id: string): Promise<void>;

  // Workout Templates
  getTemplates(userId?: string): Promise<WorkoutTemplate[]>;
  saveTemplate(template: WorkoutTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;

  // Body weight tracking
  getBodyWeightLogs(): Promise<BodyWeightEntry[]>;
  saveBodyWeight(entry: BodyWeightEntry): Promise<void>;
  deleteBodyWeight(id: string): Promise<void>;

  // Settings
  getSettings(): Promise<UserSettings>;
  saveSettings(settings: UserSettings): Promise<void>;

  // Backup / Restore / Reset
  exportAllData(): Promise<ExportData>;
  importAllData(data: ExportData): Promise<void>;
  clearAllData(): Promise<void>;
}
