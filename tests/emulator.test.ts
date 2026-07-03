import { describe, expect, it, vi } from "vitest";
import { CATALOG } from "../src/catalog";
import {
  configureEmulator,
  EmulatorJsNativeEmulator,
  getEmulatorWarmupUrls,
  suppressEmulatorChrome,
  warmUpEmulatorAssets
} from "../src/emulator";

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

  it("uses local SNES9x shell assets while leaving the SNES core data to EmulatorJS startup", () => {
    expect(getEmulatorWarmupUrls("snes9x")).toEqual([
      "/ponpoko/emulatorjs/loader.js",
      "/ponpoko/emulatorjs/emulator.min.js",
      "/ponpoko/emulatorjs/emulator.min.css",
      "/ponpoko/emulatorjs/cores/reports/snes9x.json",
      "/ponpoko/emulatorjs/compression/extract7z.js",
      "/ponpoko/emulatorjs/compression/extractzip.js"
    ]);
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
      EJS_disableLocalStorage: true,
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

    configureEmulator(CATALOG[1], "roms/pbobble.zip", vi.fn());

    expect("EJS_loadStateURL" in stubWindow).toBe(false);
    vi.unstubAllGlobals();
  });

  it("keeps pre-start UI options close to the known working EmulatorJS configuration", () => {
    const stubWindow = {};
    vi.stubGlobal("window", stubWindow);

    configureEmulator(CATALOG[0], "roms/ponpoko.zip", vi.fn());

    expect(stubWindow).toMatchObject({
      EJS_gameID: "ponpoko",
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
      EJS_defaultOptions: expect.objectContaining({
        "mame2003-plus_skip_disclaimer": "enabled",
        "mame2003-plus_skip_warnings": "enabled",
        "menu-bar-button": "hidden",
        "virtual-gamepad": "disabled"
      }),
      EJS_hideSettings: ["menu-bar-button", "virtual-gamepad", "virtual-gamepad-left-handed-mode"]
    });
    vi.unstubAllGlobals();
  });

  it("aligns EmulatorJS default keyboard controls with the app desktop controls", () => {
    const stubWindow = {};
    vi.stubGlobal("window", stubWindow);

    configureEmulator(CATALOG[1], "roms/pbobble.zip", vi.fn());

    expect(stubWindow).toMatchObject({
      EJS_defaultControls: {
        0: expect.objectContaining({
          0: { value: "q", value2: "BUTTON_1" },
          1: { value: "w", value2: "BUTTON_2" },
          2: { value: "5", value2: "SELECT" },
          3: { value: "enter", value2: "START" },
          8: { value: "e", value2: "BUTTON_3" },
          9: { value: "a", value2: "BUTTON_4" },
          10: { value: "s", value2: "BUTTON_5" },
          11: { value: "d", value2: "BUTTON_6" }
        })
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

  it("hides EmulatorJS resume popups with other runtime chrome", () => {
    const popup = createHideableElement();
    const querySelectorAll = vi.fn((selector: string) => {
      return selector.includes(".ejs_popup_container") ? [popup] : [];
    });
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      querySelectorAll
    });

    suppressEmulatorChrome();

    expect(querySelectorAll).toHaveBeenCalledWith(expect.stringContaining(".ejs_popup_container"));
    expect(popup.hidden).toBe(true);
    expect(popup.style.setProperty).toHaveBeenCalledWith("display", "none", "important");
    expect(popup.style.setProperty).toHaveBeenCalledWith("pointer-events", "none", "important");
    vi.unstubAllGlobals();
  });

  it("resumes EmulatorJS runtime audio contexts during user audio unlock", async () => {
    const placeholderContext = createAudioContext("running");
    const runtimeContext = createAudioContext("suspended");
    function AudioContextMock(): AudioContext {
      return placeholderContext;
    }

    vi.stubGlobal("window", {
      AudioContext: AudioContextMock,
      EJS_emulator: {
        Module: {
          AL: {
            currentCtx: {
              sources: [
                {
                  gain: {
                    context: runtimeContext
                  }
                }
              ]
            }
          }
        }
      }
    });

    const emulator = new EmulatorJsNativeEmulator();
    await emulator.unlockAudio();

    expect(runtimeContext.resume).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("captures and restores EmulatorJS runtime states through the game manager", async () => {
    const state = new Uint8Array([1, 2, 3]);
    const gameManager = {
      loadedState: null as Uint8Array | null,
      state,
      getState: vi.fn(function (this: { state: Uint8Array }) {
        return this.state;
      }),
      loadState: vi.fn(function (this: { loadedState: Uint8Array | null }, nextState: Uint8Array) {
        this.loadedState = nextState;
      })
    };
    vi.stubGlobal("window", {
      EJS_emulator: {
        gameManager
      }
    });

    const emulator = new EmulatorJsNativeEmulator();
    const savedState = await emulator.saveState();
    state[0] = 9;

    expect(savedState).toEqual(new Uint8Array([1, 2, 3]));
    await expect(emulator.loadState(new Uint8Array([4, 5, 6]))).resolves.toBe(true);
    expect(gameManager.loadState).toHaveBeenCalledWith(new Uint8Array([4, 5, 6]));
    expect(gameManager.loadedState).toEqual(new Uint8Array([4, 5, 6]));
    vi.unstubAllGlobals();
  });

  it("exits and clears the previous EmulatorJS runtime before another game can load", () => {
    const callEvent = vi.fn();
    const removeLoader = vi.fn();
    const target = { textContent: "old canvas" } as HTMLElement;
    vi.stubGlobal("window", {
      EJS_emulator: {
        callEvent
      }
    });
    vi.stubGlobal("document", {
      querySelectorAll: vi.fn((selector: string) => selector === 'script[data-emulatorjs="loader"]'
        ? [{ remove: removeLoader }]
        : [])
    });

    const emulator = new EmulatorJsNativeEmulator();
    emulator.attach(target);
    emulator.dispose();

    expect(callEvent).toHaveBeenCalledWith("exit");
    expect(removeLoader).toHaveBeenCalledTimes(1);
    expect(target.textContent).toBe("");
    expect("EJS_emulator" in window).toBe(false);
    vi.unstubAllGlobals();
  });
});

function createHideableElement(): HTMLElement {
  return {
    hidden: false,
    style: {
      setProperty: vi.fn()
    }
  } as unknown as HTMLElement;
}

function createAudioContext(initialState: AudioContextState): AudioContext {
  const context = {
    state: initialState,
    resume: vi.fn(async () => {
      context.state = "running";
    })
  };
  return context as unknown as AudioContext;
}
