import { spawn } from "node:child_process";
import { inflateSync } from "node:zlib";
import { chromium, webkit } from "playwright";

const port = 4176;
const configuredBaseUrl = process.env.GAME_RUNTIME_SMOKE_BASE_URL;
const baseUrl = configuredBaseUrl
  ? ensureTrailingSlash(configuredBaseUrl)
  : `http://127.0.0.1:${port}/ponpoko/`;
const appUrl = new URL("?bootDebug=1", baseUrl).href;
const expectedRomBaseUrl = new URL("roms/", baseUrl).href;
const requestedGameId = process.env.GAME_RUNTIME_SMOKE_GAME;
const requestedTargetLabel = process.env.GAME_RUNTIME_SMOKE_TARGET;
const games = [
  {
    id: "pbobble",
    dpadMode: "fourWay",
    inactiveButtons: 5,
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-surface="virtual"] [data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyQ", label: "fire", selector: '[data-touch-surface="virtual"] [data-action="fire"]' }
    ],
    minFrame: 120,
    romFile: "pbobble.zip",
    romVersion: "b05467d9c827fc04fe4836aeaa1c93feb298ad195a5c6e6e8ae4550a7f432a3a",
    title: "퍼즐 보블",
    videoHeight: 224,
    videoWidth: 320
  },
  {
    id: "spang",
    dpadMode: "fourWay",
    inactiveButtons: 5,
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-surface="virtual"] [data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyQ", label: "fire", selector: '[data-touch-surface="virtual"] [data-action="fire"]' }
    ],
    minFrame: 120,
    romFile: "spang.zip",
    romVersion: "acd4dd9b95f6113fd61477824045f0478bf9469dfd41ff6465c4383966812e71",
    title: "슈퍼 팡",
    videoHeight: 240,
    videoWidth: 384
  },
  {
    id: "bublbobl",
    dpadMode: "fourWay",
    inactiveButtons: 4,
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-surface="virtual"] [data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyQ", label: "bubble shot", selector: '[data-touch-surface="virtual"] [data-action="fire"]' },
      { expectedInput: 8, forbiddenInputs: [1, 4], keyboard: "KeyW", label: "jump", selector: '[data-touch-surface="virtual"] .virtual-game-button[data-action="jumpUp"]' }
    ],
    blockedInputChecks: [
      { keyboard: "KeyE", label: "inactive button 3" }
    ],
    minFrame: 120,
    romFile: "bublbobl.zip",
    romVersion: "c23a70a5f12e695fec513fee682441accba5ea44a811ff43289ed894ec8ce505",
    title: "보글보글",
    videoHeight: 224,
    videoWidth: 256
  },
  {
    core: "snes9x",
    dpadMode: "eightWay",
    id: "snes_smwk",
    inactiveButtons: 0,
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-surface="virtual"] [data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyQ", label: "B", selector: '[data-touch-surface="virtual"] [data-action="button1"]' },
      { expectedInput: 1, keyboard: "KeyW", label: "Y", selector: '[data-touch-surface="virtual"] [data-action="button2"]' },
      { expectedInput: 8, keyboard: "KeyE", label: "A", selector: '[data-touch-surface="virtual"] [data-action="button3"]' },
      { expectedInput: 9, keyboard: "KeyA", label: "X", selector: '[data-touch-surface="virtual"] [data-action="button4"]' },
      { expectedInput: 10, keyboard: "KeyS", label: "L", selector: '[data-touch-surface="virtual"] [data-action="button5"]' },
      { expectedInput: 11, keyboard: "KeyD", label: "R", selector: '[data-touch-surface="virtual"] [data-action="button6"]' }
    ],
    minFrame: 600,
    minVisiblePixelRatio: 0.08,
    romFile: "snes_smwk.zip",
    romVersion: "2b2eb0710c393750f660df34eb8af3dd936258eb993530858d85f065f349170d",
    title: "슈퍼 마리오 월드 한국어",
    visibleRegion: { xEnd: 0.95, xStart: 0.05, yEnd: 0.55, yStart: 0.02 },
    videoHeight: 224,
    videoWidth: 256
  },
  {
    dpadMode: "eightWay",
    id: "sf2ce",
    inactiveButtons: 0,
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-surface="virtual"] [data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyQ", label: "button1", selector: '[data-touch-surface="virtual"] [data-action="button1"]' },
      { expectedInput: 8, keyboard: "KeyW", label: "button2", selector: '[data-touch-surface="virtual"] [data-action="button2"]' },
      { expectedInput: 1, keyboard: "KeyE", label: "button3", selector: '[data-touch-surface="virtual"] [data-action="button3"]' },
      { expectedInput: 9, keyboard: "KeyA", label: "button4", selector: '[data-touch-surface="virtual"] [data-action="button4"]' },
      { expectedInput: 10, keyboard: "KeyS", label: "button5", selector: '[data-touch-surface="virtual"] [data-action="button5"]' },
      { expectedInput: 11, keyboard: "KeyD", label: "button6", selector: '[data-touch-surface="virtual"] [data-action="button6"]' }
    ],
    minFrame: 120,
    romFile: "sf2ce.zip",
    romVersion: "82e5451619c1328e57987dd00be7ac5337361e60a0c48a9e69823ca7b59d15ad",
    title: "스트리트 파이터 II CE",
    videoHeight: 224,
    videoWidth: 384
  },
  {
    dpadMode: "eightWay",
    id: "wofj_korean_v1_20",
    inactiveButtons: 4,
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-surface="virtual"] [data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyQ", label: "attack", selector: '[data-touch-surface="virtual"] [data-action="button1"]' },
      { expectedInput: 8, keyboard: "KeyW", label: "jump", selector: '[data-touch-surface="virtual"] [data-action="button2"]' }
    ],
    blockedInputChecks: [
      { keyboard: "KeyE", label: "inactive button 3" }
    ],
    minFrame: 120,
    romFile: "wofj.zip",
    romVersion: "346984d6e6f2f54d11228ab82350e07b82577be0c3c995fd41e12ba40ae9e906",
    title: "천지를 먹다 II 한국어",
    videoHeight: 224,
    videoWidth: 384
  }
].filter((game) => !requestedGameId || game.id === requestedGameId);

