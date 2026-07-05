import {
  resolveAutosaveStartDecision,
  shouldRestoreAutosave,
  type AutosaveStartMode
} from "./autosave-start";
import {
  getBootProgressCopy,
  getBootProgressSnapshot as createBootProgressSnapshot,
  shouldRequestRuntimePreparation,
  shouldStopBoot,
  type BootProgressSnapshot
} from "./boot-progress";
import {
  formatBootDebugLines,
  isBootDebugEnabled,
  type BootDebugRuntimePrep,
  type BootDebugState,
  type BootDebugTouch
} from "./boot-debug";
import { CATALOG, type GameEntry, getRomPath, getThumbnailPath } from "./catalog";
import {
  SPECIAL_CONTROLS,
  type ControlAction,
  type ControllerProfile,
  getControllerProfile,
  getKeyboardControlHints
} from "./controllers";
import { DeferredTaskQueue } from "./deferred-task-queue";
import { createNativeEmulator, warmUpEmulatorAssets } from "./emulator";
import { InputRouter } from "./input";
import { downloadRomArrayBuffer } from "./rom-download";
import { shouldEnableControlsAfterPrepFailure } from "./runtime-prep";
import {
  handleRuntimePageHide,
  handleRuntimePageShow,
  type RuntimePageLifecycleContext
} from "./runtime-lifecycle";
import { registerServiceWorker } from "./service-worker-registration";
import { getStartupAssistSequence } from "./startup-assist";
import {
  loadAutosaveState,
  loadManualState,
  saveAutosaveState,
  saveManualState,
  type AutosaveRecord
} from "./state-storage";
import "./styles.css";

type ViewState =
  | { name: "menu" }
  | { autosave: AutosaveRecord; game: GameEntry; name: "autosave-choice" }
  | { game: GameEntry; message: string; name: "loading"; progress: number; startMode: AutosaveStartMode }
  | { controlsEnabled: boolean; game: GameEntry; name: "game"; startMode: AutosaveStartMode; status: string }
  | { game: GameEntry; message: string; name: "error"; startMode: AutosaveStartMode };

declare global {
  interface Window {
    __ponpokoTouchLog?: BootDebugTouch[];
  }
}

const app = getRequiredAppRoot();
const nativeEmulator = createNativeEmulator();
const input = new InputRouter(nativeEmulator);
const AUTOSAVE_INTERVAL_MS = 60_000;
const APP_BOOT_TIMEOUT_SECONDS = 150;
const TOUCH_POINTER_PREFIX = "touch:";
const POINTER_PREFIX = "pointer:";
let state: ViewState = { name: "menu" };
let autosaveTimer: number | null = null;
let autosaveInFlight = false;
let manualStateInFlight = false;
let manualStateStatusTimer: number | null = null;
let wakeLock: WakeLockSentinel | null = null;
let startupAssistTimer: number | null = null;
let emulatorChromeObserver: MutationObserver | null = null;
let bootProgressTimer: number | null = null;
let bootProgressStartedAt = 0;
let bootDebugTimer: number | null = null;
let romCacheSaveDrainFrame: number | null = null;
let romCacheSaveDrainTimer: number | null = null;
let runtimeControlsEnabled = false;
let runtimeControlsFinalizing = false;
let runtimeAutosaveRestored = false;
let runtimePrepStatus: BootDebugRuntimePrep = "pending";
const bootDebugEnabled = isBootDebugEnabled(window.location.search);
const romCacheSaveQueue = new DeferredTaskQueue();

input.attachKeyboard(window);
registerServiceWorker();
render();

function getRequiredAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) {
    throw new Error("앱 컨테이너를 찾을 수 없습니다.");
  }
  return root;
}

function setState(nextState: ViewState): void {
  state = nextState;
  render();
}

function render(): void {
  if (state.name === "menu") {
    renderMenu();
    return;
  }

  if (state.name === "autosave-choice") {
    renderAutosaveChoice(state.game, state.autosave);
    return;
  }

  if (state.name === "loading") {
    renderLoading(state.game, state.progress, state.message);
    return;
  }

  if (state.name === "game") {
    renderGame(state.game, state.controlsEnabled, state.status);
    return;
  }

  renderError(state.game, state.message, state.startMode);
}

function renderMenu(): void {
  stopAutosave();
  clearDeferredRomCacheSaves();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopBootDebugPanel();
  stopManualStateStatusTimer();
  input.releaseAll();
  app.innerHTML = `
    <main class="app-shell menu-shell">
      <section class="menu-header">
        <p class="eyebrow">iPhone Safari Arcade</p>
        <h1>폰포코 아케이드</h1>
        <p>폰포코와 아케이드 액션 게임을 iPhone Safari 세로 화면에서 실행합니다.</p>
      </section>
      <section class="game-list" aria-label="게임 선택">
        ${CATALOG.map((game) => renderGameCard(game)).join("")}
      </section>
    </main>
  `;

  app.querySelectorAll<HTMLButtonElement>("[data-game-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const game = CATALOG.find((candidate) => candidate.id === button.dataset.gameId);
      if (game) {
        void handleGameSelection(game);
      }
    });
  });
}

