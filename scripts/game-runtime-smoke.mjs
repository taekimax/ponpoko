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
const games = [
  {
    id: "pbobble",
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-zone][data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyZ", label: "fire", selector: '.control-button[data-action="fire"]' },
      { expectedInput: 1, keyboard: "KeyX", label: "wire", selector: '.control-button[data-action="wire"]' }
    ],
    minFrame: 120,
    romFile: "pbobble.zip",
    title: "퍼즐 보블",
    videoHeight: 224,
    videoWidth: 320
  },
  {
    id: "pang",
    inputChecks: [
      { expectedInput: 6, keyboard: "ArrowLeft", label: "left", selector: '[data-touch-zone][data-action="left"]' },
      { expectedInput: 0, keyboard: "KeyZ", label: "fire", selector: '.control-button[data-action="fire"]' },
      { expectedInput: 1, keyboard: "KeyX", label: "wire", selector: '.control-button[data-action="wire"]' }
    ],
    minFrame: 120,
    romFile: "pang.zip",
    title: "팡",
    videoHeight: 240,
    videoWidth: 384
  }
];

const server = configuredBaseUrl
  ? null
  : spawn("npm", ["run", "preview", "--", "--port", String(port)], {
      stdio: ["ignore", "pipe", "pipe"]
    });

try {
  await waitForServer(baseUrl);
  const targets = [
    {
      browser: await chromium.launch({ headless: true }),
      contextOptions: {
        viewport: { width: 1280, height: 800 }
      },
      inputMode: "keyboard",
      label: "desktop Chromium"
    },
    {
      browser: await webkit.launch({ headless: true }),
      contextOptions: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      },
      inputMode: "pointer",
      label: "mobile WebKit"
    }
  ];

  try {
    for (const target of targets) {
      for (const game of games) {
        await verifyGame(target, game);
      }
    }
  } finally {
    await Promise.all(targets.map((target) => target.browser.close()));
  }

  console.log("game runtime smoke ok: Puzzle Bobble and Pang boot on desktop/mobile, render frames, and accept mapped inputs");
} finally {
  server?.kill("SIGTERM");
}

async function verifyGame(target, game) {
  const expectedRomUrl = new URL(game.romFile, expectedRomBaseUrl).href;
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

    assertRuntimeState(target, game, runtimeState);

    await page.evaluate(() => {
      window.__gameSmokeInputCalls = [];
      window.__gameSmokePatchInputCapture?.();
    });
    for (const check of game.inputChecks) {
      await triggerControl(page, target, check);
      const inputCalls = await page.evaluate(() => window.__gameSmokeInputCalls ?? []);
      assertInputPair(inputCalls, check.expectedInput, `${target.label} ${game.id} ${check.label}`);
      await page.evaluate(() => {
        window.__gameSmokeInputCalls = [];
      });
    }
  } finally {
    await context.close();
  }
}

function assertRuntimeState(target, game, runtimeState) {
  if (runtimeState.core !== "mame2003_plus") {
    throw new Error(`${target.label} ${game.id} expected mame2003_plus core, got ${runtimeState.core}`);
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

function hasRetroArchMainMenu(pngBuffer) {
  const image = decodePngRgba(pngBuffer);
  const leftMenuPanelRatio = panelPixelRatio(image, 0.04, 0.33, 0.12, 0.88);
  const bodyPanelRatio = panelPixelRatio(image, 0.36, 0.96, 0.12, 0.88);

  return leftMenuPanelRatio > 0.75 && bodyPanelRatio > 0.75;
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
