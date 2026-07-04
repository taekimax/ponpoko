import { spawn } from "node:child_process";
import { inflateSync } from "node:zlib";
import { webkit } from "playwright";

const port = 4173;
const configuredBaseUrl = process.env.BROWSER_SMOKE_BASE_URL;
const throwPointerCapture = process.env.BROWSER_SMOKE_THROW_POINTER_CAPTURE === "1";
const baseUrl = configuredBaseUrl
  ? ensureTrailingSlash(configuredBaseUrl)
  : `http://127.0.0.1:${port}/ponpoko/`;
const appUrl = new URL("?bootDebug=1", baseUrl).href;
const baseHost = new URL(baseUrl).hostname;
const expectedRomBaseUrl = new URL("roms/", baseUrl).href;
const expectedRomUrl = new URL(
  "ponpoko.zip?v=8d77d65d7b0a8594a185e4d2c28aec91cf0cb0ff47ef56108e85e4a52f90024f",
  expectedRomBaseUrl
).href;
const expectedEmulatorBaseUrl = new URL("emulatorjs/", baseUrl).href;
const expectedStartStatePath = "/ponpoko/states/ponpoko-start.state?v=20260701";
const expectedStartStateUrl = new URL(`states/ponpoko-start.state?v=20260701`, baseUrl).href;
const expectedEmulatorResources = [
  "loader.js",
  "emulator.min.js",
  "emulator.min.css",
  "cores/reports/mame2003_plus.json",
  "cores/mame2003_plus-legacy-wasm.data",
  "compression/extract7z.js"
];

const server = configuredBaseUrl
  ? null
  : spawn("npm", ["run", "preview", "--", "--port", String(port)], {
      stdio: ["ignore", "pipe", "pipe"]
    });