async function handleGameSelection(game: GameEntry): Promise<void> {
  input.releaseAll();
  void saveActiveAutosave();

  const decision = await resolveAutosaveStartDecision(game.id, loadAutosaveState);
  if (decision.kind === "prompt") {
    setState({ autosave: decision.autosave, game, name: "autosave-choice" });
    return;
  }

  await startGame(game, decision.mode);
}

function renderGameCard(game: GameEntry): string {
  const profile = getControllerProfile(game);

  return `
    <button class="game-card" type="button" data-game-id="${game.id}">
      <span class="thumb-frame">
        <img src="${getThumbnailPath(game)}" alt="" loading="lazy" onerror="this.style.display='none'" />
        <span class="thumb-fallback">${game.titleKo.slice(0, 2)}</span>
      </span>
      <span class="game-meta">
        <strong>${game.titleKo}</strong>
        <span>${game.titleEn}</span>
        <em>${profile.label}</em>
      </span>
    </button>
  `;
}

function renderLoading(game: GameEntry, progress: number, message: string): void {
  stopAutosave();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopBootDebugPanel();
  stopManualStateStatusTimer();
  app.innerHTML = `
    <main class="app-shell play-shell">
      <section class="loading-panel" aria-live="polite">
        <p class="eyebrow">${game.titleKo}</p>
        <h1>ROM 다운로드 중</h1>
        <p>${message}</p>
        <ul class="loading-cautions">
          <li>Safari를 닫지 말고 기다려 주세요.</li>
          <li>처음 실행은 잠시 멈춘 것처럼 보일 수 있습니다.</li>
        </ul>
        <div class="progress-track">
          <span style="width: ${progress}%"></span>
        </div>
        <strong>${progress}%</strong>
      </section>
    </main>
  `;
}

function renderAutosaveChoice(game: GameEntry, autosave: AutosaveRecord): void {
  stopAutosave();
  clearDeferredRomCacheSaves();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopBootDebugPanel();
  stopManualStateStatusTimer();
  input.releaseAll();
  app.innerHTML = `
    <main class="app-shell play-shell">
      <section class="error-panel autosave-choice-panel" data-autosave-choice>
        <p class="eyebrow">${game.titleKo}</p>
        <h1>저장된 진행을 불러올까요?</h1>
        <p>이전에 자동 저장된 지점이 있습니다.</p>
        <p data-autosave-saved-at>${formatAutosaveSavedAt(autosave.savedAt)}</p>
        <div class="error-actions autosave-choice-actions">
          <button class="primary-action" type="button" data-continue-autosave>이어하기</button>
          <button class="secondary-action" type="button" data-start-new>새로 시작</button>
          <button class="secondary-action" type="button" data-cancel-autosave-choice>메뉴로</button>
        </div>
      </section>
    </main>
  `;

  app.querySelector<HTMLButtonElement>("[data-continue-autosave]")?.addEventListener("click", () => {
    void startGame(game, { autosave, kind: "autosave" });
  });
  app.querySelector<HTMLButtonElement>("[data-start-new]")?.addEventListener("click", () => {
    void startGame(game, { kind: "new" });
  });
  app.querySelector<HTMLButtonElement>("[data-cancel-autosave-choice]")?.addEventListener("click", () => {
    setState({ name: "menu" });
  });
}

function formatAutosaveSavedAt(savedAt: number): string {
  const savedDate = new Date(savedAt);
  if (Number.isNaN(savedDate.getTime())) {
    return "자동 저장 지점이 있습니다.";
  }

  return `자동 저장: ${savedDate.toLocaleString("ko-KR")}`;
}

function renderGame(game: GameEntry, controlsEnabled: boolean, status: string): void {
  const profile = getControllerProfile(game);

  app.innerHTML = `
    <main class="app-shell play-shell">
      <header class="game-topbar">
        <button class="icon-button" type="button" data-back>메뉴</button>
        <div>
          <strong>${game.titleKo}</strong>
          <span data-game-status>${status}</span>
        </div>
        ${renderTopbarAction("coin-button", "coin", "동전", "5")}
        ${renderTopbarAction("ok-button", "ok", "OK", "O")}
        ${renderTopbarAction("start-button", "start", "플레이", "Enter")}
        ${renderStateSlotAction("save-button", "save-state", "저장", controlsEnabled)}
        ${renderStateSlotAction("load-button", "load-state", "불러오기", controlsEnabled)}
      </header>
      <section class="game-stage">
        <div id="game"></div>
        ${controlsEnabled ? "" : renderEmulatorBootOverlay()}
      </section>
      <section class="control-panel mobile-control-panel has-virtual-stick">
        ${renderVirtualArcadeControls(profile, controlsEnabled)}
      </section>
      ${renderKeyboardControls(profile)}
      ${bootDebugEnabled ? renderBootDebugPanel() : ""}
    </main>
  `;

  app.querySelectorAll<HTMLButtonElement>("[data-back]").forEach((button) => {
    button.addEventListener("click", () => {
      input.releaseAll();
      void saveActiveAutosave();
      stopAutosave();
      nativeEmulator.dispose();
      window.location.href = "/ponpoko/";
    });
  });

  wireControls(app);
  wireStateSlotControls(app);
}

