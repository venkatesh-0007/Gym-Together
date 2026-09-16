import { Workout, WorkoutSet } from '../types/workout';

export interface ExercisePR {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  workoutId: string;
  oneRepMaxEstimated: number;
}

export interface PRComparison {
  isNewPR: boolean;
  exerciseName: string;
  currentSet: WorkoutSet;
  previousBest?: {
    weight: number;
    reps: number;
    date: string;
  };
  improvementWeight?: number;
}

/**
 * Brzycki formula for estimated 1 Rep Max: weight * (36 / (37 - reps))
 */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps >= 36) return weight * 1.5;
  return Math.round(weight * (36 / (37 - reps)) * 10) / 10;
}

/**
 * Scans all previous completed workouts to find the all-time PR for an exercise.
 * A set is considered PR if its estimated 1RM is strictly higher, or if same weight but more reps.
 */
export function findPreviousBest(
  exerciseName: string,
  allWorkouts: Workout[],
  excludeWorkoutId?: string
): { weight: number; reps: number; e1rm: number; date: string } | null {
  const normalizedTarget = exerciseName.trim().toLowerCase();
  let best: { weight: number; reps: number; e1rm: number; date: string } | null = null;

  for (const w of allWorkouts) {
    if (w.status !== 'completed' || w.id === excludeWorkoutId) continue;
    for (const ex of w.exercises || []) {
      if (ex.name.trim().toLowerCase() === normalizedTarget) {
        for (const s of ex.sets || []) {
          if (!s.completed || s.weight <= 0 || s.reps <= 0) continue;
          const e1rm = estimate1RM(s.weight, s.reps);
          if (!best || e1rm > best.e1rm) {
            best = {
              weight: s.weight,
              reps: s.reps,
              e1rm,
              date: w.date,
            };
          }
        }
      }
    }
  }

  return best;
}

/**
 * Checks if a set performed in an active workout constitutes a new PR
 */
export function checkSetIsPR(
  exerciseName: string,
  set: WorkoutSet,
  allWorkouts: Workout[],
  activeWorkoutId: string
): PRComparison {
  if (!set.completed || set.weight <= 0 || set.reps <= 0) {
    return { isNewPR: false, exerciseName, currentSet: set };
  }

  const prevBest = findPreviousBest(exerciseName, allWorkouts, activeWorkoutId);

  if (!prevBest) {
    // First time recorded with valid weight/reps!
    return {
      isNewPR: true,
      exerciseName,
      currentSet: set,
    };
  }

  const currentE1RM = estimate1RM(set.weight, set.reps);

  if (currentE1RM > prevBest.e1rm) {
    const diff = Math.round((set.weight - prevBest.weight) * 10) / 10;
    return {
      isNewPR: true,
      exerciseName,
      currentSet: set,
      previousBest: {
        weight: prevBest.weight,
        reps: prevBest.reps,
        date: prevBest.date,
      },
      improvementWeight: diff > 0 ? diff : undefined,
    };
  }

  return {
    isNewPR: false,
    exerciseName,
    currentSet: set,
    previousBest: {
      weight: prevBest.weight,
      reps: prevBest.reps,
      date: prevBest.date,
    },
  };
}
