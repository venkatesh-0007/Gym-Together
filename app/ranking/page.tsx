'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  Dumbbell,
  Calendar,
  Sparkles,
  Users,
  Plus,
} from 'lucide-react';
import { useAccount } from '@/lib/context/AccountContext';
import { useWorkout } from '@/lib/context/WorkoutContext';
import {
  generateLeaderboard,
  rankLeaderboard,
} from '@/lib/realtime/leaderboardSync';
import { LeaderboardUser } from '@/lib/types/duo';

type CategoryKey = 'weekly' | 'streak' | 'volume' | 'bench' | 'squat' | 'deadlift';

interface CategoryOption {
  key: CategoryKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'weekly', label: 'Workouts', icon: Calendar },
  { key: 'streak', label: 'Streaks', icon: Flame },
  { key: 'volume', label: 'Volume', icon: Dumbbell },
  { key: 'bench', label: 'Bench', icon: Trophy },
  { key: 'squat', label: 'Squat', icon: Trophy },
  { key: 'deadlift', label: 'Deadlift', icon: Trophy },
];

export default function RankingPage() {
  const { activeProfile, allProfiles } = useAccount();
  const { allWorkouts, settings } = useWorkout();

  const [activeCategory, setActiveCategory] = useState<CategoryKey>('weekly');

  const baseLeaderboard = generateLeaderboard(activeProfile, allProfiles, allWorkouts);
  const rankedUsers = rankLeaderboard(baseLeaderboard, activeCategory);

  const topOne = rankedUsers[0];
  const topTwo = rankedUsers[1];
  const topThree = rankedUsers[2];

  // Helper for formatting the primary stat per category strictly from real recorded data
  const formatScore = (user: LeaderboardUser, cat: CategoryKey) => {
    switch (cat) {
      case 'weekly':
        return `${user.weeklyWorkouts} session${user.weeklyWorkouts === 1 ? '' : 's'}`;
      case 'streak':
        return `${user.streakDays} day${user.streakDays === 1 ? '' : 's'}`;
      case 'volume':
        return user.totalVolumeKg > 0
          ? `${user.totalVolumeKg.toLocaleString()} ${settings.weightUnit}`
          : `0 ${settings.weightUnit}`;
      case 'bench':
        return user.bestBenchKg > 0 ? `${user.bestBenchKg} ${settings.weightUnit}` : '--';
      case 'squat':
        return user.bestSquatKg > 0 ? `${user.bestSquatKg} ${settings.weightUnit}` : '--';
      case 'deadlift':
        return user.bestDeadliftKg > 0 ? `${user.bestDeadliftKg} ${settings.weightUnit}` : '--';
    }
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-5 gap-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-4 h-4" />
          <span>Gym Leaderboards</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
          Community Rankings
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Real-time performance rankings generated from your authentic gym workouts
        </p>
      </div>

      {/* CATEGORY TABS (SCROLLABLE) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                isSelected
                  ? 'bg-emerald-500 text-emerald-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* PODIUM DISPLAY */}
      {rankedUsers.length >= 2 ? (
        <div className="pt-2">
          <div className="grid grid-cols-3 gap-2 items-end">
            {/* 2nd Place */}
            {topTwo && (
              <div className="bg-zinc-900/60 border border-slate-700/60 rounded-3xl p-3 flex flex-col items-center text-center pb-4 relative">
                <span className="w-6 h-6 rounded-full bg-slate-400 text-slate-950 font-black text-xs flex items-center justify-center -mt-6 mb-1 shadow">
                  2
                </span>
                <span className="text-2xl mb-1">{topTwo.avatar}</span>
                <p className="text-xs font-extrabold text-white truncate max-w-full">
                  {topTwo.name}
                </p>
                <p className="text-[11px] font-black font-mono text-slate-300 mt-1">
                  {formatScore(topTwo, activeCategory)}
                </p>
                {topTwo.isCurrentUser && (
                  <span className="mt-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>
            )}

            {/* 1st Place */}
            {topOne && (
              <div className="bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-900 border-2 border-amber-400/80 rounded-3xl p-3.5 flex flex-col items-center text-center pb-5 relative -mt-3 shadow-xl shadow-amber-950/30">
                <span className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center -mt-7 mb-1 shadow-lg shadow-amber-500/40">
                  1
                </span>
                <span className="text-3xl mb-1">{topOne.avatar}</span>
                <p className="text-xs font-black text-white truncate max-w-full">
                  {topOne.name}
                </p>
                <p className="text-xs font-black font-mono text-amber-400 mt-1">
                  {formatScore(topOne, activeCategory)}
                </p>
                {topOne.isCurrentUser && (
                  <span className="mt-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full">
                    You 👑
                  </span>
                )}
              </div>
            )}

            {/* 3rd Place */}
            {topThree ? (
              <div className="bg-zinc-900/60 border border-amber-800/50 rounded-3xl p-3 flex flex-col items-center text-center pb-4 relative">
                <span className="w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-black text-xs flex items-center justify-center -mt-6 mb-1 shadow">
                  3
                </span>
                <span className="text-2xl mb-1">{topThree.avatar}</span>
                <p className="text-xs font-extrabold text-white truncate max-w-full">
                  {topThree.name}
                </p>
                <p className="text-[11px] font-black font-mono text-amber-500 mt-1">
                  {formatScore(topThree, activeCategory)}
                </p>
                {topThree.isCurrentUser && (
                  <span className="mt-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-full">
                    You
                  </span>
                )}
              </div>
            ) : (
              <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-3xl p-3 flex flex-col items-center justify-center text-center h-28">
                <span className="text-[10px] text-zinc-600">Spot Open</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Single Lifter Overview Card */
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-5 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
            {activeProfile.avatar}
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-sm font-black text-white">{activeProfile.name}</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full">
                Rank #1
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-emerald-400 mt-1">
              Current: {formatScore(topOne, activeCategory)}
            </p>
          </div>

          <div className="w-full pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>Invite a partner with your Buddy Code ({activeProfile.buddyCode}) to compete!</span>
            <Link
              href="/profile"
              className="text-emerald-400 font-semibold hover:underline flex items-center gap-1 whitespace-nowrap ml-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Person</span>
            </Link>
          </div>
        </div>
      )}

      {/* FULL LEADERBOARD LIST */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
            Active Lifter Standings ({rankedUsers.length})
          </span>
          <Link
            href="/profile"
            className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <Users className="w-3 h-3" />
            <span>Manage Profiles</span>
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {rankedUsers.map((user) => (
            <div
              key={user.userId}
              className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                user.isCurrentUser
                  ? 'bg-emerald-950/30 border-emerald-500/60 shadow-md'
                  : 'bg-zinc-900/70 border-zinc-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-black font-mono text-xs ${
                    user.rank === 1
                      ? 'bg-amber-400 text-amber-950'
                      : user.rank === 2
                      ? 'bg-slate-300 text-slate-900'
                      : user.rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {user.rank}
                </div>

                <span className="text-xl">{user.avatar}</span>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-white">{user.name}</h4>
                    {user.isCurrentUser && (
                      <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400">{user.levelTitle}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-black font-mono text-emerald-400">
                  {formatScore(user, activeCategory)}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {activeCategory === 'weekly' && `${user.streakDays}d streak`}
                  {activeCategory === 'streak' && `${user.weeklyWorkouts} this week`}
                  {activeCategory === 'volume' && `${user.weeklyWorkouts} workouts`}
                  {['bench', 'squat', 'deadlift'].includes(activeCategory) && 'Personal Best'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
