'use client';

import React from 'react';
import Link from 'next/link';
import { Dumbbell, Flame } from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { useAccount } from '@/lib/context/AccountContext';
import { calculateStreak } from '@/lib/calculations/streak';

export default function Header() {
  const { allWorkouts } = useWorkout();
  const { activeProfile, isAuthenticated } = useAccount();
  const streak = calculateStreak(allWorkouts);

  return (
    <header className="w-full flex items-center justify-between px-5 pt-safe pt-3 pb-3 bg-[var(--card)]/90 backdrop-blur-md sticky top-0 z-30 border-b border-[var(--card-border)]">
      <Link href="/" className="flex items-center gap-2.5 active:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shadow-md shadow-accent">
          <Dumbbell className="w-4 h-4 text-white stroke-[2.5]" />
        </div>
        <span className="font-bold tracking-tight text-lg text-[var(--foreground)]">
          Satat<span className="text-accent">am</span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {/* Streak Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--card-subtle)] border border-[var(--card-border)] rounded-full text-xs font-semibold">
          <Flame
            className={`w-4 h-4 ${
              streak.currentStreak > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-zinc-500'
            }`}
          />
          <span className={streak.currentStreak > 0 ? 'text-amber-400' : 'text-zinc-400'}>
            {streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>

        {/* User Profile / Auth Link */}
        {isAuthenticated ? (
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-[var(--card-subtle)] border border-accent flex items-center justify-center text-sm shadow hover:border-accent transition-all active:scale-95 ring-2 ring-accent/20"
            title={`Signed in as ${activeProfile.name}`}
          >
            <span>{activeProfile.avatar}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="px-2.5 py-1 bg-accent text-white text-[11px] font-bold rounded-lg shadow-sm shadow-accent active:scale-95 transition-transform"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
