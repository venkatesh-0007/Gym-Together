'use client';

import React from 'react';
import Link from 'next/link';
import { Dumbbell, Flame } from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { useAccount } from '@/lib/context/AccountContext';
import { calculateStreak } from '@/lib/calculations/streak';

export default function Header() {
  const { allWorkouts } = useWorkout();
  const { activeProfile } = useAccount();
  const streak = calculateStreak(allWorkouts);

  return (
    <header className="w-full flex items-center justify-between px-5 pt-safe pt-3 pb-3 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30 border-b border-zinc-900">
      <Link href="/" className="flex items-center gap-2.5 active:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-md shadow-emerald-950/40">
          <Dumbbell className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
        </div>
        <span className="font-bold tracking-tight text-lg text-white">
          Iron<span className="text-emerald-400">Track</span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {/* Streak Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-800/80 rounded-full text-xs font-semibold">
          <Flame
            className={`w-4 h-4 ${
              streak.currentStreak > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-zinc-500'
            }`}
          />
          <span className={streak.currentStreak > 0 ? 'text-amber-400' : 'text-zinc-400'}>
            {streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* User Profile Quick Avatar Button */}
        <Link
          href="/profile"
          className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm shadow hover:border-emerald-500 transition-colors active:scale-95"
          title={`Signed in as ${activeProfile.name}`}
        >
          <span>{activeProfile.avatar}</span>
        </Link>
      </div>
    </header>
  );
}
