import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { Connect } from "vite";

export const EXTERNAL_ROM_DIR = process.env.ARCADE_SAFARI_ROM_DIR ?? "/Volumes/dev/ponpoko/roms";

const ROM_ROUTE_PREFIX = "/ponpoko/roms/";

interface HeaderResponse {
  setHeader(name: string, value: number | string | string[]): unknown;
}

export function resolveExternalRomPath(requestUrl: string, romDir = EXTERNAL_ROM_DIR): string | null {
  const url = new URL(requestUrl, "http://localhost");
  const fileName = decodeURIComponent(url.pathname).slice(ROM_ROUTE_PREFIX.length);

  if (!url.pathname.startsWith(ROM_ROUTE_PREFIX) || !isSafeRomFileName(fileName)) {
    return null;
  }

  const root = path.resolve(romDir);
  const romPath = path.resolve(root, fileName);
  if (!romPath.startsWith(`${root}${path.sep}`)) {
    return null;
  }

  return romPath;
}

export function createExternalRomMiddleware(romDir = EXTERNAL_ROM_DIR): Connect.NextHandleFunction {
  return (request, response, next) => {
    const romPath = resolveExternalRomPath(request.url ?? "", romDir);
    if (!romPath) {
      next();
      return;
    }

    applyExternalRomHeaders(response);
    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    if (!existsSync(romPath) || !statSync(romPath).isFile()) {
      response.statusCode = 404;
      response.end("ROM not found");
      return;
    }

    response.setHeader("Content-Type", "application/zip");
    response.setHeader("Cache-Control", "no-store");
    createReadStream(romPath)
      .on("error", () => {
        if (!response.headersSent) {
          response.statusCode = 500;
        }
        response.end("ROM read failed");
      })
      .pipe(response);
  };
}

export function applyExternalRomHeaders(response: HeaderResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Range");
}

function isSafeRomFileName(fileName: string): boolean {
  return (
    fileName.length > 0 &&
    fileName.endsWith(".zip") &&
    fileName === path.basename(fileName) &&
    !fileName.includes("/") &&
    !fileName.includes("\\")
  );
}
