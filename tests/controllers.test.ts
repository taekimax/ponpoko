import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog";
import { CONTROL_PROFILES, getControllerProfile, getKeyboardControlHints } from "../src/controllers";

describe("controller profiles", () => {
  it("defines a controller profile for every catalog game", () => {
    const profileIds = Object.keys(CONTROL_PROFILES);

    for (const game of CATALOG) {
      expect(profileIds).toContain(game.controllerProfile);
      expect(getControllerProfile(game).id).toBe(game.controllerProfile);
    }
  });

  it("keeps Ponpoko on the three-zone jump control with vertical swipe movement", () => {
    const ponpoko = CATALOG.find((game) => game.id === "ponpoko");
    const profile = getControllerProfile(ponpoko!);

    expect(ponpoko).toBeDefined();
    expect(ponpoko?.controllerProfile).toBe("platformJump");
    expect(profile.zonePlacement).toBe("bottom");
    expect(profile.zones.map((zone) => zone.label)).toEqual([
      "왼쪽",
      "점프",
      "오른쪽"
    ]);
    expect(profile.swipe).toEqual({
      down: "down",
      up: "up"
    });
    expect(profile.hint).toBe("좌/우 홀드 · 가운데 점프 · 위/아래 스와이프");
  });

  it("uses dedicated action buttons for Puzzle Bobble and Pang", () => {
    expect(getControllerProfile(CATALOG.find((game) => game.id === "pbobble")!).buttons.map((button) => button.label)).toEqual([
      "발사",
      "와이어"
    ]);
    expect(getControllerProfile(CATALOG.find((game) => game.id === "pang")!).buttons.map((button) => button.label)).toEqual([
      "발사",
      "와이어"
    ]);
  });

  it("shows desktop keyboard hints with assigned arcade service keys", () => {
    const puzzleProfile = getControllerProfile(CATALOG.find((game) => game.id === "pbobble")!);

    expect(getKeyboardControlHints(puzzleProfile)).toEqual([
      { id: "move", keys: ["←", "↑", "↓", "→"], label: "이동" },
      { id: "button-fire", keys: ["Space", "Z"], label: "발사" },
      { id: "button-wire", keys: ["X"], label: "와이어" },
      { id: "coin", keys: ["5"], label: "동전" },
      { id: "ok", keys: ["O"], label: "OK" },
      { id: "play", keys: ["Enter", "P"], label: "플레이" }
    ]);
  });
});
