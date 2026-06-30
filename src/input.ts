import type { ControlAction } from "./controllers";

interface KeyBinding {
  key: string;
  code: string;
}

interface EmulatorRuntime {
  gameManager?: {
    simulateInput?: (player: number, input: number, pressed: number) => void;
  };
}

declare global {
  interface Window {
    EJS_emulator?: EmulatorRuntime;
  }
}

const ACTION_KEYS: Record<ControlAction, KeyBinding> = {
  left: { key: "ArrowLeft", code: "ArrowLeft" },
  right: { key: "ArrowRight", code: "ArrowRight" },
  up: { key: "ArrowUp", code: "ArrowUp" },
  down: { key: "ArrowDown", code: "ArrowDown" },
  jump: { key: "a", code: "KeyA" },
  attack: { key: "s", code: "KeyS" },
  special: { key: "z", code: "KeyZ" },
  action: { key: "a", code: "KeyA" },
  rotate: { key: "a", code: "KeyA" },
  fastDrop: { key: "ArrowDown", code: "ArrowDown" },
  fire: { key: "a", code: "KeyA" },
  wire: { key: "s", code: "KeyS" },
  ok: { key: "Enter", code: "Enter" },
  back: { key: "Escape", code: "Escape" },
  start: { key: "Enter", code: "Enter" },
  coin: { key: "v", code: "KeyV" }
};

const ACTION_INPUTS: Record<ControlAction, number> = {
  left: 6,
  right: 7,
  up: 4,
  down: 5,
  jump: 0,
  attack: 1,
  special: 8,
  action: 0,
  rotate: 0,
  fastDrop: 5,
  fire: 0,
  wire: 1,
  ok: 3,
  back: 2,
  start: 3,
  coin: 2
};

export class InputManager {
  private readonly activeCounts = new Map<string, number>();
  private readonly activeInputCounts = new Map<number, number>();

  press(action: ControlAction): void {
    const binding = ACTION_KEYS[action];
    const inputId = ACTION_INPUTS[action];
    const nextCount = (this.activeCounts.get(binding.code) ?? 0) + 1;
    const nextInputCount = (this.activeInputCounts.get(inputId) ?? 0) + 1;
    this.activeCounts.set(binding.code, nextCount);
    this.activeInputCounts.set(inputId, nextInputCount);

    if (nextCount === 1) {
      this.dispatch("keydown", binding);
    }

    if (nextInputCount === 1) {
      this.simulateInput(inputId, 1);
    }
  }

  release(action: ControlAction): void {
    const binding = ACTION_KEYS[action];
    const inputId = ACTION_INPUTS[action];
    const currentCount = this.activeCounts.get(binding.code) ?? 0;
    const currentInputCount = this.activeInputCounts.get(inputId) ?? 0;

    if (currentCount <= 1) {
      this.activeCounts.delete(binding.code);
      this.dispatch("keyup", binding);
    } else {
      this.activeCounts.set(binding.code, currentCount - 1);
    }

    if (currentInputCount <= 1) {
      this.activeInputCounts.delete(inputId);
      this.simulateInput(inputId, 0);
    } else {
      this.activeInputCounts.set(inputId, currentInputCount - 1);
    }
  }

  tap(action: ControlAction, durationMs = 80): void {
    this.press(action);
    window.setTimeout(() => this.release(action), durationMs);
  }

  async tapSequence(actions: ControlAction[], durationMs = 90, gapMs = 80): Promise<void> {
    for (const action of actions) {
      this.press(action);
      await delay(durationMs);
      this.release(action);
      await delay(gapMs);
    }
  }

  releaseAll(): void {
    for (const code of [...this.activeCounts.keys()]) {
      const binding = Object.values(ACTION_KEYS).find((candidate) => candidate.code === code);
      if (binding) {
        this.dispatch("keyup", binding);
      }
    }
    this.activeCounts.clear();

    for (const inputId of [...this.activeInputCounts.keys()]) {
      this.simulateInput(inputId, 0);
    }
    this.activeInputCounts.clear();
  }

  private dispatch(type: "keydown" | "keyup", binding: KeyBinding): void {
    const event = new KeyboardEvent(type, {
      key: binding.key,
      code: binding.code,
      bubbles: true,
      cancelable: true
    });

    window.dispatchEvent(event);
    document.dispatchEvent(event);
    document.body.dispatchEvent(event);
  }

  private simulateInput(inputId: number, pressed: 0 | 1): void {
    window.EJS_emulator?.gameManager?.simulateInput?.(0, inputId, pressed);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
