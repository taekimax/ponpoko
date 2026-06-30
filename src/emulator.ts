import type { GameEntry } from "./catalog";

const EMULATOR_DATA_PATH = "https://cdn.emulatorjs.org/stable/data/";
const EMULATOR_LOADER_URL = `${EMULATOR_DATA_PATH}loader.js`;

declare global {
  interface Window {
    EJS_player?: string;
    EJS_gameName?: string;
    EJS_gameUrl?: string;
    EJS_core?: string;
    EJS_color?: string;
    EJS_pathtodata?: string;
    EJS_startOnLoaded?: boolean;
    EJS_alignStartButton?: string;
    EJS_startButtonName?: string;
    EJS_controlScheme?: string;
    EJS_videoRotation?: number;
    EJS_Buttons?: Record<string, boolean>;
    EJS_defaultControls?: unknown;
    EJS_VirtualGamepadSettings?: unknown[];
    EJS_onGameStart?: () => void;
  }
}

export function configureEmulator(game: GameEntry, gameUrl: string, onGameStart: () => void): void {
  window.EJS_player = "#game";
  window.EJS_gameName = game.titleKo;
  window.EJS_gameUrl = gameUrl;
  window.EJS_core = game.core;
  window.EJS_color = "#e64040";
  window.EJS_pathtodata = EMULATOR_DATA_PATH;
  window.EJS_startOnLoaded = true;
  window.EJS_alignStartButton = "center";
  window.EJS_startButtonName = "게임 시작";
  window.EJS_controlScheme = "mame";
  window.EJS_videoRotation = game.rotation;
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

export async function loadEmulator(game: GameEntry, gameUrl: string, onGameStart: () => void): Promise<void> {
  configureEmulator(game, gameUrl, onGameStart);

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
