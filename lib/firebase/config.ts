import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseConfigOptions {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const LOCAL_STORAGE_KEY = 'irontrack_custom_firebase_config';

export function getStoredFirebaseConfig(): FirebaseConfigOptions | null {
  if (typeof window === 'undefined') return null;

  // 1. Check local storage for user entered keys
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }

  // 2. Check environment variables
  if (
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:12345:web:abcdef',
    };
  }

  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfigOptions | null) {
  if (typeof window === 'undefined') return;
  if (!config) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } else {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  }
}

export function getFirebaseApp(): FirebaseApp | null {
  const config = getStoredFirebaseConfig();
  if (!config) return null;

  try {
    if (getApps().length > 0) {
      return getApp();
    }
    return initializeApp(config);
  } catch (err) {
    console.warn('Firebase initialization error:', err);
    return null;
  }
}

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    return getFirestore(app);
  } catch (err) {
    console.warn('Firestore connection error:', err);
    return null;
  }
}
