import { spawn } from "node:child_process";
import { webkit } from "playwright";

const port = 4176;
const configuredBaseUrl = process.env.GAME_RUNTIME_SMOKE_BASE_URL;
const baseUrl = configuredBaseUrl
  ? ensureTrailingSlash(configuredBaseUrl)
  : `http://127.0.0.1:${port}/ponpoko/`;
const appUrl = new URL("?bootDebug=1", baseUrl).href;
const expectedRomBaseUrl = process.env.VITE_ROM_BASE_URL
  ? ensureTrailingSlash(process.env.VITE_ROM_BASE_URL)
  : new URL("roms/", baseUrl).href;
const games = [
  {
    id: "bublbobl1",
    inputChecks: [
      { expectedInput: 6, label: "left", selector: '[data-touch-zone][data-action="left"]' },
      { expectedInput: 0, label: "jump", selector: '.control-button[data-action="jump"]' },
      { expectedInput: 1, label: "attack", selector: '.control-button[data-action="attack"]' }
    ],
    minFrame: 120,
    romFile: "bublbobl1.zip",
    title: "보글보글"
  },
  {
    id: "spangj",
    inputChecks: [
      { expectedInput: 6, label: "left", selector: '[data-touch-zone][data-action="left"]' },
      { expectedInput: 0, label: "fire", selector: '.control-button[data-action="fire"]' },
      { expectedInput: 1, label: "wire", selector: '.control-button[data-action="wire"]' }
    ],
    minFrame: 120,
    romFile: "spangj.zip",
    title: "슈퍼 팡"
  }
];

const server = configuredBaseUrl
  ? null
  : spawn("npm", ["run", "preview", "--", "--port", String(port)], {
      stdio: ["ignore", "pipe", "pipe"]
    });

try {
  await waitForServer(baseUrl);
  const browser = await webkit.launch({ headless: true });

  try {
    for (const game of games) {
      await verifyGame(browser, game);
    }
  } finally {
    await browser.close();
  }

  console.log("game runtime smoke ok: Bubble Bobble and Super Pang boot, render frames, and accept mapped inputs");
} finally {
  server?.kill("SIGTERM");
}

async function verifyGame(browser, game) {
  const expectedRomUrl = new URL(game.romFile, expectedRomBaseUrl).href;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
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
      window.setInterval(() => window.__gameSmokePatchInputCapture?.(), 50);
    });

    await page.goto(appUrl, { waitUntil: "networkidle" });
    const intro = page.getByRole("button", { name: "확인하고 시작" });
    if (await intro.count()) {
      await intro.click();
    }
    await page.locator(`[data-game-id="${game.id}"]`).click();
    await page.getByText(game.title).waitFor({ timeout: 5_000 });
    await page.locator("canvas").first().waitFor({ timeout: 90_000 });
    await page.waitForFunction((minFrame) => {
      return (window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0) >= minFrame;
    }, game.minFrame, { timeout: 60_000 });
    await page.locator("[data-game-status]").getByText("플레이 중").waitFor({ timeout: 10_000 });

    const runtimeState = await page.evaluate((expectedRomUrl) => ({
      bodyText: document.body.innerText,
      core: window.EJS_core,
      configuredGameUrl: window.EJS_emulator?.config?.gameUrl,
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

    assertRuntimeState(game, runtimeState);

    await page.evaluate(() => {
      window.__gameSmokeInputCalls = [];
      window.__gameSmokePatchInputCapture?.();
    });
    for (const check of game.inputChecks) {
      await tapControl(page, check.selector);
      const inputCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
      assertInputPair(inputCalls, check.expectedInput, `${game.id} ${check.label}`);
      await page.evaluate(() => {
        window.__gameSmokeInputCalls = [];
      });
    }
  } finally {
    await context.close();
  }
}

function assertRuntimeState(game, runtimeState) {
  if (runtimeState.core !== "mame2003_plus") {
    throw new Error(`${game.id} expected mame2003_plus core, got ${runtimeState.core}`);
  }
  if (runtimeState.gameUrlKind !== "file" || runtimeState.gameUrlName !== game.romFile) {
    throw new Error(`${game.id} expected warmed File ROM ${game.romFile}, got ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.configuredGameUrl !== game.romFile) {
    throw new Error(`${game.id} expected EmulatorJS ROM filename ${game.romFile}, got ${runtimeState.configuredGameUrl}`);
  }
  if (runtimeState.loadStateUrl !== null || runtimeState.configuredLoadState !== null) {
    throw new Error(`${game.id} should not use the Ponpoko start state: ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.romRequests !== 1 || runtimeState.romFetchCalls.length !== 1) {
    throw new Error(`${game.id} expected one complete ROM fetch, got ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.romFetchCalls.some((call) => call.rangeHeader !== null)) {
    throw new Error(`${game.id} ROM fetch used range headers: ${JSON.stringify(runtimeState.romFetchCalls)}`);
  }
  if (runtimeState.failed || !runtimeState.started || runtimeState.paused) {
    throw new Error(`${game.id} did not reach active play state: ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.frame < game.minFrame || runtimeState.videoWidth !== 320 || runtimeState.videoHeight !== 240) {
    throw new Error(`${game.id} video did not advance as expected: ${JSON.stringify(runtimeState)}`);
  }
  if (/Failed to start game|Load Content|Main Menu|Restart|Save State|Load State|Context Menu|Virtual Gamepad|Click to resume Emulator|\bundefined\b/.test(runtimeState.bodyText)) {
    throw new Error(`${game.id} exposed unexpected emulator menu/error text: ${runtimeState.bodyText}`);
  }
  if (/에뮬레이터 준비 중/.test(runtimeState.bodyText)) {
    throw new Error(`${game.id} boot overlay did not clear after startup: ${runtimeState.bodyText}`);
  }
}

async function tapControl(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) {
    throw new Error(`Control was not found for selector ${selector}`);
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(120);
}

function assertInputPair(calls, input, label) {
  const pressed = calls.some((call) => call.input === input && call.pressed === 1);
  const released = calls.some((call) => call.input === input && call.pressed === 0);
  if (!pressed || !released) {
    throw new Error(`${label} control did not send input ${input}: ${JSON.stringify(calls)}`);
  }
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
