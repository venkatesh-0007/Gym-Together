/**
 * Duration and date/time formatting utilities.
 */

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS (clock format)
 */
export function formatElapsed(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats seconds into human-readable e.g. "1h 17m" or "45m" or "< 1m"
 */
export function formatDurationHuman(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours === 0 && minutes === 0) {
    return safeSeconds < 10 ? 'Just started' : `${safeSeconds}s`;
  }
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Formats ISO string into localized time e.g. "6:42 PM" or "18:42"
 */
export function formatTime(
  isoString: string | null | undefined,
  timeFormat: '12h' | '24h' = '12h'
): string {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

/**
 * Returns user-friendly date label: "Today", "Yesterday", or "Mon, Sep 15"
 */
export function formatDateLabel(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return targetDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Returns Month and Year label: e.g. "September 2026"
 */
export function formatMonthYearLabel(dateString: string): string {
  if (!dateString) return '';
  const [year, month] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}
