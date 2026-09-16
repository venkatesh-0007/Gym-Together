'use client';

import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  Trash2,
  Check,
  AlertTriangle,
  Volume2,
  Clock,
  Scale,
  Target,
} from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { storage } from '@/lib/storage';
import { triggerHaptic } from '@/lib/utils/haptics';

export default function SettingsPage() {
  const { settings, updateSettings, refreshWorkouts, refreshTemplates } = useWorkout();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Export JSON backup
  const handleExportData = async () => {
    try {
      const data = await storage.exportAllData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `irontrack-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      triggerHaptic('success');
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  // Import JSON backup
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
        setImportMessage('Error: Invalid backup file format.');
        return;
      }

      await storage.importAllData(parsed);
      await refreshWorkouts();
      await refreshTemplates();

      setImportMessage('Backup successfully restored!');
      triggerHaptic('success');
      setTimeout(() => setImportMessage(null), 4000);
    } catch (err) {
      console.error('Import failed:', err);
      setImportMessage('Failed to import file. Please verify JSON file format.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Clear all data
  const handleClearAllData = async () => {
    triggerHaptic('warning');
    await storage.clearAllData();
    await refreshWorkouts();
    await refreshTemplates();
    setShowClearConfirm(false);
    setImportMessage('All local gym data has been reset.');
    setTimeout(() => setImportMessage(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col px-5 py-5 gap-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Customize workout parameters, units, and data backups
        </p>
      </div>

      {importMessage && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{importMessage}</span>
        </div>
      )}

      {/* WEEKLY GOAL SETTING */}
      <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
            Weekly Workout Goal
          </span>
        </div>

        <p className="text-xs text-zinc-400">
          How many workouts do you aim to complete per week?
        </p>

        <div className="grid grid-cols-7 gap-1.5 mt-1">
          {[1, 2, 3, 4, 5, 6, 7].map((num) => {
            const isSelected = settings.weeklyGoal === num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  updateSettings({ ...settings, weeklyGoal: num });
                }}
                className={`h-11 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-500 text-emerald-950 shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </section>

      {/* UNITS & FORMATTING */}
      <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-4">
        <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
          Preferences
        </span>

        {/* Weight Unit Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-sm font-bold text-white">Weight Units</p>
              <p className="text-[11px] text-zinc-400">Kilograms or Pounds</p>
            </div>
          </div>

          <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
            {(['kg', 'lb'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  updateSettings({ ...settings, weightUnit: unit });
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                  settings.weightUnit === unit
                    ? 'bg-emerald-500 text-emerald-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        {/* Time Format Toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/70">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-sm font-bold text-white">Clock Format</p>
              <p className="text-[11px] text-zinc-400">12-Hour (AM/PM) or 24-Hour</p>
            </div>
          </div>

          <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-xl">
            {(['12h', '24h'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  updateSettings({ ...settings, timeFormat: fmt });
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${
                  settings.timeFormat === fmt
                    ? 'bg-emerald-500 text-emerald-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Alerts Toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/70">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-sm font-bold text-white">Timer Audio Alerts</p>
              <p className="text-[11px] text-zinc-400">Sound chimes on timer completion</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              updateSettings({
                ...settings,
                soundEnabled: !settings.soundEnabled,
              });
            }}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              settings.soundEnabled ? 'bg-emerald-500' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Default Rest Timer Duration */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/70">
          <div>
            <p className="text-sm font-bold text-white">Default Rest Duration</p>
            <p className="text-[11px] text-zinc-400">Countdown starting value</p>
          </div>

          <select
            value={settings.restTimerDefaultSeconds || 90}
            onChange={(e) =>
              updateSettings({
                ...settings,
                restTimerDefaultSeconds: parseInt(e.target.value, 10),
              })
            }
            className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none"
          >
            <option value={45}>45s</option>
            <option value={60}>60s (1m)</option>
            <option value={90}>90s (1.5m)</option>
            <option value={120}>120s (2m)</option>
            <option value={180}>180s (3m)</option>
          </select>
        </div>
      </section>

      {/* DATA BACKUP & RESTORE */}
      <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
        <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
          Data Management
        </span>

        <p className="text-xs text-zinc-400">
          All workouts are stored locally on your device via IndexedDB. You can export a JSON backup at any time or restore previously saved data.
        </p>

        <div className="flex flex-col gap-2 mt-1">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportData}
            className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] border border-zinc-700 text-zinc-200 font-semibold rounded-2xl flex items-center justify-center gap-2 text-xs transition-colors"
          >
            {exportSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Backup Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export All Data (JSON)</span>
              </>
            )}
          </button>

          {/* Import Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] border border-zinc-700 text-zinc-200 font-semibold rounded-2xl flex items-center justify-center gap-2 text-xs transition-colors"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Import Data Backup</span>
          </button>

          {/* Destructive Clear */}
          <div className="pt-2">
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="w-full py-2.5 text-rose-400/80 hover:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset / Clear All Local Data</span>
              </button>
            ) : (
              <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-2xl flex flex-col gap-3 text-center animate-in fade-in">
                <div className="flex items-center justify-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Permanent Data Wipe Warning</span>
                </div>
                <p className="text-[11px] text-rose-300/90 leading-relaxed">
                  This will delete all completed workouts, PRs, body weight logs, and custom routines from this device. Are you completely sure?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllData}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-md shadow-rose-600/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Yes, Wipe Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* APP INFO */}
      <div className="text-center py-4">
        <p className="text-xs font-bold text-zinc-500 tracking-wider">
          IRONTRACK · MOBILE GYM TRACKER
        </p>
        <p className="text-[10px] text-zinc-600 mt-0.5">
          v1.0.0 · Local-First Offline PWA
        </p>
      </div>
    </div>
  );
}
