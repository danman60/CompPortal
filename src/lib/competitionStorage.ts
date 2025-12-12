/**
 * Competition State Persistence - Task 14
 * Uses IndexedDB to persist competition state across browser sessions
 */

const DB_NAME = 'CompSyncLiveDB';
const DB_VERSION = 1;
const STORE_NAME = 'competitionState';

export interface PersistedCompetitionState {
  competitionId: string;
  currentRoutineIndex: number;
  status: 'not_started' | 'running' | 'paused' | 'break' | 'completed';
  startTime: number | null;
  pausedAt: number | null;
  delayMinutes: number;
  competitionDay: string;
  lastSyncedAt: number;
  activeBreakId: string | null;
  breakCountdown: number;
  // Store routine live statuses separately from server data
  routineStatuses: Record<string, 'queued' | 'current' | 'completed' | 'skipped'>;
}

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB connection
 */
export async function initCompetitionDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create store for competition state
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'competitionId' });
      }
    };
  });
}

/**
 * Save competition state to IndexedDB
 */
export async function saveCompetitionState(state: PersistedCompetitionState): Promise<void> {
  try {
    const database = await initCompetitionDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const stateWithTimestamp = {
        ...state,
        lastSyncedAt: Date.now(),
      };

      const request = store.put(stateWithTimestamp);

      request.onerror = () => {
        console.error('Failed to save competition state:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  } catch (error) {
    console.error('Error saving competition state:', error);
    throw error;
  }
}

/**
 * Load competition state from IndexedDB
 */
export async function loadCompetitionState(competitionId: string): Promise<PersistedCompetitionState | null> {
  try {
    const database = await initCompetitionDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.get(competitionId);

      request.onerror = () => {
        console.error('Failed to load competition state:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        const result = request.result as PersistedCompetitionState | undefined;
        resolve(result || null);
      };
    });
  } catch (error) {
    console.error('Error loading competition state:', error);
    return null;
  }
}

/**
 * Clear competition state from IndexedDB
 */
export async function clearCompetitionState(competitionId: string): Promise<void> {
  try {
    const database = await initCompetitionDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.delete(competitionId);

      request.onerror = () => {
        console.error('Failed to clear competition state:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  } catch (error) {
    console.error('Error clearing competition state:', error);
    throw error;
  }
}

/**
 * Check if persisted state is still valid (not too old)
 */
export function isStateValid(state: PersistedCompetitionState, maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
  // State is valid if it's less than 24 hours old by default
  const age = Date.now() - state.lastSyncedAt;
  return age < maxAgeMs;
}

/**
 * Get current competition day string (YYYY-MM-DD)
 */
export function getCurrentDayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if we need to transition to a new day
 */
export function needsDayTransition(state: PersistedCompetitionState): boolean {
  const today = getCurrentDayString();
  return state.competitionDay !== today;
}
