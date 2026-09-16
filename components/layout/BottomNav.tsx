'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users2, Trophy, History, User, Play } from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { formatElapsed } from '@/lib/calculations/duration';
import { cn } from '@/lib/utils/cn';

export default function BottomNav() {
  const pathname = usePathname();
  const { activeWorkout, elapsedSeconds } = useWorkout();

  const isActiveScreen = pathname === '/active';

  const navItems = [
    {
      href: '/',
      label: 'Home',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      href: '/duo',
      label: 'Duo',
      icon: Users2,
      isActive: pathname.startsWith('/duo'),
    },
    {
      href: '/ranking',
      label: 'Rankings',
      icon: Trophy,
      isActive: pathname.startsWith('/ranking'),
    },
    {
      href: '/history',
      label: 'History',
      icon: History,
      isActive: pathname.startsWith('/history'),
    },
    {
      href: '/profile',
      label: 'Account',
      icon: User,
      isActive: pathname.startsWith('/profile'),
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none md:hidden">
      {/* Floating active workout banner when navigating away from /active */}
      {activeWorkout && !isActiveScreen && (
        <div className="w-full max-w-md px-4 mb-2 pointer-events-auto animate-in slide-in-from-bottom-2 duration-200">
          <Link
            href="/active"
            className="flex items-center justify-between px-4 py-3 bg-emerald-950/90 border border-emerald-500/40 rounded-2xl shadow-lg shadow-emerald-950/50 backdrop-blur-md active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                  Active Workout
                </p>
                <p className="text-sm font-bold text-white font-mono">
                  {formatElapsed(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-emerald-950 rounded-xl font-semibold text-xs shadow">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </div>
          </Link>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav
        aria-label="Main Navigation"
        className="w-full max-w-md bg-zinc-950/90 border-t border-zinc-800/80 backdrop-blur-lg px-1 pb-safe pt-2 pointer-events-auto"
      >
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition-colors active:scale-95 select-none relative',
                  item.isActive
                    ? 'text-emerald-400'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                <div className="relative">
                  <Icon className={cn('w-5 h-5 transition-transform', item.isActive && 'scale-110 stroke-[2.5]')} />
                  {item.isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-400 rounded-full" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium mt-1 tracking-tight',
                    item.isActive ? 'font-semibold text-emerald-400' : 'text-zinc-400'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
