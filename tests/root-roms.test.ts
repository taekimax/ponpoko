import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog";

const expectedRoms = CATALOG.map((game) => game.romFile);

describe("root ROM files", () => {
  it("uses the catalog ROM manifest from root roms for build-time verification", () => {
    const manifestPath = path.join(process.cwd(), "scripts/catalog-roms.mjs");
    const manifestSource = readFileSync(manifestPath, "utf8");

    for (const romFile of expectedRoms) {
      expect(manifestSource).toContain(`"${romFile}"`);
    }
  });

  it("keeps parent ROM build handling available without declaring unused parent ROMs", () => {
    const manifestSource = readFileSync(path.join(process.cwd(), "scripts/catalog-roms.mjs"), "utf8");
    const copyScriptSource = readFileSync(path.join(process.cwd(), "scripts/copy-root-roms-to-dist.mjs"), "utf8");
    const prepareScriptSource = readFileSync(path.join(process.cwd(), "scripts/prepare-roms.mjs"), "utf8");

    expect(manifestSource).toContain("CATALOG_PARENT_ROMS");
    expect(manifestSource).not.toContain('"neogeo.zip"');
    expect(copyScriptSource).toContain("CATALOG_PARENT_ROMS");
    expect(copyScriptSource).toContain("distRootPath");
    expect(copyScriptSource).not.toContain("existsSync");
    expect(prepareScriptSource).toContain("CATALOG_PARENT_ROMS");
  });

  it("excludes removed games from the catalog ROM build manifest", () => {
    const manifestSource = readFileSync(path.join(process.cwd(), "scripts/catalog-roms.mjs"), "utf8");

    expect(manifestSource).not.toContain('"mslug.zip"');
    expect(manifestSource).not.toContain('"s1945.zip"');
  });

  it("matches catalog cache versions to the actual root ROM bytes", () => {
    for (const game of CATALOG) {
      const sourcePath = path.join(process.cwd(), "roms", game.romFile);
      const bytes = readFileSync(sourcePath);
      const hash = createHash("sha256").update(bytes).digest("hex");

      expect(existsSync(sourcePath), `${sourcePath} should exist`).toBe(true);
      expect(bytes.byteLength).toBeGreaterThan(1024);
      expect(bytes[0]).toBe(0x50);
      expect(bytes[1]).toBe(0x4b);
      expect(hash, game.romFile).toBe(game.romVersion);
    }
  });

  it("declares Bubble Bobble for build-time ROM copy", () => {
    const manifestSource = readFileSync(path.join(process.cwd(), "scripts/catalog-roms.mjs"), "utf8");

    expect(manifestSource).toContain('"bublbobl.zip"');
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
