import { spawn } from "node:child_process";
import { inflateSync } from "node:zlib";
import { chromium, webkit } from "playwright";

const port = 4176;
const configuredBaseUrl = process.env.GAME_RUNTIME_SMOKE_BASE_URL;
const baseUrl = configuredBaseUrl
  ? ensureTrailingSlash(configuredBaseUrl)
  : `http://127.0.0.1:${port}/ponpoko/`;
const captureSpikeEnabled = ["1", "true"].includes(process.env.GAME_RUNTIME_SMOKE_CAPTURE ?? "");
const captureLanEnabled = ["1", "true"].includes(process.env.GAME_RUNTIME_SMOKE_CAPTURE_LAN ?? "");
const appSearch = new URLSearchParams({ bootDebug: "1" });
if (captureSpikeEnabled) {
  appSearch.set("captureSpike", "1");
}
const appUrl = new URL(`?${appSearch}`, baseUrl).href;
const expectedRomBaseUrl = new URL("roms/", baseUrl).href;
const requestedGameId = process.env.GAME_RUNTIME_SMOKE_GAME;
const requestedTargetLabel = process.env.GAME_RUNTIME_SMOKE_TARGET;
const screenshotDirectory = process.env.GAME_RUNTIME_SMOKE_SCREENSHOT_DIR;
const visualBaselines = new Map();
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
    core: "fbneo",
    dpadMode: "eightWay",
    advanceTutorial: true,
    id: "mslug",
    inactiveButtons: 3,
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-surface="virtual"] [data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyQ", label: "A", selector: '[data-touch-surface="virtual"] [data-action="button1"]' },
      { expectedInput: 8, keyboard: "KeyW", label: "B", selector: '[data-touch-surface="virtual"] [data-action="button2"]' },
      { expectedInput: 1, keyboard: "KeyE", label: "C", selector: '[data-touch-surface="virtual"] [data-action="button3"]' }
    ],
    minFrame: 600,
    minColorBins: 64,
    minVisiblePixelRatio: 0.08,
    parentRomFile: "neogeo.zip",
    parentRomVersion: "bef93f5f254f3dbcc38afe033919f4e22502beca92877fad42a10729f3de1274",
    romFile: "mslug.zip",
    romByteLength: 13_165_412,
    romVersion: "3ebe7ca4166f956a65ae98d86f9172f8b5d4462efa13723a5ea72fcf59adcbf8",
    title: "메탈 슬러그",
    rejectTutorialScreen: true,
    verifyRomCacheReuse: true,
    videoHeight: 224,
    videoWidth: 304,
    visibleRegion: { xEnd: 0.95, xStart: 0.05, yEnd: 0.62, yStart: 0.03 }
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
    advanceSelection: true,
    compareVisualAcrossTargets: false,
    core: "fbneo",
    dpadMode: "eightWay",
    id: "s1945",
    inactiveButtons: 4,
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-surface="virtual"] [data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyQ", label: "shot", selector: '[data-touch-surface="virtual"] [data-action="button1"]' },
      { expectedInput: 8, keyboard: "KeyW", label: "bomb", selector: '[data-touch-surface="virtual"] [data-action="button2"]' }
    ],
    minColorBins: 48,
    minFrame: 600,
    minVisiblePixelRatio: 0.04,
    romByteLength: 5_455_829,
    romFile: "s1945.zip",
    romVersion: "b59a040b61763b5a1dc83b5e8db368cf778ddfdfd7ce593f0b1b00eb25c69f1d",
    screenOrientation: "vertical",
    title: "스트라이커즈 1945",
    verifyRomCacheReuse: true,
    videoHeight: 224,
    videoWidth: 320,
    visibleRegion: { xEnd: 0.88, xStart: 0.12, yEnd: 0.86, yStart: 0.08 }
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
if (captureSpikeEnabled && requestedGameId !== "bublbobl") {
  throw new Error("GAME_RUNTIME_SMOKE_CAPTURE requires GAME_RUNTIME_SMOKE_GAME=bublbobl");
}
if (captureLanEnabled && (!captureSpikeEnabled || requestedGameId !== "bublbobl")) {
  throw new Error("GAME_RUNTIME_SMOKE_CAPTURE_LAN requires GAME_RUNTIME_SMOKE_CAPTURE=1 and GAME_RUNTIME_SMOKE_GAME=bublbobl");
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
        if (captureLanEnabled) {
          await verifyLanCapture(target, game);
        } else {
          await verifyGame(target, game);
        }
      }
    }
  } finally {
    await Promise.all(targets.map((target) => target.browser.close()));
  }

  console.log("game runtime smoke ok: catalog games boot on desktop/mobile, render frames, and accept mapped inputs");
} finally {
  server?.kill("SIGTERM");
}

