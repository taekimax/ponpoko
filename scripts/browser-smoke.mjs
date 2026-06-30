import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 4173;
const baseUrl = `http://127.0.0.1:${port}/ponpoko/`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const server = spawn("npm", ["run", "preview", "--", "--port", String(port)], {
  stdio: ["ignore", "pipe", "pipe"]
});

try {
  await waitForServer(baseUrl);
  const launchOptions = await canAccess(chromePath)
    ? { headless: true, executablePath: chromePath }
    : { headless: true };
  const browser = await chromium.launch(launchOptions);
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

  await browser.close();
  console.log("browser smoke ok: mobile menu, runtime ROM download, EmulatorJS mount, and canvas startup verified");
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

async function canAccess(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
