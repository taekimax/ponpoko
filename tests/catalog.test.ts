import { describe, expect, it } from "vitest";
import { CATALOG, ROM_BASE_PATH, getRomPath, resolveRomPath } from "../src/catalog";

describe("static game catalog", () => {
  it("supports the local-ROM games with fixed ROM paths", () => {
    expect(ROM_BASE_PATH).toBe("/ponpoko/roms/");
    expect(CATALOG).toHaveLength(7);
    expect(CATALOG.map((game) => game.romFile)).toEqual([
      "ponpoko.zip",
      "pbobble.zip",
      "spang.zip",
      "mslug.zip",
      "snes_smwk.zip",
      "sf2ce.zip",
      "wofj.zip"
    ]);
  });

  it("uses the expected local ROM identifiers", () => {
    const ids = CATALOG.map((game) => game.id);

    expect(ids).toEqual(["ponpoko", "pbobble", "spang", "mslug", "snes_smwk", "sf2ce", "wofj_korean_v1_20"]);
  });

  it("loads Super Mario World through the SNES9x core instead of the NSS MAME set", () => {
    const superMarioWorld = CATALOG.find((game) => game.id === "snes_smwk");

    expect(superMarioWorld).toMatchObject({
      controllerProfile: "sfcSixButton",
      core: "snes9x",
      romFile: "snes_smwk.zip",
      titleEn: "Super Mario World Korean"
    });
    expect(getRomPath(superMarioWorld!)).toBe(`/ponpoko/roms/snes_smwk.zip?v=${superMarioWorld?.romVersion}`);
  });

  it("loads the Korean Warriors of Fate build as the parent ROM identity", () => {
    const wofjKorean = CATALOG.find((game) => game.id === "wofj_korean_v1_20");

    expect(wofjKorean).toMatchObject({
      romFile: "wofj.zip",
      titleEn: "Warriors of Fate Korean v1.20"
    });
    expect("emulatorRomFile" in wofjKorean!).toBe(false);
    expect(getRomPath(wofjKorean!)).toBe(`/ponpoko/roms/wofj.zip?v=${wofjKorean?.romVersion}`);
  });

  it("maps every game to a Safari-compatible core and a static same-origin ROM URL", () => {
    for (const game of CATALOG) {
      expect(["mame2003_plus", "snes9x"]).toContain(game.core);
      expect(game.rotation).toBe(0);
      expect(game.romVersion).toMatch(/^[a-f0-9]{64}$/);
      expect(getRomPath(game)).toBe(`/ponpoko/roms/${game.romFile}?v=${game.romVersion}`);
    }
  });

  it("can resolve ROM paths against an authorized remote base URL", () => {
    expect(resolveRomPath("https://assets.example.com/arcade-roms", "ponpoko.zip", "abc123")).toBe(
      "https://assets.example.com/arcade-roms/ponpoko.zip?v=abc123"
    );
    expect(resolveRomPath("https://assets.example.com/arcade-roms/", "pbobble.zip")).toBe(
      "https://assets.example.com/arcade-roms/pbobble.zip"
    );
    expect(resolveRomPath("", "ponpoko.zip")).toBe("/ponpoko/roms/ponpoko.zip");
  });
});
