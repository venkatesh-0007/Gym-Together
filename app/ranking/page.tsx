'use client';

import React, { useState, useEffect } from 'react';
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
import { getMyPartners, getLeaderboardWorkouts } from '@/lib/realtime/partnershipSync';
import { LeaderboardUser } from '@/lib/types/duo';
import { UserProfile } from '@/lib/types/account';
import { Workout } from '@/lib/types/workout';

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
  const { activeProfile, isAuthenticated } = useAccount();
  const { settings, allWorkouts: localWorkouts } = useWorkout();

  const [activeCategory, setActiveCategory] = useState<CategoryKey>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [baseLeaderboard, setBaseLeaderboard] = useState<LeaderboardUser[]>([]);

  useEffect(() => {
    async function loadNetworkLeaderboard() {
      if (!isAuthenticated) {
        // Fallback for guests: just rank themselves with local workouts
        setBaseLeaderboard(generateLeaderboard(activeProfile, [activeProfile], localWorkouts));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const partners = await getMyPartners(activeProfile.id);
        const communityProfiles = [activeProfile, ...partners];
        const userIds = communityProfiles.map(p => p.id);
        
        const communityWorkouts = await getLeaderboardWorkouts(userIds);
        
        // Ensure my local workouts are included if not yet synced
        const myLocalWorkouts = localWorkouts.filter(w => !communityWorkouts.find(cw => cw.id === w.id));
        const allNetworkWorkouts = [...communityWorkouts, ...myLocalWorkouts];

        const generated = generateLeaderboard(activeProfile, communityProfiles, allNetworkWorkouts as any);
        setBaseLeaderboard(generated);
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    }

    loadNetworkLeaderboard();
  }, [activeProfile, isAuthenticated, localWorkouts]);

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
        <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
          Community Rankings
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Real-time performance rankings with your persistent Duo partners.
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
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Trophy className="w-8 h-8 text-amber-500/20 animate-bounce" />
          <p className="text-xs font-bold text-zinc-500 tracking-widest uppercase animate-pulse">Syncing Leaderboard...</p>
        </div>
      ) : (
        <>
          {/* PODIUM DISPLAY */}
          {rankedUsers.length >= 2 ? (
            <div className="pt-2">
              <div className="grid grid-cols-3 gap-2 items-end">
                {/* 2nd Place */}
                {topTwo && (
                  <div className="bg-zinc-900/60 border border-slate-700/60 rounded-2xl p-3 flex flex-col items-center text-center pb-4 relative">
                    <span className="w-6 h-6 rounded-2xl bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center -mt-6 mb-1 shadow-sm">
                      2
                    </span>
                    <span className="text-2xl mb-1 text-zinc-400 font-bold">{topTwo.avatar?.substring(0,2).toUpperCase() || 'US'}</span>
                    <p className="text-xs font-extrabold text-white truncate max-w-full">
                      {topTwo.name}
                    </p>
                    <p className="text-[11px] font-bold font-mono text-slate-300 mt-1">
                      {formatScore(topTwo, activeCategory)}
                    </p>
                    {topTwo.isCurrentUser && (
                      <span className="mt-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-2xl">
                        You
                      </span>
                    )}
                  </div>
                )}

                {/* 1st Place */}
                {topOne && (
                  <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-3.5 flex flex-col items-center text-center pb-5 relative -mt-3 shadow-md">
                    <span className="w-7 h-7 rounded-2xl bg-zinc-700 text-white font-bold text-sm flex items-center justify-center -mt-7 mb-1 shadow-sm">
                      1
                    </span>
                    <span className="text-3xl mb-1 text-zinc-300 font-bold">{topOne.avatar?.substring(0,2).toUpperCase() || 'US'}</span>
                    <p className="text-xs font-bold text-white truncate max-w-full">
                      {topOne.name}
                    </p>
                    <p className="text-xs font-bold font-mono text-amber-400 mt-1">
                      {formatScore(topOne, activeCategory)}
                    </p>
                    {topOne.isCurrentUser && (
                      <span className="mt-1 text-[9px] font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-2xl">
                        You
                      </span>
                    )}
                  </div>
                )}

                {/* 3rd Place */}
                {topThree ? (
                  <div className="bg-zinc-900/60 border border-amber-800/50 rounded-2xl p-3 flex flex-col items-center text-center pb-4 relative">
                    <span className="w-6 h-6 rounded-2xl bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold text-xs flex items-center justify-center -mt-6 mb-1 shadow-sm">
                      3
                    </span>
                    <span className="text-2xl mb-1 text-zinc-500 font-bold">{topThree.avatar?.substring(0,2).toUpperCase() || 'US'}</span>
                    <p className="text-xs font-extrabold text-white truncate max-w-full">
                      {topThree.name}
                    </p>
                    <p className="text-[11px] font-bold font-mono text-amber-500 mt-1">
                      {formatScore(topThree, activeCategory)}
                    </p>
                    {topThree.isCurrentUser && (
                      <span className="mt-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded-2xl">
                        You
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="bg-zinc-950/40 border border-dashed border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center h-28">
                    <span className="text-[10px] text-zinc-600">Spot Open</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Single Lifter Overview Card */
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-300">
                {activeProfile.name?.substring(0,2).toUpperCase() || 'US'}
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-sm font-bold text-white">{activeProfile.name}</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-2xl">
                    Rank #1
                  </span>
                </div>
                <p className="text-xs font-mono font-bold text-emerald-400 mt-1">
                  Current: {formatScore(topOne, activeCategory)}
                </p>
              </div>

              <div className="w-full pt-3 border-t border-zinc-800/80 flex flex-col items-center justify-center text-xs text-zinc-400 gap-2">
                <p>Invite a partner to compete on the leaderboards!</p>
                <Link
                  href="/duo"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Partner via Buddy Code</span>
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
                href="/duo"
                className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Users className="w-3 h-3" />
                <span>Manage Partners</span>
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
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold font-mono text-xs ${
                        user.rank === 1
                          ? 'bg-zinc-800 text-zinc-300'
                          : user.rank === 2
                          ? 'bg-zinc-800 text-zinc-400'
                          : user.rank === 3
                          ? 'bg-zinc-800 text-zinc-500'
                          : 'bg-zinc-900 text-zinc-600'
                      }`}
                    >
                      {user.rank}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
                      {user.avatar?.substring(0,2).toUpperCase() || 'US'}
                    </div>

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
                    <p className="text-xs font-bold font-mono text-emerald-400">
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
        </>
      )}
    </div>
  );
}
