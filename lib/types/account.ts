export interface UserProfile {
  id: string;
  name: string;
  username: string; // e.g. @lifter
  email?: string;
  avatar: string; // emoji or avatar key
  bio: string;
  buddyCode: string; // e.g. GYM-7492
  levelTitle: string; // e.g. "Gym Novice", "Iron Starter"
  weeklyGoal: number;
  createdAt: string;
  authProvider?: 'local' | 'firebase' | 'supabase';
  isGuest?: boolean;
}

export const PRESET_AVATARS = [
  '⚡', '🔥', '🦁', '🐺', '🦍', '🦾', '🏆', '🥋', '🏋️‍♂️', '🏋️‍♀️', '🥊', '🎯'
];

export const LEVEL_TIERS = [
  { minWorkouts: 0, title: 'Gym Novice' },
  { minWorkouts: 5, title: 'Iron Starter' },
  { minWorkouts: 15, title: 'Consistent Lifter' },
  { minWorkouts: 30, title: 'Silver Beast' },
  { minWorkouts: 60, title: 'Gold Titan' },
  { minWorkouts: 100, title: 'Legendary Lifter' },
];

export function getLevelTitle(totalWorkouts: number): string {
  let title = 'Gym Novice';
  for (const tier of LEVEL_TIERS) {
    if (totalWorkouts >= tier.minWorkouts) {
      title = tier.title;
    }
  }
  return title;
}

export const DEFAULT_PROFILES: UserProfile[] = [
  {
    id: 'user_main',
    name: 'Lifter',
    username: '@lifter',
    avatar: '⚡',
    bio: '',
    buddyCode: 'GYM-7701',
    levelTitle: 'Gym Novice',
    weeklyGoal: 4,
    createdAt: new Date().toISOString(),
  },
];
