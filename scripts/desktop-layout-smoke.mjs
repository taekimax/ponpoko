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
  const intro = page.getByRole("button", { name: "확인하고 시작" });
  if (await intro.count()) {
    await intro.click();
  }
  await page.locator('[data-game-id="ponpoko"]').click();
  await page.locator("canvas").first().waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => (window.EJS_emulator?.gameManager?.getFrameNum?.() ?? 0) >= 120, {
    timeout: 30_000
  });

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const stage = document.querySelector(".game-stage");
    const controls = document.querySelector(".keyboard-control-panel") ?? document.querySelector(".control-panel");
    const keyboardPanel = document.querySelector(".keyboard-control-panel");
    const keyboardHint = keyboardPanel?.querySelector(".keyboard-hint");
    const keyboardKeycap = keyboardPanel?.querySelector("kbd");
    const mobilePanel = document.querySelector(".mobile-control-panel");
    const stageTouchZones = document.querySelector(".touch-zones-stage");
    const topbarKeycap = document.querySelector(".game-topbar kbd");
    const virtualArcadeControls = document.querySelector(".virtual-arcade-controls");
    const topbar = document.querySelector(".game-topbar");
    if (!canvas || !stage || !controls) {
      return null;
    }

    const isVisible = (element) => {
      if (!element) {
        return false;
      }
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const readVisibleText = (root) => {
      const parts = [];
      const visit = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent ?? "";
          if (text.trim()) {
            parts.push(text);
          }
          return;
        }
        if (!(node instanceof Element) || !isVisible(node)) {
          return;
        }
        for (const child of node.childNodes) {
          visit(child);
        }
      };
      if (root) {
        visit(root);
      }
      return parts.join("");
    };
    const canvasRect = canvas.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const keyboardHintStyle = keyboardHint ? getComputedStyle(keyboardHint) : null;
    const keyboardKeycapStyle = keyboardKeycap ? getComputedStyle(keyboardKeycap) : null;
    const topbarKeycapStyle = topbarKeycap ? getComputedStyle(topbarKeycap) : null;
    return {
      canvasHeight: canvasRect.height,
      canvasRatio: canvasRect.width / canvasRect.height,
      canvasWidth: canvasRect.width,
      desktopMedia: matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)").matches,
      expectedRatio: 288 / 224,
      keycapBoxShadow: keyboardKeycapStyle?.boxShadow ?? "missing",
      keycapHeight: keyboardKeycap ? keyboardKeycap.getBoundingClientRect().height : 0,
      keycapRadius: keyboardKeycapStyle ? Number.parseFloat(keyboardKeycapStyle.borderTopLeftRadius) : 0,
      keyboardHintBoxShadow: keyboardHintStyle?.boxShadow ?? "missing",
      keyboardHintHeight: keyboardHint ? keyboardHint.getBoundingClientRect().height : 0,
      keyboardHintRadius: keyboardHintStyle ? Number.parseFloat(keyboardHintStyle.borderTopLeftRadius) : 0,
      keyboardText: keyboardPanel?.textContent ?? "",
      keyboardVisible: isVisible(keyboardPanel),
      mobilePanelVisible: isVisible(mobilePanel),
      stageHeight: stageRect.height,
      stageRatio: stageRect.width / stageRect.height,
      stageWidth: stageRect.width,
      stageTouchZonesVisible: isVisible(stageTouchZones),
      topbarText: topbar?.textContent ?? "",
      topbarVisibleText: readVisibleText(topbar),
      topbarKeycapRadius: topbarKeycapStyle ? Number.parseFloat(topbarKeycapStyle.borderTopLeftRadius) : 0,
      controlsTop: controlsRect.top,
      virtualArcadeControlsVisible: isVisible(virtualArcadeControls),
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
  if (
    !layout.keyboardVisible ||
    layout.mobilePanelVisible ||
    layout.virtualArcadeControlsVisible ||
    layout.stageTouchZonesVisible ||
    !/이동/.test(layout.keyboardText) ||
    !/Q/.test(layout.keyboardText) ||
    !/동전/.test(layout.keyboardText) ||
    !/OK/.test(layout.keyboardText) ||
    !/Enter/.test(layout.keyboardText) ||
    !/동전5/.test(layout.topbarVisibleText.replace(/\s/g, "")) ||
    !/OKO/.test(layout.topbarVisibleText.replace(/\s/g, "")) ||
    !/플레이Enter/.test(layout.topbarVisibleText.replace(/\s/g, ""))
  ) {
    throw new Error(`Desktop Chrome did not switch from mobile controls to keyboard controls: ${JSON.stringify(layout)}`);
  }
  if (
    layout.keyboardHintHeight > 48 ||
    layout.keyboardHintRadius < 16 ||
    layout.keycapHeight < 26 ||
    layout.keycapRadius < 12 ||
    layout.topbarKeycapRadius < 12 ||
    layout.keyboardHintBoxShadow === "none" ||
    layout.keycapBoxShadow === "none"
  ) {
    throw new Error(`Desktop keyboard guide does not match liquid controller styling: ${JSON.stringify(layout)}`);
  }

  await page.setViewportSize({ width: 800, height: 800 });
  await page.waitForTimeout(200);
  const narrowDesktopTopbar = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll(".game-topbar .coin-button, .game-topbar .ok-button, .game-topbar .start-button, .game-topbar .save-button, .game-topbar .load-button")];
    const isVisible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const readVisibleText = (root) => {
      const parts = [];
      const visit = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent ?? "";
          if (text.trim()) {
            parts.push(text);
          }
          return;
        }
        if (!(node instanceof Element) || !isVisible(node)) {
          return;
        }
        for (const child of node.childNodes) {
          visit(child);
        }
      };
      if (root) {
        visit(root);
      }
      return parts.join("");
    };
    const topbar = document.querySelector(".game-topbar");

    return {
      buttonCount: buttons.length,
      buttonsVisible: buttons.every(isVisible),
      desktopMedia: matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)").matches,
      topbarText: topbar?.textContent ?? "",
      topbarVisibleText: readVisibleText(topbar),
      viewportWidth: innerWidth
    };
  });

  if (
    narrowDesktopTopbar.desktopMedia ||
    narrowDesktopTopbar.buttonCount !== 5 ||
    !narrowDesktopTopbar.buttonsVisible ||
    !/동전5/.test(narrowDesktopTopbar.topbarVisibleText.replace(/\s/g, "")) ||
    !/OKO/.test(narrowDesktopTopbar.topbarVisibleText.replace(/\s/g, "")) ||
    !/플레이Enter/.test(narrowDesktopTopbar.topbarVisibleText.replace(/\s/g, ""))
  ) {
    throw new Error(`Narrow desktop topbar service controls are not preserved: ${JSON.stringify(narrowDesktopTopbar)}`);
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