function renderTopbarAction(className: string, action: ControlAction, label: string, keyLabel: string): string {
  return `
    <button class="${className}" type="button" data-action="${action}">
      <span>${label}</span>
      <kbd>${keyLabel}</kbd>
    </button>
  `;
}

function renderStateSlotAction(className: string, dataName: string, label: string, enabled: boolean): string {
  return `
    <button class="${className}" type="button" data-${dataName} ${enabled ? "" : "disabled"}>
      <span>${label}</span>
    </button>
  `;
}

function renderVirtualArcadeControls(profile: ControllerProfile, controlsEnabled: boolean): string {
  const directions = profile.zones.filter((zone) => ["up", "down", "left", "right"].includes(zone.area));
  return `
    <div
      class="virtual-arcade-controls ${controlsEnabled ? "is-enabled" : ""} has-six-buttons"
      data-touch-controls
      data-touch-surface="virtual"
      aria-hidden="false"
    >
      <div class="virtual-primary-controls" aria-hidden="${controlsEnabled ? "false" : "true"}">
        <div class="virtual-stick" aria-label="가상 스틱">
          ${directions.map((zone) => `
            <button
              class="virtual-stick-button stick-${zone.area}"
              type="button"
              data-action="${zone.action}"
              data-touch-zone
              ${controlsEnabled ? "" : 'aria-disabled="true" disabled'}
              aria-label="${zone.label}"
            ></button>
          `).join("")}
        </div>
        <div class="virtual-game-buttons" aria-label="게임 버튼">
          ${profile.buttons.map((button) => `
            <button
              class="virtual-game-button tone-${button.tone} ${button.inactive ? "is-inactive" : ""}"
              type="button"
              data-action="${button.action}"
              data-controller-button="${button.id}"
              ${button.inactive || !controlsEnabled ? 'aria-disabled="true" disabled' : ""}
            >
              ${button.label}
            </button>
          `).join("")}
        </div>
      </div>
      ${renderVirtualSpecialControls(controlsEnabled)}
    </div>
  `;
}

function renderVirtualSpecialControls(controlsEnabled: boolean): string {
  return `
    <div class="virtual-special-buttons" aria-label="특수 버튼">
      ${SPECIAL_CONTROLS.map((control) => renderVirtualSpecialControl(control, controlsEnabled)).join("")}
    </div>
  `;
}

function renderVirtualSpecialControl(control: (typeof SPECIAL_CONTROLS)[number], controlsEnabled: boolean): string {
  if (control.type === "menu") {
    return `
      <button class="virtual-special-button" type="button" data-back>
        ${control.label}
      </button>
    `;
  }

  const disabled = controlsEnabled ? "" : 'aria-disabled="true" disabled';

  if (control.type === "saveState") {
    return `
      <button class="virtual-special-button" type="button" data-save-state ${disabled}>
        ${control.label}
      </button>
    `;
  }

  if (control.type === "loadState") {
    return `
      <button class="virtual-special-button" type="button" data-load-state ${disabled}>
        ${control.label}
      </button>
    `;
  }

  return `
    <button class="virtual-special-button" type="button" data-action="${control.action}" ${disabled}>
      ${control.label}
    </button>
  `;
}

function renderKeyboardControls(profile: ControllerProfile): string {
  return `
    <section class="keyboard-control-panel" aria-label="키보드 조작">
      ${getKeyboardControlHints(profile).map((hint) => `
        <div class="keyboard-hint" data-keyboard-hint="${hint.id}">
          <strong>${hint.label}</strong>
          <span>${hint.keys.map((key) => `<kbd>${key}</kbd>`).join("")}</span>
        </div>
      `).join("")}
    </section>
  `;
}

function renderEmulatorBootOverlay(): string {
  return `
    <div class="emulator-boot-overlay" data-emulator-boot aria-live="polite">
      <div>
        <h2>에뮬레이터 준비 중</h2>
        <p class="boot-phase" data-boot-phase>에뮬레이터 로더를 불러오는 중입니다.</p>
        <p class="boot-detail" data-boot-detail>EmulatorJS 로더 스크립트를 같은 origin에서 내려받고 있습니다.</p>
        <p class="boot-elapsed" data-boot-elapsed>경과 0초</p>
        <ol class="boot-steps" aria-label="에뮬레이터 시작 단계">
          <li class="is-complete" data-boot-step="rom">ROM 다운로드 완료</li>
          <li data-boot-step="loader">EmulatorJS 로더 확인</li>
          <li data-boot-step="emulator">MAME 코어 초기화</li>
          <li data-boot-step="runtime">게임 런타임 연결</li>
          <li data-boot-step="frame">첫 프레임 확인</li>
        </ol>
        <p class="boot-note" data-boot-note>처음 실행은 잠시 멈춘 것처럼 보일 수 있습니다.</p>
      </div>
    </div>
  `;
}

function renderBootDebugPanel(): string {
  return `
    <aside class="boot-debug-panel" data-boot-debug aria-live="polite"></aside>
  `;
}

