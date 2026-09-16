import { Workout } from '../types/workout';
import { getLocalDateString } from './duration';

export interface WeeklyStats {
  workoutCount: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  weeklyGoal: number;
  goalProgressPercent: number;
  workoutsRemaining: number;
}

export interface MonthlyStats {
  workoutCount: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  longestWorkoutSeconds: number;
}

export interface WeeklyChartDataPoint {
  weekLabel: string;
  workoutCount: number;
  totalMinutes: number;
  avgDurationMinutes: number;
}

export interface MonthWorkoutsGroup {
  monthKey: string; // e.g. "2026-09"
  monthTitle: string; // e.g. "September 2026"
  workouts: Workout[];
}

/**
 * Returns the Monday of the current week (or given date)
 */
export function getStartOfWeek(d: Date = new Date()): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0 is Sun, 1 is Mon
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

/**
 * Calculates current week stats
 */
export function calculateWeeklyStats(
  workouts: Workout[],
  weeklyGoal: number = 4
): WeeklyStats {
  const completed = workouts.filter((w) => w.status === 'completed');
  const startOfWeek = getStartOfWeek();
  const startOfWeekStr = getLocalDateString(startOfWeek);

  const thisWeekWorkouts = completed.filter((w) => w.date >= startOfWeekStr);

  const workoutCount = thisWeekWorkouts.length;
  const totalDurationSeconds = thisWeekWorkouts.reduce(
    (acc, w) => acc + (w.duration || 0),
    0
  );
  const averageDurationSeconds =
    workoutCount > 0 ? Math.round(totalDurationSeconds / workoutCount) : 0;

  const goalProgressPercent = Math.min(
    100,
    Math.round((workoutCount / Math.max(1, weeklyGoal)) * 100)
  );
  const workoutsRemaining = Math.max(0, weeklyGoal - workoutCount);

  return {
    workoutCount,
    totalDurationSeconds,
    averageDurationSeconds,
    weeklyGoal,
    goalProgressPercent,
    workoutsRemaining,
  };
}

/**
 * Calculates current month stats
 */
export function calculateMonthlyStats(workouts: Workout[]): MonthlyStats {
  const completed = workouts.filter((w) => w.status === 'completed');
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}`;

  const thisMonthWorkouts = completed.filter(
    (w) => w.date && w.date.startsWith(currentMonthPrefix)
  );

  const workoutCount = thisMonthWorkouts.length;
  const totalDurationSeconds = thisMonthWorkouts.reduce(
    (acc, w) => acc + (w.duration || 0),
    0
  );
  const averageDurationSeconds =
    workoutCount > 0 ? Math.round(totalDurationSeconds / workoutCount) : 0;
  const longestWorkoutSeconds = thisMonthWorkouts.reduce(
    (max, w) => Math.max(max, w.duration || 0),
    0
  );

  return {
    workoutCount,
    totalDurationSeconds,
    averageDurationSeconds,
    longestWorkoutSeconds,
  };
}

/**
 * Groups workouts by Year-Month for clean history display
 */
export function groupWorkoutsByMonth(workouts: Workout[]): MonthWorkoutsGroup[] {
  const groupsMap = new Map<string, Workout[]>();

  for (const w of workouts) {
    if (!w.date) continue;
    const monthKey = w.date.substring(0, 7); // "YYYY-MM"
    if (!groupsMap.has(monthKey)) {
      groupsMap.set(monthKey, []);
    }
    groupsMap.get(monthKey)!.push(w);
  }

  const result: MonthWorkoutsGroup[] = [];
  // Sort months descending
  const sortedMonthKeys = Array.from(groupsMap.keys()).sort().reverse();

  for (const key of sortedMonthKeys) {
    const [year, month] = key.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const monthTitle = date.toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });

    const list = groupsMap.get(key) || [];
    // Sort workouts in month descending by startTime
    list.sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    result.push({
      monthKey: key,
      monthTitle,
      workouts: list,
    });
  }

  return result;
}

/**
 * Generates last N weeks trend data for charts
 */
export function getWeeklyChartData(
  workouts: Workout[],
  weeksBack: number = 8
): WeeklyChartDataPoint[] {
  const completed = workouts.filter((w) => w.status === 'completed');
  const points: WeeklyChartDataPoint[] = [];

  const now = new Date();
  const currentWeekStart = getStartOfWeek(now);

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const startStr = getLocalDateString(weekStart);
    const endStr = getLocalDateString(weekEnd);

    const weekWorkouts = completed.filter(
      (w) => w.date >= startStr && w.date <= endStr
    );

    const count = weekWorkouts.length;
    const totalSecs = weekWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const totalMinutes = Math.round(totalSecs / 60);
    const avgDurationMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;

    const label = `${weekStart.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })}`;

    points.push({
      weekLabel: label,
      workoutCount: count,
      totalMinutes,
      avgDurationMinutes,
    });
  }

  return points;
}
