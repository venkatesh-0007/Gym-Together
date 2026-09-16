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
  Palette,
  Moon,
  Sun,
  Laptop,
} from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { storage } from '@/lib/storage';
import { triggerHaptic } from '@/lib/utils/haptics';
import { AccentColor } from '@/lib/types/workout';

const ACCENT_PRESETS: { id: AccentColor; label: string; hex: string; isDefault?: boolean }[] = [
  { id: 'red', label: 'Crimson Red', hex: '#ef4444', isDefault: true },
  { id: 'emerald', label: 'Emerald Green', hex: '#10b981' },
  { id: 'blue', label: 'Electric Blue', hex: '#3b82f6' },
  { id: 'violet', label: 'Deep Violet', hex: '#8b5cf6' },
  { id: 'amber', label: 'Amber Gold', hex: '#f59e0b' },
  { id: 'rose', label: 'Vibrant Rose', hex: '#f43f5e' },
];

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
      a.download = `satatam-backup-${dateStr}.json`;
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

  const activeTheme = settings.theme || 'dark';
  const activeAccent = settings.accentColor || 'red';

  return (
    <div className="flex-1 flex flex-col px-4 sm:px-6 py-6 gap-6 max-w-5xl mx-auto w-full animate-page-enter">
      <div>
        <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          Appearance, themes, workout parameters, metric units, and offline backup
        </p>
      </div>

      {importMessage && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 font-semibold flex items-center gap-2.5 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{importMessage}</span>
        </div>
      )}

      {/* APPEARANCE & THEME SECTION (Full Width) */}
      <section className="gym-card p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent-subtle border border-accent-subtle flex items-center justify-center text-accent">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
              Appearance & Theme
            </span>
            <p className="text-sm font-extrabold text-[var(--foreground)]">Display & Accent Palette</p>
          </div>
        </div>

        {/* Theme Mode Selector (Dark, Light, System) */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[var(--foreground)]">Theme Mode</label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'dark' as const, label: 'Dark Mode', icon: Moon },
              { id: 'light' as const, label: 'Light Mode', icon: Sun },
              { id: 'system' as const, label: 'System', icon: Laptop },
            ].map(({ id, label, icon: Icon }) => {
              const isSelected = activeTheme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    updateSettings({ ...settings, theme: id });
                  }}
                  className={`flex flex-col items-center justify-center gap-2 py-3 px-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-accent text-white border-accent shadow-md shadow-accent scale-[1.02]'
                      : 'bg-[var(--card-subtle)] border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--card-hover-border)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Color Palette Selector */}
        <div className="flex flex-col gap-2 pt-4 border-t border-[var(--card-border)]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[var(--foreground)]">Accent Color</label>
            <span className="text-[11px] text-[var(--muted)]">Default is Crimson Red</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {ACCENT_PRESETS.map((preset) => {
              const isSelected = activeAccent === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    updateSettings({ ...settings, accentColor: preset.id });
                  }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all active:scale-95 ${
                    isSelected
                      ? 'border-accent bg-[var(--card-subtle)] ring-2 ring-accent/30 shadow-sm scale-105'
                      : 'border-[var(--card-border)] bg-[var(--card-subtle)] hover:border-[var(--card-hover-border)] opacity-80 hover:opacity-100'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shadow-sm relative transition-transform"
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[var(--foreground)] leading-tight">
                      {preset.label.split(' ')[0]}
                    </span>
                    {preset.isDefault && (
                      <span className="text-[9px] font-semibold text-accent uppercase tracking-wider">
                        Default
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Desktop 2-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: Goals & Preferences */}
        <div className="flex flex-col gap-6">
          {/* WEEKLY GOAL SETTING */}
          <section className="gym-card p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-accent-subtle border border-accent-subtle flex items-center justify-center text-accent">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
                  Weekly Target
                </span>
                <p className="text-sm font-extrabold text-[var(--foreground)]">Workout Frequency</p>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              How many training sessions do you aim to complete each week?
            </p>

            <div className="grid grid-cols-7 gap-2 mt-1">
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
                        ? 'bg-accent text-white shadow-md shadow-accent scale-105'
                        : 'bg-[var(--card-subtle)] border border-[var(--card-border)] text-[var(--foreground)] hover:border-[var(--card-hover-border)]'
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </section>

          {/* UNITS & FORMATTING */}
          <section className="gym-card p-6 shadow-sm flex flex-col gap-5">
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
              Training Preferences
            </span>

            {/* Weight Unit Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--card-subtle)] border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)]">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">Weight Units</p>
                  <p className="text-[11px] text-[var(--muted)]">Kilograms (kg) or Pounds (lb)</p>
                </div>
              </div>

              <div className="flex bg-[var(--card-subtle)] border border-[var(--card-border)] p-1 rounded-xl">
                {(['kg', 'lb'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      updateSettings({ ...settings, weightUnit: unit });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      settings.weightUnit === unit
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Format Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--card-subtle)] border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">Clock Format</p>
                  <p className="text-[11px] text-[var(--muted)]">12-Hour (AM/PM) or 24-Hour</p>
                </div>
              </div>

              <div className="flex bg-[var(--card-subtle)] border border-[var(--card-border)] p-1 rounded-xl">
                {(['12h', '24h'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      updateSettings({ ...settings, timeFormat: fmt });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                      settings.timeFormat === fmt
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Alerts Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--card-subtle)] border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)]">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">Timer Audio Alerts</p>
                  <p className="text-[11px] text-[var(--muted)]">Sound chimes on countdown finish</p>
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
                  settings.soundEnabled ? 'bg-accent' : 'bg-[var(--border-subtle)]'
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
            <div className="flex items-center justify-between pt-4 border-t border-[var(--card-border)]">
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">Default Rest Duration</p>
                <p className="text-[11px] text-[var(--muted)]">Initial timer countdown between sets</p>
              </div>

              <select
                value={settings.restTimerDefaultSeconds || 90}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    restTimerDefaultSeconds: parseInt(e.target.value, 10),
                  })
                }
                className="bg-[var(--card-subtle)] border border-[var(--card-border)] text-[var(--foreground)] text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-accent"
              >
                <option value={45}>45 seconds</option>
                <option value={60}>60 seconds (1m)</option>
                <option value={90}>90 seconds (1.5m)</option>
                <option value={120}>120 seconds (2m)</option>
                <option value={180}>180 seconds (3m)</option>
              </select>
            </div>
          </section>
        </div>

        {/* Right Column: Data Management & App Info */}
        <div className="flex flex-col gap-6">
          {/* DATA BACKUP & RESTORE */}
          <section className="gym-card p-6 shadow-sm flex flex-col gap-4">
            <span className="text-xs uppercase font-bold tracking-wider text-[var(--muted)]">
              Data Management & Portability
            </span>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              All workouts, personal records, and routines are securely preserved offline on your device via IndexedDB. Export an unencrypted JSON backup anytime or import into another browser.
            </p>

            <div className="flex flex-col gap-3 mt-1">
              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportData}
                className="w-full h-12 bg-[var(--card-subtle)] hover:bg-[var(--card)] active:scale-[0.99] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] text-[var(--foreground)] font-semibold rounded-2xl flex items-center justify-center gap-2.5 text-xs transition-all shadow-sm"
              >
                {exportSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-accent" />
                    <span className="text-accent font-bold">Backup Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-accent" />
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
                className="w-full h-12 bg-[var(--card-subtle)] hover:bg-[var(--card)] active:scale-[0.99] border border-[var(--card-border)] hover:border-[var(--card-hover-border)] text-[var(--foreground)] font-semibold rounded-2xl flex items-center justify-center gap-2.5 text-xs transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 text-accent" />
                <span>Import Data Backup</span>
              </button>

              {/* Destructive Clear */}
              <div className="pt-2">
                {!showClearConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full py-3 text-rose-400/80 hover:text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 rounded-2xl hover:bg-rose-500/5 transition-colors"
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
                        className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllData}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 transition-all"
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

          {/* APP INFO CARD */}
          <div className="gym-card p-6 flex flex-col items-center justify-center text-center gap-1.5">
            <p className="text-xs font-extrabold text-[var(--foreground)] tracking-wider">
              SATATAM · DAILY GYM WORKOUT COMPANION
            </p>
            <p className="text-[11px] text-[var(--muted)]">
              v1.0.0 · सततम् · Local-First Offline PWA · Realtime Duo Engine
            </p>
            <p className="text-[10px] text-[var(--muted)] opacity-70 mt-1">
              Zero mock numbers · 100% Authentic workout analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
