import type { BootProgressRuntime } from "./boot-progress";
import type { GameEntry } from "./catalog";
import type {
  EmulatorInput,
  NativeEmulator,
  NativeEmulatorSnapshot,
  NativeEmulatorState
} from "./native-emulator";

const EMULATOR_DATA_PATH = "/ponpoko/emulatorjs/";
const EMULATOR_LOADER_URL = `${EMULATOR_DATA_PATH}loader.js`;
const EMULATOR_WARMUP_TIMEOUT_MS = 8_000;
const PONPOKO_START_STATE_URL = "/ponpoko/states/ponpoko-start.state?v=20260701";
type EmulatorAssetFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type EmulatorJsInputState = 0 | 1;

interface EmulatorWarmupOptions {
  timeoutMs?: number;
}

interface DebugInputLogEntry {
  input: number;
  pressed: EmulatorJsInputState;
}

interface EmulatorJsAudioContext {
  resume?: () => Promise<void> | void;
  state?: string;
}

interface EmulatorJsAudioSource {
  gain?: {
    context?: EmulatorJsAudioContext;
  };
}

interface EmulatorJsRuntime {
  Module?: {
    AL?: {
      currentCtx?: {
        audioCtx?: EmulatorJsAudioContext;
        sources?: EmulatorJsAudioSource[] | Record<string, EmulatorJsAudioSource>;
      };
    };
  };
  config?: {
    gameUrl?: string;
    loadState?: string;
  };
  failedToStart?: boolean;
  gameManager?: {
    getFrameNum?: () => number;
    getVideoDimensions?: (dimension: "height" | "width") => number | undefined;
    loadState?: (state: Uint8Array) => void;
    simulateInput?: (player: number, input: number, pressed: number) => void;
  };
  paused?: boolean;
  started?: boolean;
  virtualGamepad?: HTMLElement;
}

export interface NativeRuntimeResourceDebug {
  coreDataRequests: number;
  romRequests: number;
  stateRequests: number;
}

export interface NativeRuntimeDebugInfo {
  core: string;
  failed: boolean;
  frame: number;
  inputLog: DebugInputLogEntry[];
  loadStateUrl: string;
  paused: boolean;
  started: boolean;
  videoHeight: number | null;
  videoWidth: number | null;
}

export type EmulatorJsDebugInfo = NativeRuntimeDebugInfo;

export interface NativeRuntimeAdapter extends NativeEmulator {
  getBootProgressRuntime(): BootProgressRuntime | undefined;
  hasLoaderScript(): boolean;
  isInputReady(minFrame: number): boolean;
  readDebugInfo(): NativeRuntimeDebugInfo;
  readResourceDebug(): NativeRuntimeResourceDebug;
  reloadConfiguredState(): Promise<boolean>;
  suppressRuntimeChrome(): void;
}

export interface NativeEmulatorSelectionOptions {
  direct?: NativeRuntimeAdapter;
  fallback?: NativeRuntimeAdapter;
}

export class DirectRuntimeUnavailableError extends Error {
  readonly code = "direct-runtime-unavailable";

  constructor(message = "Direct native runtime is not available yet.") {
    super(message);
    this.name = "DirectRuntimeUnavailableError";
  }
}

declare global {
  interface Window {
    __ponpokoInputLog?: DebugInputLogEntry[];
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
    EJS_emulator?: EmulatorJsRuntime;
    webkitAudioContext?: typeof AudioContext;
  }
}

const EMULATOR_CHROME_SELECTOR = [
  ".ejs_virtualGamepad_parent",
  ".ejs_menu_bar",
  ".ejs_context_menu",
  ".ejs_settings_parent",
  ".ejs_popup_container"
].join(",");

const EMULATOR_JS_INPUTS: Record<EmulatorInput, number> = {
  action1: 0,
  action2: 1,
  action3: 8,
  action4: 9,
  action5: 10,
  action6: 11,
  coin: 2,
  down: 5,
  left: 6,
  right: 7,
  special1: 8,
  special2: 9,
  special3: 10,
  start: 3,
  up: 4
};

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
  const emulator = window.EJS_emulator;

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

export function createNativeEmulator(options: NativeEmulatorSelectionOptions = {}): NativeRuntimeAdapter {
  return new RuntimeSelectingNativeEmulator(
    options.direct ?? new DirectPonpokoNativeEmulator(),
    options.fallback ?? new EmulatorJsNativeEmulator()
  );
}

export class DirectPonpokoNativeEmulator implements NativeRuntimeAdapter {
  private readonly activeInputs = new Set<EmulatorInput>();
  private game: GameEntry | null = null;
  private lastError: NativeEmulatorSnapshot["lastError"];
  private state: NativeEmulatorState = "idle";
  private timings: NativeEmulatorSnapshot["timings"] = {};