async function verifyLanCapture(target, game) {
  const context = await target.browser.newContext(target.contextOptions);
  const host = await context.newPage();
  const guest = await context.newPage();
  const hostUrl = new URL("?captureSpike=1&captureRole=host", baseUrl).href;
  const guestUrl = new URL("?captureSpike=1&captureRole=guest", baseUrl).href;
  const guestRequests = [];
  guest.on("request", (request) => guestRequests.push(request.url()));

  try {
    await Promise.all([host, guest].map((page) => page.addInitScript(() => {
      window.__gameSmokeGetUserMediaCalls = 0;
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
      if (navigator.mediaDevices && originalGetUserMedia) {
        navigator.mediaDevices.getUserMedia = (...args) => {
          window.__gameSmokeGetUserMediaCalls += 1;
          return originalGetUserMedia(...args);
        };
      }
    })));

    await guest.goto(guestUrl, { waitUntil: "networkidle" });
    const join = guest.getByRole("button", { name: "참가하고 소리 켜기", exact: true });
    await join.waitFor({ timeout: 5_000 });
    await join.click();
    await guest.waitForFunction(() => window.__ponpokoReadW2Lan?.().status === "waiting", undefined, {
      timeout: 5_000
    });

    const guestBootBoundary = await readGuestIsolationEvidence(guest, guestRequests);
    if (!guestIsolationIsClean(guestBootBoundary)) {
      throw new Error(`${target.label} ${game.id} guest boot boundary failed: ${JSON.stringify({
        boundary: guestBootBoundary
      })}`);
    }

    await host.goto(hostUrl, { waitUntil: "networkidle" });
    const intro = host.getByRole("button", { name: "확인하고 시작" });
    if (await intro.count()) {
      await intro.click();
    }
    await host.locator(`[data-game-id="${game.id}"]`).click();
    await host.locator(".game-topbar strong").getByText(game.title).waitFor({ timeout: 5_000 });
    await host.locator("canvas").first().waitFor({ timeout: 90_000 });
    await host.waitForFunction((minFrame) => (
      (window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0) >= minFrame
    ), game.minFrame, { timeout: 60_000 });
    await host.locator("[data-game-status]").getByText("플레이 중").waitFor({ timeout: 10_000 });

    const fallback = host.getByRole("button", { name: "방 열고 소리 켜기", exact: true });
    await host.waitForFunction(() => {
      const snapshot = window.__ponpokoReadW2Lan?.();
      return snapshot?.status === "waiting" || snapshot?.fallbackAvailable === true || snapshot?.status === "failed";
    }, undefined, { timeout: 10_000 });
    if (await fallback.isVisible().catch(() => false)) {
      await fallback.click();
    }

    await host.keyboard.down("5");
    await host.waitForTimeout(250);
    await host.keyboard.up("5");
    await host.keyboard.down("Enter");
    await host.waitForTimeout(250);
    await host.keyboard.up("Enter");
    const fire = game.inputChecks.find((check) => check.expectedInput === 0);
    if (fire) {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        await host.keyboard.down(fire.keyboard);
        await host.waitForTimeout(120);
        await host.keyboard.up(fire.keyboard);
        await host.waitForTimeout(130);
      }
    }

    const allowHeadlessStatsAudio = target.label === "desktop Chromium";
    try {
      await guest.waitForFunction((allowStatsOnly) => {
        const snapshot = window.__ponpokoReadW2Lan?.();
        if (!snapshot || snapshot.error) {
          return false;
        }
        if (snapshot.ready === true && snapshot.status === "ready") {
          return true;
        }
        return allowStatsOnly &&
          snapshot.receivedVideoTrackCount === 1 &&
          snapshot.receivedAudioTrackCount === 1 &&
          snapshot.inboundVideoFramesDecoded > 0 &&
          snapshot.inboundAudioPacketsReceived > 0 &&
          snapshot.previewAdvancing &&
          snapshot.previewContentVisible &&
          snapshot.previewContentChanging;
      }, allowHeadlessStatsAudio, { timeout: 25_000 });
    } catch (error) {
      throw new Error(`${target.label} ${game.id} LAN guest did not receive live media: ${JSON.stringify(await readLanDiagnostic(host, guest))}`, {
        cause: error
      });
    }

    const firstGuestMedia = await guest.evaluate(() => {
      const snapshot = window.__ponpokoReadW2Lan?.();
      return {
        frames: snapshot?.inboundVideoFramesDecoded ?? 0,
        packets: snapshot?.inboundAudioPacketsReceived ?? 0
      };
    });
    await guest.waitForFunction(({ frames, packets, strictReady }) => {
      const snapshot = window.__ponpokoReadW2Lan?.();
      return snapshot?.error === null &&
        snapshot.inboundVideoFramesDecoded > frames &&
        snapshot.inboundAudioPacketsReceived > packets &&
        (!strictReady || snapshot.ready === true);
    }, { ...firstGuestMedia, strictReady: !allowHeadlessStatsAudio }, { timeout: 10_000 });

    const guestVisual = await captureLanGuestPreviewVisualEvidence(guest, target, game);
    const evidence = await Promise.all([host, guest].map((page) => page.evaluate(() => ({
      canvasCount: document.querySelectorAll("canvas").length,
      getUserMediaCalls: window.__gameSmokeGetUserMediaCalls,
      hasPreview: Boolean(document.querySelector(".w2-lan-capture-panel video")),
      snapshot: window.__ponpokoReadW2Lan?.() ?? null
    }))));
    const [hostEvidence, guestEvidence] = evidence;
    const guestSessionBoundary = await readGuestIsolationEvidence(guest, guestRequests);
    const strictReceiverReady = !allowHeadlessStatsAudio;
    if (
      hostEvidence.getUserMediaCalls !== 0 ||
      hostEvidence.hasPreview ||
      hostEvidence.snapshot?.captureVideoTrackCount !== 1 ||
      hostEvidence.snapshot?.captureAudioTrackCount !== 1 ||
      (allowHeadlessStatsAudio && hostEvidence.snapshot?.captureAudioActivityObserved !== true) ||
      guestEvidence.getUserMediaCalls !== 0 ||
      guestEvidence.canvasCount !== 0 ||
      !guestEvidence.hasPreview ||
      guestEvidence.snapshot?.receivedVideoTrackCount !== 1 ||
      guestEvidence.snapshot?.receivedAudioTrackCount !== 1 ||
      guestEvidence.snapshot?.error !== null ||
      (strictReceiverReady && guestEvidence.snapshot?.ready !== true) ||
      !guestIsolationIsClean(guestSessionBoundary)
    ) {
      throw new Error(`${target.label} ${game.id} LAN role/media boundary failed: ${JSON.stringify({
        guest: guestEvidence,
        guestSessionBoundary,
        guestVisual,
        host: hostEvidence
      })}`);
    }
  } finally {
    await context.close();
  }
}

async function readGuestIsolationEvidence(page, requests) {
  const pageState = await page.evaluate(() => ({
    canvasCount: document.querySelectorAll("canvas").length,
    ejsGlobals: Object.keys(window).filter((key) => key.startsWith("EJS_")),
    getUserMediaCalls: window.__gameSmokeGetUserMediaCalls,
    hasCatalog: Boolean(document.querySelector("[data-game-id]")),
    hasGameRuntimeMount: Boolean(document.querySelector("#game")),
    hasLoader: Boolean(document.querySelector('script[src*="loader"]')),
    snapshot: window.__ponpokoReadW2Lan?.() ?? null
  }));
  const forbiddenRequests = requests.filter((url) => {
    const parsed = new URL(url);
    return /\/roms\/|\/data\/loader\.js(?:$|\?)|\/(?:cores?|emulatorjs)\/|\.(?:state|wasm|zip)(?:$|\?)/i.test(parsed.href);
  });
  return { ...pageState, forbiddenRequests };
}

function guestIsolationIsClean(evidence) {
  return evidence.canvasCount === 0 &&
    evidence.ejsGlobals.length === 0 &&
    evidence.getUserMediaCalls === 0 &&
    !evidence.hasCatalog &&
    !evidence.hasGameRuntimeMount &&
    !evidence.hasLoader &&
    evidence.forbiddenRequests.length === 0;
}

async function captureLanGuestPreviewVisualEvidence(page, target, game) {
  const preview = page.locator('video[aria-label="Phone A 게임 수신 영상"]');
  const fullRegion = { xEnd: 1, xStart: 0, yEnd: 1, yStart: 0 };
  let previous = await preview.screenshot();
  let bestChangedPixelRatio = 0;
  let bestVisiblePixelRatio = visiblePixelRatio(previous, fullRegion);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    await page.waitForTimeout(250);
    const current = await preview.screenshot();
    const changedPixelRatio = pixelDifferenceRatio(previous, current);
    const currentVisiblePixelRatio = visiblePixelRatio(current, fullRegion);
    bestChangedPixelRatio = Math.max(bestChangedPixelRatio, changedPixelRatio);
    bestVisiblePixelRatio = Math.max(bestVisiblePixelRatio, currentVisiblePixelRatio);
    if (currentVisiblePixelRatio >= 0.02 && changedPixelRatio >= 0.01) {
      return { changedPixelRatio, visiblePixelRatio: currentVisiblePixelRatio };
    }
    previous = current;
  }
  const diagnostic = await page.evaluate(() => ({
    panel: document.querySelector("[data-w2-lan-guest-mount]")?.textContent ?? null,
    snapshot: window.__ponpokoReadW2Lan?.() ?? null
  }));
  throw new Error(`${target.label} ${game.id} LAN guest preview stayed black or static: ${JSON.stringify({
    bestChangedPixelRatio,
    bestVisiblePixelRatio,
    ...diagnostic
  })}`);
}

