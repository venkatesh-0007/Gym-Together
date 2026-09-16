'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users2,
  Trophy,
  History,
  BarChart3,
  Dumbbell,
  Settings,
  Sparkles,
  Play,
  Flame,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { useAccount } from '@/lib/context/AccountContext';
import { formatElapsed } from '@/lib/calculations/duration';
import { calculateStreak } from '@/lib/calculations/streak';
import { cn } from '@/lib/utils/cn';

export default function DesktopSidebar() {
  const pathname = usePathname();
  const { activeWorkout, elapsedSeconds, allWorkouts } = useWorkout();
  const { activeProfile, currentUser, isAuthenticated, logout } = useAccount();
  const streak = calculateStreak(allWorkouts);

  const navItems = [
    { href: '/', label: 'Home Dashboard', icon: Home, isActive: pathname === '/' },
    { href: '/duo', label: 'Duo Partner Room', icon: Users2, isActive: pathname.startsWith('/duo') },
    { href: '/ranking', label: 'Community Rankings', icon: Trophy, isActive: pathname.startsWith('/ranking') },
    { href: '/history', label: 'Workout History', icon: History, isActive: pathname.startsWith('/history') },
    { href: '/templates', label: 'Routines & Templates', icon: Sparkles, isActive: pathname.startsWith('/templates') },
    { href: '/stats', label: 'Analytics & Trends', icon: BarChart3, isActive: pathname.startsWith('/stats') },
    { href: '/settings', label: 'Preferences & Backup', icon: Settings, isActive: pathname.startsWith('/settings') },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 fixed top-0 bottom-0 left-0 bg-zinc-950/90 border-r border-zinc-900/80 backdrop-blur-xl z-40 p-4 justify-between select-none">
      {/* Brand Header */}
      <div className="flex flex-col gap-5">
        <Link
          href="/"
          className="flex items-center gap-3 px-2 py-1 group active:scale-95 transition-transform"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
            <Dumbbell className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-lg text-white">
              Iron<span className="text-emerald-400">Track</span>
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Gym Companion
            </span>
          </div>
        </Link>

        {/* Live Active Workout Pill (if running) */}
        {activeWorkout && (
          <Link
            href="/active"
            className="flex flex-col gap-2 p-3 bg-gradient-to-br from-emerald-950/90 to-zinc-900 border border-emerald-500/40 rounded-2xl shadow-lg shadow-emerald-950/50 hover:border-emerald-400 transition-all hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Active Session
              </span>
              <span className="px-2 py-0.5 bg-emerald-500 text-emerald-950 rounded-lg text-[10px] font-black flex items-center gap-1">
                <Play className="w-2.5 h-2.5 fill-current" />
                Resume
              </span>
            </div>
            <p className="text-xl font-black font-mono text-white tracking-tight">
              {formatElapsed(elapsedSeconds)}
            </p>
          </Link>
        )}

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all group',
                  item.isActive
                    ? 'bg-zinc-900 text-emerald-400 border border-zinc-800/90 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-transform group-hover:scale-110',
                    item.isActive ? 'text-emerald-400 stroke-[2.5]' : 'text-zinc-400'
                  )}
                />
                <span>{item.label}</span>
                {item.isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Card */}
      <div className="flex flex-col gap-2 pt-3 border-t border-zinc-900">
        {/* Streak badge */}
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border border-zinc-850 rounded-2xl text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Flame
              className={`w-3.5 h-3.5 ${
                streak.currentStreak > 0 ? 'text-amber-500 fill-amber-500' : 'text-zinc-600'
              }`}
            />
            <span>Active Streak</span>
          </span>
          <span className="font-bold font-mono text-amber-400">
            {streak.currentStreak}d
          </span>
        </div>

        {/* Profile Link or Auth Prompt */}
        {isAuthenticated ? (
          <div className="flex items-center justify-between p-2 rounded-2xl bg-zinc-900/50 border border-zinc-850">
            <Link
              href="/profile"
              className="flex items-center gap-2.5 flex-1 min-w-0 group hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-emerald-500/40 flex items-center justify-center text-base shadow flex-shrink-0">
                {activeProfile.avatar}
              </div>
              <div className="truncate flex-1">
                <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                  {activeProfile.name}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">
                  {currentUser?.email || activeProfile.levelTitle}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-850 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Link
              href="/login"
              className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-emerald-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
