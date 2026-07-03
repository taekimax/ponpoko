import { describe, expect, it } from "vitest";
import { SUPER_PANG_GAME } from "../src/games/super-pang";
import { SHARED_EMULATOR_CONFIG } from "../src/games/shared";

describe("Pang game configuration", () => {
  it("uses the runnable Pang ROM, thumbnail, and controller profile", () => {
    expect(SUPER_PANG_GAME).toMatchObject({
      id: "pang",
      romFile: "pang.zip",
      thumbnailFile: "pang.jpg",
      controllerProfile: "puzzleShoot"
    });
  });

  it("uses shared EmulatorJS defaults without a Ponpoko start state", () => {
    expect(SUPER_PANG_GAME.emulator).toBe(SHARED_EMULATOR_CONFIG);
    expect(SUPER_PANG_GAME.emulator).not.toHaveProperty("loadStateUrl");
  });

  it("starts the game without movement startup assist inputs", () => {
    expect(SUPER_PANG_GAME.startupAssist).toEqual(["coin", "start"]);
  });
});
