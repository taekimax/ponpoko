import { describe, expect, it } from "vitest";
import { BUBBLE_BOBBLE_GAME } from "../src/games/bubble-bobble";
import { SHARED_EMULATOR_CONFIG } from "../src/games/shared";

describe("Bubble Bobble game configuration", () => {
  it("uses the Bubble Bobble ROM identity, assets, and controller profile", () => {
    expect(BUBBLE_BOBBLE_GAME).toMatchObject({
      id: "bublbobl1",
      romFile: "bublbobl1.zip",
      thumbnailFile: "bubbobr1.jpg",
      controllerProfile: "platformFire"
    });
  });

  it("shares common EmulatorJS defaults without the Ponpoko start state", () => {
    expect(BUBBLE_BOBBLE_GAME.emulator).toBe(SHARED_EMULATOR_CONFIG);
    expect(BUBBLE_BOBBLE_GAME.emulator).not.toHaveProperty("loadStateUrl");
  });

  it("keeps startup assist to game start inputs only", () => {
    expect(BUBBLE_BOBBLE_GAME.startupAssist).toEqual(["coin", "start"]);
  });
});
