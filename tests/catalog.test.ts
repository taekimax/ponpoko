import { describe, expect, it } from "vitest";
import { CATALOG, ROM_BASE_PATH, getRomPath, resolveRomPath } from "../src/catalog";

describe("static game catalog", () => {
  it("supports exactly the three local-ROM games with fixed ROM paths", () => {
    expect(ROM_BASE_PATH).toBe("/ponpoko/roms/");
    expect(CATALOG).toHaveLength(3);
    expect(CATALOG.map((game) => game.romFile)).toEqual([
      "ponpoko.zip",
      "bublbobl1.zip",
      "spangj.zip"
    ]);
  });

  it("uses the expected local ROM identifiers", () => {
    const ids = CATALOG.map((game) => game.id);

    expect(ids).toEqual(["ponpoko", "bublbobl1", "spangj"]);
  });

  it("maps every game to the Safari-compatible MAME core and a static same-origin ROM URL", () => {
    for (const game of CATALOG) {
      expect(game.core).toBe("mame2003_plus");
      expect(game.rotation).toBe(0);
      expect(getRomPath(game)).toBe(`/ponpoko/roms/${game.romFile}`);
    }
  });

  it("can resolve ROM paths against an authorized remote base URL", () => {
    expect(resolveRomPath("https://assets.example.com/arcade-roms", "ponpoko.zip")).toBe(
      "https://assets.example.com/arcade-roms/ponpoko.zip"
    );
    expect(resolveRomPath("https://assets.example.com/arcade-roms/", "spangj.zip")).toBe(
      "https://assets.example.com/arcade-roms/spangj.zip"
    );
    expect(resolveRomPath("", "ponpoko.zip")).toBe("/ponpoko/roms/ponpoko.zip");
  });
});