  attach(_target: HTMLElement): void {
    // The direct runtime canvas will be attached here in P4.2.
  }

  async load(game: GameEntry, rom: Blob | ArrayBuffer): Promise<void> {
    const startedAt = performance.now();
    this.game = game;
    this.lastError = undefined;
    this.state = "loading-runtime";

    if (game.id !== "ponpoko") {
      this.failLoad(new DirectRuntimeUnavailableError("Direct native runtime is only entered for Ponpoko in W4.1."));
    }

    if (!(rom instanceof ArrayBuffer)) {
      this.failLoad(new DirectRuntimeUnavailableError("Direct native runtime requires a complete ROM ArrayBuffer."));
    }

    this.timings = {
      ...this.timings,
      runtimeLoadMs: Math.round(performance.now() - startedAt)
    };
    this.failLoad(new DirectRuntimeUnavailableError("Direct MAME 2003-Plus runtime assets are not wired yet."));
  }

  async unlockAudio(): Promise<void> {}

  async start(): Promise<void> {
    if (this.state !== "failed" && this.state !== "disposed") {
      this.state = "running";
    }
  }

  pause(): void {
    this.releaseActiveInputs();
    if (this.state !== "disposed") {
      this.state = "paused";
    }
  }

  reset(): void {
    this.releaseActiveInputs();
  }

  press(input: EmulatorInput): void {
    this.activeInputs.add(input);
  }

  release(input: EmulatorInput): void {
    this.activeInputs.delete(input);
  }

  dispose(): void {
    this.releaseActiveInputs();
    this.state = "disposed";
  }

  getSnapshot(): NativeEmulatorSnapshot {
    return {
      activeInputs: [...this.activeInputs],
      gameId: this.game?.id,
      lastError: this.lastError,
      runtimeName: "direct-mame2003-plus",
      state: this.state,
      timings: this.timings
    };
  }

  getBootProgressRuntime(): BootProgressRuntime | undefined {
    return undefined;
  }

  hasLoaderScript(): boolean {
    return false;
  }

  isInputReady(_minFrame: number): boolean {
    return false;
  }

  readDebugInfo(): NativeRuntimeDebugInfo {
    return {
      core: this.game?.core ?? "none",
      failed: this.state === "failed",
      frame: 0,
      inputLog: [],
      loadStateUrl: "none",
      paused: this.state === "paused",
      started: this.state === "running",
      videoHeight: null,
      videoWidth: null
    };
  }

  readResourceDebug(): NativeRuntimeResourceDebug {
    return {
      coreDataRequests: 0,
      romRequests: readResourceCount("/roms/ponpoko.zip"),
      stateRequests: 0
    };
  }

  async reloadConfiguredState(): Promise<boolean> {
    return false;
  }

  suppressRuntimeChrome(): void {}

  private failLoad(error: DirectRuntimeUnavailableError): never {
    this.state = "failed";
    this.lastError = {
      cause: error,
      code: error.code,
      message: error.message
    };
    throw error;
  }

  private releaseActiveInputs(): void {
    this.activeInputs.clear();
  }
}

class RuntimeSelectingNativeEmulator implements NativeRuntimeAdapter {
  private active: NativeRuntimeAdapter;

  constructor(
    private readonly direct: NativeRuntimeAdapter,
    private readonly fallback: NativeRuntimeAdapter
  ) {
    this.active = direct;
  }

  attach(target: HTMLElement): void {
    this.direct.attach(target);
    this.fallback.attach(target);
  }

  async load(game: GameEntry, rom: Blob | ArrayBuffer): Promise<void> {
    this.active = this.direct;

    try {
      await this.direct.load(game, rom);
      return;
    } catch (error) {
      if (!isDirectRuntimeUnavailable(error)) {
        throw error;
      }
    }

    this.active = this.fallback;
    await this.fallback.load(game, rom);
  }

  async unlockAudio(): Promise<void> {
    const [directResult, fallbackResult] = await Promise.allSettled([
      this.direct.unlockAudio(),
      this.fallback.unlockAudio()
    ]);

    if (fallbackResult.status === "rejected") {
      throw fallbackResult.reason;
    }

    if (directResult.status === "rejected" && this.active === this.direct) {
      throw directResult.reason;
    }
  }

  async start(): Promise<void> {
    await this.active.start();
  }

  pause(): void {
    this.active.pause();
  }

  reset(): void {
    this.active.reset();
  }

  press(input: EmulatorInput): void {
    this.active.press(input);
  }

  release(input: EmulatorInput): void {
    this.active.release(input);
  }

  dispose(): void {
    this.direct.dispose();
    this.fallback.dispose();
    this.active = this.direct;
  }

  getSnapshot(): NativeEmulatorSnapshot {
    return this.active.getSnapshot();
  }

