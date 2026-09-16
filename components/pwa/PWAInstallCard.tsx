'use client';

import React, { useState } from 'react';
import { Download, Smartphone, Check, Share, PlusSquare, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '@/lib/hooks/usePWAInstall';
import { triggerHaptic } from '@/lib/utils/haptics';

export default function PWAInstallCard() {
  const { isStandalone, canInstall, isIOS, installApp } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    if (canInstall) {
      setInstalling(true);
      await installApp();
      setInstalling(false);
    } else if (isIOS) {
      setShowIosGuide((prev) => !prev);
    }
  };

  if (isStandalone) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">App Mode Active</h4>
            <p className="text-xs text-zinc-400">Running standalone on your device</p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Native PWA
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-zinc-900 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0 shadow-lg shadow-red-500/10">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Install Satatam on Mobile
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold border border-red-500/30">
                PWA
              </span>
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Fullscreen experience with zero browser address bars &amp; fast offline caching.
            </p>
          </div>
        </div>

        {canInstall && (
          <button
            type="button"
            onClick={handleInstallClick}
            disabled={installing}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{installing ? 'Installing...' : 'Install'}</span>
          </button>
        )}

        {isIOS && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 border border-zinc-700 font-medium text-xs transition-all cursor-pointer"
          >
            <span>{showIosGuide ? 'Hide Steps' : 'iPhone Setup'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* iOS Safari Guide Accordion */}
      {isIOS && showIosGuide && (
        <div className="mt-2 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="font-semibold text-zinc-300">To install Satatam on iPhone or iPad:</p>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <div className="w-6 h-6 rounded-lg bg-zinc-800 text-red-400 flex items-center justify-center shrink-0 border border-zinc-700">
              <Share className="w-3.5 h-3.5" />
            </div>
            <span>1. Tap the <strong>Share</strong> button at the bottom of Safari.</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-300">
            <div className="w-6 h-6 rounded-lg bg-zinc-800 text-red-400 flex items-center justify-center shrink-0 border border-zinc-700">
              <PlusSquare className="w-3.5 h-3.5" />
            </div>
            <span>2. Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>.</span>
          </div>
          <p className="text-[11px] text-zinc-500 italic mt-0.5">
            Satatam will appear as an app icon with instant fullscreen launch.
          </p>
        </div>
      )}
    </div>
  );
}