function renderError(game: GameEntry, message: string, startMode: AutosaveStartMode): void {
  stopAutosave();
  clearDeferredRomCacheSaves();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopManualStateStatusTimer();
  app.innerHTML = `
    <main class="app-shell play-shell">
      <section class="error-panel">
        <p class="eyebrow">${game.titleKo}</p>
        <h1>실행할 수 없습니다</h1>
        <p>${message}</p>
        <div class="error-actions">
          <button class="primary-action" type="button" data-retry>다시 시도</button>
          <button class="secondary-action" type="button" data-menu>메뉴로</button>
        </div>
      </section>
    </main>
  `;

  app.querySelector<HTMLButtonElement>("[data-retry]")?.addEventListener("click", () => {
    void startGame(game, startMode);
  });
  app.querySelector<HTMLButtonElement>("[data-menu]")?.addEventListener("click", () => {
    input.releaseAll();
    void saveActiveAutosave();
    stopAutosave();
    nativeEmulator.dispose();
    setState({ name: "menu" });
  });
}

async function startGame(game: GameEntry, startMode: AutosaveStartMode): Promise<void> {
  input.releaseAll();
  void saveActiveAutosave();
  stopAutosave();
  clearDeferredRomCacheSaves();
  nativeEmulator.dispose();
  stopStartupAssist();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  runtimeControlsEnabled = false;
  runtimeControlsFinalizing = false;
  runtimeAutosaveRestored = false;
  manualStateInFlight = false;
  stopManualStateStatusTimer();
  runtimePrepStatus = "pending";
  await unlockRuntimeAudio();
  await requestWakeLock();
  setState({ game, message: "ROM 파일을 준비합니다.", name: "loading", progress: 0, startMode });
  void warmUpEmulatorAssets(game.core);

  try {
    const romPath = getRomPath(game);
    const rom = await downloadRomArrayBuffer(romPath, {
      cacheKey: `${game.romFile}:${game.romVersion}`,
      cacheSaveScheduler: queueDeferredRomCacheSave,
      onProgress: (progress) => {
        setState({ game, message: "ROM 파일을 가져오는 중입니다.", name: "loading", progress, startMode });
      }
    });
    setState({
      controlsEnabled: false,
      game,
      name: "game",
      startMode,
      status: "다운로드 완료. 에뮬레이터를 시작합니다."
    });
    const gameMount = app.querySelector<HTMLElement>("#game");
    if (gameMount) {
      nativeEmulator.attach(gameMount);
    }
    startBootProgressMonitor();
    startBootDebugPanel();
    startEmulatorChromeSuppression();
    await waitForBootOverlayPaint();
    await nativeEmulator.load(game, rom.arrayBuffer);
    await nativeEmulator.start();
    requestRuntimeAudioUnlock();
    nativeEmulator.suppressRuntimeChrome();
  } catch (error) {
    input.releaseAll();
    nativeEmulator.dispose();
    releaseWakeLock();
    stopBootProgressMonitor();
    stopEmulatorChromeSuppression();
    setState({
      name: "error",
      game,
      startMode,
      message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
    });
  }
}

interface ActivePointer {
  currentAction: ControlAction;
  pressed: boolean;
}

function wireControls(root: HTMLElement): void {
  const activePointers = new Map<string, ActivePointer>();

  root.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
    const action = element.dataset.action as ControlAction | undefined;
    if (!action) {
      return;
    }

    element.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      event.preventDefault();
      startControlPress(
        `${POINTER_PREFIX}${event.pointerId}`,
        action,
        activePointers
      );
      trySetPointerCapture(element, event.pointerId);
    });

    const release = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        return;
      }
      event.preventDefault();
      endControlPress(`${POINTER_PREFIX}${event.pointerId}`, activePointers);
    };

    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    element.addEventListener("pointerleave", release);

    element.addEventListener(
      "touchstart",
      (event) => {
        event.preventDefault();
        for (const touch of [...event.changedTouches]) {
          startControlPress(
            `${TOUCH_POINTER_PREFIX}${touch.identifier}`,
            action,
            activePointers
          );
        }
      },
      { passive: false }
    );

    element.addEventListener(
      "touchmove",
      (event) => {
        event.preventDefault();
      },
      { passive: false }
    );

    const releaseTouch = (event: TouchEvent) => {
      event.preventDefault();
      for (const touch of [...event.changedTouches]) {
        endControlPress(`${TOUCH_POINTER_PREFIX}${touch.identifier}`, activePointers);
      }
    };

    element.addEventListener("touchend", releaseTouch, { passive: false });
    element.addEventListener("touchcancel", releaseTouch, { passive: false });
  });
}

function wireStateSlotControls(root: HTMLElement): void {
  root.querySelectorAll<HTMLButtonElement>("[data-save-state]").forEach((button) => {
    button.addEventListener("click", () => {
      void saveManualStateSlot();
    });
  });
  root.querySelectorAll<HTMLButtonElement>("[data-load-state]").forEach((button) => {
    button.addEventListener("click", () => {
      void loadManualStateSlot();
    });
  });
}