  getBootProgressRuntime(): BootProgressRuntime | undefined {
    return this.active.getBootProgressRuntime();
  }

  hasLoaderScript(): boolean {
    return this.active.hasLoaderScript();
  }

  isInputReady(minFrame: number): boolean {
    return this.active.isInputReady(minFrame);
  }

  readDebugInfo(): NativeRuntimeDebugInfo {
    return this.active.readDebugInfo();
  }

  readResourceDebug(): NativeRuntimeResourceDebug {
    return this.active.readResourceDebug();
  }

  async reloadConfiguredState(): Promise<boolean> {
    return this.active.reloadConfiguredState();
  }

  suppressRuntimeChrome(): void {
    this.active.suppressRuntimeChrome();
    if (this.active !== this.fallback) {
      this.fallback.suppressRuntimeChrome();
    }
  }
}

export class EmulatorJsNativeEmulator implements NativeRuntimeAdapter {
  private readonly activeInputs = new Set<EmulatorInput>();
  private audioContext: AudioContext | null = null;
  private audioState: NativeEmulatorSnapshot["audioState"] = "locked";
  private game: GameEntry | null = null;
  private lastError: NativeEmulatorSnapshot["lastError"];
  private state: NativeEmulatorState = "idle";
  private target: HTMLElement | null = null;
  private timings: NativeEmulatorSnapshot["timings"] = {};

  attach(target: HTMLElement): void {
    this.target = target;
  }

  async load(game: GameEntry, rom: Blob | ArrayBuffer): Promise<void> {
    const startedAt = performance.now();
    this.game = game;
    this.lastError = undefined;
    this.state = "loading-runtime";

    try {
      await loadEmulator(game, createRomFile(game, rom), () => {
        this.state = "running";
      });
      this.timings = {
        ...this.timings,
        runtimeLoadMs: Math.round(performance.now() - startedAt)
      };
      if (this.state === "loading-runtime") {
        this.state = "ready";
      }
    } catch (error) {
      this.state = "failed";
      this.lastError = {
        cause: error,
        code: "emulatorjs-load-failed",
        message: error instanceof Error ? error.message : "에뮬레이터를 불러오지 못했습니다."
      };
      throw error;
    }
  }

  async unlockAudio(): Promise<void> {
    const runtimeAudioState = await resumeRuntimeAudio(this.getRuntime());
    if (runtimeAudioState) {
      this.audioState = runtimeAudioState;
      return;
    }

    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) {
      this.audioState = "unknown";
      return;
    }

