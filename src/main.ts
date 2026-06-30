import { CATALOG, type GameEntry, getRomPath, getThumbnailPath } from "./catalog";
import { type ControlAction, getControllerProfile } from "./controllers";
import { loadEmulator } from "./emulator";
import { InputManager } from "./input";
import { downloadRom } from "./rom-download";
import "./styles.css";

type ViewState =
  | { name: "menu"; intro: boolean }
  | { name: "loading"; game: GameEntry; progress: number; message: string }
  | { name: "game"; game: GameEntry; controlsEnabled: boolean; status: string }
  | { name: "error"; game: GameEntry; message: string };

const app = getRequiredAppRoot();
const input = new InputManager();
let state: ViewState = { name: "menu", intro: true };
let activeObjectUrl: string | null = null;
let wakeLock: WakeLockSentinel | null = null;
let startupAssistTimer: number | null = null;

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
  app.innerHTML = `
    <main class="app-shell menu-shell">
      <section class="menu-header">
        <p class="eyebrow">iPhone Safari Arcade</p>
        <h1>폰포코 아케이드</h1>
        <p>폰포코를 중심으로 엄선한 10개 고전게임을 실행합니다.</p>
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
  app.innerHTML = `
    <main class="app-shell play-shell">
      <section class="loading-panel" aria-live="polite">
        <div class="pixel-loader" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <p class="eyebrow">${game.titleKo}</p>
        <h1>ROM 다운로드 중</h1>
        <p>${message}</p>
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
        <div class="touch-zones ${controlsEnabled ? "is-enabled" : ""}" aria-hidden="${controlsEnabled ? "false" : "true"}">
          ${profile.zones.map((zone) => `
            <button class="touch-zone area-${zone.area}" type="button" data-action="${zone.action}">
              <span>${zone.label}</span>
            </button>
          `).join("")}
        </div>
      </section>
      <section class="control-panel">
        <p>${profile.hint}</p>
        <div class="action-buttons">
          ${profile.buttons.map((button) => `
            <button class="control-button tone-${button.tone}" type="button" data-action="${button.action}">
              ${button.label}
            </button>
          `).join("")}
        </div>
      </section>
    </main>
  `;

  app.querySelector<HTMLButtonElement>("[data-back]")?.addEventListener("click", () => {
    window.location.href = "/ponpoko/";
  });

  wireControls(app);
}

function renderError(game: GameEntry, message: string): void {
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
    setState({ name: "menu", intro: false });
  });
}

async function startGame(game: GameEntry): Promise<void> {
  releaseObjectUrl();
  input.releaseAll();
  stopStartupAssist();
  await requestWakeLock();
  setState({ name: "loading", game, progress: 0, message: "화면을 끄지 말고 기다려 주세요." });

  try {
    const romPath = getRomPath(game);
    const rom = await downloadRom(romPath, {
      createObjectUrl: false,
      onProgress: (progress) => {
        setState({ name: "loading", game, progress, message: "화면을 유지하면 다운로드가 안정적으로 완료됩니다." });
      }
    });
    activeObjectUrl = rom.objectUrl;
    const emulatorRomUrl = new URL(romPath, window.location.origin).href;
    setState({ name: "game", game, controlsEnabled: false, status: "다운로드 완료. 에뮬레이터를 시작합니다." });
    await waitForGameContainer();
    await loadEmulator(game, emulatorRomUrl, enableRuntimeControls);
  } catch (error) {
    releaseWakeLock();
    setState({
      name: "error",
      game,
      message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
    });
  }
}

function wireControls(root: HTMLElement): void {
  const activePointers = new Map<number, ControlAction>();

  root.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
    const action = element.dataset.action as ControlAction | undefined;
    if (!action) {
      return;
    }

    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      element.setPointerCapture(event.pointerId);
      activePointers.set(event.pointerId, action);
      input.press(action);
    });

    const release = (event: PointerEvent) => {
      event.preventDefault();
      const activeAction = activePointers.get(event.pointerId);
      if (activeAction) {
        input.release(activeAction);
        activePointers.delete(event.pointerId);
      }
    };

    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    element.addEventListener("pointerleave", release);
  });
}

function waitForGameContainer(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function enableRuntimeControls(): void {
  app.querySelector<HTMLElement>(".touch-zones")?.classList.add("is-enabled");
  const touchZones = app.querySelector<HTMLElement>(".touch-zones");
  if (touchZones) {
    touchZones.setAttribute("aria-hidden", "false");
  }
  const status = app.querySelector<HTMLElement>("[data-game-status]");
  if (status) {
    status.textContent = "플레이 중";
  }
  startStartupAssist();
}

function startStartupAssist(): void {
  stopStartupAssist();
  let attempts = 0;
  const assist = () => {
    attempts += 1;
    void sendConsoleOkSequence();
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

async function sendConsoleOkSequence(): Promise<void> {
  await input.tapSequence(["ok", "left", "right", "ok", "coin", "start"], 70, 70);
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

function releaseObjectUrl(): void {
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    input.releaseAll();
  }
});

window.addEventListener("pagehide", () => {
  input.releaseAll();
  stopStartupAssist();
  releaseWakeLock();
  releaseObjectUrl();
});