async function readLanDiagnostic(host, guest) {
  const read = (page) => page.evaluate(() => ({
    panel: document.querySelector("[data-stream-capture-spike-mount], [data-w2-lan-guest-mount]")?.textContent ?? null,
    snapshot: window.__ponpokoReadW2Lan?.() ?? null
  }));
  const [hostDiagnostic, guestDiagnostic] = await Promise.all([read(host), read(guest)]);
  return { guest: guestDiagnostic, host: hostDiagnostic };
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
  const romNetworkRequests = [];
  context.on("request", (request) => {
    if (request.url() === expectedRomUrl) {
      romNetworkRequests.push(request.url());
    }
  });

  try {
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      window.__gameSmokeFetchCalls = [];
      window.__gameSmokeGetUserMediaCalls = 0;
      window.__gameSmokeInputCalls = [];
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
      if (navigator.mediaDevices && originalGetUserMedia) {
        navigator.mediaDevices.getUserMedia = (...args) => {
          window.__gameSmokeGetUserMediaCalls += 1;
          return originalGetUserMedia(...args);
        };
      }
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
    if (captureSpikeEnabled) {
      await assertStreamCaptureSpike(page, target, game);
      return;
    } else if (game.id === "bublbobl") {
      const captureBoundary = await page.evaluate(() => ({
        getUserMediaCalls: window.__gameSmokeGetUserMediaCalls,
        hasDebugReader: typeof window.__ponpokoReadCaptureSpike === "function",
        hasPanel: Boolean(document.querySelector("[data-stream-capture-spike-mount]"))
      }));
      if (
        captureBoundary.getUserMediaCalls !== 0 ||
        captureBoundary.hasDebugReader ||
        captureBoundary.hasPanel
      ) {
        throw new Error(`${target.label} ${game.id} query-off capture boundary changed: ${JSON.stringify(captureBoundary)}`);
      }
    }
    if (game.advanceTutorial) {
      await advanceMetalSlugTutorial(page, target, game);
    }
    if (game.advanceSelection) {
      const selectionCheck = game.inputChecks.find((check) => check.expectedInput === 0);
      if (!selectionCheck) {
        throw new Error(`${target.label} ${game.id} is missing its selection input`);
      }
      await triggerControl(page, target, selectionCheck);
      await page.waitForTimeout(5_000);
    }
    const screenshotPath = screenshotDirectory
      ? `${screenshotDirectory}/${target.label.replaceAll(" ", "-")}-${game.id}.png`
      : undefined;
    const activeStageScreenshot = await page.locator(".game-stage").screenshot(
      screenshotPath ? { path: screenshotPath } : undefined
    );
    if (game.screenOrientation === "vertical") {
      const geometry = await page.evaluate(() => {
        const stage = document.querySelector(".game-stage");
        const canvas = document.querySelector(".game-stage canvas");
        const canvasParent = canvas?.parentElement;
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
        const canvasStyle = canvas ? getComputedStyle(canvas) : null;

        return {
          canvasAttributes: canvas ? { height: canvas.height, width: canvas.width } : null,
          canvasParentRect: canvasParent ? toRect(canvasParent) : null,
          canvasRect: canvas ? toRect(canvas) : null,
          canvasStyle: canvasStyle ? {
            aspectRatio: canvasStyle.aspectRatio,
            height: canvasStyle.height,
            objectFit: canvasStyle.objectFit,
            transform: canvasStyle.transform,
            transformOrigin: canvasStyle.transformOrigin,
            width: canvasStyle.width
          } : null,
          stageRect: stage ? toRect(stage) : null
        };
      });
      if (
        !geometry.stageRect ||
        !geometry.canvasRect ||
        geometry.stageRect.width >= geometry.stageRect.height ||
        Math.abs(geometry.stageRect.width / geometry.stageRect.height - 224 / 320) > 0.02 ||
        Math.abs(geometry.canvasRect.width - (geometry.stageRect.width - 2)) > 3 ||
        Math.abs(geometry.canvasRect.height - (geometry.stageRect.height - 2)) > 3
      ) {
        throw new Error(`${target.label} ${game.id} vertical canvas is cropped or distorted: ${JSON.stringify(geometry)}`);
      }
      const edgeVisibility = {
        left: visiblePixelRatio(activeStageScreenshot, { xEnd: 0.18, xStart: 0.02, yEnd: 0.92, yStart: 0.08 }),
        right: visiblePixelRatio(activeStageScreenshot, { xEnd: 0.98, xStart: 0.82, yEnd: 0.92, yStart: 0.08 })
      };
      if (Math.min(edgeVisibility.left, edgeVisibility.right) < 0.08) {
        throw new Error(`${target.label} ${game.id} vertical gameplay is clipped at an edge: ${JSON.stringify(edgeVisibility)}`);
      }
      if (screenshotDirectory) {
        console.log(`${target.label} ${game.id} vertical geometry ${JSON.stringify({ edgeVisibility, geometry })}`);
      }
    }
    if (hasRetroArchMainMenu(activeStageScreenshot)) {
      throw new Error(`${target.label} ${game.id} still shows the RetroArch main menu instead of gameplay`);
    }
    if (game.rejectTutorialScreen && hasMetalSlugTutorial(activeStageScreenshot)) {
      throw new Error(`${target.label} ${game.id} did not advance beyond the HOW TO PLAY tutorial`);
    }
    if (game.visibleRegion && visiblePixelRatio(activeStageScreenshot, game.visibleRegion) < game.minVisiblePixelRatio) {
      throw new Error(`${target.label} ${game.id} did not render visible gameplay pixels by frame ${game.minFrame}`);
    }
    if (game.minColorBins) {
      const visual = gameplayVisualSignature(activeStageScreenshot, game.visibleRegion);
      if (visual.colorBins < game.minColorBins) {
        throw new Error(`${target.label} ${game.id} rendered too few gameplay color bins: ${JSON.stringify(visual)}`);
      }
      const baseline = game.compareVisualAcrossTargets === false
        ? null
        : visualBaselines.get(game.id);
      if (baseline && histogramDistance(baseline.histogram, visual.histogram) > 0.2) {
        throw new Error(`${target.label} ${game.id} visual output diverged from the desktop baseline`);
      }
      if (game.compareVisualAcrossTargets !== false) {
        visualBaselines.set(game.id, baseline ?? visual);
      }
      if (screenshotDirectory) {
        console.log(`${target.label} ${game.id} visual signature ${JSON.stringify({
          colorBins: visual.colorBins,
          desktopDistance: baseline ? histogramDistance(baseline.histogram, visual.histogram) : 0
        })}`);
      }
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
    if (screenshotPath) {
      await page.locator(".boot-debug-panel").evaluateAll((panels) => {
        for (const panel of panels) {
          panel.dataset.smokeVisibility = panel.style.visibility;
          panel.style.visibility = "hidden";
        }
      });
      await page.screenshot({ path: screenshotPath.replace(/\.png$/, "-viewport.png") });
      await page.locator(".boot-debug-panel").evaluateAll((panels) => {
        for (const panel of panels) {
          panel.style.visibility = panel.dataset.smokeVisibility ?? "";
          delete panel.dataset.smokeVisibility;
        }
      });
    }
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
    await assertMobileInputStress(page, target, game);
    if (game.verifyRomCacheReuse) {
      await assertRomCacheReuse(page, target, game, expectedRomUrl, romNetworkRequests);
    }
  } finally {
    await context.close();
  }
}

async function assertStreamCaptureSpike(page, target, game) {
  if (game.id !== "bublbobl") {
    throw new Error(`${target.label} capture spike entered for non-Bubble game ${game.id}`);
  }

  await page.locator("[data-stream-capture-spike-mount]").waitFor({ timeout: 5_000 });
  const panelLayout = await page.evaluate(() => {
    const panel = document.querySelector("[data-stream-capture-spike-mount]");
    const stage = document.querySelector(".game-stage");
    const controls = [...document.querySelectorAll(
      '[data-touch-surface="virtual"] [data-action]'
    )].filter((element) => {
      if (element instanceof HTMLButtonElement && element.disabled) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity || "1") > 0;
    });
    const toRect = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top
      };
    };
    const panelRect = panel ? toRect(panel) : null;
    const stageRect = stage ? toRect(stage) : null;
    const obstructedActions = controls.flatMap((control) => {
      const rect = control.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit?.closest("[data-action]") === control
        ? []
        : [control.getAttribute("data-action") ?? "unknown"];
    });
    return {
      obstructedActions,
      panelInsideStage: Boolean(panel && stage?.contains(panel)),
      panelRect,
      stageRect
    };
  });
  if (
    !panelLayout.panelInsideStage ||
    !panelLayout.panelRect ||
    !panelLayout.stageRect ||
    panelLayout.panelRect.top < panelLayout.stageRect.top - 1 ||
    panelLayout.panelRect.left < panelLayout.stageRect.left - 1 ||
    panelLayout.panelRect.right > panelLayout.stageRect.right + 1 ||
    panelLayout.panelRect.bottom > panelLayout.stageRect.bottom + 1 ||
    panelLayout.obstructedActions.length > 0
  ) {
    throw new Error(`${target.label} ${game.id} capture panel obstructs gameplay controls: ${JSON.stringify(panelLayout)}`);
  }
  try {
    await page.waitForFunction(() => {
      const snapshot = window.__ponpokoReadCaptureSpike?.();
      const preview = document.querySelector('[data-stream-capture-spike="true"] video');
      return snapshot?.width === 512 &&
        snapshot.height === 448 &&
        snapshot.fps === 30 &&
        snapshot.captureVideoTrackCount === 1 &&
        snapshot.receivedVideoTrackCount === 1 &&
        snapshot.videoPath === "bridge" &&
        snapshot.bridgeReady === true &&
        snapshot.bridgePlayError === null &&
        snapshot.previewPlayError === null &&
        snapshot.videoPipeline?.diagnosis === "ok" &&
        snapshot.videoPipeline.bridge.verdict === "ok" &&
        snapshot.videoPipeline.staging.verdict === "ok" &&
        snapshot.videoPipeline.receiver.verdict === "ok" &&
        snapshot.inboundVideoFramesDecoded > 0 &&
        snapshot.previewPresentationReady === true &&
        snapshot.receivedVideoContentVisible === true &&
        snapshot.receivedVideoBlack === false &&
        preview instanceof HTMLVideoElement &&
        preview.currentTime > 0;
    }, undefined, { timeout: 20_000 });
  } catch (error) {
    const diagnostic = await page.evaluate(() => {
      const preview = document.querySelector('[data-stream-capture-spike="true"] video');
      return {
        panel: document.querySelector("[data-stream-capture-spike-mount]")?.textContent ?? null,
        preview: preview instanceof HTMLVideoElement
          ? {
              currentTime: preview.currentTime,
              error: preview.error?.message ?? null,
              networkState: preview.networkState,
              paused: preview.paused,
              readyState: preview.readyState,
              tracks: preview.srcObject instanceof MediaStream
                ? preview.srcObject.getTracks().map((track) => ({ kind: track.kind, readyState: track.readyState }))
                : []
            }
          : null,
        snapshot: window.__ponpokoReadCaptureSpike?.() ?? null
      };
    });
    throw new Error(`${target.label} ${game.id} capture spike did not present visible video: ${JSON.stringify(diagnostic)}`, {
      cause: error
    });
  }

  await page.keyboard.down("5");
  await page.waitForTimeout(250);
  await page.keyboard.up("5");
  await page.keyboard.down("Enter");
  await page.waitForTimeout(250);
  await page.keyboard.up("Enter");
  const audibleAction = game.inputChecks.find((check) => check.expectedInput === 0);
  if (audibleAction) {
    await page.keyboard.down(audibleAction.keyboard);
    await page.waitForTimeout(120);
    await page.keyboard.up(audibleAction.keyboard);
  }

  const fallback = page.getByRole("button", { name: "방 열고 소리 켜기" });
  const allowHeadlessStatsAudio = target.label === "desktop Chromium";
  let headlessStatsAudioObserved = false;

  if (allowHeadlessStatsAudio) {
    await page.waitForFunction(() => {
      const snapshot = window.__ponpokoReadCaptureSpike?.();
      return snapshot?.ready === true || (
        snapshot?.captureAudioLevelRms > 0.001 &&
        snapshot.inboundAudioPacketsReceived > 0
      );
    }, undefined, { timeout: 15_000 });
    headlessStatsAudioObserved = await page.evaluate(() => {
      const snapshot = window.__ponpokoReadCaptureSpike?.();
      return snapshot?.ready !== true &&
        snapshot?.captureAudioLevelRms > 0.001 &&
        snapshot.inboundAudioPacketsReceived > 0;
    });
  } else {
    await page.waitForFunction(() => {
      const snapshot = window.__ponpokoReadCaptureSpike?.();
      return snapshot?.ready === true || snapshot?.fallbackAvailable === true;
    }, undefined, { timeout: 6_000 }).catch(() => undefined);
    if (await fallback.isVisible().catch(() => false)) {
      await fallback.click();
    }
  }

  try {
    if (headlessStatsAudioObserved) {
      // Headless Chromium can expose non-silent sender/inbound RTP energy while its remote
      // MediaStream-to-WebAudio analyser remains zero. Physical readiness still requires RMS.
      await page.waitForFunction(() => {
        const snapshot = window.__ponpokoReadCaptureSpike?.();
        const preview = document.querySelector('[data-stream-capture-spike="true"] video');
        return snapshot?.captureAudioTrackCount === 1 &&
          snapshot.receivedAudioTrackCount === 1 &&
          snapshot.receivedVideoTrackCount === 1 &&
          preview instanceof HTMLVideoElement &&
          preview.srcObject instanceof MediaStream &&
          preview.srcObject.getVideoTracks()[0]?.readyState === "live";
      }, undefined, { timeout: 5_000 });
    } else {
      await page.waitForFunction(() => {
        const snapshot = window.__ponpokoReadCaptureSpike?.();
        const preview = document.querySelector('[data-stream-capture-spike="true"] video');
        return snapshot?.ready === true &&
          snapshot.status === "ready" &&
          snapshot.captureAudioTrackCount === 1 &&
          snapshot.receivedAudioTrackCount === 1 &&
          snapshot.receivedVideoTrackCount === 1 &&
          preview instanceof HTMLVideoElement &&
          preview.srcObject instanceof MediaStream &&
          preview.srcObject.getVideoTracks()[0]?.readyState === "live";
      }, undefined, { timeout: 15_000 });
    }
  } catch (error) {
    const diagnostic = await page.evaluate(() => {
      const currentCtx = window.EJS_emulator?.Module?.AL?.currentCtx;
      const sources = Array.isArray(currentCtx?.sources)
        ? currentCtx.sources
        : Object.values(currentCtx?.sources ?? {});
      return {
        audioGraph: currentCtx
          ? {
              contextKeys: Object.keys(currentCtx),
              sourceCount: sources.length,
              sourceKeys: sources.slice(0, 4).map((source) => Object.keys(source ?? {})),
              state: currentCtx.audioCtx?.state ?? null
            }
          : null,
        panel: document.querySelector("[data-stream-capture-spike-mount]")?.textContent ?? null,
        snapshot: window.__ponpokoReadCaptureSpike?.() ?? null
      };
    });
    throw new Error(`${target.label} ${game.id} capture spike did not become ready: ${JSON.stringify(diagnostic)}`, {
      cause: error
    });
  }

  const previewVisual = await capturePreviewVisualEvidence(page, target, game);

  const evidence = {
    previewVisual,
    ...(await page.evaluate(() => {
      const snapshot = window.__ponpokoReadCaptureSpike?.();
      const preview = document.querySelector('[data-stream-capture-spike="true"] video');
      return {
        getUserMediaCalls: window.__gameSmokeGetUserMediaCalls,
        preview: preview instanceof HTMLVideoElement
          ? {
              autoplay: preview.autoplay,
              muted: preview.muted,
              playsInline: preview.playsInline,
              videoTracks: preview.srcObject instanceof MediaStream
                ? preview.srcObject.getVideoTracks().map((track) => track.readyState)
                : []
            }
          : null,
        snapshot
      };
    }))
  };
  if (
    evidence.getUserMediaCalls !== 0 ||
    !evidence.preview?.autoplay ||
    !evidence.preview.muted ||
    !evidence.preview.playsInline ||
    evidence.preview.videoTracks[0] !== "live" ||
    evidence.snapshot?.videoPath !== "bridge" ||
    evidence.snapshot?.bridgeReady !== true ||
    evidence.snapshot?.bridgePlayError !== null ||
    evidence.snapshot?.previewPlayError !== null ||
    evidence.snapshot?.videoPipeline?.diagnosis !== "ok" ||
    (evidence.snapshot?.ready !== true && !headlessStatsAudioObserved)
  ) {
    throw new Error(`${target.label} ${game.id} capture spike media boundary failed: ${JSON.stringify(evidence)}`);
  }
  console.log(`${target.label} ${game.id} capture evidence ${JSON.stringify({
    audioPackets: evidence.snapshot?.inboundAudioPacketsReceived ?? 0,
    changedPixelRatio: evidence.previewVisual.changedPixelRatio,
    framesDecoded: evidence.snapshot?.inboundVideoFramesDecoded ?? 0,
    audioEvidence: evidence.snapshot?.ready === true ? "receiver-rms" : "headless-sender-rms+packets",
    inboundAudioEnergy: evidence.snapshot?.inboundAudioTotalEnergy ?? 0,
    pipeline: evidence.snapshot?.videoPipeline?.diagnosis ?? "missing",
    ready: evidence.snapshot?.ready === true,
    rms: evidence.snapshot?.receiverAudioLevelRms ?? 0,
    visiblePixelRatio: evidence.previewVisual.visiblePixelRatio
  })}`);
}

