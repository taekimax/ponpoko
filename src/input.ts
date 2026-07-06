import { getKeyboardActionKeys, type ControlAction, type ControllerProfile } from "./controllers";
import type { EmulatorInput, NativeEmulator } from "./native-emulator";

interface KeyboardInputBinding {
  code: string;
  input?: EmulatorInput;
  key: string;
  sequence?: EmulatorInput[];
}

const KEYBOARD_INPUTS: KeyboardInputBinding[] = [
  { code: "ArrowLeft", input: "left", key: "ArrowLeft" },
  { code: "ArrowRight", input: "right", key: "ArrowRight" },
  { code: "ArrowUp", input: "up", key: "ArrowUp" },
  { code: "ArrowDown", input: "down", key: "ArrowDown" },
  { code: "Space", input: "action1", key: " " },
  { code: "KeyZ", input: "action1", key: "z" },
  { code: "KeyQ", input: "action1", key: "q" },
  { code: "KeyW", input: "action2", key: "w" },
  { code: "KeyE", input: "action3", key: "e" },
  { code: "KeyX", input: "action2", key: "x" },
  { code: "KeyC", input: "action3", key: "c" },
  { code: "KeyA", input: "action4", key: "a" },
  { code: "KeyS", input: "action5", key: "s" },
  { code: "KeyD", input: "action6", key: "d" },
  { code: "Digit5", input: "coin", key: "5" },
  { code: "Enter", input: "start", key: "enter" },
  { code: "KeyP", input: "start", key: "p" },
  { code: "KeyO", key: "o", sequence: ["left", "right"] },
  { code: "BracketLeft", input: "special1", key: "[" },
  { code: "BracketRight", input: "special2", key: "]" },
  { code: "Backslash", input: "special3", key: "\\" }
];

const CONTROL_INPUTS: Partial<Record<ControlAction, EmulatorInput>> = {
  action: "action1",
  attack: "action2",
  back: "coin",
  button1: "action1",
  button2: "action2",
  button3: "action3",
  button4: "action4",
  button5: "action5",
  button6: "action6",
  coin: "coin",
  down: "down",
  fastDrop: "down",
  fire: "action1",
  jump: "action1",
  jumpUp: "up",
  left: "left",
  right: "right",
  rotate: "action1",
  special: "action3",
  start: "start",
  up: "up",
  wire: "action2"
};

const CONTROL_SEQUENCES: Partial<Record<ControlAction, EmulatorInput[]>> = {
  ok: ["left", "right"]
};

const SUSTAINED_INPUTS = new Set<EmulatorInput>(["left", "right"]);
const SUSTAIN_INTERVAL_MS = 120;

export class InputRouter {
  private readonly activeInputCounts = new Map<EmulatorInput, number>();
  private readonly activeKeys = new Map<string, EmulatorInput | null>();
  private readonly keyboardDisposers: Array<() => void> = [];
  private readonly sustainTimers = new Map<EmulatorInput, ReturnType<typeof setInterval>>();
  private controllerProfile: ControllerProfile | null = null;

  constructor(private readonly emulator: NativeEmulator) {}

  attachKeyboard(target: EventTarget = window): () => void {
    const keydown = (event: Event) => this.handleKeyDown(event as KeyboardEvent);
    const keyup = (event: Event) => this.handleKeyUp(event as KeyboardEvent);
    const blur = () => this.releaseAll();

    target.addEventListener("keydown", keydown);
    target.addEventListener("keyup", keyup);
    target.addEventListener("blur", blur);

    const dispose = () => {
      target.removeEventListener("keydown", keydown);
      target.removeEventListener("keyup", keyup);
      target.removeEventListener("blur", blur);
    };
    this.keyboardDisposers.push(dispose);
    return dispose;
  }

  pressControl(action: ControlAction): void {
    const input = CONTROL_INPUTS[action];
    if (input) {
      this.press(input);
      return;
    }

    const sequence = CONTROL_SEQUENCES[action];
    if (sequence) {
      void this.tapInputSequence(sequence);
    }
  }

  setControllerProfile(profile: ControllerProfile | null): void {
    if (this.controllerProfile?.id === profile?.id) {
      return;
    }

    this.releaseAll();
    this.controllerProfile = profile;
  }

  releaseControl(action: ControlAction): void {
    const input = CONTROL_INPUTS[action];
    if (input) {
      this.release(input);
    }
  }

  press(input: EmulatorInput): void {
    const nextCount = (this.activeInputCounts.get(input) ?? 0) + 1;
    this.activeInputCounts.set(input, nextCount);

    if (nextCount === 1) {
      this.emulator.press(input);
      this.startSustain(input);
    }
  }