function startControlPress(
  pointerId: string,
  action: ControlAction,
  activePointers: Map<string, ActivePointer>
): void {
  if (activePointers.has(pointerId)) {
    return;
  }

  requestRuntimeAudioUnlock();
  activePointers.set(pointerId, {
    currentAction: action,
    pressed: true
  });
  recordBootDebugTouch(action, "down");
  input.pressControl(action);
}

function endControlPress(pointerId: string, activePointers: Map<string, ActivePointer>): void {
  const activePointer = activePointers.get(pointerId);
  if (!activePointer) {
    return;
  }

  recordBootDebugTouch(activePointer.currentAction, "up");
  if (activePointer.pressed) {
    input.releaseControl(activePointer.currentAction);
  }
  activePointers.delete(pointerId);
}

function requestRuntimeAudioUnlock(): void {
  void unlockRuntimeAudio();
}

async function unlockRuntimeAudio(): Promise<void> {
  try {
    await nativeEmulator.unlockAudio();
  } catch {
    // Audio unlock is best-effort; gameplay can continue and retry on the next user gesture.
  }
}

function trySetPointerCapture(element: HTMLElement, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // iPhone Safari can reject capture during transient touch states; direct input should still work.
  }
}

async function waitForBootOverlayPaint(): Promise<void> {
  await waitForAnimationFrame();
  await waitForAnimationFrame();
  await waitForDelay(100);
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function waitForDelay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function requestRuntimeControls(): void {
  void finalizeRuntimeControls();
}

async function finalizeRuntimeControls(): Promise<void> {
  if (runtimeControlsEnabled || runtimeControlsFinalizing || state.name !== "game") {
    return;
  }

  runtimeControlsFinalizing = true;
  runtimePrepStatus = "finalizing";
  try {
    const prepared = await prepareRuntimeControls(state.game, state.startMode);
    if (!prepared) {
      runtimePrepStatus = "failed";
      if (state.name === "game" && shouldRestoreAutosave(state.startMode)) {
        renderAutosaveRestoreFailure(state.game, state.startMode);
        return;
      }
      const snapshot = readBootProgressSnapshot();
      if (shouldEnableControlsAfterPrepFailure(snapshot)) {
        enableRuntimeControls();
      } else {
        renderBootFailure(snapshot);
      }
      return;
    }
    enableRuntimeControls();
  } finally {
    runtimeControlsFinalizing = false;
  }
}

async function prepareRuntimeControls(game: GameEntry, startMode: AutosaveStartMode): Promise<boolean> {
  const inputReady = await waitForRuntimeInputReady(10_000);
  if (!inputReady) {
    return false;
  }
  runtimePrepStatus = "input-ready";

  await acknowledgeMameCopyrightWarning();
  runtimePrepStatus = "warning-ack";

  if (shouldRestoreAutosave(startMode)) {
    const autosaveRestored = await restoreSelectedAutosaveState(startMode.autosave);
    if (!autosaveRestored) {
      return false;
    }
    runtimeAutosaveRestored = true;
    runtimePrepStatus = "state-reloaded";
    return true;
  }

  if (game.id !== "ponpoko") {
    return true;
  }

  const stateReloaded = await reloadConfiguredStartState();
  if (!stateReloaded) {
    return false;
  }
  runtimePrepStatus = "state-reloaded";

  return true;
}

async function waitForRuntimeInputReady(timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (nativeEmulator.isInputReady(1)) {
      return true;
    }

    await waitForDelay(100);
  }

  return false;
}

async function acknowledgeMameCopyrightWarning(): Promise<void> {
  await input.tapControlSequence(["left", "right"], 60, 80);
  await waitForDelay(120);
  input.releaseAll();
}

async function restoreSelectedAutosaveState(autosave: AutosaveRecord): Promise<boolean> {
  const restored = await nativeEmulator.loadState(autosave.state);
  if (restored) {
    await waitForDelay(150);
  }

  return restored;
}

async function reloadConfiguredStartState(): Promise<boolean> {
  if (state.name !== "game" || !state.game.emulator.loadStateUrl) {
    return false;
  }

  const reloaded = await nativeEmulator.reloadConfiguredState(state.game.emulator.loadStateUrl);
  await waitForDelay(150);
  return reloaded;
}

function enableRuntimeControls(): void {
  if (runtimeControlsEnabled) {
    return;
  }

  runtimeControlsEnabled = true;
  runtimePrepStatus = "controls-enabled";
  nativeEmulator.suppressRuntimeChrome();
  stopBootProgressMonitor();
  app.querySelector<HTMLElement>("[data-emulator-boot]")?.remove();
  app.querySelectorAll<HTMLElement>("[data-touch-controls]").forEach((touchControls) => {
    touchControls.classList.add("is-enabled");
    touchControls.setAttribute("aria-hidden", "false");
  });
  app.querySelectorAll<HTMLElement>("[data-touch-controls] .virtual-primary-controls").forEach((primaryControls) => {
    primaryControls.setAttribute("aria-hidden", "false");
  });
  app.querySelectorAll<HTMLButtonElement>("[data-touch-controls] button").forEach((button) => {
    if (!button.classList.contains("is-inactive")) {
      button.disabled = false;
      button.removeAttribute("aria-disabled");
    }
  });
  const status = app.querySelector<HTMLElement>("[data-game-status]");
  if (status) {
    status.textContent = "플레이 중";
  }
  app.querySelectorAll<HTMLButtonElement>("[data-save-state], [data-load-state]").forEach((button) => {
    button.disabled = false;
  });
  if (state.name === "game") {
    if (!runtimeAutosaveRestored) {
      startStartupAssist(state.game);
    }
    startAutosave(state.game);
    drainDeferredRomCacheSavesAfterPaint();
  }
}

