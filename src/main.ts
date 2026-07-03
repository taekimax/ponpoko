import {
  getBootProgressCopy,
  getBootProgressSnapshot as createBootProgressSnapshot,
  shouldEnableRuntimeControls,
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
import { type ControlAction, type ControllerProfile, getControllerProfile } from "./controllers";
import { createNativeEmulator } from "./emulator";
import { InputRouter } from "./input";
import { downloadRomArrayBuffer } from "./rom-download";
import { getStartupAssistSequence } from "./startup-assist";
import "./styles.css";

type ViewState =
  | { name: "menu"; intro: boolean }
  | { name: "loading"; game: GameEntry; progress: number; message: string }
  | { name: "game"; game: GameEntry; controlsEnabled: boolean; status: string }
  | { name: "error"; game: GameEntry; message: string };

declare global {
  interface Window {
    __ponpokoTouchLog?: BootDebugTouch[];
  }
}

const app = getRequiredAppRoot();
const nativeEmulator = createNativeEmulator();
const input = new InputRouter(nativeEmulator);
const SWIPE_THRESHOLD_PX = 34;
const TOUCH_POINTER_PREFIX = "touch:";
const POINTER_PREFIX = "pointer:";
let state: ViewState = { name: "menu", intro: true };
let wakeLock: WakeLockSentinel | null = null;
let startupAssistTimer: number | null = null;
let emulatorChromeObserver: MutationObserver | null = null;
let bootProgressTimer: number | null = null;
let bootProgressStartedAt = 0;
let bootDebugTimer: number | null = null;
let runtimeControlsEnabled = false;
let runtimeControlsFinalizing = false;
let runtimePrepStatus: BootDebugRuntimePrep = "pending";
const bootDebugEnabled = isBootDebugEnabled(window.location.search);

input.attachKeyboard(window);
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
    renderMenu(state.intro);
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

  renderError(state.game, state.message);
}

function renderMenu(showIntro: boolean): void {
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopBootDebugPanel();
  input.releaseAll();
  app.innerHTML = `
    <main class="app-shell menu-shell">
      <section class="menu-header">
        <p class="eyebrow">iPhone Safari Arcade</p>
        <h1>폰포코 아케이드</h1>
        <p>폰포코, 보글보글, 슈퍼 팡을 iPhone Safari 세로 화면에서 실행합니다.</p>
      </section>
      <section class="game-list" aria-label="게임 선택">
        ${CATALOG.map((game) => renderGameCard(game)).join("")}
      </section>
      ${showIntro ? renderIntroDialog() : ""}
    </main>
  `;

  app.querySelector<HTMLButtonElement>("[data-close-intro]")?.addEventListener("click", () => {
    setState({ name: "menu", intro: false });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-game-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const game = CATALOG.find((candidate) => candidate.id === button.dataset.gameId);
      if (game) {
        void startGame(game);
      }
    });
  });
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

function renderIntroDialog(): string {
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <section class="intro-modal">
        <h2 id="intro-title">조작 안내</h2>
        <p>폰포코는 화면 왼쪽이 왼쪽 이동, 가운데가 점프, 오른쪽이 오른쪽 이동입니다.</p>
        <p>다른 게임은 선택한 게임에 맞는 전용 버튼이 자동으로 표시됩니다.</p>
        <button class="primary-action" type="button" data-close-intro>확인하고 시작</button>
      </section>
    </div>
  `;
}

function renderLoading(game: GameEntry, progress: number, message: string): void {
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopBootDebugPanel();
  app.innerHTML = `
    <main class="app-shell play-shell">
      <section class="loading-panel" aria-live="polite">
        <div class="pixel-loader" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
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

function renderGame(game: GameEntry, controlsEnabled: boolean, status: string): void {
  const profile = getControllerProfile(game);
  const usesBottomZones = profile.zonePlacement === "bottom";

  app.innerHTML = `
    <main class="app-shell play-shell">
      <header class="game-topbar">
        <button class="icon-button" type="button" data-back>메뉴</button>
        <div>
          <strong>${game.titleKo}</strong>
          <span data-game-status>${status}</span>
        </div>
        <button class="coin-button" type="button" data-action="coin">동전</button>
        <button class="ok-button" type="button" data-action="ok">OK</button>
        <button class="start-button" type="button" data-action="start">시작</button>
      </header>
      <section class="game-stage">
        <div id="game"></div>
        ${controlsEnabled ? "" : renderEmulatorBootOverlay()}
        ${usesBottomZones ? "" : renderTouchZones(profile, controlsEnabled, "stage")}
      </section>
      <section class="control-panel ${usesBottomZones ? "has-bottom-zones" : ""}">
        <p>${profile.hint}</p>
        ${usesBottomZones ? renderTouchZones(profile, controlsEnabled, "bottom") : ""}
        ${renderActionButtons(profile)}
      </section>
      ${bootDebugEnabled ? renderBootDebugPanel() : ""}
    </main>
  `;

  app.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => {
    input.releaseAll();
    nativeEmulator.dispose();
    window.location.href = "/ponpoko/";
  });

  wireControls(app, profile);
}

