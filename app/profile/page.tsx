'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Copy,
  Check,
  Edit2,
  Users,
  Plus,
  Flame,
  Dumbbell,
  Clock,
  Trophy,
  Database,
  Settings,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAccount } from '@/lib/context/AccountContext';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { PRESET_AVATARS } from '@/lib/types/account';
import { calculateStreak } from '@/lib/calculations/streak';
import { formatDurationHuman } from '@/lib/calculations/duration';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
} from '@/lib/firebase/config';
import { triggerHaptic } from '@/lib/utils/haptics';

export default function ProfilePage() {
  const {
    activeProfile,
    allProfiles,
    switchProfile,
    createProfile,
    updateProfile,
    deleteProfile,
  } = useAccount();

  const { allWorkouts, settings } = useWorkout();

  const [copiedCode, setCopiedCode] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSwitchOpen, setIsSwitchOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFirebaseOpen, setIsFirebaseOpen] = useState(false);

  // Edit fields
  const [nameInput, setNameInput] = useState(activeProfile.name);
  const [usernameInput, setUsernameInput] = useState(activeProfile.username);
  const [avatarInput, setAvatarInput] = useState(activeProfile.avatar);
  const [bioInput, setBioInput] = useState(activeProfile.bio);

  // New profile fields
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newAvatar, setNewAvatar] = useState('⚡');
  const [newBio, setNewBio] = useState('');

  // Firebase config state
  const existingFb = getStoredFirebaseConfig();
  const [fbApiKey, setFbApiKey] = useState(existingFb?.apiKey || '');
  const [fbProjectId, setFbProjectId] = useState(existingFb?.projectId || '');
  const [fbAppId, setFbAppId] = useState(existingFb?.appId || '');

  // Stats calculation strictly from authentic user workouts
  const userWorkouts = allWorkouts.filter(
    (w) =>
      w.status === 'completed' &&
      (w.userId === activeProfile.id || (!w.userId && activeProfile.id === allProfiles[0]?.id))
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
      avatar: avatarInput,
      bio: bioInput.trim(),
    });
    setIsEditOpen(false);
  };

  const handleCreateNewProfile = () => {
    if (!newName.trim()) return;
    createProfile({
      name: newName.trim(),
      username: newUsername.trim() || `@${newName.toLowerCase().replace(/\s+/g, '_')}`,
      avatar: newAvatar,
      bio: newBio.trim(),
      weeklyGoal: 4,
    });
    setNewName('');
    setNewUsername('');
    setNewBio('');
    setIsCreateOpen(false);
    setIsSwitchOpen(false);
  };

  const handleSaveFirebase = () => {
    if (fbApiKey.trim() && fbProjectId.trim()) {
      saveStoredFirebaseConfig({
        apiKey: fbApiKey.trim(),
        projectId: fbProjectId.trim(),
        appId: fbAppId.trim() || '1:12345:web:irontrack',
      });
    } else {
      saveStoredFirebaseConfig(null);
    }
    setIsFirebaseOpen(false);
    triggerHaptic('success');
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-5 gap-6 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Account & Profile
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your personal lifter profile & collaboration
          </p>
        </div>

        <Link
          href="/settings"
          className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl transition-colors active:scale-95"
          title="App Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* HERO PROFILE CARD */}
      <div className="w-full bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 border-2 border-emerald-500/50 flex items-center justify-center text-3xl shadow-lg shadow-emerald-950/40">
              {activeProfile.avatar}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-black text-white tracking-tight">
                  {activeProfile.name}
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full">
                  {activeProfile.levelTitle}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {activeProfile.username}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setNameInput(activeProfile.name);
              setUsernameInput(activeProfile.username);
              setAvatarInput(activeProfile.avatar);
              setBioInput(activeProfile.bio);
              setIsEditOpen(true);
            }}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800/80 rounded-xl border border-zinc-700/60 transition-colors active:scale-95"
            title="Edit profile"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeProfile.bio && (
          <p className="text-xs text-zinc-300 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/60">
            {activeProfile.bio}
          </p>
        )}

        {/* GYM BUDDY CODE */}
        <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800/80 px-3.5 py-2.5 rounded-2xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
              Gym Buddy Code
            </span>
            <p className="text-sm font-black font-mono text-emerald-400 tracking-wider">
              {activeProfile.buddyCode}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyBuddyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold rounded-xl transition-all active:scale-95"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Share Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MULTI-PERSON PROFILE SWITCHER */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
            Switch Lifter Profile ({allProfiles.length})
          </span>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Person</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {allProfiles.map((p) => {
            const isCurrent = p.id === activeProfile.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => switchProfile(p.id)}
                className={`p-3 rounded-2xl border text-left transition-all active:scale-95 flex items-center gap-2.5 ${
                  isCurrent
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm'
                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <span className="text-2xl">{p.avatar}</span>
                <div className="truncate">
                  <p className="text-xs font-bold truncate">{p.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{p.levelTitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* LIFTER STATS SUMMARY */}
      <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
        <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
          Career Records
        </span>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-zinc-950/70 border border-zinc-800/70 rounded-2xl p-3">
            <Dumbbell className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-black text-white">{userWorkouts.length}</p>
            <p className="text-[10px] text-zinc-500">Workouts</p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/70 rounded-2xl p-3">
            <Clock className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-black text-white">
              {formatDurationHuman(totalSecs)}
            </p>
            <p className="text-[10px] text-zinc-500">Gym Time</p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/70 rounded-2xl p-3">
            <Flame className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-black text-white">{streak.currentStreak}d</p>
            <p className="text-[10px] text-zinc-500">Streak</p>
          </div>
        </div>

        {/* Big 3 PRs */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800/60">
          <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Personal PRs (Heavy Lifts)
          </span>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-2">
              <span className="text-[10px] text-zinc-500">Bench</span>
              <p className="text-sm font-bold text-emerald-400">
                {maxBench > 0 ? `${maxBench} ${settings.weightUnit}` : '--'}
              </p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-2">
              <span className="text-[10px] text-zinc-500">Squat</span>
              <p className="text-sm font-bold text-emerald-400">
                {maxSquat > 0 ? `${maxSquat} ${settings.weightUnit}` : '--'}
              </p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-2">
              <span className="text-[10px] text-zinc-500">Deadlift</span>
              <p className="text-sm font-bold text-emerald-400">
                {maxDeadlift > 0 ? `${maxDeadlift} ${settings.weightUnit}` : '--'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* REAL-TIME DATABASE STATUS & CLOUD SYNC */}
      <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
              Real-Time Sync Engine
            </span>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              existingFb
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {existingFb ? 'Firebase Connected' : 'Local Peer Mesh (Active)'}
          </span>
        </div>

        <p className="text-xs text-zinc-400">
          {existingFb
            ? 'Connected to Firebase Firestore for cloud real-time duo rooms and live rankings.'
            : 'Zero-config local real-time mesh is active! You can test Duo collab and live rankings across multiple browser tabs or windows immediately.'}
        </p>

        <button
          type="button"
          onClick={() => setIsFirebaseOpen(true)}
          className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] border border-zinc-700 text-zinc-200 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors mt-1"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>{existingFb ? 'Configure Firebase Keys' : 'Connect Firebase Cloud Database'}</span>
        </button>
      </section>

      {/* EDIT PROFILE MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-white text-center">
              Edit Lifter Profile
            </h3>

            {/* Avatar Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Choose Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatarInput(av)}
                    className={`h-10 text-xl rounded-xl border flex items-center justify-center transition-all ${
                      avatarInput === av
                        ? 'bg-emerald-950 border-emerald-500 scale-105'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Username</label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Bio / Goals</label>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                rows={2}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="flex-1 py-2.5 bg-emerald-500 text-emerald-950 text-xs font-bold rounded-xl"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW PERSON MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-white text-center">
              Add New Person / Lifter
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Choose Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setNewAvatar(av)}
                    className={`h-10 text-xl rounded-xl border flex items-center justify-center transition-all ${
                      newAvatar === av
                        ? 'bg-emerald-950 border-emerald-500 scale-105'
                        : 'bg-zinc-950 border-zinc-800'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Maya Chen"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Username</label>
              <input
                type="text"
                placeholder="e.g. @maya_lifts"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Bio</label>
              <textarea
                placeholder="Fitness aspirations..."
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                rows={2}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewProfile}
                disabled={!newName.trim()}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-emerald-950 text-xs font-bold rounded-xl"
              >
                Create Lifter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIREBASE CONFIG MODAL */}
      {isFirebaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-white text-center">
              Firebase Cloud Setup
            </h3>
            <p className="text-xs text-zinc-400">
              Enter your Firebase project keys to enable multi-device cloud sync across the internet.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">API Key</label>
              <input
                type="text"
                placeholder="AIzaSy..."
                value={fbApiKey}
                onChange={(e) => setFbApiKey(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">Project ID</label>
              <input
                type="text"
                placeholder="gym-tracker-12345"
                value={fbProjectId}
                onChange={(e) => setFbProjectId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-400">App ID</label>
              <input
                type="text"
                placeholder="1:123456789:web:abcdef"
                value={fbAppId}
                onChange={(e) => setFbAppId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFirebaseOpen(false)}
                className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFirebase}
                className="flex-1 py-2.5 bg-emerald-500 text-emerald-950 text-xs font-bold rounded-xl"
              >
                Save Keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
