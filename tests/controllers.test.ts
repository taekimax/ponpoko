import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog";
import { CONTROL_PROFILES, getControllerProfile } from "../src/controllers";

describe("controller profiles", () => {
  it("defines a controller profile for every catalog game", () => {
    const profileIds = Object.keys(CONTROL_PROFILES);

    for (const game of CATALOG) {
      expect(profileIds).toContain(game.controllerProfile);
      expect(getControllerProfile(game).id).toBe(game.controllerProfile);
    }
  });

  it("keeps Ponpoko on the three-zone jump control", () => {
    const ponpoko = CATALOG.find((game) => game.id === "ponpoko");

    expect(ponpoko).toBeDefined();
    expect(ponpoko?.controllerProfile).toBe("platformJump");
    expect(getControllerProfile(ponpoko!).zones.map((zone) => zone.label)).toEqual([
      "왼쪽",
      "점프",
      "오른쪽"
    ]);
  });

  it("uses different layouts for Tetris, Pang, and beat-em-up games", () => {
    expect(getControllerProfile(CATALOG.find((game) => game.id === "atetris")!).buttons.map((button) => button.label)).toEqual([
      "회전",
      "빠른 낙하"
    ]);
    expect(getControllerProfile(CATALOG.find((game) => game.id === "pang")!).buttons.map((button) => button.label)).toEqual([
      "발사",
      "와이어"
    ]);
    expect(getControllerProfile(CATALOG.find((game) => game.id === "dino")!).buttons.map((button) => button.label)).toEqual([
      "공격",
      "점프",
      "특수"
    ]);
  });
});
