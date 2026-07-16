import { describe, expect, it } from "vitest";
import { CATALOG, ROM_BASE_PATH, getRomPath, resolveRomPath } from "../src/catalog";

describe("static game catalog", () => {
  it("supports the local-ROM games with fixed ROM paths", () => {
    expect(ROM_BASE_PATH).toBe("/ponpoko/roms/");
    expect(CATALOG).toHaveLength(9);
    expect(CATALOG.map((game) => game.romFile)).toEqual([
      "ponpoko.zip",
      "pbobble.zip",
      "spang.zip",
      "bublbobl.zip",
      "mslug.zip",
      "s1945.zip",
      "snes_smwk.zip",
      "sf2ce.zip",
      "wofj.zip"
    ]);
  });

  it("uses the expected local ROM identifiers", () => {
    const ids = CATALOG.map((game) => game.id);

    expect(ids).toEqual([
      "ponpoko",
      "pbobble",
      "spang",
      "bublbobl",
      "mslug",
      "s1945",
      "snes_smwk",
      "sf2ce",
      "wofj_korean_v1_20"
    ]);
  });

  it("exposes Metal Slug and Strikers 1945", () => {
    expect(CATALOG.map((game) => game.id)).toContain("mslug");
    expect(CATALOG.map((game) => game.id)).toContain("s1945");
    expect(CATALOG.map((game) => game.romFile)).toContain("s1945.zip");
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

  it("loads Bubble Bobble from the local MAME2003-plus ROM", () => {
    const bubbleBobble = CATALOG.find((game) => game.id === "bublbobl");

    expect(bubbleBobble).toMatchObject({
      controllerProfile: "bubbleBobble",
      core: "mame2003_plus",
      romFile: "bublbobl.zip",
      runtimeDebug: expect.objectContaining({
        coreDataFragment: "/emulatorjs/cores/mame2003_plus-legacy-wasm.data"
      }),
      titleEn: "Bubble Bobble"
    });
    expect(bubbleBobble?.emulator.parentRomFile).toBeUndefined();
    expect(bubbleBobble?.romVersion).toBe("c23a70a5f12e695fec513fee682441accba5ea44a811ff43289ed894ec8ce505");
    expect(getRomPath(bubbleBobble!)).toBe(
      "/ponpoko/roms/bublbobl.zip?v=c23a70a5f12e695fec513fee682441accba5ea44a811ff43289ed894ec8ce505"
    );
  });

  it("loads Metal Slug through FBNeo with the verified ROM and Neo Geo parent BIOS", () => {
    const metalSlug = CATALOG.find((game) => game.id === "mslug");

    expect(metalSlug).toMatchObject({
      controllerProfile: "arcadeThreeButton",
      core: "fbneo",
      emulator: expect.objectContaining({
        forceLegacyCores: true,
        parentRomFile: "neogeo.zip",
        parentRomVersion: "bef93f5f254f3dbcc38afe033919f4e22502beca92877fad42a10729f3de1274"
      }),
      runtimeDebug: expect.objectContaining({
        coreDataFragment: "/emulatorjs/cores/fbneo-legacy-wasm.data"
      }),
      titleEn: "Metal Slug"
    });
    expect(metalSlug?.romVersion).toBe("3ebe7ca4166f956a65ae98d86f9172f8b5d4462efa13723a5ea72fcf59adcbf8");
    expect(getRomPath(metalSlug!)).toBe(
      "/ponpoko/roms/mslug.zip?v=3ebe7ca4166f956a65ae98d86f9172f8b5d4462efa13723a5ea72fcf59adcbf8"
    );
  });

  it("loads Strikers 1945 through FBNeo as a vertical two-button shooter", () => {
    const strikers1945 = CATALOG.find((game) => game.id === "s1945");

    expect(strikers1945).toMatchObject({
      controllerProfile: "arcadeTwoButton",
      core: "fbneo",
      romFile: "s1945.zip",
      screenOrientation: "vertical",
      runtimeDebug: expect.objectContaining({
        coreDataFragment: "/emulatorjs/cores/fbneo-legacy-wasm.data"
      }),
      titleEn: "Strikers 1945"
    });
    expect(strikers1945?.emulator.parentRomFile).toBeUndefined();
    expect(strikers1945?.romVersion).toBe("b59a040b61763b5a1dc83b5e8db368cf778ddfdfd7ce593f0b1b00eb25c69f1d");
    expect(getRomPath(strikers1945!)).toBe(
      "/ponpoko/roms/s1945.zip?v=b59a040b61763b5a1dc83b5e8db368cf778ddfdfd7ce593f0b1b00eb25c69f1d"
    );
  });

  it("maps every game to a Safari-compatible core and a static same-origin ROM URL", () => {
    for (const game of CATALOG) {
      expect(["fbneo", "mame2003_plus", "snes9x"]).toContain(game.core);
      expect(game.rotation).toBe(0);
      expect(game.romVersion).toMatch(/^[a-f0-9]{64}$/);
      expect(getRomPath(game)).toBe(`/ponpoko/roms/${game.romFile}?v=${game.romVersion}`);
    }
  });

  it("does not extend mobile boot waits beyond the app-wide 150 second limit", () => {
    for (const game of CATALOG) {
      expect(game.bootTimeoutSeconds).toBeUndefined();
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
