import type { GameId } from "./catalog";

const AUTOSAVE_DB_NAME = "arcade-safari";
const AUTOSAVE_DB_VERSION = 1;
const AUTOSAVE_STORE_NAME = "autosaves";
const AUTOSAVE_RECORD_VERSION = 1;

export interface AutosaveRecord {
  gameId: GameId;
  savedAt: number;
  state: Uint8Array;
  version: number;
}

export async function saveAutosaveState(
  gameId: GameId,
  state: Uint8Array,
  savedAt = Date.now()
): Promise<boolean> {
  if (state.byteLength === 0 || typeof indexedDB === "undefined") {
    return false;
  }

  let database: IDBDatabase | null = null;
  try {
    database = await openAutosaveDatabase();
    const transaction = database.transaction(AUTOSAVE_STORE_NAME, "readwrite");
    transaction.objectStore(AUTOSAVE_STORE_NAME).put({
      gameId,
      savedAt,
      state: new Uint8Array(state),
      version: AUTOSAVE_RECORD_VERSION
    } satisfies AutosaveRecord);
    await waitForTransaction(transaction);
    return true;
  } catch {
    return false;
  } finally {
    database?.close();
  }
}

export async function loadAutosaveState(gameId: GameId): Promise<AutosaveRecord | null> {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  let database: IDBDatabase | null = null;
  try {
    database = await openAutosaveDatabase();
    const transaction = database.transaction(AUTOSAVE_STORE_NAME, "readonly");
    const request = transaction.objectStore(AUTOSAVE_STORE_NAME).get(gameId);
    const record = await waitForRequest<AutosaveRecord | undefined>(request);
    await waitForTransaction(transaction);
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
