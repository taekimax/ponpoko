import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog";

const expectedRoms = CATALOG.map((game) => game.romFile);

describe("root ROM source of truth", () => {
  it("uses the catalog ROM manifest from root roms for build-time verification", () => {
    const manifestPath = path.join(process.cwd(), "scripts/catalog-roms.mjs");
    const manifestSource = readFileSync(manifestPath, "utf8");

    for (const romFile of expectedRoms) {
      expect(manifestSource).toContain(`"${romFile}"`);
    }
  });

  it("keeps every catalog ROM in the repository root roms directory", () => {
    for (const romFile of expectedRoms) {
      const sourcePath = path.join(process.cwd(), "roms", romFile);
      const buffer = readFileSync(sourcePath);

      expect(existsSync(sourcePath), `${sourcePath} should exist`).toBe(true);
      expect(buffer.byteLength).toBeGreaterThan(1024);
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    }
  });

  it("runs root ROM copy and validation in the build and Pages workflow", () => {
    const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/deploy.yml"), "utf8");

    expect(packageJson.scripts.build).toContain("copy-root-roms-to-dist.mjs");
    expect(workflow).not.toContain("ARCADE_SAFARI_SKIP_ROMS");
    expect(workflow).toContain("npm run smoke");
  });
});
