import { StorageAdapter } from './interface';
import { indexedDBStorage } from './indexeddb';

// Singleton instance used across the app
export const storage: StorageAdapter = indexedDBStorage;

export * from './interface';
export * from './indexeddb';