function renderTouchZones(profile: ControllerProfile, controlsEnabled: boolean, surface: "bottom" | "stage"): string {
  const supportsSwipe = profile.swipe ? "true" : "false";
  return `
    <div
      class="touch-zones touch-zones-${surface} ${controlsEnabled ? "is-enabled" : ""}"
      data-touch-controls
      data-touch-surface="${surface}"
      aria-hidden="${controlsEnabled ? "false" : "true"}"
    >
      ${profile.zones.map((zone) => `
        <button
          class="touch-zone area-${zone.area}"
          type="button"
          data-action="${zone.action}"
          data-touch-zone
          data-swipe-zone="${supportsSwipe}"
          aria-label="${zone.label}"
        >${surface === "bottom" ? `<span aria-hidden="true">${getTouchZoneGlyph(zone)}</span>` : ""}</button>
      `).join("")}
    </div>
  `;
}

function getTouchZoneGlyph(zone: ControllerProfile["zones"][number]): string {
  if (zone.area === "left") {
    return "◀";
  }

  if (zone.area === "right") {
    return "▶";
  }

  if (zone.action === "jump") {
    return `<span class="jump-glyph"><span>▲</span><strong>${zone.label}</strong><span>▼</span></span>`;
  }

  return zone.label;
}

function renderActionButtons(profile: ControllerProfile): string {
  if (profile.buttons.length === 0) {
    return "";
  }

  return `
    <div class="action-buttons">
      ${profile.buttons.map((button) => `
        <button class="control-button tone-${button.tone}" type="button" data-action="${button.action}">
          ${button.label}
        </button>
      `).join("")}
    </div>
  `;
}

