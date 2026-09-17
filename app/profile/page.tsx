'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Copy,
  Check,
  Edit2,
  Users,
  Flame,
  Dumbbell,
  Clock,
  Trophy,
  Database,
  Settings,
  ShieldCheck,
  LogIn,
  LogOut,
  Mail,
} from 'lucide-react';
import { useAccount } from '@/lib/context/AccountContext';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { calculateStreak } from '@/lib/calculations/streak';
import { formatDurationHuman } from '@/lib/calculations/duration';
import { triggerHaptic } from '@/lib/utils/haptics';

export default function ProfilePage() {
  const {
    activeProfile,
    currentUser,
    isAuthenticated,
    logout,
    updateProfile,
  } = useAccount();

  const { allWorkouts, settings } = useWorkout();

  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Edit fields
  const [nameInput, setNameInput] = useState(activeProfile.name);
  const [usernameInput, setUsernameInput] = useState(activeProfile.username);
  const [bioInput, setBioInput] = useState(activeProfile.bio);

  // Stats calculation strictly from authentic user workouts
  const userWorkouts = allWorkouts.filter(
    (w) => w.status === 'completed' && w.userId === activeProfile.id
  );
  const totalSecs = userWorkouts.reduce((acc, w) => acc + (w.duration || 0), 0);
  const streak = calculateStreak(userWorkouts);

  // Highest lift weights
  let maxBench = 0;
  let maxSquat = 0;
  let maxDeadlift = 0;

  userWorkouts.forEach((w) => {
    (w.exercises || []).forEach((ex) => {
      const name = ex.name.toLowerCase();
      (ex.sets || []).forEach((s) => {
        if (s.completed && s.weight > 0) {
          if (name.includes('bench')) maxBench = Math.max(maxBench, s.weight);
          else if (name.includes('squat')) maxSquat = Math.max(maxSquat, s.weight);
          else if (name.includes('deadlift')) maxDeadlift = Math.max(maxDeadlift, s.weight);
        }
      });
    });
  });

  const handleCopyBuddyCode = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(activeProfile.buddyCode);
      setCopiedCode(true);
      triggerHaptic('light');
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleSaveProfile = () => {
    updateProfile({
      name: nameInput.trim() || activeProfile.name,
      username: usernameInput.trim() || activeProfile.username,
      bio: bioInput.trim(),
    });
    setIsEditOpen(false);
  };

  const userInitials = activeProfile.name ? activeProfile.name.substring(0, 2).toUpperCase() : 'US';

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6 gap-6 animate-page-enter">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Profile
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your personal identity and account settings
          </p>
        </div>

        <Link
          href="/settings"
          className="p-2.5 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl transition-all hover:border-zinc-700 active:scale-95 shadow-sm"
          title="App Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* Structured Responsive Grid: 1 col on mobile, 2 cols on tablet/desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: HERO PROFILE & RECORDS */}
        <div className="flex flex-col gap-6">
          {/* HERO PROFILE CARD */}
          <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden transition-all hover:border-zinc-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xl font-bold text-zinc-300">
                  {userInitials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {activeProfile.name}
                    </h2>
                    <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-semibold rounded-md">
                      {activeProfile.levelTitle}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {activeProfile.username}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setNameInput(activeProfile.name);
                  setUsernameInput(activeProfile.username);
                  setBioInput(activeProfile.bio);
                  setIsEditOpen(true);
                }}
                className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 rounded-lg border border-zinc-700/50 transition-all hover:bg-zinc-800 active:scale-95"
                title="Edit profile"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            {activeProfile.bio ? (
               <p className="text-sm text-zinc-300 leading-relaxed">
                 {activeProfile.bio}
               </p>
            ) : (
               <p className="text-sm text-zinc-500 italic">No bio set. Tap edit to add your fitness goals.</p>
            )}

            {/* GYM BUDDY CODE */}
            <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-xl mt-2">
              <div>
                <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">
                  Partner Code
                </span>
                <p className="text-sm font-mono text-zinc-200 mt-0.5">
                  {activeProfile.buddyCode}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyBuddyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-all active:scale-95"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* LIFTER STATS SUMMARY */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5 hover:border-zinc-700 transition-all">
            <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
              Career Statistics
            </span>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4">
                <Dumbbell className="w-4 h-4 text-zinc-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{userWorkouts.length}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Workouts</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4">
                <Clock className="w-4 h-4 text-zinc-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">
                  {formatDurationHuman(totalSecs)}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">Time</p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4">
                <Flame className="w-4 h-4 text-zinc-400 mx-auto mb-2" />
                <p className="text-lg font-bold text-white">{streak.currentStreak}d</p>
                <p className="text-[10px] text-zinc-500 mt-1">Streak</p>
              </div>
            </div>

            {/* Big 3 PRs */}
            <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800/80">
              <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                Personal Records
              </span>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3">
                  <span className="text-[10px] text-zinc-500">Bench</span>
                  <p className="text-sm font-semibold text-zinc-200 mt-1">
                    {maxBench > 0 ? `${maxBench} ${settings.weightUnit}` : '--'}
                  </p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3">
                  <span className="text-[10px] text-zinc-500">Squat</span>
                  <p className="text-sm font-semibold text-zinc-200 mt-1">
                    {maxSquat > 0 ? `${maxSquat} ${settings.weightUnit}` : '--'}
                  </p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-3">
                  <span className="text-[10px] text-zinc-500">Deadlift</span>
                  <p className="text-sm font-semibold text-zinc-200 mt-1">
                    {maxDeadlift > 0 ? `${maxDeadlift} ${settings.weightUnit}` : '--'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: ACCOUNT AUTHENTICATION */}
        <div className="flex flex-col gap-6">
          {/* AUTHENTICATION & ACCOUNT STATUS */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-zinc-400" />
                <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
                  Account Status
                </span>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium ${
                  isAuthenticated
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {isAuthenticated ? 'Authenticated' : 'Guest Mode'}
              </span>
            </div>

            {isAuthenticated ? (
              <div className="flex flex-col gap-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Email</span>
                    <span className="text-zinc-300 font-mono">{currentUser?.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-medium">Data Sync</span>
                    <span className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-2xl bg-emerald-400" />
                      Active
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {showLogoutConfirm ? (
                    <div className="bg-zinc-950 border border-rose-900/50 rounded-xl p-4 flex flex-col gap-3">
                      <p className="text-xs text-rose-200 text-center">Are you sure you want to sign out?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowLogoutConfirm(false)}
                          className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                             setShowLogoutConfirm(false);
                             logout();
                          }}
                          className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg transition-all"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  You are currently using the app in local guest mode. Sign in to sync your workouts, track PRs, and connect with partners.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    className="py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/signup"
                    className="py-2.5 bg-white hover:bg-zinc-200 text-black active:scale-95 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Create Account</span>
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
            <h3 className="text-lg font-semibold text-white">
              Edit Profile
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 font-mono transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">Bio</label>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                rows={3}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 resize-none transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="flex-1 py-2.5 bg-white hover:bg-zinc-200 text-black text-sm font-semibold rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