  release(input: EmulatorInput): void {
    const currentCount = this.activeInputCounts.get(input) ?? 0;

    if (currentCount <= 1) {
      this.activeInputCounts.delete(input);
      this.stopSustain(input);
      this.emulator.release(input);
    } else {
      this.activeInputCounts.set(input, currentCount - 1);
    }
  }

  tapControl(action: ControlAction, durationMs = 80): void {
    void this.tapControlAction(action, durationMs);
  }

  async tapControlSequence(actions: ControlAction[], durationMs = 90, gapMs = 80): Promise<void> {
    for (const action of actions) {
      await this.tapControlAction(action, durationMs);
      await delay(gapMs);
    }
  }

  releaseAll(): void {
    this.activeKeys.clear();
    for (const input of [...this.activeInputCounts.keys()]) {
      this.stopSustain(input);
      this.emulator.release(input);
    }
    this.activeInputCounts.clear();
  }

  dispose(): void {
    for (const dispose of this.keyboardDisposers.splice(0)) {
      dispose();
    }
    this.releaseAll();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const binding = this.getKeyboardInput(event);
    if (!binding) {
      return;
    }

    event.preventDefault();
    const keyId = getKeyboardEventId(event);
    if (event.repeat || this.activeKeys.has(keyId)) {
      return;
    }

    this.activeKeys.set(keyId, binding.input ?? null);

    if (binding.input) {
      this.press(binding.input);
    } else if (binding.sequence) {
      void this.tapInputSequence(binding.sequence);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const keyId = getKeyboardEventId(event);
    const input = this.activeKeys.get(keyId);
    if (!this.activeKeys.has(keyId)) {
      return;
    }

    event.preventDefault();
    this.activeKeys.delete(keyId);
    if (input) {
      this.release(input);
    }
  }

  private async tapControlAction(action: ControlAction, durationMs: number): Promise<void> {
    const sequence = CONTROL_SEQUENCES[action];
    if (sequence) {
      await this.tapInputSequence(sequence, durationMs, 70);
      return;
    }

    this.pressControl(action);
    await delay(durationMs);
    this.releaseControl(action);
  }

  private getKeyboardInput(event: KeyboardEvent): KeyboardInputBinding | null {
    return this.getProfileKeyboardInput(event) ?? getDefaultKeyboardInput(event);
  }

  private getProfileKeyboardInput(event: KeyboardEvent): KeyboardInputBinding | null {
    if (!this.controllerProfile) {
      return null;
    }

    const eventKeys = getKeyboardEventKeys(event);
    const button = this.controllerProfile.buttons.find(
      (candidate) =>
        !candidate.inactive &&
        getKeyboardActionKeys(candidate.action).some((key) => eventKeys.has(key.toLowerCase()))
    );

    if (!button) {
      return null;
    }

    const input = CONTROL_INPUTS[button.action];
    const sequence = CONTROL_SEQUENCES[button.action];
    if (!input && !sequence) {
      return null;
    }

    return { code: event.code, input, key: event.key, sequence };
  }

  private async tapInputSequence(inputs: EmulatorInput[], durationMs = 80, gapMs = 70): Promise<void> {
    for (const input of inputs) {
      this.press(input);
      await delay(durationMs);
      this.release(input);
      await delay(gapMs);
    }
  }

  private startSustain(input: EmulatorInput): void {
    if (!SUSTAINED_INPUTS.has(input) || this.sustainTimers.has(input)) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      if (!this.activeInputCounts.has(input)) {
        this.stopSustain(input);
        return;
      }

      this.emulator.press(input);
    }, SUSTAIN_INTERVAL_MS);

    this.sustainTimers.set(input, timer);
  }

  private stopSustain(input: EmulatorInput): void {
    const timer = this.sustainTimers.get(input);
    if (timer === undefined) {
      return;
    }

    globalThis.clearInterval(timer);
    this.sustainTimers.delete(input);
  }
}

function getDefaultKeyboardInput(event: KeyboardEvent): KeyboardInputBinding | null {
  const code = event.code;
  const key = event.key.toLowerCase();
  const binding = KEYBOARD_INPUTS.find((candidate) => candidate.code === code || candidate.key === key);
  return binding ?? null;
}

function getKeyboardEventKeys(event: KeyboardEvent): Set<string> {
  const keys = new Set([event.key.toLowerCase(), event.code.toLowerCase()]);

  if (event.code.startsWith("Key")) {
    keys.add(event.code.slice(3).toLowerCase());
  } else if (event.code.startsWith("Digit")) {
    keys.add(event.code.slice(5));
  }

  return keys;
}

function getKeyboardEventId(event: KeyboardEvent): string {
  return event.code || event.key.toLowerCase();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}
