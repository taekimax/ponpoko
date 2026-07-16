import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog";
import { getEmulatorJsInputId } from "../src/emulator";
import {
  type ControlAction,
  CONTROL_PROFILES,
  SPECIAL_CONTROLS,
  getControllerProfile,
  getKeyboardActionKeys,
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
      ["pbobble", [false, true, true, true, true, true]],
      ["spang", [false, true, true, true, true, true]],
      ["bublbobl", [false, false, true, true, true, true]],
      ["mslug", [false, false, false, true, true, true]],
      ["s1945", [false, false, true, true, true, true]],
      ["snes_smwk", [false, false, false, false, false, false]],
      ["sf2ce", [false, false, false, false, false, false]],
      ["wofj_korean_v1_20", [false, false, true, true, true, true]]
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
      ["bublbobl", "fourWay"],
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

  it("matches every catalog game's onscreen buttons to labels, keys, actions, and emulator inputs", () => {
    const expectedButtonsByGame = new Map([
      ["ponpoko", [
        expectedButton("점프", "jump", false, 0),
        expectedButton("·", "button2", true, 8),
        expectedButton("·", "button3", true, 1),
        expectedButton("·", "button4", true, 9),
        expectedButton("·", "button5", true, 10),
        expectedButton("·", "button6", true, 11)
      ]],
      ["pbobble", [
        expectedButton("발사", "fire", false, 0),
        expectedButton("·", "button2", true, 8),
        expectedButton("·", "button3", true, 1),
        expectedButton("·", "button4", true, 9),
        expectedButton("·", "button5", true, 10),
        expectedButton("·", "button6", true, 11)
      ]],
      ["spang", [
        expectedButton("발사", "fire", false, 0),
        expectedButton("·", "button2", true, 8),
        expectedButton("·", "button3", true, 1),
        expectedButton("·", "button4", true, 9),
        expectedButton("·", "button5", true, 10),
        expectedButton("·", "button6", true, 11)
      ]],
      ["bublbobl", [
        expectedButton("발사", "fire", false, 0),
        expectedButton("점프", "jumpUp", false, 8),
        expectedButton("·", "button3", true, 1),
        expectedButton("·", "button4", true, 9),
        expectedButton("·", "button5", true, 10),
        expectedButton("·", "button6", true, 11)
      ]],
      ["mslug", [
        expectedButton("A", "button1", false, 0),
        expectedButton("B", "button2", false, 8),
        expectedButton("C", "button3", false, 1),
        expectedButton("·", "button4", true, 9),
        expectedButton("·", "button5", true, 10),
        expectedButton("·", "button6", true, 11)
      ]],
      ["s1945", [
        expectedButton("샷", "button1", false, 0),
        expectedButton("폭탄", "button2", false, 8),
        expectedButton("·", "button3", true, 1),
        expectedButton("·", "button4", true, 9),
        expectedButton("·", "button5", true, 10),
        expectedButton("·", "button6", true, 11)
      ]],
      ["snes_smwk", [
        expectedButton("B", "button1", false, 0),
        expectedButton("Y", "button2", false, 1),
        expectedButton("A", "button3", false, 8),
        expectedButton("X", "button4", false, 9),
        expectedButton("L", "button5", false, 10),
        expectedButton("R", "button6", false, 11)
      ]],
      ["sf2ce", [
        expectedButton("LP", "button1", false, 0),
        expectedButton("MP", "button2", false, 8),
        expectedButton("HP", "button3", false, 1),
        expectedButton("LK", "button4", false, 9),
        expectedButton("MK", "button5", false, 10),
        expectedButton("HK", "button6", false, 11)
      ]],
      ["wofj_korean_v1_20", [
        expectedButton("공격", "button1", false, 0),
        expectedButton("점프", "button2", false, 8),
        expectedButton("·", "button3", true, 1),
        expectedButton("·", "button4", true, 9),
        expectedButton("·", "button5", true, 10),
        expectedButton("·", "button6", true, 11)
      ]]
    ]);

    for (const game of CATALOG) {
      const profile = getControllerProfile(game);
      const expectedButtons = expectedButtonsByGame.get(game.id);
      const hintsById = new Map(getKeyboardControlHints(profile).map((hint) => [hint.id, hint]));

      expect(expectedButtons, game.id).toBeDefined();
      expect(profile.buttons).toHaveLength(expectedButtons!.length);

      profile.buttons.forEach((button, index) => {
        const expected = expectedButtons![index];
        expect({
          action: button.action,
          emulatorInput: getEmulatorJsInputId(button.input),
          inactive: Boolean(button.inactive),
          key: getKeyboardActionKeys(button.action)[0],
          label: button.label
        }).toEqual(expected);

        const hint = hintsById.get(button.id);
        if (expected.inactive) {
          expect(hint, `${game.id} ${button.id}`).toBeUndefined();
        } else {
          expect(hint, `${game.id} ${button.id}`).toEqual({
            id: button.id,
            keys: [expected.key],
            label: expected.label
          });
        }
      });
    }
  });

  it("labels the two-button arcade profile in the shared six-button footprint", () => {
    const profile = CONTROL_PROFILES.arcadeTwoButton;

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

  it("maps Bubble Bobble actions to bubble shot and jump inputs", () => {
    const profile = getControllerProfile(CATALOG.find((game) => game.id === "bublbobl")!);

    expect(profile.id).toBe("bubbleBobble");
    expect(profile.buttons.map((button) => ({
      action: button.action,
      inactive: Boolean((button as { inactive?: boolean }).inactive),
      label: button.label
    }))).toEqual([
      { action: "fire", inactive: false, label: "발사" },
      { action: "jumpUp", inactive: false, label: "점프" },
      { action: "button3", inactive: true, label: "·" },
      { action: "button4", inactive: true, label: "·" },
      { action: "button5", inactive: true, label: "·" },
      { action: "button6", inactive: true, label: "·" }
    ]);
    expect(getKeyboardControlHints(profile)).toEqual([
      { id: "move", keys: ["←", "↑", "↓", "→"], label: "이동" },
      { id: "button-1", keys: ["Q"], label: "발사" },
      { id: "button-2", keys: ["W"], label: "점프" },
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

  it("keeps navigation out of the mobile gamepad service strip", () => {
    expect(SPECIAL_CONTROLS).toEqual([
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

function expectedButton(
  label: string,
  action: ControlAction,
  inactive: boolean,
  emulatorInput: number
): {
  action: ControlAction;
  emulatorInput: number;
  inactive: boolean;
  key: string;
  label: string;
} {
  return {
    action,
    emulatorInput,
    inactive,
    key: getKeyboardActionKeys(action)[0],
    label
  };
}
