import type { GameId } from "./catalog";

const AUTOSAVE_DB_NAME = "arcade-safari";
const AUTOSAVE_DB_VERSION = 3;
const AUTOSAVE_STORE_NAME = "autosaves";
const MANUAL_STORE_NAME = "manual-states";
const AUTOSAVE_RECORD_VERSION = 1;

export interface AutosaveRecord {
  gameId: GameId;
  savedAt: number;
  state: Uint8Array;
  version: number;
}

export type ManualStateRecord = AutosaveRecord;

export async function saveAutosaveState(
  gameId: GameId,
  state: Uint8Array,
  savedAt = Date.now()
): Promise<boolean> {
  return saveStateRecord(AUTOSAVE_STORE_NAME, gameId, state, savedAt);
}

export async function loadAutosaveState(gameId: GameId): Promise<AutosaveRecord | null> {
  return loadStateRecord(AUTOSAVE_STORE_NAME, gameId);
}

export async function saveManualState(
  gameId: GameId,
  state: Uint8Array,
  savedAt = Date.now()
): Promise<boolean> {
  return saveStateRecord(MANUAL_STORE_NAME, gameId, state, savedAt);
}

export async function loadManualState(gameId: GameId): Promise<ManualStateRecord | null> {
  return loadStateRecord(MANUAL_STORE_NAME, gameId);
}

async function saveStateRecord(
  storeName: string,
  gameId: GameId,
  state: Uint8Array,
  savedAt: number
): Promise<boolean> {
  if (state.byteLength === 0 || typeof indexedDB === "undefined") {
    return false;
  }

  let database: IDBDatabase | null = null;
  try {
    database = await openAutosaveDatabase();
    const transaction = database.transaction(storeName, "readwrite");
    const completed = waitForTransaction(transaction);
    const request = transaction.objectStore(storeName).put({
      gameId,
      savedAt,
      state: new Uint8Array(state),
      version: AUTOSAVE_RECORD_VERSION
    } satisfies AutosaveRecord);
    await waitForRequest(request);
    await completed;
    return true;
  } catch {
    return false;
  } finally {
    database?.close();
  }
}

async function loadStateRecord(storeName: string, gameId: GameId): Promise<AutosaveRecord | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  let database: IDBDatabase | null = null;
  try {
    database = await openAutosaveDatabase();
    const transaction = database.transaction(storeName, "readonly");
    const completed = waitForTransaction(transaction);
    const request = transaction.objectStore(storeName).get(gameId);
    const record = await waitForRequest<AutosaveRecord | undefined>(request);
    await completed;
    const state = normalizeStateBytes(record?.state);

    return record && state
      ? {
          gameId: record.gameId,
          savedAt: record.savedAt,
          state,
          version: record.version
        }
      : null;
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

function openAutosaveDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AUTOSAVE_DB_NAME, AUTOSAVE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(AUTOSAVE_STORE_NAME)) {
        database.createObjectStore(AUTOSAVE_STORE_NAME, { keyPath: "gameId" });
      }
      if (!database.objectStoreNames.contains(MANUAL_STORE_NAME)) {
        database.createObjectStore(MANUAL_STORE_NAME, { keyPath: "gameId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Autosave database upgrade was blocked."));
  });
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function normalizeStateBytes(state: unknown): Uint8Array | null {
  if (state instanceof Uint8Array) {
    return state.byteLength > 0 ? new Uint8Array(state) : null;
  }

  if (state instanceof ArrayBuffer) {
    return state.byteLength > 0 ? new Uint8Array(state) : null;
  }

  if (ArrayBuffer.isView(state)) {
    return state.byteLength > 0
      ? new Uint8Array(state.buffer, state.byteOffset, state.byteLength)
      : null;
  }

  return null;
}
