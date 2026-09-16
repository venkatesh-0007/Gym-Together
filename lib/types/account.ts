export interface UserProfile {
  id: string;
  name: string;
  username: string; // e.g. @alex_fit
  avatar: string; // emoji or avatar key
  bio: string;
  buddyCode: string; // e.g. GYM-7492
  levelTitle: string; // e.g. "Gold Lifter", "Iron Beast"
  weeklyGoal: number;
  createdAt: string;
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
    id: 'user_alex_1',
    name: 'Alex Iron',
    username: '@alex_iron',
    avatar: '🦾',
    bio: 'Chasing 100kg bench press & consistent 5-day week.',
    buddyCode: 'GYM-8821',
    levelTitle: 'Silver Beast',
    weeklyGoal: 4,
    createdAt: '2026-01-10T10:00:00.000Z',
  },
  {
    id: 'user_sam_2',
    name: 'Sam Power',
    username: '@sam_power',
    avatar: '🔥',
    bio: 'Leg day enthusiast & hypertrophy focus.',
    buddyCode: 'GYM-4419',
    levelTitle: 'Consistent Lifter',
    weeklyGoal: 5,
    createdAt: '2026-02-15T12:30:00.000Z',
  },
  {
    id: 'user_jordan_3',
    name: 'Jordan Swift',
    username: '@jordan_swift',
    avatar: '⚡',
    bio: 'Calisthenics & deadlift personal records.',
    buddyCode: 'GYM-3190',
    levelTitle: 'Gold Titan',
    weeklyGoal: 4,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
];
