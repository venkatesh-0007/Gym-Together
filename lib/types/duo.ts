export type DuoRoomStatus = 'waiting' | 'active' | 'finished';

export interface DuoParticipant {
  userId: string;
  name: string;
  avatar: string;
  isReady: boolean;
  status: 'idle' | 'lifting' | 'resting';
  restCountdown?: number;
}

export interface DuoActivityItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  exerciseName: string;
  setNumber: number;
  weight: number;
  reps: number;
  isPR?: boolean;
  timestamp: string;
}

export interface DuoHypeEvent {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  emoji: string;
  message: string;
  timestamp: number;
}

export interface DuoRoom {
  roomCode: string; // 6-digit code e.g. "IRON99"
  workoutTitle: string;
  status: DuoRoomStatus;
  host: DuoParticipant;
  partner?: DuoParticipant;
  startTime?: string;
  currentTurnUserId?: string;
  activityLog: DuoActivityItem[];
  lastHype?: DuoHypeEvent;
  updatedAt: string;
}

export interface LeaderboardUser {
  userId: string;
  name: string;
  username: string;
  avatar: string;
  levelTitle: string;
  weeklyWorkouts: number;
  streakDays: number;
  totalVolumeKg: number;
  bestBenchKg: number;
  bestSquatKg: number;
  bestDeadliftKg: number;
  rank: number;
  isCurrentUser?: boolean;
}
