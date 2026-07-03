import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SERVICE_WORKER_SCOPE,
  SERVICE_WORKER_URL
} from "../src/service-worker-registration";

describe("PWA asset cache", () => {
  it("declares a home-screen manifest and same-origin service worker", () => {
    const indexHtml = readFileSync("index.html", "utf8");

    expect(indexHtml).toContain('<link rel="manifest" href="/ponpoko/manifest.webmanifest"');
    expect(SERVICE_WORKER_URL).toBe("/ponpoko/service-worker.js");
    expect(SERVICE_WORKER_SCOPE).toBe("/ponpoko/");
    expect(existsSync("public/manifest.webmanifest")).toBe(true);
    expect(existsSync("public/service-worker.js")).toBe(true);
  });

  it("caches large runtime assets and ROMs without caching navigations forever", () => {
    const serviceWorker = readFileSync("public/service-worker.js", "utf8");

    expect(serviceWorker).toContain("/ponpoko/roms/");
    expect(serviceWorker).toContain("/ponpoko/emulatorjs/");
    expect(serviceWorker).toContain("cacheFirst");
    expect(serviceWorker).toContain("networkFirst");
  });
});
