import { LeaderboardUser } from '../types/duo';
import { UserProfile, DEFAULT_PROFILES } from '../types/account';
import { Workout } from '../types/workout';
import { calculateStreak } from '../calculations/streak';
import { calculateWeeklyStats } from '../calculations/stats';
import { estimate1RM } from '../calculations/pr';

/**
 * Calculates volume (weight * reps in kg) for a workout
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
 * Generates dynamic rankings among all profiles and buddies
 */
export function generateLeaderboard(
  activeUser: UserProfile,
  allProfiles: UserProfile[],
  userWorkouts: Workout[]
): LeaderboardUser[] {
  // Pre-seed buddy baseline stats for realistic competition
  const buddyBaselines: Record<
    string,
    {
      weeklyWorkouts: number;
      streakDays: number;
      totalVolumeKg: number;
      bestBenchKg: number;
      bestSquatKg: number;
      bestDeadliftKg: number;
    }
  > = {
    user_alex_1: {
      weeklyWorkouts: 4,
      streakDays: 6,
      totalVolumeKg: 18450,
      bestBenchKg: 95,
      bestSquatKg: 130,
      bestDeadliftKg: 165,
    },
    user_sam_2: {
      weeklyWorkouts: 5,
      streakDays: 9,
      totalVolumeKg: 24200,
      bestBenchKg: 85,
      bestSquatKg: 155,
      bestDeadliftKg: 180,
    },
    user_jordan_3: {
      weeklyWorkouts: 3,
      streakDays: 4,
      totalVolumeKg: 14800,
      bestBenchKg: 110,
      bestSquatKg: 140,
      bestDeadliftKg: 205,
    },
  };

  // Calculate current user's actual stats from their stored workouts
  const streak = calculateStreak(userWorkouts);
  const weekly = calculateWeeklyStats(userWorkouts);

  let userVolume = 0;
  let userBestBench = 0;
  let userBestSquat = 0;
  let userBestDeadlift = 0;

  userWorkouts.forEach((w) => {
    userVolume += calculateWorkoutVolume(w);
    (w.exercises || []).forEach((ex) => {
      const name = ex.name.toLowerCase();
      (ex.sets || []).forEach((s) => {
        if (s.completed && s.weight > 0) {
          if (name.includes('bench')) {
            userBestBench = Math.max(userBestBench, s.weight);
          } else if (name.includes('squat')) {
            userBestSquat = Math.max(userBestSquat, s.weight);
          } else if (name.includes('deadlift')) {
            userBestDeadlift = Math.max(userBestDeadlift, s.weight);
          }
        }
      });
    });
  });

  const mergedProfiles = [...allProfiles];
  // Ensure default buddies exist for realistic leaderboard competition
  DEFAULT_PROFILES.forEach((dp) => {
    if (!mergedProfiles.find((p) => p.id === dp.id)) {
      mergedProfiles.push(dp);
    }
  });

  const list: LeaderboardUser[] = mergedProfiles.map((profile) => {
    const isCurrent = profile.id === activeUser.id;

    if (isCurrent) {
      return {
        userId: profile.id,
        name: profile.name,
        username: profile.username,
        avatar: profile.avatar,
        levelTitle: profile.levelTitle,
        weeklyWorkouts: weekly.workoutCount,
        streakDays: streak.currentStreak,
        totalVolumeKg: userVolume,
        bestBenchKg: userBestBench,
        bestSquatKg: userBestSquat,
        bestDeadliftKg: userBestDeadlift,
        rank: 1,
        isCurrentUser: true,
      };
    }

    const baseline = buddyBaselines[profile.id] || {
      weeklyWorkouts: 3,
      streakDays: 3,
      totalVolumeKg: 12000,
      bestBenchKg: 70,
      bestSquatKg: 100,
      bestDeadliftKg: 120,
    };

    return {
      userId: profile.id,
      name: profile.name,
      username: profile.username,
      avatar: profile.avatar,
      levelTitle: profile.levelTitle,
      weeklyWorkouts: baseline.weeklyWorkouts,
      streakDays: baseline.streakDays,
      totalVolumeKg: baseline.totalVolumeKg,
      bestBenchKg: baseline.bestBenchKg,
      bestSquatKg: baseline.bestSquatKg,
      bestDeadliftKg: baseline.bestDeadliftKg,
      rank: 1,
      isCurrentUser: false,
    };
  });

  return list;
}

/**
 * Sorts and ranks leaderboard users by category
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
