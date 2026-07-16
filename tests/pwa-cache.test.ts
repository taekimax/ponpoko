import { existsSync, readFileSync } from "node:fs";
import { createContext, Script } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import {
  SERVICE_WORKER_SCOPE,
  SERVICE_WORKER_URL
} from "../src/service-worker-registration";

type FetchEventDouble = {
  request: {
    method: string;
    mode?: string;
    url: string;
  };
  respondWith: (response: Promise<Response> | Response) => void;
  waitUntil: (promise: Promise<unknown>) => void;
};

type FetchDispatchResult = {
  responsePromise?: Promise<Response>;
  waitUntilPromises: Promise<unknown>[];
};

function createDeferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

async function settledState<T>(promise: Promise<T>, delayMs = 20) {
  const pending = Symbol("pending");
  const result = await Promise.race([
    promise.then(
      (value) => ({ status: "fulfilled" as const, value }),
      (reason) => ({ status: "rejected" as const, reason })
    ),
    new Promise<typeof pending>((resolve) => {
      setTimeout(() => resolve(pending), delayMs);
    })
  ]);

  return result === pending ? { status: "pending" as const } : result;
}

function loadServiceWorker({
  caches,
  fetch
}: {
  caches: unknown;
  fetch: unknown;
}) {
  const listeners = new Map<string, Array<(event: FetchEventDouble) => void>>();
  const self = {
    addEventListener: vi.fn((type: string, listener: (event: FetchEventDouble) => void) => {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    }),
    clients: {
      claim: vi.fn(() => Promise.resolve())
    },
    location: {
      origin: "https://example.test"
    },
    skipWaiting: vi.fn()
  };

  const context = createContext({
    caches,
    fetch,
    Response,
    self,
    URL
  });
  new Script(readFileSync("public/service-worker.js", "utf8"), {
    filename: "public/service-worker.js"
  }).runInContext(context);

  return {
    dispatchFetch(request: FetchEventDouble["request"]) {
      const result: FetchDispatchResult = {
        waitUntilPromises: []
      };
      const event: FetchEventDouble = {
        request,
        respondWith: (response) => {
          result.responsePromise = Promise.resolve(response);
        },
        waitUntil: (promise) => {
          result.waitUntilPromises.push(Promise.resolve(promise));
        }
      };

      for (const listener of listeners.get("fetch") ?? []) {
        listener(event);
      }

      return result;
    }
  };
}

describe("PWA asset cache", () => {
  it("declares a home-screen manifest and same-origin service worker", () => {
    const indexHtml = readFileSync("index.html", "utf8");

    expect(indexHtml).toContain('<link rel="manifest" href="/ponpoko/manifest.webmanifest"');
    expect(SERVICE_WORKER_URL).toBe("/ponpoko/service-worker.js");
    expect(SERVICE_WORKER_SCOPE).toBe("/ponpoko/");
    expect(existsSync("public/manifest.webmanifest")).toBe(true);
    expect(existsSync("public/service-worker.js")).toBe(true);
  });

  it("caches emulator assets without duplicating large ROMs in Cache Storage", () => {
    const serviceWorker = readFileSync("public/service-worker.js", "utf8");

    expect(serviceWorker).not.toContain('"/ponpoko/roms/"');
    expect(serviceWorker).toContain("/ponpoko/emulatorjs/");
    expect(serviceWorker).toContain("cacheFirst");
    expect(serviceWorker).toContain("networkFirst");
  });

  it("returns cache-first runtime asset responses without waiting for cache writes", async () => {
    const cacheWrite = createDeferred();
    const cache = {
      match: vi.fn(() => Promise.resolve(undefined)),
      put: vi.fn(() => cacheWrite.promise)
    };
    const caches = {
      open: vi.fn(() => Promise.resolve(cache))
    };
    const networkResponse = new Response("runtime asset", { status: 200 });
    const fetch = vi.fn(() => Promise.resolve(networkResponse));
    const serviceWorker = loadServiceWorker({ caches, fetch });

    const result = serviceWorker.dispatchFetch({
      method: "GET",
      mode: "same-origin",
      url: "https://example.test/ponpoko/emulatorjs/cores/fbneo-legacy-wasm.data"
    });

    expect(result.responsePromise).toBeDefined();
    const responseState = await settledState(result.responsePromise!);
    expect(responseState.status).toBe("fulfilled");
    if (responseState.status !== "fulfilled") {
      throw new Error("response did not resolve");
    }
    await expect(responseState.value.text()).resolves.toBe("runtime asset");
    expect(cache.put).toHaveBeenCalledTimes(1);
    expect(result.waitUntilPromises).toHaveLength(1);
    await expect(settledState(result.waitUntilPromises[0])).resolves.toEqual({
      status: "pending"
    });

    cacheWrite.resolve();
    await expect(result.waitUntilPromises[0]).resolves.toBeUndefined();
  });

  it("leaves ROM requests to the app-owned IndexedDB cache", () => {
    const cache = {
      match: vi.fn(),
      put: vi.fn()
    };
    const caches = {
      open: vi.fn(() => Promise.resolve(cache))
    };
    const fetch = vi.fn(() => Promise.resolve(new Response("rom", { status: 200 })));
    const serviceWorker = loadServiceWorker({ caches, fetch });

    const result = serviceWorker.dispatchFetch({
      method: "GET",
      mode: "same-origin",
      url: "https://example.test/ponpoko/roms/mslug.zip?v=verified"
    });

    expect(result.responsePromise).toBeUndefined();
    expect(result.waitUntilPromises).toEqual([]);
    expect(caches.open).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns network-first navigation responses without waiting for cache writes", async () => {
    const cacheWrite = createDeferred();
    const cache = {
      match: vi.fn(() => Promise.resolve(undefined)),
      put: vi.fn(() => cacheWrite.promise)
    };
    const caches = {
      open: vi.fn(() => Promise.resolve(cache))
    };
    const networkResponse = new Response("<!doctype html>", { status: 200 });
    const fetch = vi.fn(() => Promise.resolve(networkResponse));
    const serviceWorker = loadServiceWorker({ caches, fetch });

    const result = serviceWorker.dispatchFetch({
      method: "GET",
      mode: "navigate",
      url: "https://example.test/ponpoko/"
    });

    expect(result.responsePromise).toBeDefined();
    const responseState = await settledState(result.responsePromise!);
    expect(responseState.status).toBe("fulfilled");
    if (responseState.status !== "fulfilled") {
      throw new Error("response did not resolve");
    }
    await expect(responseState.value.text()).resolves.toBe("<!doctype html>");
    expect(cache.put).toHaveBeenCalledTimes(1);
    expect(result.waitUntilPromises).toHaveLength(1);
    await expect(settledState(result.waitUntilPromises[0])).resolves.toEqual({
      status: "pending"
    });

    cacheWrite.resolve();
    await expect(result.waitUntilPromises[0]).resolves.toBeUndefined();
  });
});
