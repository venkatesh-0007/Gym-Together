import { DuoRoom, DuoActivityItem, DuoHypeEvent, DuoParticipant } from '../types/duo';
import { UserProfile } from '../types/account';
import { supabase } from '../supabase/client';

const STORAGE_PREFIX = 'irontrack_duo_room_';
const BROADCAST_CHANNEL_NAME = 'irontrack_duo_channel';

// In-memory cache for fast local access
const localRoomCache = new Map<string, DuoRoom>();

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    return new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
  return null;
}

function getLocalStoredRoom(roomCode: string): DuoRoom | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${roomCode.toUpperCase()}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalStoredRoom(room: DuoRoom) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${room.roomCode.toUpperCase()}`,
      JSON.stringify(room)
    );
    localRoomCache.set(room.roomCode.toUpperCase(), room);

    // Broadcast update across tabs
    const bc = getBroadcastChannel();
    if (bc) {
      bc.postMessage({ type: 'ROOM_UPDATE', room });
      bc.close();
    }
  } catch (e) {
    console.error('Failed to save local room:', e);
  }
}

/**
 * Creates a new Duo Workout Room
 */
export async function createDuoRoom(
  host: UserProfile,
  workoutTitle: string = 'Push & Pull Duo'
): Promise<DuoRoom> {
  const digits = Math.floor(10 + Math.random() * 90);
  const prefixes = ['PUMP', 'IRON', 'BEAST', 'FLEX', 'LIFT', 'TITAN'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const roomCode = `${prefix}${digits}`;

  const hostParticipant: DuoParticipant = {
    userId: host.id,
    name: host.name,
    avatar: host.avatar,
    isReady: true,
    status: 'idle',
  };

  const newRoom: DuoRoom = {
    roomCode,
    workoutTitle,
    status: 'waiting',
    host: hostParticipant,
    activityLog: [],
    updatedAt: new Date().toISOString(),
  };

  saveLocalStoredRoom(newRoom);

  try {
    await supabase.from('duo_rooms').upsert({
      id: roomCode,
      room_data: newRoom,
      updated_at: newRoom.updatedAt
    });
  } catch (err) {
    console.warn('Supabase room create error, using local mesh:', err);
  }

  return newRoom;
}

/**
 * Join an existing Duo Room by code
 */
export async function joinDuoRoom(
  code: string,
  participant: UserProfile
): Promise<DuoRoom | null> {
  const roomCode = code.trim().toUpperCase();

  try {
    const { data } = await supabase.from('duo_rooms').select('room_data').eq('id', roomCode).single();
    if (data && data.room_data) {
      const room = data.room_data as DuoRoom;
      if (room.status !== 'finished') {
        room.partner = {
          userId: participant.id,
          name: participant.name,
          avatar: participant.avatar,
          isReady: true,
          status: 'idle',
        };
        room.status = 'active';
        room.startTime = room.startTime || new Date().toISOString();
        room.updatedAt = new Date().toISOString();

        await supabase.from('duo_rooms').upsert({
          id: roomCode,
          room_data: room,
          updated_at: room.updatedAt
        });

        saveLocalStoredRoom(room);
        return room;
      }
    }
  } catch (e) {
    console.warn('Supabase join failed, falling back to local mesh:', e);
  }

  // Fallback to local mesh / storage
  const localRoom = getLocalStoredRoom(roomCode);
  if (!localRoom) return null;

  localRoom.partner = {
    userId: participant.id,
    name: participant.name,
    avatar: participant.avatar,
    isReady: true,
    status: 'idle',
  };
  localRoom.status = 'active';
  localRoom.startTime = localRoom.startTime || new Date().toISOString();
  localRoom.updatedAt = new Date().toISOString();

  saveLocalStoredRoom(localRoom);
  return localRoom;
}

/**
 * Real-time room listener
 */
export function subscribeToDuoRoom(
  code: string,
  onUpdate: (room: DuoRoom) => void
): () => void {
  const roomCode = code.trim().toUpperCase();
  
  // Cloud listener
  const channel = supabase.channel(`public:duo_rooms:id=eq.${roomCode}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'duo_rooms', filter: `id=eq.${roomCode}` },
      (payload) => {
        if (payload.new && payload.new.room_data) {
          const cloudRoom = payload.new.room_data as DuoRoom;
          saveLocalStoredRoom(cloudRoom);
          onUpdate(cloudRoom);
        }
      }
    )
    .subscribe();

  // Multi-tab BroadcastChannel listener
  const bc = getBroadcastChannel();
  const handleBroadcast = (event: MessageEvent) => {
    if (
      event.data &&
      event.data.type === 'ROOM_UPDATE' &&
      event.data.room &&
      event.data.room.roomCode === roomCode
    ) {
      onUpdate(event.data.room);
    }
  };

  if (bc) {
    bc.addEventListener('message', handleBroadcast);
  }

  // Window storage event listener (cross-tab fallback)
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === `${STORAGE_PREFIX}${roomCode}` && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        onUpdate(parsed);
      } catch {
        // Ignore
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  // Emit initial cached state
  const initial = getLocalStoredRoom(roomCode);
  if (initial) {
    onUpdate(initial);
  }

  // Cleanup
  return () => {
    supabase.removeChannel(channel);
    if (bc) {
      bc.removeEventListener('message', handleBroadcast);
      bc.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}

/**
 * Log a completed set in the Duo session in real time
 */
export async function logDuoSet(roomCode: string, item: DuoActivityItem) {
  const code = roomCode.toUpperCase();
  const room = getLocalStoredRoom(code);
  if (!room) return;

  room.activityLog = [item, ...(room.activityLog || [])];
  room.updatedAt = new Date().toISOString();

  if (room.partner) {
    room.currentTurnUserId =
      item.userId === room.host.userId ? room.partner.userId : room.host.userId;
  }

  saveLocalStoredRoom(room);

  try {
    await supabase.from('duo_rooms').upsert({
      id: code,
      room_data: room,
      updated_at: room.updatedAt
    });
  } catch {
    // Local broadcast will still handle it
  }
}

/**
 * Send real-time high-five / hype emoji to partner
 */
export async function sendDuoHype(roomCode: string, hype: DuoHypeEvent) {
  const code = roomCode.toUpperCase();
  const room = getLocalStoredRoom(code);
  if (!room) return;

  room.lastHype = hype;
  room.updatedAt = new Date().toISOString();

  saveLocalStoredRoom(room);

  try {
    await supabase.from('duo_rooms').upsert({
      id: code,
      room_data: room,
      updated_at: room.updatedAt
    });
  } catch {
    // Local broadcast handles it
  }
}

/**
 * Finish and close Duo room
 */
export async function finishDuoRoom(roomCode: string) {
  const code = roomCode.toUpperCase();
  const room = getLocalStoredRoom(code);
  if (!room) return;

  room.status = 'finished';
  room.updatedAt = new Date().toISOString();

  saveLocalStoredRoom(room);

  try {
    await supabase.from('duo_rooms').upsert({
      id: code,
      room_data: room,
      updated_at: room.updatedAt
    });
  } catch {
    // Local handles it
  }
}
