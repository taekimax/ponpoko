import { spawn } from "node:child_process";
import { webkit } from "playwright";

const port = 4177;
const configuredBaseUrl = process.env.PONPOKO_PREP_FAILURE_SMOKE_BASE_URL;
const baseUrl = configuredBaseUrl
  ? ensureTrailingSlash(configuredBaseUrl)
  : `http://127.0.0.1:${port}/ponpoko/`;
const appUrl = new URL("?bootDebug=1", baseUrl).href;

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
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
  const page = await context.newPage();

  try {
    await page.addInitScript(() => {
      window.__prepFailureSmokePatched = false;
      window.setInterval(() => {
        const gameManager = window.EJS_emulator?.gameManager;
        if (!gameManager || window.__prepFailureSmokePatched) {
          return;
        }

        if (typeof gameManager.simulateInput === "function") {
          gameManager.simulateInput = undefined;
          window.__prepFailureSmokePatched = true;
        }
      }, 20);
    });

    await page.goto(appUrl, { waitUntil: "networkidle" });
    const intro = page.getByRole("button", { name: "확인하고 시작" });
    if (await intro.count()) {
      await intro.click();
    }
    await page.locator('[data-game-id="ponpoko"]').click();
    await page.locator("canvas").first().waitFor({ timeout: 90_000 });
    await page.waitForFunction(() => window.__prepFailureSmokePatched === true, { timeout: 30_000 });
    await page.waitForFunction(() => {
      return (window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0) >= 120;
    }, { timeout: 60_000 });
    await page.waitForFunction(() => {
      const overlayVisible = Boolean(document.querySelector("[data-emulator-boot]"));
      const touchControlsEnabled = [...document.querySelectorAll("[data-touch-controls]")]
        .every((element) => element.classList.contains("is-enabled"));
      return !overlayVisible && touchControlsEnabled;
    }, { timeout: 20_000 });

    const state = await page.evaluate(() => ({
      bodyText: document.body.innerText,
      frame: window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0,
      overlayVisible: Boolean(document.querySelector("[data-emulator-boot]")),
      prepDebug: document.querySelector("[data-boot-debug]")?.textContent ?? "",
      status: document.querySelector("[data-game-status]")?.textContent ?? ""
    }));

    if (state.overlayVisible || /에뮬레이터 준비 중/.test(state.bodyText)) {
      throw new Error(`Ponpoko prep failure left boot overlay visible: ${JSON.stringify(state)}`);
    }
    if (state.status !== "플레이 중") {
      throw new Error(`Ponpoko prep failure did not enable play controls: ${JSON.stringify(state)}`);
    }

    console.log("ponpoko prep failure smoke ok: active frames no longer leave the boot overlay stuck");
  } finally {
    await context.close();
    await browser.close();
  }
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