function queueDeferredRomCacheSave(task: () => void): void {
  romCacheSaveQueue.enqueue(task);
}

function drainDeferredRomCacheSavesAfterPaint(): void {
  if (
    romCacheSaveQueue.pendingCount === 0 ||
    romCacheSaveDrainFrame !== null ||
    romCacheSaveDrainTimer !== null
  ) {
    return;
  }

  romCacheSaveDrainFrame = window.requestAnimationFrame(() => {
    romCacheSaveDrainFrame = null;
    romCacheSaveDrainTimer = window.setTimeout(() => {
      romCacheSaveDrainTimer = null;
      romCacheSaveQueue.drain();
    }, 0);
  });
}

function clearDeferredRomCacheSaves(): void {
  if (romCacheSaveDrainFrame !== null) {
    window.cancelAnimationFrame(romCacheSaveDrainFrame);
    romCacheSaveDrainFrame = null;
  }
  if (romCacheSaveDrainTimer !== null) {
    window.clearTimeout(romCacheSaveDrainTimer);
    romCacheSaveDrainTimer = null;
  }
  romCacheSaveQueue.clear();
}

function startEmulatorChromeSuppression(): void {
  stopEmulatorChromeSuppression();
  nativeEmulator.suppressRuntimeChrome();
  emulatorChromeObserver = new MutationObserver(() => nativeEmulator.suppressRuntimeChrome());
  emulatorChromeObserver.observe(app, { childList: true, subtree: true });
}

function stopEmulatorChromeSuppression(): void {
  emulatorChromeObserver?.disconnect();
  emulatorChromeObserver = null;
}

function startBootProgressMonitor(): void {
  stopBootProgressMonitor();
  bootProgressStartedAt = Date.now();
  updateBootProgress();
  bootProgressTimer = window.setInterval(updateBootProgress, 500);
}

function stopBootProgressMonitor(): void {
  if (bootProgressTimer !== null) {
    window.clearInterval(bootProgressTimer);
    bootProgressTimer = null;
  }
}

function updateBootProgress(): void {
  const overlay = app.querySelector<HTMLElement>("[data-emulator-boot]");
  if (!overlay) {
    return;
  }

  const elapsedSeconds = Math.floor((Date.now() - bootProgressStartedAt) / 1000);
  const snapshot = readBootProgressSnapshot();
  const copy = getBootProgressCopy(snapshot, elapsedSeconds);

  if (shouldRequestRuntimePreparation(snapshot)) {
    requestRuntimeControls();
    return;
  }

  if (shouldStopBoot(snapshot, elapsedSeconds, { timeoutSeconds: state.name === "game" ? getBootTimeoutSeconds(state.game) : undefined })) {
    renderBootFailure(snapshot);
    return;
  }

  overlay.classList.toggle("is-delayed", elapsedSeconds >= 20 && !snapshot.failed);
  overlay.classList.toggle("is-error", snapshot.failed);
  setText("[data-boot-phase]", copy.phase);
  setText("[data-boot-detail]", copy.detail);
  setText("[data-boot-elapsed]", `경과 ${elapsedSeconds}초`);

  setStepState("loader", snapshot.hasLoaderScript);
  setStepState("emulator", snapshot.hasEmulator);
  setStepState("runtime", snapshot.hasGameManager || snapshot.hasCanvas);
  setStepState("frame", snapshot.frame > 0 || snapshot.started);
}

function renderBootFailure(snapshot: BootProgressSnapshot): void {
  if (state.name !== "game") {
    return;
  }
  const failedGameState = state;

  const message = snapshot.failed
    ? "에뮬레이터가 시작 실패를 보고했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요."
    : `에뮬레이터 첫 화면이 ${getBootTimeoutSeconds(failedGameState.game)}초 안에 시작되지 않았습니다. iPhone Safari에서 탭을 새로고침하거나 다시 시도해 주세요.`;

  releaseWakeLock();
  input.releaseAll();
  nativeEmulator.dispose();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopBootDebugPanel();
  setState({
    name: "error",
    game: failedGameState.game,
    startMode: failedGameState.startMode,
    message
  });
}

function renderAutosaveRestoreFailure(game: GameEntry, startMode: AutosaveStartMode): void {
  releaseWakeLock();
  input.releaseAll();
  nativeEmulator.dispose();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopBootDebugPanel();
  setState({
    game,
    message: "자동 저장을 불러오지 못했습니다. 다시 시도하거나 메뉴에서 새로 시작해 주세요.",
    name: "error",
    startMode
  });
}

