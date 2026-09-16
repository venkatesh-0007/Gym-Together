'use client';

import React, { useEffect, useState } from 'react';
import { Timer, Plus, X, Volume2, VolumeX } from 'lucide-react';
import { formatElapsed } from '@/lib/calculations/duration';
import { triggerHaptic, playTimerDing } from '@/lib/utils/haptics';

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
  soundEnabled?: boolean;
}

export default function RestTimer({
  initialSeconds = 90,
  isOpen,
  onClose,
  soundEnabled = true,
}: RestTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(!soundEnabled);

  useEffect(() => {
    if (isOpen) {
      setSecondsRemaining(initialSeconds);
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [isOpen, initialSeconds]);

  useEffect(() => {
    if (!isActive || !isOpen) return;

    if (secondsRemaining <= 0) {
      triggerHaptic('success');
      if (!isSoundMuted) {
        playTimerDing();
      }
      setIsActive(false);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isOpen, secondsRemaining, isSoundMuted]);

  if (!isOpen) return null;

  const isCompleted = secondsRemaining <= 0;

  return (
    <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-40 animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-zinc-900/95 border border-emerald-500/40 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3">
        {/* Left: Timer Indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-lg transition-all ${
              isCompleted
                ? 'bg-emerald-500 text-emerald-950 animate-bounce'
                : 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-400'
            }`}
          >
            <Timer className="w-6 h-6" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
              {isCompleted ? 'REST COMPLETE!' : 'RESTING'}
            </span>
            <p className="text-2xl font-black font-mono tracking-tight text-white">
              {formatElapsed(Math.max(0, secondsRemaining))}
            </p>
          </div>
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2">
          {!isCompleted && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSecondsRemaining((s) => s + 30);
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-xs font-bold rounded-xl flex items-center gap-1 border border-zinc-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              30s
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSoundMuted(!isSoundMuted)}
            className="p-2 text-zinc-400 hover:text-white rounded-xl active:scale-95 transition-colors"
            title={isSoundMuted ? 'Unmute alert' : 'Mute alert'}
          >
            {isSoundMuted ? (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Skip</span>
          </button>
        </div>
      </div>
    </div>
  );
}
