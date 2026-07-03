import { describe, expect, it } from "vitest";
import { PUZZLE_BOBBLE_GAME } from "../src/games/puzzle-bobble";
import { SHARED_EMULATOR_CONFIG } from "../src/games/shared";

describe("Puzzle Bobble game configuration", () => {
  it("uses the runnable Puzzle Bobble ROM, thumbnail, and controller profile", () => {
    expect(PUZZLE_BOBBLE_GAME).toMatchObject({
      id: "pbobble",
      romFile: "pbobble.zip",
      thumbnailFile: "pbobble.jpg",
      controllerProfile: "puzzleShoot"
    });
  });

  it("uses shared EmulatorJS defaults without a Ponpoko start state", () => {
    expect(PUZZLE_BOBBLE_GAME.emulator).toBe(SHARED_EMULATOR_CONFIG);
    expect(PUZZLE_BOBBLE_GAME.emulator).not.toHaveProperty("loadStateUrl");
  });

  it("starts the game without movement startup assist inputs", () => {
    expect(PUZZLE_BOBBLE_GAME.startupAssist).toEqual(["coin", "start"]);
  });
});
