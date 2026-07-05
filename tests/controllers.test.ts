import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog";
import {
  CONTROL_PROFILES,
  SPECIAL_CONTROLS,
  getControllerProfile,
  getKeyboardControlHints,
  resolveDpadActions
} from "../src/controllers";

describe("controller profiles", () => {
  it("defines a controller profile for every catalog game", () => {
    const profileIds = Object.keys(CONTROL_PROFILES);

    for (const game of CATALOG) {
      expect(profileIds).toContain(game.controllerProfile);
      expect(getControllerProfile(game).id).toBe(game.controllerProfile);
    }
  });

  it("uses one universal mobile controller footprint below gameplay for every game", () => {
    for (const game of CATALOG) {
      const profile = getControllerProfile(game);

      expect(profile.zonePlacement).toBe("virtualStick");
      expect(Object.hasOwn(profile, "swipe")).toBe(false);
      expect(profile.zones.map((zone) => zone.action)).toEqual(["up", "right", "down", "left"]);
      expect(profile.buttons.map((button) => button.id)).toEqual([
        "button-1",
        "button-2",
        "button-3",
        "button-4",
        "button-5",
        "button-6"
      ]);
      expect(profile.buttons).toHaveLength(6);
    }
  });

  it("dims unused mobile action buttons while keeping six physical buttons visible", () => {
    const inactiveByGame = new Map([
      ["ponpoko", [false, true, true, true, true, true]],
      ["pbobble", [false, false, true, true, true, true]],
      ["spang", [false, false, true, true, true, true]],
      ["mslug", [false, false, false, true, true, true]],
      ["s1945", [false, false, true, true, true, true]],
      ["snes_smwk", [false, false, false, false, false, false]],
      ["sf2ce", [false, false, false, false, false, false]],
      ["wofj_korean_v1_20", [false, false, false, true, true, true]]
    ]);

    for (const game of CATALOG) {
      const profile = getControllerProfile(game);
      const inactive = profile.buttons.map((button) => Boolean((button as { inactive?: boolean }).inactive));

      expect(inactive).toEqual(inactiveByGame.get(game.id));
    }
  });

  it("enables 8-way D-pad synthesis only for games that use diagonal movement", () => {
    const modesByGame = new Map([
      ["ponpoko", "fourWay"],
      ["pbobble", "fourWay"],
      ["spang", "fourWay"],
      ["mslug", "eightWay"],
      ["s1945", "eightWay"],
      ["snes_smwk", "eightWay"],
      ["sf2ce", "eightWay"],
      ["wofj_korean_v1_20", "eightWay"]
    ]);

    for (const game of CATALOG) {
      expect(getControllerProfile(game).dpadMode).toBe(modesByGame.get(game.id));
    }
  });

  it("labels Strikers 1945 as a two-button shooter in the shared six-button footprint", () => {
    const profile = getControllerProfile(CATALOG.find((game) => game.id === "s1945")!);

    expect(profile.buttons.map((button) => button.label)).toEqual(["샷", "폭탄", "·", "·", "·", "·"]);
    expect(getKeyboardControlHints(profile)).toEqual([
      { id: "move", keys: ["←", "↑", "↓", "→"], label: "이동" },
      { id: "button-1", keys: ["Q"], label: "샷" },
      { id: "button-2", keys: ["W"], label: "폭탄" },
      { id: "coin", keys: ["5"], label: "동전" },
      { id: "ok", keys: ["O"], label: "OK" },
      { id: "play", keys: ["Enter", "P"], label: "플레이" }
    ]);
  });

  it("resolves diagonal D-pad vectors as paired cardinal presses for 8-way profiles", () => {
    expect(resolveDpadActions("eightWay", 1, -1)).toEqual(["up", "right"]);
    expect(resolveDpadActions("eightWay", 1, 1)).toEqual(["right", "down"]);
    expect(resolveDpadActions("eightWay", -1, 1)).toEqual(["down", "left"]);
    expect(resolveDpadActions("eightWay", -1, -1)).toEqual(["left", "up"]);
    expect(resolveDpadActions("eightWay", 0.02, 0.02)).toEqual([]);
  });

  it("keeps 4-way profiles locked to the nearest cardinal direction", () => {
    expect(resolveDpadActions("fourWay", 1, -1)).toEqual(["right"]);
    expect(resolveDpadActions("fourWay", -1, -1)).toEqual(["left"]);
    expect(resolveDpadActions("fourWay", 0, -1)).toEqual(["up"]);
    expect(resolveDpadActions("fourWay", 0, 1)).toEqual(["down"]);
  });

  it("keeps one always-visible mobile special key strip available for every game", () => {
    expect(SPECIAL_CONTROLS).toEqual([
      { id: "menu", label: "메뉴", type: "menu" },
      { action: "coin", id: "coin", label: "동전", type: "control" },
      { action: "start", id: "start", label: "시작", type: "control" },
      { action: "ok", id: "ok", label: "OK", type: "control" },
      { id: "save", label: "저장", type: "saveState" },
      { id: "load", label: "불러오기", type: "loadState" }
    ]);
  });

  it("labels Super Mario World with SFC buttons in the shared six-button footprint", () => {
    const profile = getControllerProfile(CATALOG.find((game) => game.id === "snes_smwk")!);

    expect(profile.buttons.map((button) => button.label)).toEqual(["B", "Y", "A", "X", "L", "R"]);
    expect(getKeyboardControlHints(profile)).toEqual([
      { id: "move", keys: ["←", "↑", "↓", "→"], label: "이동" },
      { id: "button-1", keys: ["Q"], label: "B" },
      { id: "button-2", keys: ["W"], label: "Y" },
      { id: "button-3", keys: ["E"], label: "A" },
      { id: "button-4", keys: ["A"], label: "X" },
      { id: "button-5", keys: ["S"], label: "L" },
      { id: "button-6", keys: ["D"], label: "R" },
      { id: "coin", keys: ["5"], label: "동전" },
      { id: "ok", keys: ["O"], label: "OK" },
      { id: "play", keys: ["Enter", "P"], label: "플레이" }
    ]);
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