function getBootTimeoutSeconds(game: GameEntry): number {
  return Math.min(game.bootTimeoutSeconds ?? APP_BOOT_TIMEOUT_SECONDS, APP_BOOT_TIMEOUT_SECONDS);
}

function readBootProgressSnapshot(): BootProgressSnapshot {
  return createBootProgressSnapshot(
    {
      hasCanvas: Boolean(document.querySelector("#game canvas")),
      hasLoaderScript: nativeEmulator.hasLoaderScript()
    },
    nativeEmulator.getBootProgressRuntime()
  );
}

function setText(selector: string, value: string): void {
  const element = app.querySelector<HTMLElement>(selector);
  if (element) {
    element.textContent = value;
  }
}

function setStepState(step: string, complete: boolean): void {
  const element = app.querySelector<HTMLElement>(`[data-boot-step="${step}"]`);
  if (element) {
    element.classList.toggle("is-complete", complete);
  }
}

function startBootDebugPanel(): void {
  stopBootDebugPanel();
  if (!bootDebugEnabled) {
    return;
  }

  updateBootDebugPanel();
  bootDebugTimer = window.setInterval(updateBootDebugPanel, 1000);
}

function stopBootDebugPanel(): void {
  if (bootDebugTimer !== null) {
    window.clearInterval(bootDebugTimer);
    bootDebugTimer = null;
  }
}

function updateBootDebugPanel(): void {
  const panel = app.querySelector<HTMLElement>("[data-boot-debug]");
  if (!panel) {
    return;
  }

  panel.textContent = formatBootDebugLines(readBootDebugState()).join("\n");
}

function readBootDebugState(): BootDebugState {
  const debugInfo = nativeEmulator.readDebugInfo();

  return {
    core: debugInfo.core,
    failed: debugInfo.failed,
    frame: debugInfo.frame,
    inputLog: debugInfo.inputLog,
    loadStateUrl: debugInfo.loadStateUrl,
    overlayVisible: Boolean(app.querySelector("[data-emulator-boot]")),
    paused: debugInfo.paused,
    resources: readBootDebugResources(),
    runtimePrep: runtimePrepStatus,
    started: debugInfo.started,
    status: app.querySelector("[data-game-status]")?.textContent ?? "none",
    touchZones: readBootDebugTouchZones(),
    touchLog: window.__ponpokoTouchLog ?? [],
    videoHeight: debugInfo.videoHeight,
    videoWidth: debugInfo.videoWidth
  };
}

function readBootDebugResources(): BootDebugState["resources"] {
  return nativeEmulator.readResourceDebug();
}

function readBootDebugTouchZones(): BootDebugState["touchZones"] {
  const zones = [...app.querySelectorAll<HTMLElement>("[data-touch-zone]")];
  const touchControls = app.querySelector<HTMLElement>("[data-touch-controls]");
  const enabled = touchControls?.classList.contains("is-enabled") === true;
  const surface = getBootDebugTouchSurface(touchControls?.dataset.touchSurface);
  const visible = zones.some((zone) => {
    const style = getComputedStyle(zone);
    const hasText = (zone.textContent?.trim() ?? "").length > 0;
    const hasBackground = style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
    const hasBorder =
      Number.parseFloat(style.borderTopWidth) > 0 ||
      Number.parseFloat(style.borderRightWidth) > 0 ||
      Number.parseFloat(style.borderBottomWidth) > 0 ||
      Number.parseFloat(style.borderLeftWidth) > 0;

    return hasText || hasBackground || hasBorder;
  });

  return {
    count: zones.length,
    enabled,
    surface,
    visible
  };
}

function getBootDebugTouchSurface(surface: string | undefined): BootDebugState["touchZones"]["surface"] {
  if (surface === "bottom" || surface === "stage" || surface === "virtual") {
    return surface;
  }

  return "none";
}

function recordBootDebugTouch(action: ControlAction, type: BootDebugTouch["type"]): void {
  if (!bootDebugEnabled) {
    return;
  }

  const log = window.__ponpokoTouchLog ?? [];
  log.push({ action, type });
  window.__ponpokoTouchLog = log.slice(-12);
}

function startStartupAssist(game: GameEntry): void {
  stopStartupAssist();
  const sequence = getStartupAssistSequence(game);
  if (sequence.length === 0) {
    return;
  }

  let attempts = 0;
  const assist = () => {
    attempts += 1;
    void input.tapControlSequence(sequence, 70, 70);
    if (attempts >= 10) {
      stopStartupAssist();
    }
  };
  assist();
  startupAssistTimer = window.setInterval(assist, 1200);
}

function stopStartupAssist(): void {
  if (startupAssistTimer !== null) {
    window.clearInterval(startupAssistTimer);
    startupAssistTimer = null;
  }
}

function startAutosave(game: GameEntry): void {
  stopAutosave();
  void saveActiveAutosave(game);
  autosaveTimer = window.setInterval(() => {
    void saveActiveAutosave(game);
  }, AUTOSAVE_INTERVAL_MS);
}

