const ROM_CACHE_DB_NAME = "arcade-safari-roms";
const ROM_CACHE_DB_VERSION = 1;
const ROM_CACHE_STORE_NAME = "roms";
const ROM_CACHE_RECORD_VERSION = 1;

interface CachedRomRecord {
  byteLength: number;
  cacheKey: string;
  savedAt: number;
  bytes: ArrayBuffer;
  version: number;
}

export interface RomArrayBufferCache {
  load(cacheKey: string): Promise<ArrayBuffer | null>;
  save(cacheKey: string, arrayBuffer: ArrayBuffer): Promise<boolean>;
}

export const indexedDbRomCache: RomArrayBufferCache = {
  load: loadCachedRom,
  save: saveCachedRom
};

export async function loadCachedRom(cacheKey: string): Promise<ArrayBuffer | null> {
  if (!cacheKey || typeof indexedDB === "undefined") {
    return null;
  }

  let database: IDBDatabase | null = null;
  try {
    database = await openRomCacheDatabase();
    const transaction = database.transaction(ROM_CACHE_STORE_NAME, "readonly");
    const completed = waitForTransaction(transaction);
    const request = transaction.objectStore(ROM_CACHE_STORE_NAME).get(cacheKey);
    const record = await waitForRequest<CachedRomRecord | undefined>(request);
    await completed;
    return normalizeArrayBuffer(record?.bytes, record?.byteLength);
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

export async function saveCachedRom(cacheKey: string, arrayBuffer: ArrayBuffer): Promise<boolean> {
  if (!cacheKey || arrayBuffer.byteLength === 0 || typeof indexedDB === "undefined") {
    return false;
  }

  let database: IDBDatabase | null = null;
  try {
    database = await openRomCacheDatabase();
    const transaction = database.transaction(ROM_CACHE_STORE_NAME, "readwrite");
    const completed = waitForTransaction(transaction);
    const request = transaction.objectStore(ROM_CACHE_STORE_NAME).put({
      byteLength: arrayBuffer.byteLength,
      bytes: arrayBuffer,
      cacheKey,
      savedAt: Date.now(),
      version: ROM_CACHE_RECORD_VERSION
    } satisfies CachedRomRecord);
    await waitForRequest(request);
    await completed;
    return true;
  } catch {
    return false;
  } finally {
    database?.close();
  }
}

function openRomCacheDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ROM_CACHE_DB_NAME, ROM_CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ROM_CACHE_STORE_NAME)) {
        database.createObjectStore(ROM_CACHE_STORE_NAME, { keyPath: "cacheKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("ROM cache database upgrade was blocked."));
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

function normalizeArrayBuffer(bytes: unknown, expectedByteLength: number | undefined): ArrayBuffer | null {
  if (bytes instanceof ArrayBuffer) {
    return isValidBuffer(bytes, expectedByteLength) ? bytes.slice(0) : null;
  }

  if (ArrayBuffer.isView(bytes)) {
    if (!(bytes.buffer instanceof ArrayBuffer)) {
      return null;
    }
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return isValidBuffer(buffer, expectedByteLength) ? buffer : null;
  }

  return null;
}

function isValidBuffer(buffer: ArrayBuffer, expectedByteLength: number | undefined): boolean {
  return buffer.byteLength > 0 && (expectedByteLength === undefined || buffer.byteLength === expectedByteLength);
}