function renderEmulatorBootOverlay(): string {
  return `
    <div class="emulator-boot-overlay" data-emulator-boot aria-live="polite">
      <div>
        <div class="pixel-loader" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
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

function renderError(game: GameEntry, message: string): void {
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
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
    void startGame(game);
  });
  app.querySelector<HTMLButtonElement>("[data-menu]")?.addEventListener("click", () => {
    input.releaseAll();
    nativeEmulator.dispose();
    setState({ name: "menu", intro: false });
  });
}

async function startGame(game: GameEntry): Promise<void> {
  input.releaseAll();
  nativeEmulator.dispose();
  stopStartupAssist();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  runtimeControlsEnabled = false;
  runtimeControlsFinalizing = false;
  runtimePrepStatus = "pending";
  await unlockRuntimeAudio();
  await requestWakeLock();
  setState({ name: "loading", game, progress: 0, message: "ROM 파일을 준비합니다." });

  try {
    const romPath = getRomPath(game);
    const rom = await downloadRomArrayBuffer(romPath, {
      onProgress: (progress) => {
        setState({ name: "loading", game, progress, message: "ROM 파일을 가져오는 중입니다." });
      }
    });
    setState({ name: "game", game, controlsEnabled: false, status: "다운로드 완료. 에뮬레이터를 시작합니다." });
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
    releaseWakeLock();
    stopBootProgressMonitor();
    stopEmulatorChromeSuppression();
    setState({
      name: "error",
      game,
      message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
    });
  }
}

interface ActivePointer {
  currentAction: ControlAction;
  deferred: boolean;
  pressed: boolean;
  startX: number;
  startY: number;
}

function wireControls(root: HTMLElement, profile: ControllerProfile): void {
  const activePointers = new Map<string, ActivePointer>();

  root.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
    const action = element.dataset.action as ControlAction | undefined;
    if (!action) {
      return;
    }

    const supportsSwipe = element.dataset.swipeZone === "true";

    element.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      event.preventDefault();
      startControlPress(
        `${POINTER_PREFIX}${event.pointerId}`,
        action,
        event.clientX,
        event.clientY,
        supportsSwipe,
        profile,
        activePointers
      );
      trySetPointerCapture(element, event.pointerId);
    });

    element.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") {
        return;
      }

      event.preventDefault();
      moveControlPress(
        `${POINTER_PREFIX}${event.pointerId}`,
        event.clientX,
        event.clientY,
        supportsSwipe,
        profile,
        activePointers
      );
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
            touch.clientX,
            touch.clientY,
            supportsSwipe,
            profile,
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
        for (const touch of [...event.changedTouches]) {
          moveControlPress(
            `${TOUCH_POINTER_PREFIX}${touch.identifier}`,
            touch.clientX,
            touch.clientY,
            supportsSwipe,
            profile,
            activePointers
          );
        }
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

function startControlPress(
  pointerId: string,
  action: ControlAction,
  clientX: number,
  clientY: number,
  supportsSwipe: boolean,
  profile: ControllerProfile,
  activePointers: Map<string, ActivePointer>
): void {
  if (activePointers.has(pointerId)) {
    return;
  }

  const deferred = shouldDeferSwipeOrigin(action, supportsSwipe, profile);
  requestRuntimeAudioUnlock();
  activePointers.set(pointerId, {
    currentAction: action,
    deferred,
    pressed: !deferred,
    startX: clientX,
    startY: clientY
  });
  recordBootDebugTouch(action, "down");
  if (!deferred) {
    input.pressControl(action);
  }
}

function moveControlPress(
  pointerId: string,
  clientX: number,
  clientY: number,
  supportsSwipe: boolean,
  profile: ControllerProfile,
  activePointers: Map<string, ActivePointer>
): void {
  const activePointer = activePointers.get(pointerId);
  if (!activePointer || !profile.swipe || !supportsSwipe) {
    return;
  }

  const deltaX = clientX - activePointer.startX;
  const deltaY = clientY - activePointer.startY;
  const verticalDistance = Math.abs(deltaY);
  const horizontalDistance = Math.abs(deltaX);

  if (verticalDistance < SWIPE_THRESHOLD_PX || verticalDistance <= horizontalDistance) {
    return;
  }

  const nextAction = deltaY < 0 ? profile.swipe.up : profile.swipe.down;
  if (activePointer.currentAction === nextAction) {
    return;
  }

  if (activePointer.pressed) {
    input.releaseControl(activePointer.currentAction);
  }
  activePointer.currentAction = nextAction;
  activePointer.deferred = false;
  activePointer.pressed = true;
  recordBootDebugTouch(nextAction, "move");
  input.pressControl(nextAction);
}

function endControlPress(pointerId: string, activePointers: Map<string, ActivePointer>): void {
  const activePointer = activePointers.get(pointerId);
  if (!activePointer) {
    return;
  }

  recordBootDebugTouch(activePointer.currentAction, "up");
  if (activePointer.pressed) {
    input.releaseControl(activePointer.currentAction);
  } else {
    input.tapControl(activePointer.currentAction);
  }
  activePointers.delete(pointerId);
}

function shouldDeferSwipeOrigin(action: ControlAction, supportsSwipe: boolean, profile: ControllerProfile): boolean {
  return supportsSwipe && Boolean(profile.swipe) && action === "jump";
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
    const prepared = await prepareRuntimeControls(state.game);
    if (!prepared) {
      runtimePrepStatus = "failed";
      return;
    }
    enableRuntimeControls();
  } finally {
    runtimeControlsFinalizing = false;
  }
}

async function prepareRuntimeControls(game: GameEntry): Promise<boolean> {
  if (game.id !== "ponpoko") {
    return true;
  }

  const inputReady = await waitForPonpokoInputReady(10_000);
  if (!inputReady) {
    return false;
  }
  runtimePrepStatus = "input-ready";

  await acknowledgeMameCopyrightWarning();
  runtimePrepStatus = "warning-ack";
  const stateReloaded = await reloadPonpokoStartState();
  if (!stateReloaded) {
    return false;
  }
  runtimePrepStatus = "state-reloaded";

  return true;
}

async function waitForPonpokoInputReady(timeoutMs: number): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (nativeEmulator.isInputReady(120)) {
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

async function reloadPonpokoStartState(): Promise<boolean> {
  const reloaded = await nativeEmulator.reloadConfiguredState();
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
  const status = app.querySelector<HTMLElement>("[data-game-status]");
  if (status) {
    status.textContent = "플레이 중";
  }
  if (state.name === "game") {
    startStartupAssist(state.game);
  }
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

  if (shouldEnableRuntimeControls(snapshot)) {
    requestRuntimeControls();
    return;
  }

  if (shouldStopBoot(snapshot, elapsedSeconds)) {
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

  const message = snapshot.failed
    ? "에뮬레이터가 시작 실패를 보고했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요."
    : "에뮬레이터 첫 화면이 120초 안에 시작되지 않았습니다. iPhone Safari에서 탭을 새로고침하거나 다시 시도해 주세요.";

  releaseWakeLock();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopBootDebugPanel();
  setState({
    name: "error",
    game: state.game,
    message
  });
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
  if (surface === "bottom" || surface === "stage") {
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
    input.releaseAll();
  }
});

window.addEventListener("pagehide", () => {
  input.releaseAll();
  nativeEmulator.dispose();
  stopStartupAssist();
  stopBootProgressMonitor();
  stopEmulatorChromeSuppression();
  stopBootDebugPanel();
  releaseWakeLock();
});