try {
  await waitForServer(baseUrl);
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
  const page = await context.newPage();
  await page.addInitScript(({ throwPointerCapture }) => {
    if (throwPointerCapture) {
      Object.defineProperty(Element.prototype, "setPointerCapture", {
        configurable: true,
        value() {
          throw new Error("smoke setPointerCapture failure");
        }
      });
    }

    const originalFetch = window.fetch.bind(window);
    window.__smokeFetchCalls = [];
    window.__smokeAllInputCalls = [];
    window.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : new URL(String(input), window.location.href).href;
      const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
      window.__smokeFetchCalls.push({
        beforeLoaderScript: !document.querySelector('script[data-emulatorjs="loader"]'),
        rangeHeader: headers.get("range"),
        url
      });
      if (url.endsWith("/ponpoko.zip")) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return originalFetch(input, init);
    };

    window.__smokePatchInputCapture = () => {
      const gameManager = window.EJS_emulator?.gameManager;
      if (!gameManager?.simulateInput || gameManager.__smokeInputPatched) {
        return;
      }

      const original = gameManager.simulateInput.bind(gameManager);
      gameManager.__smokeInputPatched = true;
      gameManager.simulateInput = (player, input, pressed) => {
        const call = { input, player, pressed };
        window.__smokeAllInputCalls.push(call);
        window.__smokeInputCalls?.push(call);
        original(player, input, pressed);
      };
    };
    window.setInterval(() => window.__smokePatchInputCapture?.(), 50);
  }, { throwPointerCapture });

  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.evaluate(({ romUrl, startStateUrl }) => {
    window.__expectedSmokeRomUrl = romUrl;
    window.__expectedSmokeStartStateUrl = startStateUrl;
  }, { romUrl: expectedRomUrl, startStateUrl: expectedStartStateUrl });
  const intro = page.getByRole("button", { name: "확인하고 시작" });
  if (await intro.count()) {
    await intro.click();
  }
  await page.locator('[data-game-id="ponpoko"]').click();
  await page.getByText("ROM 다운로드 중").waitFor({ timeout: 5_000 });
  const loadingAnimationVisible = await page.locator(".loading-panel .pixel-loader").count();
  if (loadingAnimationVisible > 0) {
    throw new Error("Loading screen should not render the top pixel-loader animation");
  }
  await page.locator("[data-game-status]").getByText(/다운로드 완료|게임 시작/).waitFor({ timeout: 45_000 });
  await page.getByText("에뮬레이터 준비 중").waitFor({ timeout: 5_000 });
  await page.getByText(/처음 실행은 잠시 멈춘 것처럼 보일 수 있습니다/).waitFor({ timeout: 5_000 });
  await page.getByText(/경과 \d+초/).waitFor({ timeout: 5_000 });
  await page.getByText("ROM 다운로드 완료").waitFor({ timeout: 5_000 });
  await page.getByText("EmulatorJS 로더 확인").waitFor({ timeout: 5_000 });
  await page.locator('[data-boot-step="emulator"]').waitFor({ timeout: 5_000 });
  await page.getByText(/처음 실행은 잠시 멈춘 것처럼 보일 수 있습니다/).waitFor({ timeout: 5_000 });
  await page.locator("[data-boot-phase]").getByText(/로더|초기화|런타임|캔버스|프레임/).waitFor({ timeout: 5_000 });
  const bootDetailState = await page.evaluate(() => ({
    detail: document.querySelector("[data-boot-detail]")?.textContent ?? "",
    elapsed: document.querySelector("[data-boot-elapsed]")?.textContent ?? "",
    note: document.querySelector("[data-boot-note]")?.textContent ?? "",
    phase: document.querySelector("[data-boot-phase]")?.textContent ?? "",
    steps: [...document.querySelectorAll("[data-boot-step]")].map((element) => element.textContent?.trim() ?? "")
  }));
  if (!/origin|코어|런타임|캔버스|프레임/.test(bootDetailState.detail)) {
    throw new Error(`Boot overlay detail is not specific enough: ${JSON.stringify(bootDetailState)}`);
  }
  if (!/경과 \d+초/.test(bootDetailState.elapsed) || bootDetailState.steps.length < 5) {
    throw new Error(`Boot overlay is missing elapsed time or detailed steps: ${JSON.stringify(bootDetailState)}`);
  }
  if (!/처음 실행은 잠시 멈춘 것처럼 보일 수 있습니다/.test(`${bootDetailState.detail} ${bootDetailState.note}`)) {
    throw new Error(`Boot overlay does not briefly pre-warn about first-run stalls: ${JSON.stringify(bootDetailState)}`);
  }
  await page.locator("#game").waitFor({ timeout: 10_000 });
  await page.locator("canvas").first().waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => (window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0) >= 120, { timeout: 30_000 });
  const earlyStageScreenshot = await page.locator(".game-stage").screenshot();
  if (hasMameCopyrightWarning(earlyStageScreenshot)) {
    throw new Error("MAME copyright warning is visible when gameplay controls first become active");
  }
  await page.waitForTimeout(18_000);

  const runtimeState = await page.evaluate((emulatorBaseUrl) => ({
    bodyText: document.body.innerText,
    core: window.EJS_core,
    dataPath: window.EJS_pathtodata,
    disableDatabases: window.EJS_disableDatabases,
    failed: window.EJS_emulator?.failedToStart,
    forceLegacyCores: window.EJS_forceLegacyCores,
    frame: window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0,
    configuredGameUrl: window.EJS_emulator?.config?.gameUrl,
    configuredLoadState: window.EJS_emulator?.config?.loadState,
    gameUrlKind: window.EJS_gameUrl instanceof File ? "file" : typeof window.EJS_gameUrl,
    gameUrlName: window.EJS_gameUrl instanceof File ? window.EJS_gameUrl.name : window.EJS_gameUrl,
    loadStateUrl: window.EJS_loadStateURL,
    paused: window.EJS_emulator?.paused,
    preLoaderEmulatorFetches: (window.__smokeFetchCalls ?? [])
      .filter((call) => call.beforeLoaderScript && call.url.startsWith("https://cdn.emulatorjs.org/stable/data/"))
      .map((call) => call.url),
    romFetchCalls: (window.__smokeFetchCalls ?? [])
      .filter((call) => call.url === window.__expectedSmokeRomUrl),
    emulatorCdnResources: performance.getEntriesByType("resource")
      .filter((entry) => entry.name.startsWith("https://cdn.emulatorjs.org/"))
      .map((entry) => entry.name),
    emulatorLocalResources: performance.getEntriesByType("resource")
      .filter((entry) => entry.name.startsWith(emulatorBaseUrl))
      .map((entry) => entry.name.slice(emulatorBaseUrl.length)),
    romRequests: performance.getEntriesByType("resource")
      .filter((entry) => entry.name === window.__expectedSmokeRomUrl)
      .length,
    stateRequests: performance.getEntriesByType("resource")
      .filter((entry) => entry.name === window.__expectedSmokeStartStateUrl)
      .length,
    started: window.EJS_emulator?.started,
    videoHeight: window.EJS_emulator?.gameManager?.getVideoDimensions?.("height"),
    videoWidth: window.EJS_emulator?.gameManager?.getVideoDimensions?.("width")
  }), expectedEmulatorBaseUrl);

  if (runtimeState.core !== "mame2003_plus") {
    throw new Error(`Expected mame2003_plus core, got ${runtimeState.core}`);
  }
  if (runtimeState.dataPath !== "/ponpoko/emulatorjs/") {
    throw new Error(`Expected local EmulatorJS data path, got ${runtimeState.dataPath}`);
  }
  if (runtimeState.disableDatabases !== true) {
    throw new Error(`Expected EmulatorJS IndexedDB caches to be disabled, got ${runtimeState.disableDatabases}`);
  }
  if (runtimeState.forceLegacyCores !== true) {
    throw new Error(`Expected legacy core path to be forced for Ponpoko state compatibility, got ${runtimeState.forceLegacyCores}`);
  }
  if (runtimeState.gameUrlKind !== "file" || runtimeState.gameUrlName !== "ponpoko.zip") {
    throw new Error(`Expected warmed Ponpoko File ROM input, got ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.configuredGameUrl !== "ponpoko.zip") {
    throw new Error(`Expected EmulatorJS to preserve Ponpoko ROM filename, got ${runtimeState.configuredGameUrl}`);
  }
  if (runtimeState.romRequests !== 1) {
    throw new Error(`Expected one Ponpoko network ROM request before EmulatorJS startup, got ${runtimeState.romRequests}`);
  }
  if (
    runtimeState.romFetchCalls.length !== 1 ||
    runtimeState.romFetchCalls.some((call) => call.rangeHeader !== null)
  ) {
    throw new Error(`Expected one complete Ponpoko ZIP fetch without Range headers, got ${JSON.stringify(runtimeState.romFetchCalls)}`);
  }
  if (runtimeState.loadStateUrl !== expectedStartStatePath || runtimeState.configuredLoadState !== expectedStartStatePath) {
    throw new Error(`Expected Ponpoko post-warning start state to be configured, got ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.stateRequests !== 2) {
    throw new Error(`Expected initial and post-warning Ponpoko start state requests, got ${runtimeState.stateRequests}`);
  }
  if (runtimeState.preLoaderEmulatorFetches.length > 0) {
    throw new Error(`App fetched EmulatorJS CDN assets before loader startup: ${JSON.stringify(runtimeState.preLoaderEmulatorFetches)}`);
  }
  const disallowedEmulatorCdnResources = runtimeState.emulatorCdnResources.filter(
    (url) => !isAllowedLocalEmulatorCdnResource(url, baseHost)
  );
  if (disallowedEmulatorCdnResources.length > 0) {
    throw new Error(`EmulatorJS loaded cross-origin CDN resources: ${JSON.stringify(disallowedEmulatorCdnResources)}`);
  }
  const loadedEmulatorResources = new Set(runtimeState.emulatorLocalResources);
  const missingEmulatorResources = expectedEmulatorResources.filter((resource) => !loadedEmulatorResources.has(resource));
  if (missingEmulatorResources.length > 0) {
    throw new Error(
      `EmulatorJS did not load expected same-origin resources: ${JSON.stringify({
        missing: missingEmulatorResources,
        loaded: runtimeState.emulatorLocalResources
      })}`
    );
  }
  if (runtimeState.failed || !runtimeState.started || runtimeState.paused) {
    throw new Error(`Emulator did not reach active play state: ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.frame < 60 || runtimeState.videoWidth !== 288 || runtimeState.videoHeight !== 224) {
    throw new Error(`Ponpoko video did not advance as expected: ${JSON.stringify(runtimeState)}`);
  }
  const canvasLayout = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const stage = document.querySelector(".game-stage");
    if (!canvas || !stage) {
      return null;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    return {
      canvasHeight: canvasRect.height,
      canvasRatio: canvasRect.width / canvasRect.height,
      canvasWidth: canvasRect.width,
      expectedRatio: 288 / 224,
      stageHeight: stageRect.height,
      stageWidth: stageRect.width
    };
  });
  if (
    !canvasLayout ||
    Math.abs(canvasLayout.canvasRatio - canvasLayout.expectedRatio) > 0.04 ||
    Math.abs(canvasLayout.stageWidth / canvasLayout.stageHeight - canvasLayout.expectedRatio) > 0.04 ||
    canvasLayout.stageWidth > 460 ||
    canvasLayout.canvasHeight > canvasLayout.stageHeight + 1
  ) {
    throw new Error(`Ponpoko stage/canvas is not aspect-bound: ${JSON.stringify(canvasLayout)}`);
  }
  if (/Failed to start game|Load Content|Main Menu|Restart|Save State|Load State|Context Menu|Virtual Gamepad|Click to resume Emulator|\bundefined\b/.test(runtimeState.bodyText)) {
    throw new Error(`Unexpected emulator menu/error text: ${runtimeState.bodyText}`);
  }
  if (/에뮬레이터 준비 중/.test(runtimeState.bodyText)) {
    throw new Error(`Emulator boot overlay did not clear after startup: ${runtimeState.bodyText}`);
  }

  const saveButton = page.locator("[data-save-state]");
  await saveButton.waitFor({ timeout: 5_000 });
  const saveButtonState = await saveButton.evaluate((button) => ({
    disabled: button.disabled,
    text: button.textContent?.trim() ?? ""
  }));
  if (saveButtonState.disabled || !/저장/.test(saveButtonState.text)) {
    throw new Error(`Manual save button is not ready after gameplay starts: ${JSON.stringify(saveButtonState)}`);
  }
  await saveButton.click();
  await waitForGameStatus(page, "저장 완료");
  const loadButton = page.locator("[data-load-state]");
  await loadButton.waitFor({ timeout: 5_000 });
  const loadButtonState = await loadButton.evaluate((button) => ({
    disabled: button.disabled,
    text: button.textContent?.trim() ?? ""
  }));
  if (loadButtonState.disabled || !/불러오기/.test(loadButtonState.text)) {
    throw new Error(`Manual load button is not ready after saving: ${JSON.stringify(loadButtonState)}`);
  }
  await loadButton.click();
  await waitForGameStatus(page, "불러오기 완료");

  const stageScreenshot = await page.locator(".game-stage").screenshot();
  if (hasMameCopyrightWarning(stageScreenshot)) {
    throw new Error("MAME copyright warning is still visible over gameplay");
  }

  const visibleEmulatorChrome = await page.evaluate(() => {
    const selectors = [".ejs_virtualGamepad_parent", ".ejs_menu_bar", ".ejs_context_menu", ".ejs_settings_parent", ".ejs_popup_container"];
    return selectors.flatMap((selector) => {
      return [...document.querySelectorAll(selector)].flatMap((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0;

        return visible ? [{ selector, width: rect.width, height: rect.height, text: element.innerText }] : [];
      });
    });
  });

  if (visibleEmulatorChrome.length > 0) {
    throw new Error(`Emulator chrome is visible over the game: ${JSON.stringify(visibleEmulatorChrome)}`);
  }

  const unsuppressedEmulatorChrome = await page.evaluate(() => {
    const selectors = [".ejs_virtualGamepad_parent", ".ejs_menu_bar", ".ejs_context_menu", ".ejs_settings_parent", ".ejs_popup_container"];
    return selectors.flatMap((selector) => {
      return [...document.querySelectorAll(selector)].flatMap((element) => {
        const style = getComputedStyle(element);
        const suppressed =
          element.hasAttribute("hidden") ||
          element.inert === true ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.pointerEvents === "none";

        return suppressed
          ? []
          : [{
              pointerEvents: style.pointerEvents,
              selector,
              tagName: element.tagName,
              visibility: style.visibility
            }];
      });
    });
  });

  if (unsuppressedEmulatorChrome.length > 0) {
    throw new Error(`Runtime chrome exists without hidden/inert/pointer-events suppression: ${JSON.stringify(unsuppressedEmulatorChrome)}`);
  }

  const visibleStageTouchZoneChrome = await page.evaluate(() => {
    return [...document.querySelectorAll('[data-touch-surface="stage"] [data-touch-zone]')].flatMap((element) => {
      const style = getComputedStyle(element);
      const visibleText = element.textContent?.trim() ?? "";
      const hasBackground = style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent";
      const hasBorder =
        Number.parseFloat(style.borderTopWidth) > 0 ||
        Number.parseFloat(style.borderRightWidth) > 0 ||
        Number.parseFloat(style.borderBottomWidth) > 0 ||
        Number.parseFloat(style.borderLeftWidth) > 0;

      return visibleText || hasBackground || hasBorder
        ? [{
            backgroundColor: style.backgroundColor,
            borderTopWidth: style.borderTopWidth,
            text: visibleText
          }]
        : [];
    });
  });

  if (visibleStageTouchZoneChrome.length > 0) {
    throw new Error(`Stage touch zones are visible over the game: ${JSON.stringify(visibleStageTouchZoneChrome)}`);
  }

  await page.evaluate(() => {
    const gameManager = window.EJS_emulator?.gameManager;
    if (!gameManager?.simulateInput) {
      throw new Error("EmulatorJS simulateInput is not available");
    }
    window.__smokePatchInputCapture?.();
  });

  const startupInputCalls = await page.evaluate(() => window.__smokeAllInputCalls ?? []);
  const movementStartupInputCalls = startupInputCalls.filter((call) => ![2, 3].includes(call.input));
  const expectedWarningAckCalls = [
    { input: 6, player: 0, pressed: 1 },
    { input: 6, player: 0, pressed: 0 },
    { input: 7, player: 0, pressed: 1 },
    { input: 7, player: 0, pressed: 0 }
  ];
  if (JSON.stringify(movementStartupInputCalls) !== JSON.stringify(expectedWarningAckCalls)) {
    throw new Error(
      `Ponpoko should only receive one automatic left/right warning acknowledgement before manual play: ${JSON.stringify(startupInputCalls)}`
    );
  }

  await page.evaluate(() => {
    window.__smokeInputCalls = [];
  });

  const leftControl = page.locator('[data-touch-surface="virtual"] [data-action="left"]').first();
  const leftBox = await leftControl.boundingBox();
  if (!leftBox) {
    throw new Error("Left control was not found");
  }
  const stageBox = await page.locator(".game-stage").boundingBox();
  if (!stageBox) {
    throw new Error("Game stage was not found");
  }
  const leftControlLayout = await leftControl.evaluate((element) => ({
    ariaLabel: element.getAttribute("aria-label") ?? "",
    surface: element.closest("[data-touch-controls]")?.getAttribute("data-touch-surface") ?? "none",
    text: element.textContent?.trim() ?? ""
  }));
  if (leftControlLayout.surface !== "virtual") {
    throw new Error(`Expected Ponpoko controls in the universal virtual controller, got ${JSON.stringify(leftControlLayout)}`);
  }
  if (leftBox.y < stageBox.y + stageBox.height - 1) {
    throw new Error(`Virtual D-pad overlaps the game stage: ${JSON.stringify({ leftBox, stageBox })}`);
  }
  if (!leftControlLayout.ariaLabel) {
    throw new Error(`D-pad slice is missing an accessible label: ${JSON.stringify(leftControlLayout)}`);
  }
  const controllerLayout = await page.evaluate(() => {
    const surface = document.querySelector('[data-touch-surface="virtual"]');
    const stage = document.querySelector(".game-stage");
    const stick = document.querySelector(".virtual-stick");
    const zones = [...document.querySelectorAll('[data-touch-surface="virtual"] [data-touch-zone]')];
    const buttons = [...document.querySelectorAll('[data-touch-surface="virtual"] .virtual-game-button')];
    const toRect = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width
      };
    };
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0;
    };
    const inactiveButtons = buttons.filter((button) => button.disabled || button.getAttribute("aria-disabled") === "true");
    const stickRect = stick ? toRect(stick) : null;
    const buttonRects = buttons.map(toRect);
    const zoneDetails = zones.map((zone) => {
      const rect = toRect(zone);
      return {
        action: zone.getAttribute("data-action"),
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        clipPath: getComputedStyle(zone).clipPath,
        rect
      };
    });
    const buttonCenters = buttons.map((button) => {
      const rect = toRect(button);
      return {
        id: button.getAttribute("data-controller-button"),
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    });
    return {
      buttonCount: buttons.length,
      buttonCenters,
      buttonsVisible: buttons.every(isVisible),
      controlRect: surface ? toRect(surface) : null,
      dpadLeftOfButtons: stickRect !== null && buttonRects.length > 0
        ? stickRect.right < Math.min(...buttonRects.map((rect) => rect.left))
        : false,
      inactiveCount: inactiveButtons.length,
      inactiveDimmed: inactiveButtons.every((button) => {
        const style = getComputedStyle(button);
        return Number.parseFloat(style.opacity || "1") <= 0.5 && style.pointerEvents === "none";
      }),
      stageRect: stage ? toRect(stage) : null,
      stickRect,
      surface: surface?.getAttribute("data-touch-surface") ?? "none",
      viewportHeight: window.innerHeight,
      zoneActions: zones.map((zone) => zone.getAttribute("data-action")),
      zoneDetails,
      zonesVisible: zones.every(isVisible)
    };
  });
  if (
    controllerLayout.surface !== "virtual" ||
    JSON.stringify(controllerLayout.zoneActions) !== JSON.stringify(["up", "right", "down", "left"]) ||
    controllerLayout.buttonCount !== 6
  ) {
    throw new Error(`Ponpoko does not use the universal mobile controller: ${JSON.stringify(controllerLayout)}`);
  }
  if (!controllerLayout.stageRect || !controllerLayout.controlRect || controllerLayout.controlRect.top < controllerLayout.stageRect.bottom - 1) {
    throw new Error(`Universal controller overlaps gameplay: ${JSON.stringify(controllerLayout)}`);
  }
  if (!controllerLayout.zonesVisible || !controllerLayout.buttonsVisible) {
    throw new Error(`Universal controller controls are not visible: ${JSON.stringify(controllerLayout)}`);
  }
  if (controllerLayout.inactiveCount !== 5 || !controllerLayout.inactiveDimmed) {
    throw new Error(`Ponpoko inactive buttons are not visibly dimmed: ${JSON.stringify(controllerLayout)}`);
  }
  assertUniversalControllerGeometry(controllerLayout, "Ponpoko");
  const touchInterceptors = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('[data-touch-surface="virtual"] [data-touch-zone], [data-touch-surface="virtual"] .virtual-game-button:not(:disabled), .game-topbar [data-action]')].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.pointerEvents !== "none";
    });

    return controls.flatMap((control) => {
      const rect = control.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const stack = document.elementsFromPoint(x, y);
      const top = stack[0] ?? null;
      const topControl = top?.closest?.("[data-action], [data-touch-zone]") ?? null;
      const hiddenBlockers = stack.filter((element) => {
        const style = getComputedStyle(element);
        const hidden = element.hasAttribute("hidden") ||
          element.getAttribute("aria-hidden") === "true" ||
          style.display === "none" ||
          style.visibility === "hidden";
        return hidden && !control.contains(element) && style.pointerEvents !== "none";
      });

      if (topControl !== control || hiddenBlockers.length > 0) {
        return [{
          action: control.getAttribute("data-action") ?? control.getAttribute("aria-label") ?? control.className,
          hiddenBlockers: hiddenBlockers.map((element) => ({
            className: element.className,
            tagName: element.tagName
          })),
          topClassName: top?.className ?? "",
          topTagName: top?.tagName ?? "none"
        }];
      }

      return [];
    });
  });
  if (touchInterceptors.length > 0) {
    throw new Error(`Hidden overlay or unrelated element intercepts controls: ${JSON.stringify(touchInterceptors)}`);
  }
  await page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(100);
  const activeBackground = await leftControl.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.mouse.up();
  if (activeBackground === "rgba(0, 0, 0, 0)" || activeBackground === "transparent") {
    throw new Error(`Virtual D-pad control is not visibly tappable: ${activeBackground}`);
  }
  await assertControlFeedback(page, '[data-touch-surface="virtual"] [data-action="left"]', "D-pad left");
  await assertControlFeedback(page, '[data-touch-surface="virtual"] [data-action="jump"]', "jump button");
  await page.evaluate(() => {
    window.__smokeInputCalls = [];
  });

  await holdControl(page, "left", 650);
  const leftHoldCalls = await page.evaluate(() => window.__smokeInputCalls ?? []);
  assertInputPair(leftHoldCalls, 6, "left hold");
  assertMinimumPresses(leftHoldCalls, 6, "left hold", 3);
  await page.evaluate(() => {
    window.__smokeInputCalls = [];
  });
  await holdControl(page, "jump", 350);
  await page.waitForTimeout(120);
  const jumpHoldCalls = await page.evaluate(() => window.__smokeInputCalls ?? []);
  assertInputPair(jumpHoldCalls, 0, "jump hold");
  await page.evaluate(() => {
    window.__smokeInputCalls = [];
  });
  await tapTouchscreenControl(page, "up");
  const upTapCalls = await page.evaluate(() => window.__smokeInputCalls ?? []);
  assertInputPair(upTapCalls, 4, "D-pad up tap");
  await page.evaluate(() => {
    window.__smokeInputCalls = [];
  });
  await tapTouchscreenControl(page, "down");
  const downTapCalls = await page.evaluate(() => window.__smokeInputCalls ?? []);
  assertInputPair(downTapCalls, 5, "D-pad down tap");
  await page.evaluate(() => {
    window.__smokeInputCalls = [];
  });
  const inactiveBox = await page.locator('[data-touch-surface="virtual"] .virtual-game-button.is-inactive').first().boundingBox();
  if (!inactiveBox) {
    throw new Error("Inactive virtual button was not found");
  }
  await page.mouse.click(inactiveBox.x + inactiveBox.width / 2, inactiveBox.y + inactiveBox.height / 2);
  await page.waitForTimeout(120);
  const inactiveButtonCalls = await page.evaluate(() => window.__smokeInputCalls ?? []);
  if (inactiveButtonCalls.length > 0) {
    throw new Error(`Inactive virtual button sent input: ${JSON.stringify(inactiveButtonCalls)}`);
  }
  await page.evaluate(() => {
    window.__smokeInputCalls = [];
  });
  await tapTouchscreenControl(page, "left");
  await tapTouchscreenControl(page, "jump");
  await tapTouchscreenControl(page, "right");
  await page.waitForFunction(() => {
    const text = document.querySelector("[data-boot-debug]")?.textContent ?? "";
    return text.includes("prep=controls-enabled") &&
      text.includes("touchZones=4 enabled=true visible=true surface=virtual") &&
      text.includes("touches=") && text.includes("right:down") && text.includes("right:up") &&
      text.includes("inputs=") && text.includes("7:1") && text.includes("7:0");
  }, { timeout: 5_000 });

  const inputCalls = await page.evaluate(() => window.__smokeInputCalls ?? []);
  assertInputPair(inputCalls, 6, "touchscreen left tap");
  assertInputPair(inputCalls, 0, "touchscreen jump tap");
  assertInputPair(inputCalls, 7, "touchscreen right tap");

  const frameBeforeKeyboard = await page.evaluate(() => window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0);
  await page.evaluate(() => {
    window.__smokeInputCalls = [];
  });
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(180);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("KeyQ");
  await page.waitForTimeout(120);
  await page.keyboard.up("KeyQ");
  await page.keyboard.press("Digit5");
  await page.keyboard.press("Enter");
  await page.keyboard.press("KeyO");
  await page.waitForTimeout(450);
  const keyboardInputCalls = await page.evaluate(() => window.__smokeInputCalls ?? []);
  assertInputPair(keyboardInputCalls, 6, "keyboard left");
  assertInputPair(keyboardInputCalls, 0, "keyboard jump");
  assertInputPair(keyboardInputCalls, 2, "keyboard coin");
  assertInputPair(keyboardInputCalls, 3, "keyboard play");
  assertInputPair(keyboardInputCalls, 7, "keyboard OK");
  const frameAfterKeyboard = await page.evaluate(() => window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0);
  if (frameAfterKeyboard <= frameBeforeKeyboard) {
    throw new Error(`Gameplay frames stopped during keyboard input: before=${frameBeforeKeyboard} after=${frameAfterKeyboard}`);
  }

  const scrollState = await page.evaluate(() => ({
    scrollX: window.scrollX,
    scrollY: window.scrollY
  }));
  if (scrollState.scrollX !== 0 || scrollState.scrollY !== 0) {
    throw new Error(`Touch/keyboard controls scrolled the page: ${JSON.stringify(scrollState)}`);
  }

  await page.getByRole("button", { name: "메뉴" }).click();
  await page.waitForURL(baseUrl, { timeout: 10_000 });
  await page.locator('[data-game-id="ponpoko"]').waitFor({ timeout: 5_000 });
  const menuState = await page.evaluate(() => ({
    bodyText: document.body.innerText,
    canvasCount: document.querySelectorAll("#game canvas").length,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  }));
  if (
    menuState.canvasCount !== 0 ||
    /플레이 중|에뮬레이터 준비 중|다운로드 완료/.test(menuState.bodyText) ||
    menuState.scrollX !== 0 ||
    menuState.scrollY !== 0
  ) {
    throw new Error(`Menu disposal did not return to a clean menu state: ${JSON.stringify(menuState)}`);
  }

  await browser.close();
  console.log("browser smoke ok: WebKit Ponpoko ROM fetch, active gameplay, keyboard/touch input, overlay hit tests, no scroll, and menu disposal verified");
} finally {
  server?.kill("SIGTERM");
}

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

function isAllowedLocalEmulatorCdnResource(url, host) {
  return (
    ["localhost", "127.0.0.1"].includes(host) &&
    url === "https://cdn.emulatorjs.org/stable/data/version.json"
  );
}

async function waitForServer(url) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // wait
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Preview server did not start at ${url}`);
}

async function waitForGameStatus(page, expectedStatus) {
  await page.waitForFunction((status) => {
    return document.querySelector("[data-game-status]")?.textContent === status;
  }, expectedStatus, { timeout: 10_000 });
}

function assertUniversalControllerGeometry(layout, label) {
  if (!layout.dpadLeftOfButtons || !layout.stickRect) {
    throw new Error(`${label} D-pad is not positioned to the left of action buttons: ${JSON.stringify(layout)}`);
  }

  const stickMidX = layout.stickRect.left + layout.stickRect.width / 2;
  const stickMidY = layout.stickRect.top + layout.stickRect.height / 2;
  const zones = new Map(layout.zoneDetails.map((zone) => [zone.action, zone]));
  const expectedQuadrants = [
    ["up", (zone) => Math.abs(zone.centerX - stickMidX) <= layout.stickRect.width * 0.12 && zone.centerY < stickMidY],
    ["right", (zone) => zone.centerX > stickMidX && Math.abs(zone.centerY - stickMidY) <= layout.stickRect.height * 0.12],
    ["down", (zone) => Math.abs(zone.centerX - stickMidX) <= layout.stickRect.width * 0.12 && zone.centerY > stickMidY],
    ["left", (zone) => zone.centerX < stickMidX && Math.abs(zone.centerY - stickMidY) <= layout.stickRect.height * 0.12]
  ];

  for (const [action, matchesQuadrant] of expectedQuadrants) {
    const zone = zones.get(action);
    if (!zone || zone.clipPath === "none" || !matchesQuadrant(zone)) {
      throw new Error(`${label} D-pad slice ${action} is not a clipped wedge in the expected quadrant: ${JSON.stringify(layout)}`);
    }
  }

  const buttons = layout.buttonCenters;
  if (
    buttons.length !== 6 ||
    !isRisingDiagonal(buttons.slice(0, 3)) ||
    !isRisingDiagonal(buttons.slice(3, 6))
  ) {
    throw new Error(`${label} action buttons are not arranged in two rising diagonals: ${JSON.stringify(layout)}`);
  }
}

function isRisingDiagonal(buttons) {
  return buttons.length === 3 &&
    buttons[0].x < buttons[1].x &&
    buttons[1].x < buttons[2].x &&
    buttons[0].y > buttons[1].y &&
    buttons[1].y > buttons[2].y;
}

async function assertControlFeedback(page, selector, label) {
  const control = page.locator(selector).first();
  const box = await control.boundingBox();
  if (!box) {
    throw new Error(`${label} control was not found for feedback check`);
  }

  const before = await control.evaluate(readFeedbackStyle);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(80);
  const active = await control.evaluate(readFeedbackStyle);
  await page.mouse.up();

  if (
    before.filter === active.filter &&
    before.boxShadow === active.boxShadow &&
    before.transform === active.transform
  ) {
    throw new Error(`${label} does not show haptic-style visual feedback: ${JSON.stringify({ active, before })}`);
  }
}

function readFeedbackStyle(element) {
  const style = getComputedStyle(element);
  return {
    boxShadow: style.boxShadow,
    filter: style.filter,
    transform: style.transform
  };
}

async function holdControl(page, action, durationMs) {
  const box = await page.locator(`[data-action="${action}"]`).first().boundingBox();
  if (!box) {
    throw new Error(`Control ${action} was not found`);
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(durationMs);
  await page.mouse.up();
}

async function tapTouchscreenControl(page, action) {
  const box = await page.locator(`[data-action="${action}"]`).first().boundingBox();
  if (!box) {
    throw new Error(`Control ${action} was not found`);
  }

  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(180);
}

function assertInputPair(calls, input, label) {
  const pressed = calls.some((call) => call.input === input && call.pressed === 1);
  const released = calls.some((call) => call.input === input && call.pressed === 0);
  if (!pressed || !released) {
    throw new Error(`${label} control did not send input ${input}: ${JSON.stringify(calls)}`);
  }
}

function assertMinimumPresses(calls, input, label, minimum) {
  const pressCount = calls.filter((call) => call.input === input && call.pressed === 1).length;
  if (pressCount < minimum) {
    throw new Error(`${label} did not sustain input ${input}; expected ${minimum} presses, got ${pressCount}: ${JSON.stringify(calls)}`);
  }
}

function hasMameCopyrightWarning(pngBuffer) {
  const image = decodePngRgba(pngBuffer);
  const yStart = Math.floor(image.height * 0.12);
  const yEnd = Math.floor(image.height * 0.36);
  const requiredRun = Math.floor(image.width * 0.62);

  for (let y = yStart; y < yEnd; y += 1) {
    let run = 0;
    for (let x = 0; x < image.width; x += 1) {
      if (isWarningBorderPixel(image, x, y)) {
        run += 1;
        if (run >= requiredRun) {
          return true;
        }
      } else {
        run = 0;
      }
    }
  }

  return false;
}

function isWarningBorderPixel(image, x, y) {
  const index = (y * image.width + x) * 4;
  const red = image.data[index];
  const green = image.data[index + 1];
  const blue = image.data[index + 2];
  const alpha = image.data[index + 3];

  return alpha > 240 && red > 220 && green > 220 && blue > 220;
}

function decodePngRgba(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Screenshot is not a PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const data = new Uint8Array(width * height * bytesPerPixel);
  let sourceOffset = 0;
  let previous = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = inflated.subarray(sourceOffset, sourceOffset + stride);
    sourceOffset += stride;
    const output = data.subarray(y * stride, (y + 1) * stride);
    unfilterScanline(filter, row, previous, output, bytesPerPixel);
    previous = output;
  }

  return { data, height, width };
}

function unfilterScanline(filter, row, previous, output, bytesPerPixel) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? output[index - bytesPerPixel] : 0;
    const up = previous[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
    let value = row[index];

    if (filter === 1) {
      value += left;
    } else if (filter === 2) {
      value += up;
    } else if (filter === 3) {
      value += Math.floor((left + up) / 2);
    } else if (filter === 4) {
      value += paethPredictor(left, up, upLeft);
    } else if (filter !== 0) {
      throw new Error(`Unsupported PNG filter ${filter}`);
    }

    output[index] = value & 0xff;
  }
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  if (upDistance <= upLeftDistance) {
    return up;
  }

  return upLeft;
}