async function capturePreviewVisualEvidence(page, target, game) {
  const preview = page.locator('[data-stream-capture-spike="true"] video');
  const fullRegion = { xEnd: 1, xStart: 0, yEnd: 1, yStart: 0 };
  let previous = await preview.screenshot();
  let bestChangedPixelRatio = 0;
  let bestVisiblePixelRatio = visiblePixelRatio(previous, fullRegion);

  for (let attempt = 0; attempt < 16; attempt += 1) {
    await page.waitForTimeout(250);
    const current = await preview.screenshot();
    const changedPixelRatio = pixelDifferenceRatio(previous, current);
    const currentVisiblePixelRatio = visiblePixelRatio(current, fullRegion);
    bestChangedPixelRatio = Math.max(bestChangedPixelRatio, changedPixelRatio);
    bestVisiblePixelRatio = Math.max(bestVisiblePixelRatio, currentVisiblePixelRatio);
    if (currentVisiblePixelRatio >= 0.02 && changedPixelRatio >= 0.01) {
      return {
        changedPixelRatio,
        visiblePixelRatio: currentVisiblePixelRatio
      };
    }
    previous = current;
  }

  const snapshot = await page.evaluate(() => window.__ponpokoReadCaptureSpike?.() ?? null);
  throw new Error(`${target.label} ${game.id} capture preview stayed black or static: ${JSON.stringify({
    bestChangedPixelRatio,
    bestVisiblePixelRatio,
    snapshot
  })}`);
}

