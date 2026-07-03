import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 4174;
const configuredBaseUrl = process.env.DESKTOP_SMOKE_BASE_URL;
const baseUrl = configuredBaseUrl
  ? ensureTrailingSlash(configuredBaseUrl)
  : `http://127.0.0.1:${port}/ponpoko/`;
const server = configuredBaseUrl
  ? null
  : spawn("npm", ["run", "preview", "--", "--port", String(port)], {
      stdio: ["ignore", "pipe", "pipe"]
    });

try {
  await waitForServer(baseUrl);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "확인하고 시작" }).click();
  await page.locator('[data-game-id="ponpoko"]').click();
  await page.locator("canvas").first().waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => (window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0) >= 120, {
    timeout: 30_000
  });

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const stage = document.querySelector(".game-stage");
    const controls = document.querySelector(".control-panel");
    if (!canvas || !stage || !controls) {
      return null;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    return {
      canvasHeight: canvasRect.height,
      canvasRatio: canvasRect.width / canvasRect.height,
      canvasWidth: canvasRect.width,
      desktopMedia: matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)").matches,
      expectedRatio: 288 / 224,
      stageHeight: stageRect.height,
      stageRatio: stageRect.width / stageRect.height,
      stageWidth: stageRect.width,
      controlsTop: controlsRect.top,
      viewportHeight: innerHeight,
      viewportWidth: innerWidth
    };
  });

  if (!layout) {
    throw new Error("Desktop layout smoke could not read game layout");
  }
  if (!layout.desktopMedia) {
    throw new Error(`Desktop media query did not match in Chrome: ${JSON.stringify(layout)}`);
  }
  if (
    layout.stageWidth < 620 ||
    Math.abs(layout.stageRatio - layout.expectedRatio) > 0.04 ||
    Math.abs(layout.canvasRatio - layout.expectedRatio) > 0.04 ||
    layout.controlsTop <= 0 ||
    layout.controlsTop >= layout.viewportHeight
  ) {
    throw new Error(`Desktop Chrome game layout is not expanded appropriately: ${JSON.stringify(layout)}`);
  }

  await browser.close();
  console.log(`desktop layout smoke ok: ${JSON.stringify(roundLayout(layout))}`);
} finally {
  server?.kill("SIGTERM");
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

function roundLayout(layout) {
  return Object.fromEntries(
    Object.entries(layout).map(([key, value]) => [
      key,
      typeof value === "number" ? Math.round(value * 100) / 100 : value
    ])
  );
}