    this.audioContext ??= new AudioContextConstructor();
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    this.audioState = this.audioContext.state === "running" ? "running" : "suspended";
  }

  async start(): Promise<void> {
    if (this.state !== "failed" && this.state !== "disposed") {
      this.state = "running";
    }
  }

  pause(): void {
    this.releaseActiveInputs();
    if (this.state !== "disposed") {
      this.state = "paused";
    }
  }

  reset(): void {
    this.releaseActiveInputs();
  }

  press(input: EmulatorInput): void {
    this.activeInputs.add(input);
    this.sendInput(input, 1);
  }

  release(input: EmulatorInput): void {
    if (!this.activeInputs.has(input)) {
      return;
    }

    this.activeInputs.delete(input);
    this.sendInput(input, 0);
  }

  dispose(): void {
    this.releaseActiveInputs();
    void this.audioContext?.close();
    this.audioContext = null;
    this.state = "disposed";
    if (this.target) {
      this.target.textContent = "";
    }
  }

  getSnapshot(): NativeEmulatorSnapshot {
    const canvas = this.target?.querySelector("canvas") ?? document.querySelector("#game canvas");
    const runtime = this.getRuntime();
    const frameCount = readFrame(runtime?.gameManager);

    return {
      activeInputs: [...this.activeInputs],
      audioState: this.audioState,
      canvasSize: typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement
        ? { height: canvas.height, width: canvas.width }
        : undefined,
      frameCount,
      gameId: this.game?.id,
      lastError: this.lastError,
      runtimeName: "emulatorjs",
      state: this.readState(runtime),
      timings: this.timings
    };
  }

  getBootProgressRuntime(): BootProgressRuntime | undefined {
    return this.getRuntime();
  }

  hasLoaderScript(): boolean {
    return Boolean(document.querySelector('script[data-emulatorjs="loader"]'));
  }

  isInputReady(minFrame: number): boolean {
    const gameManager = this.getRuntime()?.gameManager;
    return Boolean(gameManager?.simulateInput && readFrame(gameManager) >= minFrame);
  }

  async reloadConfiguredState(): Promise<boolean> {
    const gameManager = this.getRuntime()?.gameManager;
    const stateUrl = window.EJS_loadStateURL;

    if (!gameManager?.loadState || !stateUrl) {
      return false;
    }

    try {
      const response = await fetch(stateUrl, { cache: "force-cache" });
      if (!response.ok) {
        return false;
      }

      gameManager.loadState(new Uint8Array(await response.arrayBuffer()));
      return true;
    } catch {
      return false;
    }
  }

  readDebugInfo(): EmulatorJsDebugInfo {
    const runtime = this.getRuntime();
    const gameManager = runtime?.gameManager;

    return {
      core: window.EJS_core ?? "none",
      failed: runtime?.failedToStart === true,
      frame: readFrame(gameManager),
      inputLog: window.__ponpokoInputLog ?? [],
      loadStateUrl: runtime?.config?.loadState ?? window.EJS_loadStateURL ?? "none",
      paused: runtime?.paused === true,
      started: runtime?.started === true,
      videoHeight: gameManager?.getVideoDimensions?.("height") ?? null,
      videoWidth: gameManager?.getVideoDimensions?.("width") ?? null
    };
  }

  readResourceDebug(): NativeRuntimeResourceDebug {
    return {
      coreDataRequests: readResourceCount("/emulatorjs/cores/mame2003_plus-legacy-wasm.data"),
      romRequests: readResourceCount("/roms/ponpoko.zip"),
      stateRequests: readResourceCount("/states/ponpoko-start.state")
    };
  }

  suppressRuntimeChrome(): void {
    suppressEmulatorChrome();
  }

  private getRuntime(): EmulatorJsRuntime | undefined {
    return window.EJS_emulator;
  }

  private readState(runtime: EmulatorJsRuntime | undefined): NativeEmulatorState {
    if (this.state === "disposed" || this.state === "failed") {
      return this.state;
    }

    if (runtime?.failedToStart) {
      return "failed";
    }

    if (runtime?.paused) {
      return "paused";
    }

    if (runtime?.started || readFrame(runtime?.gameManager) > 0) {
      return "running";
    }

    return this.state;
  }

  private releaseActiveInputs(): void {
    for (const input of [...this.activeInputs]) {
      this.release(input);
    }
  }

  private sendInput(input: EmulatorInput, pressed: EmulatorJsInputState): void {
    const inputId = EMULATOR_JS_INPUTS[input];
    recordDebugInput(inputId, pressed);
    this.getRuntime()?.gameManager?.simulateInput?.(0, inputId, pressed);
  }
}

function isDirectRuntimeUnavailable(error: unknown): boolean {
  return error instanceof DirectRuntimeUnavailableError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "direct-runtime-unavailable");
}

function readResourceCount(fragment: string): number {
  return performance.getEntriesByType("resource").filter((entry) => entry.name.includes(fragment)).length;
}

function createRomFile(game: GameEntry, rom: Blob | ArrayBuffer): File {
  if (typeof File !== "undefined" && rom instanceof File && rom.name === game.romFile) {
    return rom;
  }

  return new File([rom], game.romFile, { type: "application/zip" });
}

function recordDebugInput(input: number, pressed: EmulatorJsInputState): void {
  const log = window.__ponpokoInputLog ?? [];
  log.push({ input, pressed });
  window.__ponpokoInputLog = log.slice(-12);
}

async function resumeRuntimeAudio(
  runtime: EmulatorJsRuntime | undefined
): Promise<NativeEmulatorSnapshot["audioState"] | null> {
  const contexts = readRuntimeAudioContexts(runtime);
  if (contexts.length === 0) {
    return null;
  }

  let state: NativeEmulatorSnapshot["audioState"] = "unknown";
  for (const context of contexts) {
    if (context.state === "suspended") {
      await context.resume?.();
    }
    state = normalizeAudioState(context.state);
    if (state !== "running") {
      break;
    }
  }

  return state;
}

function readRuntimeAudioContexts(runtime: EmulatorJsRuntime | undefined): EmulatorJsAudioContext[] {
  const currentCtx = runtime?.Module?.AL?.currentCtx;
  if (!currentCtx) {
    return [];
  }

  const contexts = new Set<EmulatorJsAudioContext>();
  if (currentCtx.audioCtx) {
    contexts.add(currentCtx.audioCtx);
  }

  const sources = Array.isArray(currentCtx.sources)
    ? currentCtx.sources
    : Object.values(currentCtx.sources ?? {});
  for (const source of sources) {
    const context = source.gain?.context;
    if (context) {
      contexts.add(context);
    }
  }

  return [...contexts];
}

function normalizeAudioState(state: string | undefined): NativeEmulatorSnapshot["audioState"] {
  if (state === "running" || state === "suspended") {
    return state;
  }

  return "unknown";
}

function readFrame(gameManager: EmulatorJsRuntime["gameManager"] | undefined): number {
  try {
    return gameManager?.getFrameNum?.() ?? 0;
  } catch {
    return 0;
  }
}