async function advanceMetalSlugTutorial(page, target, game) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const screenshot = await page.locator(".game-stage").screenshot();
    if (!hasMetalSlugTutorial(screenshot)) {
      await triggerSpecialControl(page, target, "coin", "5");
      await page.waitForTimeout(250);
      await triggerSpecialControl(page, target, "start", "Enter");
      await page.waitForTimeout(5_000);
      return;
    }
    await triggerSpecialControl(page, target, "coin", "5");
    await page.waitForTimeout(250);
    await triggerSpecialControl(page, target, "start", "Enter");
    await page.waitForTimeout(1_500);
  }
  await page.waitForTimeout(15_000);
}

async function triggerSpecialControl(page, target, action, key) {
  if (target.inputMode === "keyboard") {
    await page.keyboard.down(key);
    await page.waitForTimeout(500);
    await page.keyboard.up(key);
    return;
  }

  const box = await page.locator(
    `[data-touch-surface="virtual"] .virtual-special-button[data-action="${action}"]`
  ).boundingBox();
  if (!box) {
    throw new Error(`${target.label} special control ${action} was not found`);
  }
  const point = centerPoint(box);
  await dispatchTouchStart(page, point.x, point.y, action === "coin" ? 1951 : 1952);
  await page.waitForTimeout(500);
  await dispatchTouchEnd(page, point.x, point.y, action === "coin" ? 1951 : 1952);
}