if (requestedGameId && games.length === 0) {
  throw new Error(`Unknown GAME_RUNTIME_SMOKE_GAME ${requestedGameId}`);
}

const server = configuredBaseUrl
  ? null
  : spawn("npm", ["run", "preview", "--", "--port", String(port)], {
      stdio: ["ignore", "pipe", "pipe"]
    });

try {
  await waitForServer(baseUrl);
  const targetConfigs = [
    {
      contextOptions: {
        viewport: { width: 1280, height: 800 }
      },
      inputMode: "keyboard",
      label: "desktop Chromium",
      launch: () => chromium.launch({ headless: true })
    },
    {
      contextOptions: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      },
      inputMode: "pointer",
      label: "mobile WebKit",
      launch: () => webkit.launch({ headless: true })
    }
  ].filter((target) => !requestedTargetLabel || target.label.includes(requestedTargetLabel));

  if (requestedTargetLabel && targetConfigs.length === 0) {
    throw new Error(`Unknown GAME_RUNTIME_SMOKE_TARGET ${requestedTargetLabel}`);
  }

  const targets = [];
  try {
    for (const targetConfig of targetConfigs) {
      targets.push({
        browser: await targetConfig.launch(),
        contextOptions: targetConfig.contextOptions,
        inputMode: targetConfig.inputMode,
        label: targetConfig.label
      });
    }
    for (const target of targets) {
      for (const game of games) {
        await verifyGame(target, game);
      }
    }
  } finally {
    await Promise.all(targets.map((target) => target.browser.close()));
  }

  console.log("game runtime smoke ok: catalog games boot on desktop/mobile, render frames, and accept mapped inputs");
} finally {
  server?.kill("SIGTERM");
}

