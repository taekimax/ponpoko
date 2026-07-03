import { describe, expect, it, vi } from "vitest";
import { CATALOG } from "../src/catalog";
import { configureEmulator, getEmulatorWarmupUrls, suppressEmulatorChrome, warmUpEmulatorAssets } from "../src/emulator";

describe("EmulatorJS startup configuration", () => {
  it("warms only small shell assets and leaves large MAME core data to EmulatorJS startup", () => {
    expect(getEmulatorWarmupUrls("mame2003_plus")).toEqual([
      "/ponpoko/emulatorjs/loader.js",
      "/ponpoko/emulatorjs/emulator.min.js",
      "/ponpoko/emulatorjs/emulator.min.css",
      "/ponpoko/emulatorjs/cores/reports/mame2003_plus.json",
      "/ponpoko/emulatorjs/compression/extract7z.js",
      "/ponpoko/emulatorjs/compression/extractzip.js"
    ]);
    expect(getEmulatorWarmupUrls("mame2003_plus")).not.toContain(
      "/ponpoko/emulatorjs/cores/mame2003_plus-legacy-wasm.data"
    );
  });

  it("warms cacheable assets without failing game startup when one request fails", async () => {
    const bodies: Array<{ arrayBuffer: ReturnType<typeof vi.fn> }> = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
      if (String(url).endsWith("emulator.min.css")) {
        throw new Error("temporary cache warm-up failure");
      }

      const body = {
        arrayBuffer: vi.fn(async () => new ArrayBuffer(0))
      };
      bodies.push(body);
      return body as unknown as Response;
    });

    await expect(warmUpEmulatorAssets("mame2003_plus", fetcher)).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(bodies).toHaveLength(5);
    expect(bodies.every((body) => body.arrayBuffer.mock.calls.length === 1)).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(
      "/ponpoko/emulatorjs/loader.js",
      expect.objectContaining({ cache: "force-cache", mode: "cors" })
    );
    expect(fetcher.mock.calls.every(([, init]) => init?.signal instanceof AbortSignal)).toBe(true);
  });

  it("bounds warm-up requests so slow cache fills do not block startup", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException(`warm-up timed out for ${String(url)}`, "AbortError"));
        });
      });
    });

    const warmup = warmUpEmulatorAssets("mame2003_plus", fetcher, { timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(50);

    await expect(warmup).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(fetcher.mock.calls.every(([, init]) => init?.signal instanceof AbortSignal)).toBe(true);
    expect(fetcher.mock.calls.every(([, init]) => init?.signal?.aborted === true)).toBe(true);
    vi.useRealTimers();
  });

  it("disables EmulatorJS IndexedDB caches so iPhone Safari startup does not wait on storage", () => {
    const stubWindow = {};
    vi.stubGlobal("window", stubWindow);

    configureEmulator(CATALOG[0], "roms/ponpoko.zip", vi.fn());

    expect(stubWindow).toMatchObject({
      EJS_pathtodata: "/ponpoko/emulatorjs/",
      EJS_disableDatabases: true,
      EJS_forceLegacyCores: true
    });
    vi.unstubAllGlobals();
  });

  it("loads Ponpoko from a post-warning start state so WebKit does not wait on the copyright screen", () => {
    const stubWindow = {};
    vi.stubGlobal("window", stubWindow);

    configureEmulator(CATALOG[0], "roms/ponpoko.zip", vi.fn());

    expect(stubWindow).toMatchObject({
      EJS_loadStateURL: "/ponpoko/states/ponpoko-start.state?v=20260701",
      EJS_defaultOptions: expect.objectContaining({
        "mame2003-plus_skip_disclaimer": "enabled",
        "mame2003-plus_skip_warnings": "enabled"
      })
    });
    vi.unstubAllGlobals();
  });

  it("does not apply the Ponpoko start state to other games", () => {
    const stubWindow = {};
    vi.stubGlobal("window", stubWindow);

    configureEmulator(CATALOG[1], "roms/bubbobr1.zip", vi.fn());

    expect("EJS_loadStateURL" in stubWindow).toBe(false);
    vi.unstubAllGlobals();
  });

  it("keeps pre-start UI options close to the known working EmulatorJS configuration", () => {
    const stubWindow = {};
    vi.stubGlobal("window", stubWindow);

    configureEmulator(CATALOG[0], "roms/ponpoko.zip", vi.fn());

    expect(stubWindow).toMatchObject({
      EJS_VirtualGamepadSettings: [],
      EJS_Buttons: expect.objectContaining({
        fullscreen: true,
        loadState: true,
        mute: true,
        restart: true,
        saveState: true,
        settings: false,
        volume: true
      })
    });
    expect(stubWindow).toMatchObject({
      EJS_defaultOptions: {
        "mame2003-plus_skip_disclaimer": "enabled",
        "mame2003-plus_skip_warnings": "enabled"
      }
    });
    vi.unstubAllGlobals();
  });

  it("hides EmulatorJS chrome without mutating EmulatorJS runtime settings during startup", () => {
    const changeSettingOption = vi.fn();
    const toggleVirtualGamepad = vi.fn();
    vi.stubGlobal("window", {
      EJS_emulator: {
        changeSettingOption,
        toggleVirtualGamepad
      }
    });
    vi.stubGlobal("document", {
      querySelectorAll: vi.fn(() => [])
    });

    suppressEmulatorChrome();

    expect(changeSettingOption).not.toHaveBeenCalled();
    expect(toggleVirtualGamepad).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
