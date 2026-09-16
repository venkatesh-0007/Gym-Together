export type WorkoutStatus = 'active' | 'completed' | 'discarded';

export type Mood = 'terrible' | 'neutral' | 'good' | 'strong' | 'beast';

export interface WorkoutSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  weight: number; // in user's chosen unit or stored in kg
  reps: number;
  completed: boolean;
  completedAt?: string;
  isPR?: boolean;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  name: string;
  muscleGroup: string;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  startTime: string; // ISO string
  endTime: string | null; // ISO string or null if active
  status: WorkoutStatus;
  duration: number; // in seconds
  date: string; // YYYY-MM-DD local date
  notes?: string;
  mood?: Mood;
  bodyWeight?: number;
  exercises: WorkoutExercise[];
  templateId?: string;
  templateName?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  muscleGroups: string[];
  exercises: {
    name: string;
    muscleGroup: string;
    defaultSets: number;
  }[];
}

export interface BodyWeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number;
  unit: 'kg' | 'lb';
  notes?: string;
}

export interface UserSettings {
  weeklyGoal: number; // e.g. 3, 4, 5
  weightUnit: 'kg' | 'lb';
  timeFormat: '12h' | '24h';
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  restTimerDefaultSeconds: number;
}

export interface ExportData {
  version: number;
  exportedAt: string;
  workouts: Workout[];
  templates: WorkoutTemplate[];
  bodyWeightLogs: BodyWeightEntry[];
  settings: UserSettings;
}

export const DEFAULT_SETTINGS: UserSettings = {
  weeklyGoal: 4,
  weightUnit: 'kg',
  timeFormat: '12h',
  theme: 'dark',
  soundEnabled: true,
  restTimerDefaultSeconds: 90,
};