async function assertRomCacheReuse(page, target, game, expectedRomUrl, romNetworkRequests) {
  const cacheKey = `${game.romFile}:${game.romVersion}`;
  await page.waitForFunction(({ byteLength, cacheKey }) => new Promise((resolve) => {
    const openRequest = indexedDB.open("arcade-safari-roms", 1);
    openRequest.onerror = () => resolve(false);
    openRequest.onsuccess = () => {
      const database = openRequest.result;
      const transaction = database.transaction("roms", "readonly");
      const readRequest = transaction.objectStore("roms").get(cacheKey);
      readRequest.onerror = () => {
        database.close();
        resolve(false);
      };
      readRequest.onsuccess = () => {
        const record = readRequest.result;
        database.close();
        resolve(record?.byteLength === byteLength && record?.bytes?.byteLength === byteLength);
      };
    };
  }), { byteLength: game.romByteLength, cacheKey }, { timeout: 10_000 });

  const serviceWorkerRomEntries = await page.evaluate(async (romPathname) => {
    const matches = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        if (new URL(request.url).pathname === romPathname) {
          matches.push({ cacheName, url: request.url });
        }
      }
    }
    return matches;
  }, new URL(expectedRomUrl).pathname);
  if (serviceWorkerRomEntries.length > 0) {
    throw new Error(`${target.label} ${game.id} duplicated the ROM in Cache Storage: ${JSON.stringify(serviceWorkerRomEntries)}`);
  }
  if (romNetworkRequests.length !== 1) {
    throw new Error(`${target.label} ${game.id} expected one cold ROM request before cache reuse, got ${romNetworkRequests.length}`);
  }

  await page.locator(".game-topbar [data-back]").click();
  await page.locator(`[data-game-id="${game.id}"]`).waitFor({ timeout: 10_000 });
  await page.locator(`[data-game-id="${game.id}"]`).click();
  const choice = page.locator("[data-autosave-choice]");
  const nextView = await Promise.race([
    choice.waitFor({ timeout: 10_000 }).then(() => "choice"),
    page.locator("canvas").first().waitFor({ timeout: 10_000 }).then(() => "game")
  ]);
  if (nextView === "choice") {
    await page.locator("[data-start-new]").click();
  }
  await page.locator("canvas").first().waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => (
    (window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0) >= 120
  ), undefined, { timeout: 60_000 });
  await page.locator("[data-game-status]").getByText("플레이 중").waitFor({ timeout: 10_000 });

  const warmFetchCalls = await page.evaluate((romUrl) => (
    window.__gameSmokeFetchCalls ?? []
  ).filter((call) => call.url === romUrl), expectedRomUrl);
  if (warmFetchCalls.length !== 0 || romNetworkRequests.length !== 1) {
    throw new Error(`${target.label} ${game.id} warm launch fetched the ROM again: ${JSON.stringify({
      coldAndWarmRequests: romNetworkRequests,
      warmFetchCalls
    })}`);
  }
  if (screenshotDirectory) {
    console.log(`${target.label} ${game.id} ROM cache reuse cold=1 warm=0 CacheStorage=0`);
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
    const buttonMinGap = buttonRects.length > 1
      ? Math.min(...buttonRects.flatMap((rect, index) => (
          buttonRects.slice(index + 1).map((other) => {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const otherCenterX = other.left + other.width / 2;
            const otherCenterY = other.top + other.height / 2;
            return Math.hypot(centerX - otherCenterX, centerY - otherCenterY) -
              (rect.width + other.width) / 2;
          })
        )))
      : 0;
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
      buttonMinGap,
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
  if (layout.buttonMinGap < 6) {
    throw new Error(`${target.label} ${game.id} action buttons are too close together: ${JSON.stringify(layout)}`);
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
    if (screenshotDirectory) {
      console.log(`${target.label} ${game.id} vertical mobile layout ${JSON.stringify({
        controlsRect: layout.controlsRect,
        menuRect: layout.menuRect,
        specialMinHeight: layout.specialMinHeight,
        stageRect: layout.stageRect,
        viewportHeight: layout.viewportHeight,
        viewportWidth: layout.viewportWidth
      })}`);
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
    !areSeparatedButtonRows(buttons.slice(0, 3), buttons.slice(3, 6))
  ) {
    throw new Error(`${label} action buttons are not arranged in two separated arcade rows: ${JSON.stringify(layout)}`);
  }
}

function areSeparatedButtonRows(topRow, bottomRow) {
  const isRow = (buttons) => buttons.length === 3 &&
    buttons[0].x < buttons[1].x &&
    buttons[1].x < buttons[2].x &&
    Math.max(...buttons.map((button) => button.y)) - Math.min(...buttons.map((button) => button.y)) <= 1;

  return isRow(topRow) &&
    isRow(bottomRow) &&
    Math.max(...topRow.map((button) => button.y)) < Math.min(...bottomRow.map((button) => button.y));
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

  const point = centerPoint(box);
  await dispatchTouchStart(page, point.x, point.y, 1960);
  await page.waitForTimeout(120);
  await dispatchTouchEnd(page, point.x, point.y, 1960);
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

async function assertMobileInputStress(page, target, game) {
  if (target.inputMode !== "pointer" || !["bublbobl", "s1945"].includes(game.id)) {
    return;
  }

  const fireCheck = game.inputChecks.find((check) => check.expectedInput === 0);
  const jumpCheck = game.inputChecks.find((check) => check.expectedInput === 8);
  const fireBox = fireCheck ? await page.locator(fireCheck.selector).first().boundingBox() : null;
  const jumpBox = jumpCheck ? await page.locator(jumpCheck.selector).first().boundingBox() : null;
  const stickBox = await page.locator(".virtual-stick").boundingBox();
  if (!fireCheck || !jumpCheck || !fireBox || !jumpBox || !stickBox) {
    throw new Error(`${target.label} ${game.id} missing controls for mobile input stress`);
  }

  const firePoint = centerPoint(fireBox);
  const jumpPoint = centerPoint(jumpBox);

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });
  await page.mouse.move(firePoint.x, firePoint.y);
  await page.mouse.down();
  await page.mouse.move(jumpPoint.x, jumpPoint.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(120);
  const scrubCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertOrderedInputTransition(
    scrubCalls,
    fireCheck.expectedInput,
    jumpCheck.expectedInput,
    `${target.label} ${game.id} action scrub`
  );

  const okBox = await page.locator(
    '[data-touch-surface="virtual"] .virtual-special-button[data-action="ok"]'
  ).boundingBox();
  if (!okBox) {
    throw new Error(`${target.label} ${game.id} missing OK control for scrub containment`);
  }
  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });
  const okPoint = centerPoint(okBox);
  await page.mouse.move(firePoint.x, firePoint.y);
  await page.mouse.down();
  await page.mouse.move(okPoint.x, okPoint.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const containedScrubCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertInputPair(
    containedScrubCalls,
    fireCheck.expectedInput,
    `${target.label} ${game.id} gameplay scrub containment`
  );
  assertForbiddenInputs(
    containedScrubCalls,
    [6, 7],
    `${target.label} ${game.id} gameplay scrub containment`
  );

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });
  const stickCenter = centerPoint(stickBox);
  const scrubRadius = Math.min(stickBox.width, stickBox.height) * 0.34;
  await dispatchTouchStart(page, stickCenter.x - scrubRadius, stickCenter.y, 1951);
  for (let index = 0; index < 96; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    await dispatchTouchMove(
      page,
      stickCenter.x + Math.cos(angle) * scrubRadius,
      stickCenter.y + Math.sin(angle) * scrubRadius,
      1951
    );
  }
  await page.waitForTimeout(1_400);
  await dispatchTouchEnd(page, stickCenter.x, stickCenter.y, 1951);
  await page.waitForTimeout(300);
  const dpadState = await page.evaluate(() => ({
    activeDirections: document.querySelector(".virtual-stick")?.getAttribute("data-active-directions") ?? "",
    calls: window.__gameSmokeInputCalls ?? []
  }));
  for (const [input, label] of [[4, "up"], [7, "right"], [5, "down"], [6, "left"]]) {
    assertInputPair(dpadState.calls, input, `${target.label} ${game.id} long scrub ${label}`);
  }
  assertBalancedInputs(dpadState.calls, [4, 5, 6, 7], `${target.label} ${game.id} long D-pad scrub`);
  if (dpadState.activeDirections !== "") {
    throw new Error(`${target.label} ${game.id} D-pad stayed visually active after scrub: ${JSON.stringify(dpadState)}`);
  }

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });
  await dispatchTouchStart(page, firePoint.x, firePoint.y, 1952);
  await dispatchLostPointerCapture(page, 1952);
  await dispatchTouchStart(page, firePoint.x, firePoint.y, 1952);
  await dispatchTouchEnd(page, firePoint.x, firePoint.y, 1952);
  await page.waitForTimeout(120);
  const lostCaptureCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertExactInputPairs(
    lostCaptureCalls,
    fireCheck.expectedInput,
    2,
    `${target.label} ${game.id} lost capture recovery`
  );

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });
  await dispatchTouchStart(page, firePoint.x, firePoint.y, 1953);
  await dispatchPointerEndOutside(page, 1953);
  await dispatchTouchStart(page, firePoint.x, firePoint.y, 1953);
  await dispatchTouchEnd(page, firePoint.x, firePoint.y, 1953);
  await page.waitForTimeout(120);
  const outsideReleaseCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertExactInputPairs(
    outsideReleaseCalls,
    fireCheck.expectedInput,
    2,
    `${target.label} ${game.id} document release recovery`
  );

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });
  const leftPoint = {
    x: stickBox.x + stickBox.width * 0.2,
    y: stickBox.y + stickBox.height / 2
  };
  await dispatchTouchStart(page, leftPoint.x, leftPoint.y, 1955);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("blur"));
    delete window.__gameSmokeActivePointerTargets[1955];
  });
  const blurActiveDirections = await page.locator(".virtual-stick").getAttribute("data-active-directions");
  await dispatchTouchStart(page, leftPoint.x, leftPoint.y, 1955);
  await dispatchTouchEnd(page, leftPoint.x, leftPoint.y, 1955);
  await page.waitForTimeout(120);
  const blurRecoveryCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertExactInputPairs(
    blurRecoveryCalls,
    6,
    2,
    `${target.label} ${game.id} blur recovery`
  );
  if (blurActiveDirections !== "") {
    throw new Error(`${target.label} ${game.id} D-pad stayed active after blur: ${blurActiveDirections}`);
  }

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });
  await dispatchTouchStart(page, leftPoint.x, leftPoint.y, 1958);
  const loadBox = await page.locator(
    '[data-touch-surface="virtual"] [data-load-state]'
  ).boundingBox();
  if (!loadBox) {
    throw new Error(`${target.label} ${game.id} missing load control for pointer cleanup`);
  }
  const loadPoint = centerPoint(loadBox);
  await page.mouse.click(loadPoint.x, loadPoint.y);
  await page.waitForTimeout(160);
  const loadActiveDirections = await page.locator(".virtual-stick").getAttribute("data-active-directions");
  await dispatchTouchEnd(page, leftPoint.x, leftPoint.y, 1958);
  await dispatchTouchStart(page, leftPoint.x, leftPoint.y, 1959);
  await dispatchTouchEnd(page, leftPoint.x, leftPoint.y, 1959);
  await page.waitForTimeout(120);
  const loadRecoveryCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertExactInputPairs(
    loadRecoveryCalls,
    6,
    2,
    `${target.label} ${game.id} load-state pointer cleanup`
  );
  if (loadActiveDirections !== "") {
    throw new Error(`${target.label} ${game.id} D-pad stayed active after loading state: ${loadActiveDirections}`);
  }

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });
  await dispatchTouchStart(page, leftPoint.x, leftPoint.y, 1960);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    delete document.hidden;
    delete window.__gameSmokeActivePointerTargets[1960];
  });
  const visibilityActiveDirections = await page.locator(".virtual-stick").getAttribute("data-active-directions");
  await dispatchTouchStart(page, leftPoint.x, leftPoint.y, 1961);
  await dispatchTouchEnd(page, leftPoint.x, leftPoint.y, 1961);
  await page.waitForTimeout(120);
  const visibilityRecoveryCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertExactInputPairs(
    visibilityRecoveryCalls,
    6,
    2,
    `${target.label} ${game.id} visibility recovery with fresh pointer`
  );
  if (visibilityActiveDirections !== "") {
    throw new Error(`${target.label} ${game.id} D-pad stayed active after visibility cleanup: ${visibilityActiveDirections}`);
  }

  await page.evaluate(() => {
    window.__gameSmokeInputCalls = [];
  });
  await dispatchTouchStart(page, firePoint.x, firePoint.y, 1956);
  await dispatchTouchStart(page, firePoint.x, firePoint.y, 1957);
  await dispatchTouchEnd(page, firePoint.x, firePoint.y, 1956);
  const sharedActionMidCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  if (sharedActionMidCalls.some((call) => call.input === fireCheck.expectedInput && call.pressed === 0)) {
    throw new Error(`${target.label} ${game.id} released a shared action while another pointer held it: ${JSON.stringify(sharedActionMidCalls)}`);
  }
  await dispatchTouchEnd(page, firePoint.x, firePoint.y, 1957);
  await page.waitForTimeout(120);
  const sharedActionCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertExactInputPairs(
    sharedActionCalls,
    fireCheck.expectedInput,
    1,
    `${target.label} ${game.id} shared action pointer ownership`
  );

  await page.evaluate(({ x, y }) => {
    window.__gameSmokeInputCalls = [];
    for (let index = 0; index < 30; index += 1) {
      window.__gameSmokeDispatchPointer("pointerdown", x, y, 1954, true);
      window.__gameSmokeDispatchPointer("pointerup", x, y, 1954, false);
    }
  }, firePoint);
  await page.waitForTimeout(120);
  const rapidTapCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
  assertExactInputPairs(
    rapidTapCalls,
    fireCheck.expectedInput,
    30,
    `${target.label} ${game.id} rapid repeated taps`
  );
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