async function verifyGame(target, game) {
  const expectedRomUrl = new URL(`${game.romFile}?v=${game.romVersion}`, expectedRomBaseUrl).href;
  const expectedParentRomUrl = game.parentRomFile
    ? game.core === "fbneo"
      ? new URL(game.parentRomFile, baseUrl).href
      : new URL(`${game.parentRomFile}${game.parentRomVersion ? `?v=${game.parentRomVersion}` : ""}`, expectedRomBaseUrl).href
    : null;
  const context = await target.browser.newContext(target.contextOptions);
  const page = await context.newPage();

  try {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.__gameSmokeFetchCalls = [];
      window.__gameSmokeInputCalls = [];
      window.fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : new URL(String(input), window.location.href).href;
        const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
        window.__gameSmokeFetchCalls.push({
          rangeHeader: headers.get("range"),
          url
        });
        return originalFetch(input, init);
      };
      window.__gameSmokePatchInputCapture = () => {
        const gameManager = window.EJS_emulator?.gameManager;
        if (!gameManager?.simulateInput || gameManager.__gameSmokeInputPatched) {
          return;
        }

        const original = gameManager.simulateInput.bind(gameManager);
        gameManager.__gameSmokeInputPatched = true;
        gameManager.simulateInput = (player, input, pressed) => {
          window.__gameSmokeInputCalls.push({ input, player, pressed });
          original(player, input, pressed);
        };
      };
      window.__gameSmokeActiveTouchTarget = null;
      window.__gameSmokeActivePointerTargets = {};
      window.__gameSmokeDispatchPointer = (type, x, y, pointerId, active) => {
        const target = window.__gameSmokeActivePointerTargets[pointerId] || document.elementFromPoint(x, y) || document.body;
        if (active) {
          window.__gameSmokeActivePointerTargets[pointerId] = target;
        } else {
          delete window.__gameSmokeActivePointerTargets[pointerId];
        }

        target.dispatchEvent(new PointerEvent(type, {
          bubbles: true,
          button: 0,
          buttons: active ? 1 : 0,
          cancelable: true,
          clientX: x,
          clientY: y,
          composed: true,
          isPrimary: pointerId === 1945,
          pointerId,
          pointerType: "touch"
        }));
      };
      window.__gameSmokeDispatchTouch = (type, x, y, active) => {
        const target = window.__gameSmokeActiveTouchTarget || document.elementFromPoint(x, y) || document.body;
        const touchInit = {
          clientX: x,
          clientY: y,
          force: 1,
          identifier: 1945,
          pageX: x + window.scrollX,
          pageY: y + window.scrollY,
          radiusX: 6,
          radiusY: 6,
          rotationAngle: 0,
          screenX: x,
          screenY: y,
          target
        };
        let touch = touchInit;
        try {
          if (typeof Touch === "function") {
            touch = new Touch(touchInit);
          }
        } catch {
          touch = touchInit;
        }

        let event;
        try {
          event = new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            changedTouches: [touch],
            composed: true,
            targetTouches: active ? [touch] : [],
            touches: active ? [touch] : []
          });
        } catch {
          event = document.createEvent("Event");
          event.initEvent(type, true, true);
          Object.defineProperties(event, {
            changedTouches: { value: [touch] },
            targetTouches: { value: active ? [touch] : [] },
            touches: { value: active ? [touch] : [] }
          });
        }

        target.dispatchEvent(event);
      };
      window.setInterval(() => window.__gameSmokePatchInputCapture?.(), 50);
    });

    await page.goto(appUrl, { waitUntil: "networkidle" });
    const intro = page.getByRole("button", { name: "확인하고 시작" });
    if (await intro.count()) {
      await intro.click();
    }
    await page.locator(`[data-game-id="${game.id}"]`).click();
    await page.locator(".game-topbar strong").getByText(game.title).waitFor({ timeout: 5_000 });
    await page.locator("canvas").first().waitFor({ timeout: 90_000 });
    await page.waitForFunction((minFrame) => {
      return (window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0) >= minFrame;
    }, game.minFrame, { timeout: 60_000 });
    await page.locator("[data-game-status]").getByText("플레이 중").waitFor({ timeout: 10_000 });
    const activeStageScreenshot = await page.locator(".game-stage").screenshot();
    if (hasRetroArchMainMenu(activeStageScreenshot)) {
      throw new Error(`${target.label} ${game.id} still shows the RetroArch main menu instead of gameplay`);
    }
    if (game.visibleRegion && visiblePixelRatio(activeStageScreenshot, game.visibleRegion) < game.minVisiblePixelRatio) {
      throw new Error(`${target.label} ${game.id} did not render visible gameplay pixels by frame ${game.minFrame}`);
    }

    const runtimeState = await page.evaluate((expectedRomUrl) => ({
      biosUrl: window.EJS_biosUrl ?? null,
      bodyText: document.body.innerText,
      configuredBiosUrl: window.EJS_emulator?.config?.biosUrl ?? null,
      configuredDontExtractBios: window.EJS_emulator?.config?.dontExtractBIOS ?? null,
      core: window.EJS_core,
      gameParentUrl: window.EJS_gameParentUrl ?? null,
      configuredGameUrl: window.EJS_emulator?.config?.gameUrl,
      configuredGameParentUrl: window.EJS_emulator?.config?.gameParentUrl ?? null,
      configuredLoadState: window.EJS_emulator?.config?.loadState ?? null,
      failed: window.EJS_emulator?.failedToStart === true,
      frame: window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0,
      gameUrlKind: window.EJS_gameUrl instanceof File ? "file" : typeof window.EJS_gameUrl,
      gameUrlName: window.EJS_gameUrl instanceof File ? window.EJS_gameUrl.name : window.EJS_gameUrl,
      loadStateUrl: window.EJS_loadStateURL ?? null,
      paused: window.EJS_emulator?.paused === true,
      romFetchCalls: (window.__gameSmokeFetchCalls ?? []).filter((call) => call.url === expectedRomUrl),
      romRequests: performance.getEntriesByType("resource").filter((entry) => entry.name === expectedRomUrl).length,
      started: window.EJS_emulator?.started === true,
      videoHeight: window.EJS_emulator?.gameManager?.getVideoDimensions?.("height"),
      videoWidth: window.EJS_emulator?.gameManager?.getVideoDimensions?.("width")
    }), expectedRomUrl);

    assertRuntimeState(target, game, runtimeState, expectedParentRomUrl);
    await assertMobileControllerLayout(page, target, game);
    await assertInactiveButtonsIgnoreInput(page, target, game);

    await page.evaluate(() => {
      window.__gameSmokeInputCalls = [];
      window.__gameSmokePatchInputCapture?.();
    });
    for (const check of game.inputChecks) {
      await triggerControl(page, target, check);
      const inputCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
      assertInputPair(inputCalls, check.expectedInput, `${target.label} ${game.id} ${check.label}`);
      assertForbiddenInputs(inputCalls, check.forbiddenInputs ?? [], `${target.label} ${game.id} ${check.label}`);
      await page.evaluate(() => {
        window.__gameSmokeInputCalls = [];
      });
    }
    await assertBlockedKeyboardInputs(page, target, game);
    await assertSimultaneousMappedInput(page, target, game);
    await assertCancelledMappedInput(page, target, game);
    await assertDiagonalDpadInput(page, target, game);
  } finally {
    await context.close();
  }
}

async function assertBlockedKeyboardInputs(page, target, game) {
  if (target.inputMode !== "keyboard") {
    return;
  }

  for (const check of game.blockedInputChecks ?? []) {
    await page.evaluate(() => {
      window.__gameSmokeInputCalls = [];
    });
    await page.keyboard.down(check.keyboard);
    await page.waitForTimeout(120);
    await page.keyboard.up(check.keyboard);
    await page.waitForTimeout(120);
    const inputCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
    const nonStartupCalls = inputCalls.filter((call) => call.input !== 2 && call.input !== 3);
    if (nonStartupCalls.length > 0) {
      throw new Error(`${target.label} ${game.id} ${check.label} should not send gameplay input: ${JSON.stringify(inputCalls)}`);
    }
  }
}

