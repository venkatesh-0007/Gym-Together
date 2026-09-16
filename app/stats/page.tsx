'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Flame,
  Clock,
  Dumbbell,
  Trophy,
  Scale,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import { formatDurationHuman, getLocalDateString } from '@/lib/calculations/duration';
import { calculateStreak } from '@/lib/calculations/streak';
import {
  calculateWeeklyStats,
  calculateMonthlyStats,
  getWeeklyChartData,
} from '@/lib/calculations/stats';
import { storage } from '@/lib/storage';
import { BodyWeightEntry } from '@/lib/types/workout';
import { triggerHaptic } from '@/lib/utils/haptics';

export default function StatsPage() {
  const { allWorkouts, settings } = useWorkout();

  const [bodyWeightLogs, setBodyWeightLogs] = useState<BodyWeightEntry[]>([]);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState('');

  useEffect(() => {
    storage.getBodyWeightLogs().then(setBodyWeightLogs);
  }, []);

  const streak = calculateStreak(allWorkouts);
  const weekly = calculateWeeklyStats(allWorkouts, settings.weeklyGoal);
  const monthly = calculateMonthlyStats(allWorkouts);
  const weeklyChartData = getWeeklyChartData(allWorkouts, 6);

  const handleAddWeight = async () => {
    const val = parseFloat(newWeightInput);
    if (!val || val <= 0) return;

    const entry: BodyWeightEntry = {
      id: `bw_${Date.now()}`,
      date: getLocalDateString(new Date()),
      weight: val,
      unit: settings.weightUnit,
    };

    await storage.saveBodyWeight(entry);
    setBodyWeightLogs((prev) => [...prev, entry]);
    setNewWeightInput('');
    setIsWeightModalOpen(false);
    triggerHaptic('success');
  };

  const latestWeight =
    bodyWeightLogs.length > 0 ? bodyWeightLogs[bodyWeightLogs.length - 1] : null;

  return (
    <div className="flex-1 flex flex-col px-5 py-5 gap-6 animate-in fade-in duration-200">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight">
          Performance & Stats
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Track consistency, gym volume, and progress trends
        </p>
      </div>

      {/* THIS WEEK OVERVIEW */}
      <section className="flex flex-col gap-3">
        <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
          This Week
        </span>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
              <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
              Workouts
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {weekly.workoutCount}{' '}
              <span className="text-xs font-semibold text-zinc-400">
                / {weekly.weeklyGoal}
              </span>
            </p>
            <p className="text-[11px] text-zinc-400">
              {weekly.goalProgressPercent}% of goal
            </p>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Total Time
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {formatDurationHuman(weekly.totalDurationSeconds)}
            </p>
            <p className="text-[11px] text-zinc-400">
              Avg: {formatDurationHuman(weekly.averageDurationSeconds)}
            </p>
          </div>
        </div>
      </section>

      {/* THIS MONTH OVERVIEW */}
      <section className="flex flex-col gap-3">
        <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
          This Month
        </span>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Workouts
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {monthly.workoutCount}
            </p>
            <p className="text-[11px] text-zinc-400">
              Avg: {formatDurationHuman(monthly.averageDurationSeconds)}
            </p>
          </div>

          <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-1">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Longest Session
            </span>
            <p className="text-2xl font-black text-white mt-1">
              {formatDurationHuman(monthly.longestWorkoutSeconds)}
            </p>
            <p className="text-[11px] text-zinc-400">
              Total: {formatDurationHuman(monthly.totalDurationSeconds)}
            </p>
          </div>
        </div>
      </section>

      {/* CHART: WORKOUTS PER WEEK */}
      <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
            Workouts Per Week
          </span>
          <span className="text-[11px] font-semibold text-emerald-400">
            Last 6 Weeks
          </span>
        </div>

        <div className="h-44 w-full -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#3f3f46',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(val) => [`${val ?? 0} workouts`, 'Frequency']}
              />
              <Bar dataKey="workoutCount" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* CHART: GYM TIME PER WEEK */}
      <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
            Total Gym Time (Minutes)
          </span>
          <span className="text-[11px] font-semibold text-emerald-400">
            Trend
          </span>
        </div>

        <div className="h-44 w-full -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="weekLabel"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  borderColor: '#3f3f46',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(val) => [`${val ?? 0} mins`, 'Duration']}
              />
              <Line
                type="monotone"
                dataKey="totalMinutes"
                stroke="#34d399"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* BODY WEIGHT SECTION */}
      <section className="bg-zinc-900/70 border border-zinc-800/80 rounded-3xl p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-bold tracking-wider text-zinc-400">
              Body Weight Tracking
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsWeightModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Log Weight</span>
          </button>
        </div>

        {latestWeight ? (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              {latestWeight.weight}
            </span>
            <span className="text-sm font-bold text-emerald-400">
              {latestWeight.unit}
            </span>
            <span className="text-xs text-zinc-500 ml-auto">
              Logged on {latestWeight.date}
            </span>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            No weight logged yet. Tap &apos;Log Weight&apos; to begin tracking your body weight history.
          </p>
        )}

        {bodyWeightLogs.length > 1 && (
          <div className="h-32 w-full -ml-3 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyWeightLogs}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => val.substring(5)}
                />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  stroke="#71717a"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#3f3f46',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                  formatter={(val) => [`${val ?? 0} ${settings.weightUnit}`, 'Weight']}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#34d399', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Log Body Weight Modal */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white text-center">
              Log Today&apos;s Body Weight
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                autoFocus
                value={newWeightInput}
                onChange={(e) => setNewWeightInput(e.target.value)}
                placeholder="e.g. 75.5"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-center text-lg font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-sm font-bold text-zinc-400">
                {settings.weightUnit}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsWeightModalOpen(false)}
                className="flex-1 py-2.5 bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddWeight}
                className="flex-1 py-2.5 bg-emerald-500 text-emerald-950 text-xs font-bold rounded-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
