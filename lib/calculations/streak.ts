import { Workout } from '../types/workout';

export interface StreakInfo {
  currentStreak: number;
  bestStreak: number;
  hasWorkedOutToday: boolean;
  streakStatus: 'active' | 'at_risk' | 'broken';
}

/**
 * Intelligent workout streak calculation.
 * A streak is maintained if consecutive workouts occur with at most 1 rest day in between.
 * (e.g. Workout Monday -> Rest Tuesday -> Workout Wednesday counts as streak of 2).
 * If worked out today, streak is active.
 * If worked out yesterday, streak is active today (waiting for today's session).
 */
export function calculateStreak(workouts: Workout[]): StreakInfo {
  // Only count completed workouts
  const completed = workouts.filter((w) => w.status === 'completed' && w.date);
  if (completed.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      hasWorkedOutToday: false,
      streakStatus: 'broken',
    };
  }

  // Get unique workout dates sorted ascending
  const uniqueDates = Array.from(new Set(completed.map((w) => w.date))).sort();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  const hasWorkedOutToday = uniqueDates.includes(todayStr);

  // Convert date strings to timestamps at midnight
  const dateObjs = uniqueDates.map((dStr) => {
    const [y, m, d] = dStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  // Calculate streaks allowing max 1 rest day gap (<= 2 days diff)
  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (let i = 0; i < dateObjs.length; i++) {
    const currDate = dateObjs[i];
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays <= 2) {
        // Same day or 1 day gap or adjacent
        if (diffDays > 0) {
          tempStreak++;
        }
      } else {
        tempStreak = 1;
      }
    }

    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
    prevDate = currDate;
  }

  // Now determine CURRENT streak relative to today
  const lastWorkoutDate = dateObjs[dateObjs.length - 1];
  const daysSinceLastWorkout = Math.round(
    (today.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let currentStreak = 0;
  let streakStatus: 'active' | 'at_risk' | 'broken' = 'broken';

  if (daysSinceLastWorkout <= 2) {
    // Current streak is alive!
    // Count backwards from end
    currentStreak = 1;
    for (let i = dateObjs.length - 1; i > 0; i--) {
      const curr = dateObjs[i];
      const prev = dateObjs[i - 1];
      const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 2) {
        currentStreak++;
      } else {
        break;
      }
    }

    if (daysSinceLastWorkout === 0) {
      streakStatus = 'active';
    } else if (daysSinceLastWorkout === 1) {
      streakStatus = 'active'; // Can still workout today
    } else if (daysSinceLastWorkout === 2) {
      streakStatus = 'at_risk'; // Today is the last day to maintain streak!
    }
  } else {
    currentStreak = 0;
    streakStatus = 'broken';
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    hasWorkedOutToday,
    streakStatus,
  };
}