async function assertMobileControllerLayout(page, target, game) {
  if (target.inputMode !== "pointer") {
    return;
  }

  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(150);

  const layout = await page.evaluate(() => {
    const stage = document.querySelector(".game-stage");
    const controls = document.querySelector('[data-touch-surface="virtual"]');
    const stick = document.querySelector(".virtual-stick");
    const zones = [...document.querySelectorAll('[data-touch-surface="virtual"] [data-touch-zone]')];
    const buttons = [...document.querySelectorAll('[data-touch-surface="virtual"] .virtual-game-button')];
    const specialButtons = [...document.querySelectorAll('[data-touch-surface="virtual"] .virtual-special-button')];
    const menuButtons = [...document.querySelectorAll("[data-back]")];
    const topbarMenu = document.querySelector(".game-topbar [data-back]");
    const activeControls = [...document.querySelectorAll(
      '[data-touch-surface="virtual"] [data-touch-zone], [data-touch-surface="virtual"] .virtual-game-button:not(:disabled), [data-touch-surface="virtual"] .virtual-special-button:not(:disabled), .game-topbar [data-back]'
    )];
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
    const buildDpadSectorSamples = (rect) => {
      const left = rect.left;
      const right = rect.right;
      const top = rect.top;
      const bottom = rect.bottom;
      const width = rect.width;
      const height = rect.height;
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      return [
        { action: "up", x: centerX, y: top + height * 0.18 },
        { action: "up", x: left + width * 0.32, y: top + height * 0.26 },
        { action: "up", x: right - width * 0.32, y: top + height * 0.26 },
        { action: "right", x: right - width * 0.18, y: centerY },
        { action: "right", x: right - width * 0.26, y: top + height * 0.32 },
        { action: "right", x: right - width * 0.26, y: bottom - height * 0.32 },
        { action: "down", x: centerX, y: bottom - height * 0.18 },
        { action: "down", x: left + width * 0.32, y: bottom - height * 0.26 },
        { action: "down", x: right - width * 0.32, y: bottom - height * 0.26 },
        { action: "left", x: left + width * 0.18, y: centerY },
        { action: "left", x: left + width * 0.26, y: top + height * 0.32 },
        { action: "left", x: left + width * 0.26, y: bottom - height * 0.32 }
      ];
    };
    const stageRect = stage ? toRect(stage) : null;
    const controlsRect = controls ? toRect(controls) : null;
    const inactiveButtons = buttons.filter((button) => button.disabled || button.getAttribute("aria-disabled") === "true");
    const stickRect = stick ? toRect(stick) : null;
    const buttonRects = buttons.map(toRect);
    const specialRects = specialButtons.map(toRect);
    const primaryBottom = Math.max(
      stickRect?.bottom ?? 0,
      ...buttonRects.map((rect) => rect.bottom)
    );
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
    const buttonVerticalSpan = buttonCenters.length > 0
      ? Math.max(...buttonCenters.map((button) => button.y)) - Math.min(...buttonCenters.map((button) => button.y))
      : 0;
    const dpadCenterWidth = stick ? Number.parseFloat(getComputedStyle(stick, "::after").width) : 0;
    const dpadSectorFailures = stickRect === null
      ? [{ action: "none", hitAction: "none", x: 0, y: 0 }]
      : buildDpadSectorSamples(stickRect).flatMap((sample) => {
          const hitAction = document.elementsFromPoint(sample.x, sample.y)
            .map((element) => element.closest?.("[data-action]"))
            .find(Boolean)
            ?.getAttribute("data-action") ?? "none";

          return hitAction === sample.action
            ? []
            : [{ ...sample, hitAction }];
        });
    const hitFailures = activeControls.flatMap((control) => {
      const rect = control.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const topControl = document.elementsFromPoint(x, y)
        .map((element) => element.closest?.("[data-action], [data-back], [data-save-state], [data-load-state]"))
        .find(Boolean);

      return topControl === control
        ? []
        : [{
            action: control.getAttribute("data-action") ??
              (control.hasAttribute("data-back") ? "menu" : null) ??
              (control.hasAttribute("data-save-state") ? "save" : null) ??
              (control.hasAttribute("data-load-state") ? "load" : null) ??
              "unknown",
            topAction: topControl?.getAttribute("data-action") ??
              (topControl?.hasAttribute("data-back") ? "menu" : null) ??
              (topControl?.hasAttribute("data-save-state") ? "save" : null) ??
              (topControl?.hasAttribute("data-load-state") ? "load" : null) ??
              "none"
          }];
    });

    return {
      activeHitFailureCount: hitFailures.length,
      activeHitFailures: hitFailures,
      buttonCount: buttons.length,
      buttonCenters,
      buttonVerticalSpanRatio: stickRect ? buttonVerticalSpan / stickRect.height : 1,
      buttonsVisible: buttons.every(isVisible),
      controlsRect,
      controlsCenterY: controlsRect ? controlsRect.top + controlsRect.height / 2 : null,
      controlTop: controlsRect?.top ?? null,
      dpadCenterRatio: stickRect ? dpadCenterWidth / stickRect.width : 1,
      dpadMode: stick?.getAttribute("data-dpad-mode") ?? null,
      dpadActiveDirections: stick?.getAttribute("data-active-directions"),
      dpadSectorFailures,
      dpadLeftOfButtons: stickRect !== null && buttonRects.length > 0
        ? stickRect.right < Math.min(...buttonRects.map((rect) => rect.left))
        : false,
      inactiveCount: inactiveButtons.length,
      inactiveDimmed: inactiveButtons.every((button) => {
        const style = getComputedStyle(button);
        return Number.parseFloat(style.opacity || "1") <= 0.5;
      }),
      menuCount: menuButtons.length,
      menuEnabled: topbarMenu instanceof HTMLButtonElement && !topbarMenu.disabled,
      menuInsideControls: Boolean(controls?.querySelector("[data-back]")),
      menuRect: topbarMenu ? toRect(topbarMenu) : null,
      menuVisible: topbarMenu ? isVisible(topbarMenu) : false,
      scrollFits: (document.scrollingElement?.scrollHeight ?? 0) <= window.innerHeight + 1,
      specialActions: specialButtons.map((button) => (
        button.getAttribute("data-action") ??
        (button.hasAttribute("data-save-state") ? "save" : null) ??
        (button.hasAttribute("data-load-state") ? "load" : null) ??
        "unknown"
      )),
      specialBelowPrimary: specialRects.length > 0 && specialRects.every((rect) => rect.top >= primaryBottom - 1),
      specialCount: specialButtons.length,
      specialInsideControls: Boolean(controlsRect) && specialRects.every((rect) => (
        rect.left >= controlsRect.left - 1 &&
        rect.right <= controlsRect.right + 1 &&
        rect.top >= controlsRect.top - 1 &&
        rect.bottom <= controlsRect.bottom + 1
      )),
      specialMinHeight: Math.min(...specialRects.map((rect) => rect.height)),
      specialTextFits: specialButtons.every((button) => button.scrollWidth <= button.clientWidth + 1),
      specialVisible: specialButtons.every(isVisible),
      stageRect,
      stickRect,
      surface: controls?.getAttribute("data-touch-surface") ?? "none",
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      zoneCount: zones.length,
      zoneDetails,
      zonesVisible: zones.every(isVisible)
    };
  });

  if (
    layout.surface !== "virtual" ||
    layout.zoneCount !== 4 ||
    layout.buttonCount !== 6 ||
    layout.specialCount !== 5 ||
    JSON.stringify(layout.specialActions) !== JSON.stringify(["coin", "start", "ok", "save", "load"]) ||
    layout.menuCount !== 1 ||
    layout.menuInsideControls ||
    !layout.menuEnabled ||
    !layout.menuVisible
  ) {
    throw new Error(`${target.label} ${game.id} expected universal virtual controls, got ${JSON.stringify(layout)}`);
  }
  if (
    !layout.stageRect ||
    !layout.controlsRect ||
    layout.controlTop < layout.stageRect.bottom - 1 ||
    layout.controlsRect.bottom > layout.viewportHeight + 1 ||
    layout.controlsRect.left < -1 ||
    layout.controlsRect.right > layout.viewportWidth + 1
  ) {
    throw new Error(`${target.label} ${game.id} controls overlap gameplay: ${JSON.stringify(layout)}`);
  }
  if (
    !layout.menuRect ||
    layout.menuRect.top < -1 ||
    layout.menuRect.left < -1 ||
    layout.menuRect.right > layout.viewportWidth + 1 ||
    layout.menuRect.bottom > layout.stageRect.top + 1
  ) {
    throw new Error(`${target.label} ${game.id} menu is not isolated above gameplay: ${JSON.stringify(layout)}`);
  }
  if (!layout.zonesVisible || !layout.buttonsVisible || !layout.specialVisible) {
    throw new Error(`${target.label} ${game.id} controls are not visible: ${JSON.stringify(layout)}`);
  }
  if (!layout.specialBelowPrimary || !layout.specialInsideControls || layout.specialMinHeight < 44 || !layout.specialTextFits || !layout.scrollFits) {
    throw new Error(`${target.label} ${game.id} special controls do not fit compact iPhone layout: ${JSON.stringify(layout)}`);
  }
  if (layout.inactiveCount !== game.inactiveButtons || !layout.inactiveDimmed) {
    throw new Error(`${target.label} ${game.id} inactive buttons are not dimmed as expected: ${JSON.stringify(layout)}`);
  }
  if (layout.dpadSectorFailures.length > 0) {
    throw new Error(`${target.label} ${game.id} D-pad has dead or mismapped visible sectors: ${JSON.stringify(layout)}`);
  }
  if (layout.activeHitFailureCount > 0) {
    throw new Error(`${target.label} ${game.id} controls are intercepted: ${JSON.stringify(layout)}`);
  }
  if (layout.buttonVerticalSpanRatio > 0.45) {
    throw new Error(`${target.label} ${game.id} action buttons are too steep for short thumb travel: ${JSON.stringify(layout)}`);
  }
  if (layout.dpadCenterRatio > 0.18) {
    throw new Error(`${target.label} ${game.id} D-pad center circle is too large for sensitive sectors: ${JSON.stringify(layout)}`);
  }
  if (layout.dpadMode !== game.dpadMode || layout.dpadActiveDirections === null) {
    throw new Error(`${target.label} ${game.id} D-pad mode/state is wrong: ${JSON.stringify(layout)}`);
  }
  if (game.screenOrientation === "vertical") {
    if (layout.controlTop === null || layout.stageRect === null || layout.controlTop - layout.stageRect.bottom > layout.viewportHeight * 0.04) {
      throw new Error(`${target.label} ${game.id} vertical controls do not use the available bottom space: ${JSON.stringify(layout)}`);
    }
  } else if (
    layout.controlsCenterY === null ||
    Math.abs(layout.controlsCenterY - layout.viewportHeight * 0.75) > layout.viewportHeight * 0.2
  ) {
    throw new Error(`${target.label} ${game.id} controls are not centered in the lower half: ${JSON.stringify(layout)}`);
  }
  assertUniversalControllerGeometry(layout, `${target.label} ${game.id}`);
  await assertControlFeedback(page, '[data-touch-surface="virtual"] [data-action="left"]', `${target.label} ${game.id} D-pad left`);
  await assertControlFeedback(
    page,
    '[data-touch-surface="virtual"] .virtual-game-button:not(:disabled)',
    `${target.label} ${game.id} action button`
  );
}

