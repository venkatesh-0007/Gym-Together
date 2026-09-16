'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ListFilter,
  Clock,
  ChevronRight,
  Dumbbell,
  X,
} from 'lucide-react';
import { useWorkout } from '@/lib/context/WorkoutContext';
import {
  formatDurationHuman,
  formatDateLabel,
  formatTime,
} from '@/lib/calculations/duration';
import { groupWorkoutsByMonth } from '@/lib/calculations/stats';
import CalendarView from '@/components/history/CalendarView';

const MOOD_EMOJIS: Record<string, string> = {
  terrible: '😫',
  neutral: '😐',
  good: '🙂',
  strong: '💪',
  beast: '🔥',
};

export default function HistoryPage() {
  const { allWorkouts, settings } = useWorkout();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const completedWorkouts = allWorkouts.filter((w) => w.status === 'completed');

  // Filtered list if date selected
  const displayedWorkouts = selectedDate
    ? completedWorkouts.filter((w) => w.date === selectedDate)
    : completedWorkouts;

  const monthGroups = groupWorkoutsByMonth(displayedWorkouts);

  return (
    <div className="flex-1 flex flex-col px-5 py-5 gap-5 animate-in fade-in duration-200">
      {/* Top Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Workout History
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {completedWorkouts.length} completed session
            {completedWorkouts.length === 1 ? '' : 's'}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setViewMode('list');
              setSelectedDate(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'list'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>List</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'calendar'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      {/* Calendar View Component */}
      {viewMode === 'calendar' && (
        <div className="flex flex-col gap-3">
          <CalendarView
            workouts={completedWorkouts}
            selectedDate={selectedDate}
            onSelectDate={(dStr) => {
              setSelectedDate(selectedDate === dStr ? null : dStr);
            }}
          />

          {selectedDate && (
            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 px-3 py-2 rounded-xl text-xs">
              <span className="text-zinc-300">
                Filtered by:{' '}
                <strong className="text-emerald-400">
                  {formatDateLabel(selectedDate)}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Workouts List Grouped by Month */}
      {displayedWorkouts.length === 0 ? (
        <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl p-8 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-500">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-300">No workouts found</h3>
            <p className="text-xs text-zinc-500 mt-1">
              {selectedDate
                ? 'No workouts logged on this date.'
                : 'Record your first gym session to see it here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {monthGroups.map((group) => (
            <div key={group.monthKey} className="flex flex-col gap-2.5">
              {/* Month Header */}
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
                {group.monthTitle}
              </h2>

              {/* Workouts in Month */}
              <div className="flex flex-col gap-2">
                {group.workouts.map((workout) => {
                  const startTimeLabel = formatTime(workout.startTime, settings.timeFormat);
                  const endTimeLabel = formatTime(workout.endTime, settings.timeFormat);
                  const durationLabel = formatDurationHuman(workout.duration);

                  return (
                    <Link
                      key={workout.id}
                      href={`/history/${workout.id}`}
                      className="bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700/80 active:scale-[0.99] rounded-2xl p-4 flex items-center justify-between transition-all group shadow-sm"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Day indicator badge */}
                        <div className="w-12 h-12 rounded-xl bg-zinc-800/90 border border-zinc-700/50 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] uppercase font-bold text-zinc-400">
                            {new Date(workout.startTime).toLocaleDateString(undefined, {
                              weekday: 'short',
                            })}
                          </span>
                          <span className="text-sm font-black text-white font-mono leading-none mt-0.5">
                            {new Date(workout.startTime).getDate()}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                              {durationLabel}
                            </h3>
                            {workout.mood && (
                              <span className="text-sm" title={`Felt: ${workout.mood}`}>
                                {MOOD_EMOJIS[workout.mood]}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>
                              {startTimeLabel} → {endTimeLabel}
                            </span>
                          </p>

                          {workout.exercises && workout.exercises.length > 0 && (
                            <p className="text-[11px] text-zinc-400 mt-1 truncate max-w-[200px]">
                              {workout.exercises.map((e) => e.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-zinc-600 group-hover:text-zinc-300 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
