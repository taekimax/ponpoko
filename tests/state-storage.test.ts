import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadAutosaveState,
  loadManualState,
  saveAutosaveState,
  saveManualState
} from "../src/state-storage";

describe("autosave state storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and loads the latest state bytes for a game", async () => {
    vi.stubGlobal("indexedDB", createFakeIndexedDb());

    const state = new Uint8Array([1, 2, 3, 4]);
    await expect(saveAutosaveState("pbobble", state, 1234)).resolves.toBe(true);
    state[0] = 9;

    await expect(loadAutosaveState("pbobble")).resolves.toEqual({
      gameId: "pbobble",
      savedAt: 1234,
      state: new Uint8Array([1, 2, 3, 4]),
      version: 1
    });
    await expect(loadAutosaveState("spang")).resolves.toBeNull();
  });

  it("keeps the user save slot separate from autosave continuity", async () => {
    vi.stubGlobal("indexedDB", createFakeIndexedDb());

    await expect(saveManualState("ponpoko", new Uint8Array([7, 8, 9]), 2000)).resolves.toBe(true);
    await expect(saveAutosaveState("ponpoko", new Uint8Array([1, 2, 3]), 3000)).resolves.toBe(true);

    await expect(loadManualState("ponpoko")).resolves.toEqual({
      gameId: "ponpoko",
      savedAt: 2000,
      state: new Uint8Array([7, 8, 9]),
      version: 1
    });
    await expect(loadAutosaveState("ponpoko")).resolves.toEqual({
      gameId: "ponpoko",
      savedAt: 3000,
      state: new Uint8Array([1, 2, 3]),
      version: 1
    });
  });

  it("fails closed when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);

    await expect(saveAutosaveState("ponpoko", new Uint8Array([1]))).resolves.toBe(false);
    await expect(saveManualState("ponpoko", new Uint8Array([1]))).resolves.toBe(false);
    await expect(loadAutosaveState("ponpoko")).resolves.toBeNull();
    await expect(loadManualState("ponpoko")).resolves.toBeNull();
  });
});

function createFakeIndexedDb(): IDBFactory {
  const stores = new Map<string, Map<string, unknown>>();
  let upgraded = false;

  return {
    open: () => {
      const database = createFakeDatabase(stores);
      const request = createPendingOpenRequest(database);

      setTimeout(() => {
        if (!upgraded) {
          upgraded = true;
          request.onupgradeneeded?.(new Event("upgradeneeded") as IDBVersionChangeEvent);
        }
        request.onsuccess?.(new Event("success"));
      }, 0);

      return request;
    }
  } as unknown as IDBFactory;
}

function createFakeDatabase(stores: Map<string, Map<string, unknown>>): IDBDatabase {
  return {
    close: vi.fn(),
    createObjectStore: (name: string) => {
      stores.set(name, new Map());
      return {} as IDBObjectStore;
    },
    objectStoreNames: {
      contains: (name: string) => stores.has(name)
    },
    transaction: (name: string) => createFakeTransaction(stores, name)
  } as unknown as IDBDatabase;
}

function createFakeTransaction(stores: Map<string, Map<string, unknown>>, name: string): IDBTransaction {
  const store = stores.get(name) ?? new Map<string, unknown>();
  stores.set(name, store);
  const transaction = {
    error: null,
    objectStore: () => ({
      get: (key: string) => {
        const request = createPendingRequest(store.get(key));
        setTimeout(() => {
          request.onsuccess?.(new Event("success"));
          setTimeout(() => transaction.oncomplete?.(new Event("complete")), 0);
        }, 0);
        return request;
      },
      put: (record: { gameId: string }) => {
        store.set(record.gameId, record);
        const request = createPendingRequest(record);
        setTimeout(() => {
          request.onsuccess?.(new Event("success"));
          setTimeout(() => transaction.oncomplete?.(new Event("complete")), 0);
        }, 0);
        return request;
      }
    }),
    onabort: null,
    oncomplete: null,
    onerror: null
  } as unknown as IDBTransaction;

  return transaction;
}

function createPendingRequest<T>(result: T): IDBRequest<T> {
  return {
    error: null,
    result,
    onerror: null,
    onsuccess: null
  } as unknown as IDBRequest<T>;
}

function createPendingOpenRequest(result: IDBDatabase): IDBOpenDBRequest {
  return {
    ...createPendingRequest(result),
    onblocked: null,
    onupgradeneeded: null
  } as unknown as IDBOpenDBRequest;
}