async function assertDiagonalDpadInput(page, target, game) {
  if (target.inputMode !== "pointer" || game.dpadMode !== "eightWay") {
    return;
  }

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });

  const box = await page.locator(".virtual-stick").boundingBox();
  if (!box) {
    throw new Error(`${target.label} ${game.id} D-pad was not found`);
  }

  const x = box.x + box.width * 0.72;
  const y = box.y + box.height * 0.28;
  await dispatchTouchStart(page, x, y);
  await page.waitForTimeout(120);
  const downState = await page.evaluate(() => ({
    activeDirections: document.querySelector(".virtual-stick")?.getAttribute("data-active-directions") ?? "",
    calls: window.__gameSmokeInputCalls ?? []
  }));
  const pressedInputs = new Set(downState.calls.filter((call) => call.pressed === 1).map((call) => call.input));
  if (!pressedInputs.has(4) || !pressedInputs.has(7) || !/\bup\b/.test(downState.activeDirections) || !/\bright\b/.test(downState.activeDirections)) {
    await dispatchTouchEnd(page, x, y);
    throw new Error(`${target.label} ${game.id} diagonal D-pad did not press up+right: ${JSON.stringify(downState)}`);
  }

  await dispatchTouchEnd(page, x, y);
  await page.waitForTimeout(120);
  const upState = await page.evaluate(() => ({
    activeDirections: document.querySelector(".virtual-stick")?.getAttribute("data-active-directions") ?? "",
    calls: window.__gameSmokeInputCalls ?? []
  }));
  const releasedInputs = new Set(upState.calls.filter((call) => call.pressed === 0).map((call) => call.input));
  if (!releasedInputs.has(4) || !releasedInputs.has(7) || upState.activeDirections !== "") {
    throw new Error(`${target.label} ${game.id} diagonal D-pad did not release cleanly: ${JSON.stringify(upState)}`);
  }
}

