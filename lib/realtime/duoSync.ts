import { DuoRoom, DuoActivityItem, DuoHypeEvent, DuoParticipant } from '../types/duo';
import { UserProfile } from '../types/account';
import { getFirestoreDb } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';

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
  // Generate friendly 6-digit room code e.g. "PUMP77"
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

  // If Firestore is available, save to cloud
  const db = getFirestoreDb();
  if (db) {
    try {
      await setDoc(doc(db, 'duo_rooms', roomCode), newRoom);
    } catch (err) {
      console.warn('Firestore room create error, using local mesh:', err);
    }
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

  // Try cloud first if Firestore is connected
  const db = getFirestoreDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'duo_rooms', roomCode));
      if (snap.exists()) {
        const room = snap.data() as DuoRoom;
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

          await updateDoc(doc(db, 'duo_rooms', roomCode), {
            partner: room.partner,
            status: 'active',
            startTime: room.startTime,
            updatedAt: room.updatedAt,
          });

          saveLocalStoredRoom(room);
          return room;
        }
      }
    } catch (e) {
      console.warn('Firestore join failed, falling back to local mesh:', e);
    }
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
 * Real-time room listener (supports Firestore onSnapshot AND BroadcastChannel for instant multi-tab sync)
 */
export function subscribeToDuoRoom(
  code: string,
  onUpdate: (room: DuoRoom) => void
): () => void {
  const roomCode = code.trim().toUpperCase();
  let unsubFirestore: (() => void) | null = null;

  // Cloud listener
  const db = getFirestoreDb();
  if (db) {
    try {
      unsubFirestore = onSnapshot(doc(db, 'duo_rooms', roomCode), (docSnap) => {
        if (docSnap.exists()) {
          const cloudRoom = docSnap.data() as DuoRoom;
          saveLocalStoredRoom(cloudRoom);
          onUpdate(cloudRoom);
        }
      });
    } catch (err) {
      console.warn('Firestore subscription error:', err);
    }
  }

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
    if (unsubFirestore) unsubFirestore();
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

  // If set belongs to current host, turn toggles to partner and vice versa
  if (room.partner) {
    room.currentTurnUserId =
      item.userId === room.host.userId ? room.partner.userId : room.host.userId;
  }

  saveLocalStoredRoom(room);

  const db = getFirestoreDb();
  if (db) {
    try {
      await updateDoc(doc(db, 'duo_rooms', code), {
        activityLog: room.activityLog,
        currentTurnUserId: room.currentTurnUserId,
        updatedAt: room.updatedAt,
      });
    } catch {
      // Local broadcast will still handle it
    }
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

  const db = getFirestoreDb();
  if (db) {
    try {
      await updateDoc(doc(db, 'duo_rooms', code), {
        lastHype: hype,
        updatedAt: room.updatedAt,
      });
    } catch {
      // Local broadcast handles it
    }
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

  const db = getFirestoreDb();
  if (db) {
    try {
      await updateDoc(doc(db, 'duo_rooms', code), {
        status: 'finished',
        updatedAt: room.updatedAt,
      });
    } catch {
      // Local handles it
    }
  }
}
