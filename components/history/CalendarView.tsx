'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Workout } from '@/lib/types/workout';
import { getLocalDateString } from '@/lib/calculations/duration';

interface CalendarViewProps {
  workouts: Workout[];
  onSelectDate: (dateStr: string) => void;
  selectedDate: string | null;
}

export default function CalendarView({
  workouts,
  onSelectDate,
  selectedDate,
}: CalendarViewProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  const monthName = currentMonthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  // Previous / Next Month
  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Map workouts to dates
  const workoutDateMap = new Map<string, Workout[]>();
  workouts
    .filter((w) => w.status === 'completed')
    .forEach((w) => {
      if (!workoutDateMap.has(w.date)) {
        workoutDateMap.set(w.date, []);
      }
      workoutDateMap.get(w.date)!.push(w);
    });

  // Calculate calendar grid
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon
  // Shift so Monday is index 0
  const startOffset = (firstDayOfWeek + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  const todayStr = getLocalDateString(new Date());

  return (
    <div className="w-full bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      {/* Month Navigator Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{monthName}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels (Mo, Tu, We, Th, Fr, Sa, Su) */}
      <div className="grid grid-cols-7 text-center text-[11px] font-bold text-zinc-500">
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
        <span>Su</span>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center">
        {daysArray.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`empty_${idx}`} className="h-9" />;
          }

          const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
            dayNum
          ).padStart(2, '0')}`;
          const isToday = dayDateStr === todayStr;
          const isSelected = dayDateStr === selectedDate;
          const dayWorkouts = workoutDateMap.get(dayDateStr);
          const hasWorkout = dayWorkouts && dayWorkouts.length > 0;

          // Intensity based on total duration
          const totalSecs = dayWorkouts?.reduce((sum, w) => sum + (w.duration || 0), 0) || 0;
          const minutes = Math.round(totalSecs / 60);

          let intensityColor = 'bg-emerald-500';
          if (minutes > 60) intensityColor = 'bg-emerald-400 shadow-sm shadow-emerald-400/50';
          else if (minutes < 30) intensityColor = 'bg-emerald-600';

          return (
            <button
              key={dayDateStr}
              type="button"
              onClick={() => onSelectDate(dayDateStr)}
              className={`h-9 flex flex-col items-center justify-center rounded-xl relative transition-all active:scale-95 ${
                isSelected
                  ? 'bg-emerald-950 border border-emerald-500 text-white font-bold'
                  : isToday
                  ? 'bg-zinc-800 text-zinc-100 font-bold'
                  : 'hover:bg-zinc-800/60 text-zinc-300'
              }`}
            >
              <span className="text-xs">{dayNum}</span>

              {/* Workout indicator dot */}
              {hasWorkout && (
                <span
                  className={`w-1.5 h-1.5 rounded-2xl ${intensityColor} mt-0.5`}
                  title={`${minutes}m workout`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
