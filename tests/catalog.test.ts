import { describe, expect, it } from "vitest";
import { CATALOG, ROM_BASE_PATH, getRomPath } from "../src/catalog";

describe("static game catalog", () => {
  it("supports exactly the approved 10 games with fixed ROM paths", () => {
    expect(ROM_BASE_PATH).toBe("/ponpoko/roms/");
    expect(CATALOG).toHaveLength(10);
    expect(CATALOG.map((game) => game.romFile)).toEqual([
      "ponpoko.zip",
      "bubbobr1.zip",
      "neobombe.zip",
      "atetris.zip",
      "snowbros.zip",
      "dino.zip",
      "pbobble.zip",
      "penbros.zip",
      "tnzs.zip",
      "pang.zip"
    ]);
  });

  it("excludes removed games and includes New Zealand Story and Pang", () => {
    const ids = CATALOG.map((game) => game.id);

    expect(ids).not.toContain("kovplus");
    expect(ids).not.toContain("wof");
    expect(ids).toContain("tnzs");
    expect(ids).toContain("pang");
  });

  it("maps every game to mame2003 and a static same-origin ROM URL", () => {
    for (const game of CATALOG) {
      expect(game.core).toBe("mame2003");
      expect(game.rotation).toBe(0);
      expect(getRomPath(game)).toBe(`/ponpoko/roms/${game.romFile}`);
    }
  });
});
