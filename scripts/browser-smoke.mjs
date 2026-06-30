import { spawn } from "node:child_process";
import { webkit } from "playwright";

const port = 4173;
const baseUrl = `http://127.0.0.1:${port}/ponpoko/`;

const server = spawn("npm", ["run", "preview", "--", "--port", String(port)], {
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

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "확인하고 시작" }).click();
  await page.locator('[data-game-id="ponpoko"]').click();
  await page.getByText(/다운로드 완료|게임 시작/).waitFor({ timeout: 45_000 });
  await page.locator("#game").waitFor({ timeout: 10_000 });
  await page.locator("canvas").first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(18_000);

  const runtimeState = await page.evaluate(() => ({
    bodyText: document.body.innerText,
    core: window.EJS_core,
    failed: window.EJS_emulator?.failedToStart,
    frame: window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0,
    gameUrl: window.EJS_gameUrl,
    paused: window.EJS_emulator?.paused,
    started: window.EJS_emulator?.started,
    videoHeight: window.EJS_emulator?.gameManager?.getVideoDimensions?.("height"),
    videoWidth: window.EJS_emulator?.gameManager?.getVideoDimensions?.("width")
  }));

  if (runtimeState.core !== "mame2003_plus") {
    throw new Error(`Expected mame2003_plus core, got ${runtimeState.core}`);
  }
  if (!runtimeState.gameUrl?.startsWith(`http://127.0.0.1:${port}/ponpoko/roms/ponpoko.zip`)) {
    throw new Error(`Expected absolute local Ponpoko ROM URL, got ${runtimeState.gameUrl}`);
  }
  if (runtimeState.failed || !runtimeState.started || runtimeState.paused) {
    throw new Error(`Emulator did not reach active play state: ${JSON.stringify(runtimeState)}`);
  }
  if (runtimeState.frame < 60 || runtimeState.videoWidth !== 288 || runtimeState.videoHeight !== 224) {
    throw new Error(`Ponpoko video did not advance as expected: ${JSON.stringify(runtimeState)}`);
  }
  if (/Failed to start game|Load Content|Main Menu/.test(runtimeState.bodyText)) {
    throw new Error(`Unexpected emulator menu/error text: ${runtimeState.bodyText}`);
  }

  await page.evaluate(() => {
    const gameManager = window.EJS_emulator?.gameManager;
    if (!gameManager?.simulateInput) {
      throw new Error("EmulatorJS simulateInput is not available");
    }
    window.__smokeInputCalls = [];
    const original = gameManager.simulateInput.bind(gameManager);
    gameManager.simulateInput = (player, input, pressed) => {
      window.__smokeInputCalls.push({ input, player, pressed });
      original(player, input, pressed);
    };
  });
  await holdControl(page, "left", 500);
  await holdControl(page, "jump", 350);

  const inputCalls = await page.evaluate(() => window.__smokeInputCalls ?? []);
  assertInputPair(inputCalls, 6, "left");
  assertInputPair(inputCalls, 0, "jump");

  await browser.close();
  console.log("browser smoke ok: WebKit Ponpoko ROM download, active mame2003_plus gameplay, and touch controls verified");
} finally {
  server.kill("SIGTERM");
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

function assertInputPair(calls, input, label) {
  const pressed = calls.some((call) => call.input === input && call.pressed === 1);
  const released = calls.some((call) => call.input === input && call.pressed === 0);
  if (!pressed || !released) {
    throw new Error(`${label} control did not send input ${input}: ${JSON.stringify(calls)}`);
  }
}