function stopAutosave(): void {
  if (autosaveTimer !== null) {
    window.clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
}

async function saveActiveAutosave(expectedGame?: GameEntry): Promise<boolean> {
  if (autosaveInFlight || state.name !== "game") {
    return false;
  }

  const game = state.game;
  if (expectedGame && expectedGame.id !== game.id) {
    return false;
  }

  autosaveInFlight = true;
  try {
    const stateBytes = await nativeEmulator.saveState();
    return stateBytes ? await saveAutosaveState(game.id, stateBytes) : false;
  } finally {
    autosaveInFlight = false;
  }
}

async function saveManualStateSlot(): Promise<boolean> {
  if (manualStateInFlight || state.name !== "game") {
    return false;
  }

  const game = state.game;
  manualStateInFlight = true;
  setStateSlotButtonsDisabled(true);
  setGameStatus("저장 중");

  try {
    await waitForDelay(120);
    const stateBytes = await nativeEmulator.saveState();
    const saved = stateBytes ? await saveManualState(game.id, stateBytes) : false;
    if (isCurrentGame(game)) {
      setGameStatus(saved ? "저장 완료" : "저장 실패");
      scheduleGameStatusReset(game);
    }
    return saved;
  } finally {
    manualStateInFlight = false;
    if (isCurrentGame(game) && runtimeControlsEnabled) {
      setStateSlotButtonsDisabled(false);
    }
  }
}

async function loadManualStateSlot(): Promise<boolean> {
  if (manualStateInFlight || state.name !== "game") {
    return false;
  }

  const game = state.game;
  manualStateInFlight = true;
  input.releaseAll();
  setStateSlotButtonsDisabled(true);
  setGameStatus("불러오는 중");

  try {
    const savedState = await loadManualState(game.id);
    if (!savedState) {
      if (isCurrentGame(game)) {
        setGameStatus("저장 없음");
        scheduleGameStatusReset(game);
      }
      return false;
    }

    const loaded = await nativeEmulator.loadState(savedState.state);
    if (loaded) {
      await waitForDelay(150);
    }
    if (isCurrentGame(game)) {
      setGameStatus(loaded ? "불러오기 완료" : "불러오기 실패");
      scheduleGameStatusReset(game);
    }
    return loaded;
  } finally {
    manualStateInFlight = false;
    if (isCurrentGame(game) && runtimeControlsEnabled) {
      setStateSlotButtonsDisabled(false);
    }
  }
}

function isCurrentGame(game: GameEntry): boolean {
  return state.name === "game" && state.game.id === game.id;
}

function setStateSlotButtonsDisabled(disabled: boolean): void {
  app.querySelectorAll<HTMLButtonElement>("[data-save-state], [data-load-state]").forEach((button) => {
    button.disabled = disabled;
  });
}

function setGameStatus(status: string): void {
  const element = app.querySelector<HTMLElement>("[data-game-status]");
  if (element) {
    element.textContent = status;
  }
}

function scheduleGameStatusReset(game: GameEntry): void {
  stopManualStateStatusTimer();
  manualStateStatusTimer = window.setTimeout(() => {
    if (isCurrentGame(game)) {
      setGameStatus("플레이 중");
    }
    manualStateStatusTimer = null;
  }, 3_000);
}

function stopManualStateStatusTimer(): void {
  if (manualStateStatusTimer !== null) {
    window.clearTimeout(manualStateStatusTimer);
    manualStateStatusTimer = null;
  }
}

async function requestWakeLock(): Promise<void> {
  const maybeNavigator = navigator as Navigator & {
    wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
  };

  try {
    wakeLock = await maybeNavigator.wakeLock?.request("screen") ?? null;
  } catch {
    wakeLock = null;
  }
}

function releaseWakeLock(): void {
  void wakeLock?.release();
  wakeLock = null;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    void saveActiveAutosave();
    input.releaseAll();
  }
});

window.addEventListener("pagehide", (event) => {
  handleRuntimePageHide(event, createRuntimePageLifecycleContext());
});

window.addEventListener("pageshow", (event) => {
  handleRuntimePageShow(event, createRuntimePageLifecycleContext());
});

function createRuntimePageLifecycleContext(): RuntimePageLifecycleContext {
  return {
    disposeEmulator: () => nativeEmulator.dispose(),
    isGameActive: () => state.name === "game",
    isRuntimePlayable: () => runtimeControlsEnabled,
    pauseEmulator: () => nativeEmulator.pause(),
    releaseAllInputs: () => input.releaseAll(),
    releaseWakeLock,
    requestWakeLock: () => {
      void requestWakeLock();
    },
    saveActiveAutosave: () => {
      void saveActiveAutosave();
    },
    startAutosave: () => {
      if (state.name === "game") {
        startAutosave(state.game);
      }
    },
    startEmulator: () => {
      void nativeEmulator.start();
    },
    stopAutosave,
    stopBootDebugPanel,
    stopBootProgressMonitor,
    stopEmulatorChromeSuppression,
    stopManualStateStatusTimer,
    stopStartupAssist,
    suppressEmulatorChrome: () => nativeEmulator.suppressRuntimeChrome()
  };
}
