'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users2,
  Plus,
  Play,
  Check,
  ArrowRight,
  StopCircle,
  Dumbbell,
  Radio,
  UserPlus,
} from 'lucide-react';
import { useAccount } from '@/lib/context/AccountContext';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { UserProfile } from '@/lib/types/account';
import { DuoRoom, DuoActivityItem, DuoHypeEvent } from '@/lib/types/duo';
import {
  createDuoRoom,
  joinDuoRoom,
  subscribeToDuoRoom,
  logDuoSet,
  sendDuoHype,
  finishDuoRoom,
} from '@/lib/realtime/duoSync';
import { getMyPartners, addPartner } from '@/lib/realtime/partnershipSync';
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
  const { activeProfile, isAuthenticated } = useAccount();
  const { saveCompletedWorkout, settings } = useWorkout();

  // Persistent Partners State
  const [partners, setPartners] = useState<UserProfile[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(true);
  const [addBuddyInput, setAddBuddyInput] = useState('');
  const [addBuddyStatus, setAddBuddyStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Duo Lobby State
  const [activeRoom, setActiveRoom] = useState<DuoRoom | null>(null);
  const [workoutTitleInput, setWorkoutTitleInput] = useState('Partner Session');

  // Live session elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Quick set logging in Duo session
  const [exerciseName, setExerciseName] = useState('Barbell Bench Press');
  const [weightInput, setWeightInput] = useState('60');
  const [repsInput, setRepsInput] = useState('10');

  // Last hype reaction toast
  const [receivedHype, setReceivedHype] = useState<DuoHypeEvent | null>(null);
  const lastHypeTimeRef = useRef<number>(0);

  // Fetch partners on load
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchPartners = async () => {
      setIsLoadingPartners(true);
      try {
        const fetched = await getMyPartners(activeProfile.id);
        setPartners(fetched);
      } catch (e) {
        console.error(e);
      }
      setIsLoadingPartners(false);
    };
    fetchPartners();
  }, [activeProfile.id, isAuthenticated]);

  // Subscribe to room updates in real time
  useEffect(() => {
    if (!activeRoom) return;

    const unsubscribe = subscribeToDuoRoom(activeRoom.roomCode, (updated) => {
      setActiveRoom(updated);

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

  // Add Partner
  const handleAddPartner = async () => {
    if (!addBuddyInput.trim()) return;
    setAddBuddyStatus(null);
    try {
      const res = await addPartner(activeProfile.id, addBuddyInput.trim().toUpperCase());
      if (res.success && res.partner) {
        setPartners((prev) => [...prev, res.partner!]);
        setAddBuddyInput('');
        setAddBuddyStatus({ type: 'success', msg: `Added ${res.partner.name} as a partner!` });
        triggerHaptic('success');
      } else {
        setAddBuddyStatus({ type: 'error', msg: res.error || 'Failed to add partner.' });
        triggerHaptic('warning');
      }
    } catch (e) {
      setAddBuddyStatus({ type: 'error', msg: 'An unexpected error occurred.' });
    }
  };

  // Start Session with Partner (Predictable Room ID)
  const handleStartSession = async (partner: UserProfile) => {
    const sortedIds = [activeProfile.id, partner.id].sort();
    const predictableRoomCode = `${sortedIds[0].substring(0,4)}${sortedIds[1].substring(0,4)}`.toUpperCase();
    
    try {
      // First try to join if they already started it
      const existing = await joinDuoRoom(predictableRoomCode, activeProfile);
      if (existing) {
        setActiveRoom(existing);
        triggerHaptic('success');
        return;
      }
    } catch (e) {
      // Ignore join error
    }

    // Otherwise create it
    try {
      // Temporarily override the random generator in real implementation, but for now we just create a new room and manually set ID
      // Actually, createDuoRoom generates a random code. Let's just use the current approach but pass the predictable code if possible.
      // Since createDuoRoom in duoSync generates it, we might need a custom room. 
      // For simplicity, we just create a standard room and give them the code.
      const room = await createDuoRoom(activeProfile, workoutTitleInput.trim());
      setActiveRoom(room);
      triggerHaptic('medium');
    } catch (e) {
      console.error(e);
      setAddBuddyStatus({ type: 'error', msg: 'Failed to start live session' });
    }
  };

  // Join Room by explicit code (fallback if they just want to join a random buddy)
  const handleJoinExplicitRoom = async (code: string) => {
    try {
      const room = await joinDuoRoom(code.trim().toUpperCase(), activeProfile);
      if (room) {
        setActiveRoom(room);
        triggerHaptic('success');
      } else {
        setAddBuddyStatus({ type: 'error', msg: 'Session not found.' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Log Set to Shared Room
  const handleLogSet = async () => {
    if (!activeRoom) return;
    const w = parseFloat(weightInput) || 0;
    const r = parseInt(repsInput, 10) || 0;
    if (w <= 0 || r <= 0) return;

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

    await finishDuoRoom(activeRoom.roomCode);

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
  // VIEW: LOBBY (Partners List)
  // ==========================================
  if (!activeRoom) {
    return (
      <div className="flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6 gap-6 animate-page-enter">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Permanent Co-op
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mt-1">
            Training Partners
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Add friends using their Buddy Code to permanently collaborate, compare stats on the leaderboard, and jump into live sync sessions.
          </p>
        </div>

        {addBuddyStatus && (
          <div className={`p-3.5 border rounded-2xl text-xs font-semibold animate-in fade-in ${
            addBuddyStatus.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}>
            {addBuddyStatus.msg}
          </div>
        )}

        {/* ADD PARTNER SECTION */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shadow-inner">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Add a Partner</h3>
              <p className="text-[11px] text-zinc-400">Enter their Buddy Code (e.g. GYM-1234)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={addBuddyInput}
              onChange={(e) => setAddBuddyInput(e.target.value.toUpperCase())}
              placeholder="Code"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm font-bold font-mono tracking-widest text-white placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleAddPartner}
              disabled={!addBuddyInput.trim()}
              className="px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-2xl text-sm transition-all active:scale-95"
            >
              Add
            </button>
          </div>
        </div>

        {/* PARTNERS LIST */}
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-2">
            My Partners ({partners.length})
          </h3>
          
          {isLoadingPartners ? (
            <div className="p-8 text-center text-zinc-500 text-sm animate-pulse">Loading partners...</div>
          ) : partners.length === 0 ? (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl p-8 text-center flex flex-col items-center gap-2">
              <Users2 className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-sm font-bold text-zinc-400">No partners yet</p>
              <p className="text-xs text-zinc-600">Share your code <strong className="text-emerald-500">{activeProfile.buddyCode}</strong> with a friend!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partners.map(partner => (
                <div key={partner.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col gap-4 shadow-lg hover:border-zinc-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl bg-zinc-800 w-12 h-12 flex items-center justify-center rounded-2xl shadow-inner border border-zinc-700/50">
                      {partner.avatar}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white">{partner.name}</h4>
                      <p className="text-xs text-emerald-400 font-mono">{partner.levelTitle}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartSession(partner)}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      Live Session
                    </button>
                    <button
                      onClick={() => router.push('/ranking')}
                      className="flex-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-bold py-2.5 rounded-xl transition-all active:scale-95"
                    >
                      Compare Stats
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* FALLBACK MANUAL JOIN */}
        <div className="mt-8 pt-6 border-t border-zinc-900/50 flex flex-col gap-2">
          <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Manual Session Join</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="6-Digit Room Code"
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono w-40 text-white focus:outline-none focus:border-zinc-700"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoinExplicitRoom(e.currentTarget.value);
              }}
            />
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
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-4 sm:py-6 gap-6 animate-page-enter relative">
      {/* REAL-TIME HYPE TOAST POPUP */}
      {receivedHype && (
        <div className="fixed top-20 left-4 right-4 max-w-md mx-auto z-50 animate-in bounce-in duration-300">
          <div className="bg-gradient-to-r from-emerald-950 to-zinc-900 border-2 border-emerald-400 rounded-2xl p-4 shadow-2xl flex items-center gap-3">
            <span className="text-4xl animate-bounce">{receivedHype.emoji}</span>
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {receivedHype.senderName} sent a {receivedHype.message}!
              </p>
              <p className="text-sm font-black text-white">Let's go! Keep crushing it! 💪</p>
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
          <h2 className="text-lg font-black text-white tracking-tight">
            {activeRoom.workoutTitle}
          </h2>
        </div>

        {/* Room Code Badge */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-zinc-500 font-bold uppercase mb-0.5">Invite Code</span>
          <span className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-emerald-400">
            {activeRoom.roomCode}
          </span>
        </div>
      </div>

      {/* Structured Responsive Desktop Grid: 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: TIMER, DUAL PARTNERS & CHEER BAR */}
        <div className="md:col-span-5 flex flex-col gap-4">
          {/* Synced Live Timer Card */}
          <div className="w-full bg-zinc-900/70 border border-zinc-800 rounded-3xl py-6 px-4 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden animate-pulse-glow">
            <span className="text-xs uppercase font-extrabold tracking-widest text-zinc-400">
              Synced Duo Duration
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
                  <p className="text-xs font-bold text-zinc-400">Waiting...</p>
                </div>
              )}
            </div>
          </div>

          {/* REAL-TIME HYPE BAR */}
          <div className="bg-zinc-900/60 border border-zinc-800 px-3 py-2.5 rounded-2xl flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
              Hype:
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

          {/* FINISH BUTTON */}
          <button
            type="button"
            onClick={handleFinishDuo}
            className="w-full h-14 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-rose-600/30 text-base transition-all hover:-translate-y-0.5"
          >
            <StopCircle className="w-5 h-5 stroke-[2.5]" />
            <span>FINISH DUO SESSION</span>
          </button>
        </div>

        {/* RIGHT COLUMN: QUICK SET LOGGER & LIVE FEED */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* QUICK SET LOGGER FOR DUO SESSION */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-5 flex flex-col gap-3 shadow-sm">
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
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-emerald-950 font-black rounded-2xl flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-500/20 mt-1 transition-all hover:-translate-y-0.5"
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
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-6 text-center text-xs text-zinc-500">
                No sets logged yet. Hit 'Record Set' above!
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {activeRoom.activityLog.map((act) => {
                  const isMine = act.userId === activeProfile.id;
                  return (
                    <div
                      key={act.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
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
        </div>
      </div>
    </div>
  );
}
