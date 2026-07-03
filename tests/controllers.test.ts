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

  it("uses dedicated action buttons for Puzzle Bobble and Super Pang", () => {
    expect(getControllerProfile(CATALOG.find((game) => game.id === "pbobble")!).buttons.map((button) => button.label)).toEqual([
      "발사",
      "와이어"
    ]);
    expect(getControllerProfile(CATALOG.find((game) => game.id === "spang")!).buttons.map((button) => button.label)).toEqual([
      "발사",
      "와이어"
    ]);
  });

  it("uses virtual arcade controls for the new action games", () => {
    expect(getControllerProfile(CATALOG.find((game) => game.id === "mslug")!).buttons.map((button) => button.action)).toEqual([
      "button1",
      "button2",
      "button3"
    ]);
    expect(getControllerProfile(CATALOG.find((game) => game.id === "wofj_korean_v1_20")!).buttons.map((button) => button.action)).toEqual([
      "button1",
      "button2",
      "button3"
    ]);
    expect(getControllerProfile(CATALOG.find((game) => game.id === "sf2ce")!).buttons.map((button) => button.action)).toEqual([
      "button1",
      "button2",
      "button3",
      "button4",
      "button5",
      "button6"
    ]);
  });

  it("renders a virtual-stick profile for arcade action games", () => {
    const fightingProfile = getControllerProfile(CATALOG.find((game) => game.id === "sf2ce")!);

    expect(fightingProfile.zonePlacement).toBe("virtualStick");
    expect(fightingProfile.zones.map((zone) => zone.action)).toEqual(["up", "down", "left", "right"]);
    expect(fightingProfile.buttons).toHaveLength(6);
  });

  it("shows desktop keyboard hints with assigned arcade service keys", () => {
    const puzzleProfile = getControllerProfile(CATALOG.find((game) => game.id === "sf2ce")!);

    expect(getKeyboardControlHints(puzzleProfile)).toEqual([
      { id: "move", keys: ["←", "↑", "↓", "→"], label: "이동" },
      { id: "button-1", keys: ["Q"], label: "LP" },
      { id: "button-2", keys: ["W"], label: "MP" },
      { id: "button-3", keys: ["E"], label: "HP" },
      { id: "button-4", keys: ["A"], label: "LK" },
      { id: "button-5", keys: ["S"], label: "MK" },
      { id: "button-6", keys: ["D"], label: "HK" },
      { id: "coin", keys: ["5"], label: "동전" },
      { id: "ok", keys: ["O"], label: "OK" },
      { id: "play", keys: ["Enter", "P"], label: "플레이" }
    ]);
  });
});