async function dispatchTouchMove(page, x, y, pointerId = 1945) {
  await page.evaluate(({ pointerId, x, y }) => {
    if (typeof PointerEvent === "function") {
      window.__gameSmokeDispatchPointer("pointermove", x, y, pointerId, true);
      return;
    }

    window.__gameSmokeDispatchTouch("touchmove", x, y, true);
  }, { pointerId, x, y });
}

async function dispatchLostPointerCapture(page, pointerId) {
  await page.evaluate((pointerId) => {
    const target = window.__gameSmokeActivePointerTargets[pointerId];
    if (!target) {
      throw new Error(`No active pointer target for lost capture ${pointerId}`);
    }
    delete window.__gameSmokeActivePointerTargets[pointerId];
    target.dispatchEvent(new PointerEvent("lostpointercapture", {
      bubbles: true,
      button: 0,
      buttons: 0,
      cancelable: false,
      composed: true,
      pointerId,
      pointerType: "touch"
    }));
  }, pointerId);
}

async function dispatchPointerEndOutside(page, pointerId) {
  await page.evaluate((pointerId) => {
    delete window.__gameSmokeActivePointerTargets[pointerId];
    document.body.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true,
      button: 0,
      buttons: 0,
      cancelable: true,
      clientX: 1,
      clientY: 1,
      composed: true,
      pointerId,
      pointerType: "touch"
    }));
  }, pointerId);
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

