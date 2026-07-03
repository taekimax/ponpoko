import type { GameEntry } from "./catalog";

const EMULATOR_DATA_PATH = "/ponpoko/emulatorjs/";
const EMULATOR_LOADER_URL = `${EMULATOR_DATA_PATH}loader.js`;
const EMULATOR_WARMUP_TIMEOUT_MS = 8_000;
const PONPOKO_START_STATE_URL = "/ponpoko/states/ponpoko-start.state?v=20260701";
type EmulatorAssetFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface EmulatorWarmupOptions {
  timeoutMs?: number;
}

declare global {
  interface Window {
    EJS_player?: string;
    EJS_gameName?: string;
    EJS_gameUrl?: File | string;
    EJS_core?: string;
    EJS_color?: string;
    EJS_pathtodata?: string;
    EJS_startOnLoaded?: boolean;
    EJS_alignStartButton?: string;
    EJS_startButtonName?: string;
    EJS_controlScheme?: string;
    EJS_videoRotation?: number;
    EJS_Buttons?: Record<string, boolean>;
    EJS_defaultOptions?: Record<string, string>;
    EJS_disableDatabases?: boolean;
    EJS_forceLegacyCores?: boolean;
    EJS_loadStateURL?: string;
    EJS_defaultControls?: unknown;
    EJS_VirtualGamepadSettings?: unknown[];
    EJS_onGameStart?: () => void;
  }
}

const EMULATOR_CHROME_SELECTOR = [
  ".ejs_virtualGamepad_parent",
  ".ejs_menu_bar",
  ".ejs_context_menu",
  ".ejs_settings_parent"
].join(",");

export function getEmulatorWarmupUrls(core: GameEntry["core"]): string[] {
  return [
    EMULATOR_LOADER_URL,
    `${EMULATOR_DATA_PATH}emulator.min.js`,
    `${EMULATOR_DATA_PATH}emulator.min.css`,
    `${EMULATOR_DATA_PATH}cores/reports/${core}.json`,
    `${EMULATOR_DATA_PATH}compression/extract7z.js`,
    `${EMULATOR_DATA_PATH}compression/extractzip.js`
  ];
}

export async function warmUpEmulatorAssets(
  core: GameEntry["core"],
  fetcher: EmulatorAssetFetcher = fetch,
  options: EmulatorWarmupOptions = {}
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? EMULATOR_WARMUP_TIMEOUT_MS;
  await Promise.allSettled(
    getEmulatorWarmupUrls(core).map((url) => warmUpEmulatorAsset(url, fetcher, timeoutMs))
  );
}

async function warmUpEmulatorAsset(url: string, fetcher: EmulatorAssetFetcher, timeoutMs: number): Promise<void> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(url, {
      cache: "force-cache",
      mode: "cors",
      signal: controller.signal
    });
    await response.arrayBuffer();
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function configureEmulator(game: GameEntry, gameUrl: File | string, onGameStart: () => void): void {
  window.EJS_player = "#game";
  window.EJS_gameName = game.titleKo;
  window.EJS_gameUrl = gameUrl;
  window.EJS_core = game.core;
  window.EJS_color = "#e64040";
  window.EJS_pathtodata = EMULATOR_DATA_PATH;
  window.EJS_disableDatabases = true;
  window.EJS_forceLegacyCores = true;
  window.EJS_startOnLoaded = true;
  window.EJS_alignStartButton = "center";
  window.EJS_startButtonName = "게임 시작";
  window.EJS_controlScheme = "mame";
  window.EJS_videoRotation = game.rotation;
  window.EJS_defaultOptions = {
    "mame2003-plus_skip_disclaimer": "enabled",
    "mame2003-plus_skip_warnings": "enabled"
  };
  if (game.id === "ponpoko") {
    window.EJS_loadStateURL = PONPOKO_START_STATE_URL;
  } else {
    delete window.EJS_loadStateURL;
  }
  window.EJS_VirtualGamepadSettings = [];
  window.EJS_Buttons = {
    playPause: false,
    restart: true,
    mute: true,
    settings: false,
    fullscreen: true,
    saveState: true,
    loadState: true,
    screenRecord: false,
    gamepad: false,
    cheat: false,
    volume: true,
    saveSavFiles: false,
    loadSavFiles: false,
    quickSave: false,
    quickLoad: false,
    screenshot: false,
    cacheManager: false,
    exitEmulation: false
  };
  window.EJS_defaultControls = {
    0: {
      0: { value: "a", value2: "BUTTON_1" },
      1: { value: "s", value2: "BUTTON_2" },
      2: { value: "v", value2: "SELECT" },
      3: { value: "enter", value2: "START" },
      4: { value: "up arrow", value2: "DPAD_UP" },
      5: { value: "down arrow", value2: "DPAD_DOWN" },
      6: { value: "left arrow", value2: "DPAD_LEFT" },
      7: { value: "right arrow", value2: "DPAD_RIGHT" },
      8: { value: "z", value2: "BUTTON_3" },
      9: { value: "x", value2: "BUTTON_4" }
    },
    1: {},
    2: {},
    3: {}
  };
  window.EJS_onGameStart = onGameStart;
}

export function suppressEmulatorChrome(): void {
  const emulator = window.EJS_emulator as unknown as
    | {
        virtualGamepad?: HTMLElement;
      }
    | undefined;

  if (emulator?.virtualGamepad) {
    hideElement(emulator.virtualGamepad);
  }

  document.querySelectorAll<HTMLElement>(EMULATOR_CHROME_SELECTOR).forEach(hideElement);
}

function hideElement(element: HTMLElement): void {
  element.hidden = true;
  element.style.setProperty("display", "none", "important");
  element.style.setProperty("visibility", "hidden", "important");
  element.style.setProperty("pointer-events", "none", "important");
}

export async function loadEmulator(game: GameEntry, gameUrl: File | string, onGameStart: () => void): Promise<void> {
  configureEmulator(game, gameUrl, onGameStart);
  suppressEmulatorChrome();

  if (document.querySelector<HTMLScriptElement>('script[data-emulatorjs="loader"]')) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = EMULATOR_LOADER_URL;
    script.async = true;
    script.dataset.emulatorjs = "loader";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("에뮬레이터 로더를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}
