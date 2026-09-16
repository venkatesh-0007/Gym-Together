import { LeaderboardUser } from '../types/duo';
import { UserProfile } from '../types/account';
import { Workout } from '../types/workout';
import { calculateStreak } from '../calculations/streak';
import { calculateWeeklyStats } from '../calculations/stats';

/**
 * Calculates genuine volume (weight * reps in kg/lb) for a workout
 */
export function calculateWorkoutVolume(workout: Workout): number {
  if (!workout.exercises) return 0;
  let volume = 0;
  for (const ex of workout.exercises) {
    for (const set of ex.sets || []) {
      if (set.completed && set.weight > 0 && set.reps > 0) {
        volume += set.weight * set.reps;
      }
    }
  }
  return volume;
}

/**
 * Generates dynamic rankings strictly from real workouts and real active profiles.
 * Zero hardcoded or showcase data — only authentic metrics generated while using the app.
 */
export function generateLeaderboard(
  activeUser: UserProfile,
  allProfiles: UserProfile[],
  allWorkouts: Workout[]
): LeaderboardUser[] {
  const completed = allWorkouts.filter((w) => w.status === 'completed');

  return allProfiles.map((profile) => {
    const isCurrent = profile.id === activeUser.id;

    // Attribute workouts to this profile (legacy workouts without userId belong to the first/active user)
    const profileWorkouts = completed.filter(
      (w) => w.userId === profile.id || (!w.userId && profile.id === activeUser.id)
    );

    const streak = calculateStreak(profileWorkouts);
    const weekly = calculateWeeklyStats(profileWorkouts, profile.weeklyGoal || 4);

    let totalVolume = 0;
    let bestBench = 0;
    let bestSquat = 0;
    let bestDeadlift = 0;

    profileWorkouts.forEach((w) => {
      totalVolume += calculateWorkoutVolume(w);
      (w.exercises || []).forEach((ex) => {
        const name = ex.name.toLowerCase();
        (ex.sets || []).forEach((s) => {
          if (s.completed && s.weight > 0) {
            if (name.includes('bench')) {
              bestBench = Math.max(bestBench, s.weight);
            } else if (name.includes('squat')) {
              bestSquat = Math.max(bestSquat, s.weight);
            } else if (name.includes('deadlift')) {
              bestDeadlift = Math.max(bestDeadlift, s.weight);
            }
          }
        });
      });
    });

    return {
      userId: profile.id,
      name: profile.name,
      username: profile.username,
      avatar: profile.avatar,
      levelTitle: profile.levelTitle,
      weeklyWorkouts: weekly.workoutCount,
      streakDays: streak.currentStreak,
      totalVolumeKg: totalVolume,
      bestBenchKg: bestBench,
      bestSquatKg: bestSquat,
      bestDeadliftKg: bestDeadlift,
      rank: 1,
      isCurrentUser: isCurrent,
    };
  });
}

/**
 * Sorts and ranks leaderboard users by category with genuine metrics
 */
export function rankLeaderboard(
  users: LeaderboardUser[],
  category: 'weekly' | 'streak' | 'volume' | 'bench' | 'squat' | 'deadlift'
): LeaderboardUser[] {
  const sorted = [...users].sort((a, b) => {
    switch (category) {
      case 'weekly':
        return b.weeklyWorkouts - a.weeklyWorkouts || b.totalVolumeKg - a.totalVolumeKg;
      case 'streak':
        return b.streakDays - a.streakDays || b.weeklyWorkouts - a.weeklyWorkouts;
      case 'volume':
        return b.totalVolumeKg - a.totalVolumeKg;
      case 'bench':
        return b.bestBenchKg - a.bestBenchKg;
      case 'squat':
        return b.bestSquatKg - a.bestSquatKg;
      case 'deadlift':
        return b.bestDeadliftKg - a.bestDeadliftKg;
      default:
        return 0;
    }
  });

  return sorted.map((u, idx) => ({
    ...u,
    rank: idx + 1,
  }));
}
