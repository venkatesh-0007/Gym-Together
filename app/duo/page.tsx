'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users2,
  Plus,
  Play,
  Copy,
  Check,
  Flame,
  ArrowRight,
  StopCircle,
  Sparkles,
  Trophy,
  Dumbbell,
  Clock,
  Radio,
} from 'lucide-react';
import { useAccount } from '@/lib/context/AccountContext';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { DuoRoom, DuoActivityItem, DuoHypeEvent } from '@/lib/types/duo';
import {
  createDuoRoom,
  joinDuoRoom,
  subscribeToDuoRoom,
  logDuoSet,
  sendDuoHype,
  finishDuoRoom,
} from '@/lib/realtime/duoSync';
import { formatElapsed, formatTime } from '@/lib/calculations/duration';
import { triggerHaptic, playSuccessChime, playTimerDing } from '@/lib/utils/haptics';

const HYPE_EMOJIS = [
  { emoji: '🙌', label: 'High-Five' },
  { emoji: '🔥', label: 'Beast' },
  { emoji: '💥', label: 'Max Pump' },
  { emoji: '👏', label: 'Solid Set' },
  { emoji: '🏆', label: 'Champion' },
];

export default function DuoPage() {
  const router = useRouter();
  const { activeProfile } = useAccount();
  const { saveCompletedWorkout, settings } = useWorkout();

  // Duo Lobby State
  const [activeRoom, setActiveRoom] = useState<DuoRoom | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [workoutTitleInput, setWorkoutTitleInput] = useState('Partner Hypertrophy');
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live session elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Quick set logging in Duo session
  const [exerciseName, setExerciseName] = useState('Barbell Bench Press');
  const [weightInput, setWeightInput] = useState('60');
  const [repsInput, setRepsInput] = useState('10');

  // Last hype reaction toast
  const [receivedHype, setReceivedHype] = useState<DuoHypeEvent | null>(null);
  const lastHypeTimeRef = useRef<number>(0);

  // Subscribe to room updates in real time
  useEffect(() => {
    if (!activeRoom) return;

    const unsubscribe = subscribeToDuoRoom(activeRoom.roomCode, (updated) => {
      setActiveRoom(updated);

      // Check if new hype arrived from partner
      if (
        updated.lastHype &&
        updated.lastHype.timestamp > lastHypeTimeRef.current &&
        updated.lastHype.senderId !== activeProfile.id
      ) {
        lastHypeTimeRef.current = updated.lastHype.timestamp;
        setReceivedHype(updated.lastHype);
        triggerHaptic('success');
        playSuccessChime();
        setTimeout(() => setReceivedHype(null), 3000);
      }
    });

    return () => unsubscribe();
  }, [activeRoom?.roomCode, activeProfile.id]);

  // Synced Live Clock
  useEffect(() => {
    if (!activeRoom || !activeRoom.startTime) {
      setElapsedSeconds(0);
      return;
    }

    const calc = () => {
      const startMs = new Date(activeRoom.startTime!).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(diff);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [activeRoom?.startTime]);

  // Create Room
  const handleCreateRoom = async () => {
    try {
      const room = await createDuoRoom(activeProfile, workoutTitleInput.trim());
      setActiveRoom(room);
      triggerHaptic('medium');
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to create duo room');
    }
  };

  // Join Room
  const handleJoinRoom = async () => {
    if (!joinCodeInput.trim()) return;
    try {
      const room = await joinDuoRoom(joinCodeInput.trim(), activeProfile);
      if (!room) {
        setErrorMessage('Duo room not found. Check the 6-digit code.');
        triggerHaptic('warning');
        return;
      }
      setActiveRoom(room);
      setJoinCodeInput('');
      setErrorMessage(null);
      triggerHaptic('success');
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to join duo room');
    }
  };

  // Copy Room Code
  const handleCopyCode = () => {
    if (!activeRoom) return;
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(activeRoom.roomCode);
      setCopiedCode(true);
      triggerHaptic('light');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Log Set to Shared Room
  const handleLogSet = async () => {
    if (!activeRoom) return;
    const w = parseFloat(weightInput) || 0;
    const r = parseInt(repsInput, 10) || 0;
    if (w <= 0 || r <= 0) return;

    // Count previous sets for this exercise
    const count =
      activeRoom.activityLog.filter(
        (a) => a.userId === activeProfile.id && a.exerciseName === exerciseName
      ).length + 1;

    const activityItem: DuoActivityItem = {
      id: `duo_act_${Date.now()}`,
      userId: activeProfile.id,
      userName: activeProfile.name,
      userAvatar: activeProfile.avatar,
      exerciseName,
      setNumber: count,
      weight: w,
      reps: r,
      isPR: w >= 80,
      timestamp: new Date().toISOString(),
    };

    triggerHaptic('medium');
    playTimerDing();
    await logDuoSet(activeRoom.roomCode, activityItem);
  };

  // Send Hype Reaction
  const handleSendHype = async (emoji: string, label: string) => {
    if (!activeRoom) return;
    const hype: DuoHypeEvent = {
      id: `hype_${Date.now()}`,
      senderId: activeProfile.id,
      senderName: activeProfile.name,
      senderAvatar: activeProfile.avatar,
      emoji,
      message: label,
      timestamp: Date.now(),
    };

    triggerHaptic('light');
    await sendDuoHype(activeRoom.roomCode, hype);
  };

  // Finish Duo Workout
  const handleFinishDuo = async () => {
    if (!activeRoom) return;

    // Save as local completed workout for this user
    await finishDuoRoom(activeRoom.roomCode);

    // Group user's duo sets into a Workout format
    const userSets = activeRoom.activityLog.filter((a) => a.userId === activeProfile.id);
    const exerciseMap = new Map<string, typeof userSets>();
    userSets.forEach((s) => {
      if (!exerciseMap.has(s.exerciseName)) {
        exerciseMap.set(s.exerciseName, []);
      }
      exerciseMap.get(s.exerciseName)!.push(s);
    });

    const exercises = Array.from(exerciseMap.entries()).map(([name, sets], idx) => ({
      id: `ex_duo_${idx}`,
      workoutId: '',
      name,
      muscleGroup: 'Duo Collab',
      sets: sets.map((s, sIdx) => ({
        id: s.id,
        exerciseId: `ex_duo_${idx}`,
        setNumber: sIdx + 1,
        weight: s.weight,
        reps: s.reps,
        completed: true,
      })),
    }));

    await saveCompletedWorkout({
      notes: `Duo Workout with ${
        activeRoom.partner?.name || 'Gym Buddy'
      } (Room ${activeRoom.roomCode})`,
      mood: 'beast',
    });

    setActiveRoom(null);
    router.push('/history');
  };

  // ==========================================
  // VIEW: LOBBY (Create / Join Room)
  // ==========================================
  if (!activeRoom) {
    return (
      <div className="flex-1 flex flex-col px-5 py-5 gap-6 animate-in fade-in duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Real-Time Collab
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight mt-1">
            Duo Workout Partner
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Train together in real-time with a gym buddy. Sync your workout timer, alternate sets, and send instant high-fives!
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-950/60 border border-rose-800 rounded-2xl text-xs text-rose-300 font-semibold animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* CREATE ROOM CARD */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Create Duo Session</h3>
              <p className="text-xs text-zinc-400">Generate a live room code for your partner</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400">Workout Focus</label>
            <input
              type="text"
              value={workoutTitleInput}
              onChange={(e) => setWorkoutTitleInput(e.target.value)}
              placeholder="e.g. Chest & Triceps Pump"
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={handleCreateRoom}
            className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 text-base"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Create Session</span>
          </button>
        </div>

        {/* JOIN ROOM CARD */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
          <div>
            <h3 className="font-extrabold text-base text-white">Join Partner&apos;s Room</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Enter the 6-digit code shown on your buddy&apos;s phone
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. PUMP77"
              maxLength={8}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-lg font-black font-mono text-center tracking-widest text-emerald-400 uppercase placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={!joinCodeInput.trim()}
              className="px-6 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white font-bold rounded-2xl text-sm flex items-center gap-1.5 border border-zinc-700"
            >
              <span>Join</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time sync indicator note */}
        <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex items-center gap-3">
          <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div className="text-xs text-zinc-400">
            <strong className="text-zinc-200">Real-Time Sync Ready:</strong> Open two browser tabs or phones to experience live duo workouts side by side!
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: LIVE DUO WORKOUT SESSION
  // ==========================================
  const isHost = activeProfile.id === activeRoom.host.userId;
  const partner = isHost ? activeRoom.partner : activeRoom.host;

  return (
    <div className="flex-1 flex flex-col px-5 py-4 gap-5 animate-in fade-in duration-200 relative">
      {/* REAL-TIME HYPE TOAST POPUP */}
      {receivedHype && (
        <div className="fixed top-20 left-4 right-4 max-w-md mx-auto z-50 animate-in bounce-in duration-300">
          <div className="bg-gradient-to-r from-emerald-950 to-zinc-900 border-2 border-emerald-400 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
            <span className="text-4xl animate-bounce">{receivedHype.emoji}</span>
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {receivedHype.senderName} sent a {receivedHype.message}!
              </p>
              <p className="text-sm font-black text-white">Let&apos;s go! Crush this set! 💪</p>
            </div>
          </div>
        </div>
      )}

      {/* Room Header with Code */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Duo Session
          </span>
          <h2 className="text-base font-black text-white tracking-tight">
            {activeRoom.workoutTitle}
          </h2>
        </div>

        {/* Room Code Badge */}
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-emerald-400 active:scale-95"
          title="Copy room code"
        >
          <span>{activeRoom.roomCode}</span>
          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
        </button>
      </div>

      {/* Synced Live Timer Card */}
      <div className="w-full bg-zinc-900/70 border border-zinc-800 rounded-3xl py-6 px-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
        <span className="text-xs uppercase font-bold tracking-widest text-zinc-400">
          Synced Duo Time
        </span>
        <div className="text-5xl font-black font-mono tracking-tight text-white my-1">
          {formatElapsed(elapsedSeconds)}
        </div>
        <p className="text-xs text-zinc-400">
          {activeRoom.partner ? 'Both lifters connected' : 'Waiting for partner to join...'}
        </p>
      </div>

      {/* DUAL LIFTER STATUS CARDS */}
      <div className="grid grid-cols-2 gap-3">
        {/* You */}
        <div className="bg-zinc-900/80 border border-emerald-500/50 rounded-2xl p-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeProfile.avatar}</span>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{activeProfile.name}</p>
              <span className="text-[10px] text-emerald-400 font-semibold">You</span>
            </div>
          </div>
          <div className="mt-1 pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Sets Done</span>
            <strong className="text-white">
              {activeRoom.activityLog.filter((a) => a.userId === activeProfile.id).length}
            </strong>
          </div>
        </div>

        {/* Partner */}
        <div
          className={`rounded-2xl p-3 flex flex-col gap-1.5 border transition-all ${
            partner
              ? 'bg-zinc-900/80 border-zinc-800'
              : 'bg-zinc-950/40 border-dashed border-zinc-800 text-zinc-500'
          }`}
        >
          {partner ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xl">{partner.avatar}</span>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{partner.name}</p>
                  <span className="text-[10px] text-emerald-400 font-semibold">Partner</span>
                </div>
              </div>
              <div className="mt-1 pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Sets Done</span>
                <strong className="text-white">
                  {activeRoom.activityLog.filter((a) => a.userId === partner.userId).length}
                </strong>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-1">
              <p className="text-xs font-bold text-zinc-400">Share Code</p>
              <p className="text-[11px] font-mono font-bold text-emerald-400">
                {activeRoom.roomCode}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* REAL-TIME HYPE BAR */}
      <div className="bg-zinc-900/60 border border-zinc-800 px-3 py-2.5 rounded-2xl flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
          Cheer:
        </span>
        <div className="flex items-center justify-around flex-1">
          {HYPE_EMOJIS.map((h) => (
            <button
              key={h.emoji}
              type="button"
              onClick={() => handleSendHype(h.emoji, h.label)}
              className="text-2xl hover:scale-125 active:scale-95 transition-transform"
              title={`Send ${h.label}`}
            >
              {h.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* QUICK SET LOGGER FOR DUO SESSION */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
            Log Your Set
          </span>
          <span className="text-[11px] text-zinc-500">Pushes instantly to partner</span>
        </div>

        <input
          type="text"
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          placeholder="Exercise Name"
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase">
              Weight ({settings.weightUnit})
            </label>
            <input
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-1.5 px-3 text-sm font-bold text-white text-center focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase">Reps</label>
            <input
              type="number"
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-1.5 px-3 text-sm font-bold text-white text-center focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogSet}
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-black rounded-2xl flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-500/20 mt-1"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Record Set</span>
        </button>
      </div>

      {/* REAL-TIME ACTIVITY FEED */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
          Live Session Feed ({activeRoom.activityLog.length})
        </span>

        {activeRoom.activityLog.length === 0 ? (
          <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-4 text-center text-xs text-zinc-500">
            No sets logged yet. Hit &apos;Record Set&apos; above!
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {activeRoom.activityLog.map((act) => {
              const isMine = act.userId === activeProfile.id;
              return (
                <div
                  key={act.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                    isMine
                      ? 'bg-emerald-950/20 border-emerald-900/40'
                      : 'bg-zinc-900/70 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{act.userAvatar}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">
                          {isMine ? 'You' : act.userName}
                        </span>
                        <span className="text-zinc-500">· Set {act.setNumber}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{act.exerciseName}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-mono font-black text-sm text-emerald-400">
                      {act.weight} {settings.weightUnit} × {act.reps}
                    </p>
                    <span className="text-[9px] text-zinc-500">
                      {formatTime(act.timestamp, settings.timeFormat)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FINISH WORKOUT BUTTON */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleFinishDuo}
          className="w-full h-14 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 text-base"
        >
          <StopCircle className="w-5 h-5 stroke-[2.5]" />
          <span>FINISH DUO SESSION</span>
        </button>
      </div>
    </div>
  );
}