async function assertInactiveButtonsIgnoreInput(page, target, game) {
  if (target.inputMode !== "pointer" || game.inactiveButtons === 0) {
    return;
  }

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
    window.__ponpokoTouchLog = [];
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
    window.__ponpokoTouchLog = [];
  });

  const box = await page.locator('[data-touch-surface="virtual"] .virtual-game-button.is-inactive').first().boundingBox();
  if (!box) {
    throw new Error(`${target.label} ${game.id} inactive button was not found`);
  }

  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(120);
  const state = await page.evaluate(() => ({
    calls: window.__gameSmokeInputCalls ?? [],
    touchLog: window.__ponpokoTouchLog ?? []
  }));
  const nonStartupCalls = state.calls.filter((call) => call.input !== 2 && call.input !== 3);
  if (state.touchLog.length > 0 || nonStartupCalls.length > 0) {
    throw new Error(`${target.label} ${game.id} inactive button sent touch input: ${JSON.stringify(state)}`);
  }
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

function assertRuntimeState(target, game, runtimeState, expectedParentRomUrl) {
  const expectedCore = game.core ?? "mame2003_plus";
  if (runtimeState.core !== expectedCore) {
    throw new Error(`${target.label} ${game.id} expected ${expectedCore} core, got ${runtimeState.core}`);
  }
  const normalizedGameParentUrl = runtimeState.gameParentUrl
    ? new URL(runtimeState.gameParentUrl, baseUrl).href
    : null;
  const normalizedConfiguredGameParentUrl = runtimeState.configuredGameParentUrl
    ? new URL(runtimeState.configuredGameParentUrl, baseUrl).href
    : null;
  if (normalizedGameParentUrl !== expectedParentRomUrl || normalizedConfiguredGameParentUrl !== expectedParentRomUrl) {
    throw new Error(`${target.label} ${game.id} expected parent ROM ${expectedParentRomUrl}, got ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.biosUrl !== null || runtimeState.configuredBiosUrl !== null) {
    throw new Error(`${target.label} ${game.id} should not use BIOS URL loading, got ${JSON.stringify(runtimeState)}`);
  }
  const expectsUnextractedParent = game.core === "fbneo" && Boolean(game.parentRomFile);
  if ((expectsUnextractedParent && runtimeState.configuredDontExtractBios !== true) || (!expectsUnextractedParent && runtimeState.configuredDontExtractBios === true)) {
    throw new Error(`${target.label} ${game.id} has wrong parent extraction mode: ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.gameUrlKind !== "file" || runtimeState.gameUrlName !== game.romFile) {
    throw new Error(`${target.label} ${game.id} expected warmed File ROM ${game.romFile}, got ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.configuredGameUrl !== game.romFile) {
    throw new Error(`${target.label} ${game.id} expected EmulatorJS ROM filename ${game.romFile}, got ${runtimeState.configuredGameUrl}`);
  }
  if (runtimeState.loadStateUrl !== null || runtimeState.configuredLoadState !== null) {
    throw new Error(`${target.label} ${game.id} should not use the Ponpoko start state: ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.romRequests !== 1 || runtimeState.romFetchCalls.length !== 1) {
    throw new Error(`${target.label} ${game.id} expected one complete ROM fetch, got ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.romFetchCalls.some((call) => call.rangeHeader !== null)) {
    throw new Error(`${target.label} ${game.id} ROM fetch used range headers: ${JSON.stringify(runtimeState.romFetchCalls)}`);
  }
  if (runtimeState.failed || !runtimeState.started || runtimeState.paused) {
    throw new Error(`${target.label} ${game.id} did not reach active play state: ${JSON.stringify(runtimeState)}`);
  }
  if (
    runtimeState.frame < game.minFrame ||
    runtimeState.videoWidth !== game.videoWidth ||
    runtimeState.videoHeight !== game.videoHeight
  ) {
    throw new Error(`${target.label} ${game.id} video did not advance as expected: ${JSON.stringify(runtimeState)}`);
  }
  if (/Failed to start game|Load Content|Main Menu|Restart|Save State|Load State|Context Menu|Virtual Gamepad|Click to resume Emulator|\bundefined\b/.test(runtimeState.bodyText)) {
    throw new Error(`${target.label} ${game.id} exposed unexpected emulator menu/error text: ${runtimeState.bodyText}`);
  }
  if (/에뮬레이터 준비 중/.test(runtimeState.bodyText)) {
    throw new Error(`${target.label} ${game.id} boot overlay did not clear after startup: ${runtimeState.bodyText}`);
  }
}

async function triggerControl(page, target, check) {
  if (target.inputMode === "keyboard") {
    await page.keyboard.down(check.keyboard);
    await page.waitForTimeout(120);
    await page.keyboard.up(check.keyboard);
    await page.waitForTimeout(120);
    return;
  }

  const box = await page.locator(check.selector).first().boundingBox();
  if (!box) {
    throw new Error(`Control was not found for selector ${check.selector}`);
  }

  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(120);
}

async function assertSimultaneousMappedInput(page, target, game) {
  const directionCheck = game.inputChecks.find((check) => check.expectedInput === 6);
  const actionChecks = game.inputChecks.filter((check) => check.expectedInput !== 6);
  if (!directionCheck || actionChecks.length === 0) {
    throw new Error(`${target.label} ${game.id} does not define direction plus action checks`);
  }

  for (const actionCheck of actionChecks) {
    await page.evaluate(() => {
      window.__gameSmokeInputCalls = [];
    });

    if (target.inputMode === "keyboard") {
      await page.keyboard.down(directionCheck.keyboard);
      await page.waitForTimeout(120);
      await page.keyboard.down(actionCheck.keyboard);
      await page.waitForTimeout(120);
      await page.keyboard.up(actionCheck.keyboard);
      await page.waitForTimeout(80);
      await page.keyboard.up(directionCheck.keyboard);
      await page.waitForTimeout(120);
    } else {
      const directionBox = await page.locator(directionCheck.selector).first().boundingBox();
      const actionBox = await page.locator(actionCheck.selector).first().boundingBox();
      if (!directionBox || !actionBox) {
        throw new Error(`${target.label} ${game.id} missing simultaneous controls`);
      }

      const directionPoint = centerPoint(directionBox);
      const actionPoint = centerPoint(actionBox);
      await dispatchTouchStart(page, directionPoint.x, directionPoint.y, 1945);
      await page.waitForTimeout(120);
      await dispatchTouchStart(page, actionPoint.x, actionPoint.y, 1946);
      await page.waitForTimeout(120);
      await dispatchTouchEnd(page, actionPoint.x, actionPoint.y, 1946);
      await page.waitForTimeout(80);
      await dispatchTouchEnd(page, directionPoint.x, directionPoint.y, 1945);
      await page.waitForTimeout(120);
    }

    const calls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
    assertInputPair(calls, directionCheck.expectedInput, `${target.label} ${game.id} simultaneous ${directionCheck.label}`);
    assertInputPair(calls, actionCheck.expectedInput, `${target.label} ${game.id} simultaneous ${actionCheck.label}`);
    assertInputChord(
      calls,
      directionCheck.expectedInput,
      actionCheck.expectedInput,
      `${target.label} ${game.id} ${directionCheck.label} plus ${actionCheck.label}`
    );
  }
}

async function assertCancelledMappedInput(page, target, game) {
  const actionCheck = game.inputChecks.find((check) => check.expectedInput !== 6);
  if (!actionCheck) {
    throw new Error(`${target.label} ${game.id} does not define an action cancellation check`);
  }

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });

  if (target.inputMode === "keyboard") {
    await page.keyboard.down(actionCheck.keyboard);
    await page.waitForTimeout(80);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.keyboard.up(actionCheck.keyboard);
  } else {
    const actionBox = await page.locator(actionCheck.selector).first().boundingBox();
    if (!actionBox) {
      throw new Error(`${target.label} ${game.id} missing cancellable action control`);
    }
    const actionPoint = centerPoint(actionBox);
    await dispatchTouchStart(page, actionPoint.x, actionPoint.y, 1947);
    await page.waitForTimeout(80);
    await dispatchTouchCancel(page, actionPoint.x, actionPoint.y, 1947);
  }

  await page.waitForTimeout(120);
  const calls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertInputPair(calls, actionCheck.expectedInput, `${target.label} ${game.id} cancelled ${actionCheck.label}`);
}

async function dispatchTouchStart(page, x, y, pointerId = 1945) {
  await page.evaluate(({ pointerId, x, y }) => {
    if (typeof PointerEvent === "function") {
      window.__gameSmokeDispatchPointer("pointerdown", x, y, pointerId, true);
      return;
    }

    window.__gameSmokeActiveTouchTarget = document.elementFromPoint(x, y);
    window.__gameSmokeDispatchTouch("touchstart", x, y, true);
  }, { pointerId, x, y });
}

async function dispatchTouchEnd(page, x, y, pointerId = 1945) {
  await page.evaluate(({ pointerId, x, y }) => {
    if (typeof PointerEvent === "function") {
      window.__gameSmokeDispatchPointer("pointerup", x, y, pointerId, false);
      return;
    }

    window.__gameSmokeDispatchTouch("touchend", x, y, false);
    window.__gameSmokeActiveTouchTarget = null;
  }, { pointerId, x, y });
}

async function dispatchTouchCancel(page, x, y, pointerId = 1945) {
  await page.evaluate(({ pointerId, x, y }) => {
    if (typeof PointerEvent === "function") {
      window.__gameSmokeDispatchPointer("pointercancel", x, y, pointerId, false);
      return;
    }

    window.__gameSmokeDispatchTouch("touchcancel", x, y, false);
    window.__gameSmokeActiveTouchTarget = null;
  }, { pointerId, x, y });
}

function centerPoint(box) {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

function assertInputPair(calls, input, label) {
  const pressed = calls.some((call) => call.input === input && call.pressed === 1);
  const released = calls.some((call) => call.input === input && call.pressed === 0);
  if (!pressed || !released) {
    throw new Error(`${label} control did not send input ${input}: ${JSON.stringify(calls)}`);
  }
}

function assertForbiddenInputs(calls, inputs, label) {
  const forbiddenCalls = calls.filter((call) => inputs.includes(call.input));
  if (forbiddenCalls.length > 0) {
    throw new Error(`${label} sent forbidden input(s) ${inputs.join(", ")}: ${JSON.stringify(calls)}`);
  }
}

function assertInputChord(calls, directionInput, actionInput, label) {
  const directionPressIndex = calls.findIndex((call) => call.input === directionInput && call.pressed === 1);
  const actionPressIndex = calls.findIndex((call) => call.input === actionInput && call.pressed === 1);
  const directionReleaseIndex = calls.findIndex((call) => call.input === directionInput && call.pressed === 0);

  if (
    directionPressIndex === -1 ||
    actionPressIndex === -1 ||
    directionReleaseIndex === -1 ||
    directionPressIndex > actionPressIndex ||
    actionPressIndex > directionReleaseIndex
  ) {
    throw new Error(`${label} did not keep direction active through action press: ${JSON.stringify(calls)}`);
  }
}

function hasRetroArchMainMenu(pngBuffer) {
  const image = decodePngRgba(pngBuffer);
  const leftMenuPanelRatio = panelPixelRatio(image, 0.04, 0.33, 0.12, 0.88);
  const bodyPanelRatio = panelPixelRatio(image, 0.36, 0.96, 0.12, 0.88);

  return leftMenuPanelRatio > 0.75 && bodyPanelRatio > 0.75;
}

function visiblePixelRatio(pngBuffer, region) {
  const image = decodePngRgba(pngBuffer);
  const xStart = Math.floor(image.width * region.xStart);
  const xEnd = Math.floor(image.width * region.xEnd);
  const yStart = Math.floor(image.height * region.yStart);
  const yEnd = Math.floor(image.height * region.yEnd);
  let visible = 0;
  let total = 0;

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      total += 1;
      if (isVisibleGameplayPixel(image, x, y)) {
        visible += 1;
      }
    }
  }

  return total > 0 ? visible / total : 0;
}

function panelPixelRatio(image, xStartRatio, xEndRatio, yStartRatio, yEndRatio) {
  const xStart = Math.floor(image.width * xStartRatio);
  const xEnd = Math.floor(image.width * xEndRatio);
  const yStart = Math.floor(image.height * yStartRatio);
  const yEnd = Math.floor(image.height * yEndRatio);
  let matching = 0;
  let total = 0;

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      total += 1;
      if (isRetroArchPanelPixel(image, x, y)) {
        matching += 1;
      }
    }
  }

  return total > 0 ? matching / total : 0;
}

function isRetroArchPanelPixel(image, x, y) {
  const { alpha, blue, green, red } = readPixel(image, x, y);
  return alpha > 240 && red >= 25 && red <= 65 && green >= 25 && green <= 65 && blue >= 25 && blue <= 65;
}

function isVisibleGameplayPixel(image, x, y) {
  const { alpha, blue, green, red } = readPixel(image, x, y);
  return alpha > 240 && (red > 16 || green > 16 || blue > 16);
}

function readPixel(image, x, y) {
  const index = (y * image.width + x) * 4;
  return {
    alpha: image.data[index + 3],
    blue: image.data[index + 2],
    green: image.data[index + 1],
    red: image.data[index]
  };
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

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth} colorType=${colorType}`);
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const sourceBytesPerPixel = colorType === 6 ? 4 : 3;
  const sourceStride = width * sourceBytesPerPixel;
  const data = new Uint8Array(width * height * 4);
  let sourceOffset = 0;
  let previous = new Uint8Array(sourceStride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = inflated.subarray(sourceOffset, sourceOffset + sourceStride);
    sourceOffset += sourceStride;
    const sourceOutput = new Uint8Array(sourceStride);
    unfilterScanline(filter, row, previous, sourceOutput, sourceBytesPerPixel);
    copyScanlineToRgba(sourceOutput, data.subarray(y * width * 4, (y + 1) * width * 4), sourceBytesPerPixel);
    previous = sourceOutput;
  }

  return { data, height, width };
}

function copyScanlineToRgba(source, target, sourceBytesPerPixel) {
  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.length; sourceIndex += sourceBytesPerPixel, targetIndex += 4) {
    target[targetIndex] = source[sourceIndex];
    target[targetIndex + 1] = source[sourceIndex + 1];
    target[targetIndex + 2] = source[sourceIndex + 2];
    target[targetIndex + 3] = sourceBytesPerPixel === 4 ? source[sourceIndex + 3] : 255;
  }
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

function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
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