function assertOrderedInputTransition(calls, fromInput, toInput, label) {
  const fromPress = calls.findIndex((call) => call.input === fromInput && call.pressed === 1);
  const fromRelease = calls.findIndex((call) => call.input === fromInput && call.pressed === 0);
  const toPress = calls.findIndex((call) => call.input === toInput && call.pressed === 1);
  const toRelease = calls.findIndex((call) => call.input === toInput && call.pressed === 0);
  if (
    fromPress === -1 ||
    fromRelease === -1 ||
    toPress === -1 ||
    toRelease === -1 ||
    fromPress > fromRelease ||
    fromRelease > toPress ||
    toPress > toRelease
  ) {
    throw new Error(`${label} did not release the old action before pressing the new one: ${JSON.stringify(calls)}`);
  }
}

function assertBalancedInputs(calls, inputs, label) {
  for (const input of inputs) {
    const presses = calls.filter((call) => call.input === input && call.pressed === 1).length;
    const releases = calls.filter((call) => call.input === input && call.pressed === 0).length;
    if (presses === 0 || presses !== releases) {
      throw new Error(`${label} left input ${input} unbalanced: ${JSON.stringify(calls)}`);
    }
  }
}

function assertExactInputPairs(calls, input, expectedPairs, label) {
  const presses = calls.filter((call) => call.input === input && call.pressed === 1).length;
  const releases = calls.filter((call) => call.input === input && call.pressed === 0).length;
  if (presses !== expectedPairs || releases !== expectedPairs) {
    throw new Error(`${label} expected ${expectedPairs} balanced pairs for input ${input}: ${JSON.stringify(calls)}`);
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

function hasMetalSlugTutorial(pngBuffer) {
  const image = decodePngRgba(pngBuffer);
  const yStart = Math.floor(image.height * 0.6);
  let green = 0;
  let red = 0;
  let total = 0;

  for (let y = yStart; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const pixel = readPixel(image, x, y);
      total += 1;
      if (pixel.red > 140 && pixel.red > pixel.green * 1.4 && pixel.red > pixel.blue * 1.2) {
        red += 1;
      }
      if (pixel.green > 100 && pixel.green > pixel.red * 1.2 && pixel.green > pixel.blue * 1.1) {
        green += 1;
      }
    }
  }

  return total > 0 && red / total > 0.006 && green / total > 0.0015;
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

function pixelDifferenceRatio(leftBuffer, rightBuffer) {
  const left = decodePngRgba(leftBuffer);
  const right = decodePngRgba(rightBuffer);
  if (left.width !== right.width || left.height !== right.height) {
    throw new Error(
      `Cannot compare screenshots with different sizes ${left.width}x${left.height} and ${right.width}x${right.height}`
    );
  }

  let changed = 0;
  const total = left.width * left.height;
  for (let y = 0; y < left.height; y += 1) {
    for (let x = 0; x < left.width; x += 1) {
      const leftPixel = readPixel(left, x, y);
      const rightPixel = readPixel(right, x, y);
      if (
        Math.abs(leftPixel.red - rightPixel.red) +
          Math.abs(leftPixel.green - rightPixel.green) +
          Math.abs(leftPixel.blue - rightPixel.blue) >= 24
      ) {
        changed += 1;
      }
    }
  }

  return total > 0 ? changed / total : 0;
}

function gameplayVisualSignature(pngBuffer, region) {
  const image = decodePngRgba(pngBuffer);
  const targetRegion = region ?? { xEnd: 1, xStart: 0, yEnd: 1, yStart: 0 };
  const xStart = Math.floor(image.width * targetRegion.xStart);
  const xEnd = Math.floor(image.width * targetRegion.xEnd);
  const yStart = Math.floor(image.height * targetRegion.yStart);
  const yEnd = Math.floor(image.height * targetRegion.yEnd);
  const colorBins = new Set();
  const histogram = Array.from({ length: 64 }, () => 0);
  let total = 0;

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const { alpha, blue, green, red } = readPixel(image, x, y);
      if (alpha <= 240) {
        continue;
      }
      colorBins.add(`${red >> 4}:${green >> 4}:${blue >> 4}`);
      histogram[((red >> 6) << 4) | ((green >> 6) << 2) | (blue >> 6)] += 1;
      total += 1;
    }
  }

  return {
    colorBins: colorBins.size,
    histogram: histogram.map((count) => total > 0 ? count / total : 0)
  };
}

function histogramDistance(left, right) {
  return left.reduce((distance, value, index) => distance + Math.abs(value - right[index]), 0) / 2;
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
