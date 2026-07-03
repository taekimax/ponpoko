import { describe, expect, it, vi } from "vitest";
import { FakeNativeEmulator, type EmulatorInput } from "../src/native-emulator";
import { InputRouter } from "../src/input";

describe("InputRouter", () => {
  it("maps desktop keyboard controls to generic emulator inputs", () => {
    const emulator = new FakeNativeEmulator();
    const target = new EventTarget();
    const router = new InputRouter(emulator);
    router.attachKeyboard(target);

    const bindings: Array<[code: string, key: string, input: EmulatorInput]> = [
      ["ArrowLeft", "ArrowLeft", "left"],
      ["ArrowRight", "ArrowRight", "right"],
      ["ArrowUp", "ArrowUp", "up"],
      ["ArrowDown", "ArrowDown", "down"],
      ["Space", " ", "action1"],
      ["KeyZ", "z", "action1"],
      ["KeyX", "x", "action2"],
      ["KeyC", "c", "action3"],
      ["KeyA", "a", "action4"],
      ["KeyS", "s", "action5"],
      ["KeyD", "d", "action6"],
      ["Digit5", "5", "coin"],
      ["Enter", "Enter", "start"],
      ["KeyP", "p", "start"],
      ["BracketLeft", "[", "special1"],
      ["BracketRight", "]", "special2"],
      ["Backslash", "\\", "special3"]
    ];

    for (const [code, key] of bindings) {
      target.dispatchEvent(keyboardEvent("keydown", code, key));
      target.dispatchEvent(keyboardEvent("keyup", code, key));
    }

    expect(emulator.inputCalls).toEqual(
      bindings.flatMap(([, , input]) => [
        { input, type: "press" },
        { input, type: "release" }
      ])
    );
  });

  it("maps the OK keyboard key to the MAME warning acknowledgement sequence", async () => {
    vi.useFakeTimers();
    const emulator = new FakeNativeEmulator();
    const target = new EventTarget();
    const router = new InputRouter(emulator);
    router.attachKeyboard(target);

    target.dispatchEvent(keyboardEvent("keydown", "KeyO", "o"));
    await vi.runAllTimersAsync();
    target.dispatchEvent(keyboardEvent("keyup", "KeyO", "o"));

    expect(emulator.inputCalls).toEqual([
      { input: "left", type: "press" },
      { input: "left", type: "release" },
      { input: "right", type: "press" },
      { input: "right", type: "release" }
    ]);
    vi.useRealTimers();
  });

  it("ignores repeat keydown while a key is already active", () => {
    const emulator = new FakeNativeEmulator();
    const target = new EventTarget();
    const router = new InputRouter(emulator);
    router.attachKeyboard(target);

    target.dispatchEvent(keyboardEvent("keydown", "KeyZ", "z"));
    target.dispatchEvent(keyboardEvent("keydown", "KeyZ", "z", true));
    target.dispatchEvent(keyboardEvent("keyup", "KeyZ", "z"));

    expect(emulator.inputCalls).toEqual([
      { input: "action1", type: "press" },
      { input: "action1", type: "release" }
    ]);
  });

  it("routes keyboard and touch control actions through the same generic input", () => {
    const emulator = new FakeNativeEmulator();
    const target = new EventTarget();
    const router = new InputRouter(emulator);
    router.attachKeyboard(target);

    router.pressControl("jump");
    router.releaseControl("jump");
    target.dispatchEvent(keyboardEvent("keydown", "KeyZ", "z"));
    target.dispatchEvent(keyboardEvent("keyup", "KeyZ", "z"));

    expect(emulator.inputCalls).toEqual([
      { input: "action1", type: "press" },
      { input: "action1", type: "release" },
      { input: "action1", type: "press" },
      { input: "action1", type: "release" }
    ]);
  });

  it("releases all active inputs on blur and dispose", () => {
    const emulator = new FakeNativeEmulator();
    const target = new EventTarget();
    const router = new InputRouter(emulator);
    router.attachKeyboard(target);

    router.pressControl("left");
    router.pressControl("jump");
    target.dispatchEvent(new Event("blur"));
    router.pressControl("right");
    router.dispose();
    target.dispatchEvent(keyboardEvent("keydown", "KeyZ", "z"));

    expect(emulator.inputCalls).toEqual([
      { input: "left", type: "press" },
      { input: "action1", type: "press" },
      { input: "left", type: "release" },
      { input: "action1", type: "release" },
      { input: "right", type: "press" },
      { input: "right", type: "release" }
    ]);
    expect(emulator.getSnapshot().activeInputs).toEqual([]);
  });
});

function keyboardEvent(type: "keydown" | "keyup", code: string, key: string, repeat = false): KeyboardEvent {
  const event = new Event(type, { cancelable: true }) as KeyboardEvent;
  Object.defineProperties(event, {
    code: { value: code },
    key: { value: key },
    repeat: { value: repeat }
  });
  return event;
}
