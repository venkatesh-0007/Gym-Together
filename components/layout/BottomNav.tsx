'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users2, Trophy, History, User, Play } from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { formatElapsed } from '@/lib/calculations/duration';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';
import { triggerHaptic } from '@/lib/utils/haptics';

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
            className="flex items-center justify-between px-4 py-3 bg-[var(--card)]/95 border border-accent rounded-2xl shadow-lg shadow-accent backdrop-blur-md active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
              </span>
              <div>
                <p className="text-xs font-semibold text-accent uppercase tracking-wider">
                  Active Workout
                </p>
                <p className="text-sm font-bold text-[var(--foreground)] font-mono">
                  {formatElapsed(elapsedSeconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-xl font-semibold text-xs shadow">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume</span>
            </div>
          </Link>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav
        aria-label="Main Navigation"
        className="w-full max-w-md glass-panel border-t border-[var(--card-border)]/50 px-2 pb-safe pt-2 pointer-events-auto shadow-[0_-10px_40px_rgba(0,0,0,0.3)] rounded-t-[32px] overflow-hidden"
      >
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => triggerHaptic('light')}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl select-none',
                  item.isActive
                    ? 'text-accent'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)] transition-colors'
                )}
              >
                <div className="relative z-10 flex flex-col items-center">
                  <Icon className={cn('w-6 h-6 transition-transform duration-300', item.isActive && 'scale-110 stroke-[2.5]')} />
                  <span
                    className={cn(
                      'text-[10px] font-medium mt-1 tracking-tight transition-all duration-300',
                      item.isActive ? 'font-bold text-accent' : 'text-[var(--muted)]'
                    )}
                  >
                    {item.label}
                  </span>
                </div>
                {item.isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 bg-accent/10 rounded-2xl"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
