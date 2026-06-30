import type { ControlAction } from "./controllers";

interface KeyBinding {
  key: string;
  code: string;
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
  start: { key: "Enter", code: "Enter" },
  coin: { key: "v", code: "KeyV" }
};

export class InputManager {
  private readonly activeCounts = new Map<string, number>();

  press(action: ControlAction): void {
    const binding = ACTION_KEYS[action];
    const nextCount = (this.activeCounts.get(binding.code) ?? 0) + 1;
    this.activeCounts.set(binding.code, nextCount);

    if (nextCount === 1) {
      this.dispatch("keydown", binding);
    }
  }

  release(action: ControlAction): void {
    const binding = ACTION_KEYS[action];
    const currentCount = this.activeCounts.get(binding.code) ?? 0;

    if (currentCount <= 1) {
      this.activeCounts.delete(binding.code);
      this.dispatch("keyup", binding);
      return;
    }

    this.activeCounts.set(binding.code, currentCount - 1);
  }

  tap(action: ControlAction, durationMs = 80): void {
    this.press(action);
    window.setTimeout(() => this.release(action), durationMs);
  }

  releaseAll(): void {
    for (const code of [...this.activeCounts.keys()]) {
      const binding = Object.values(ACTION_KEYS).find((candidate) => candidate.code === code);
      if (binding) {
        this.dispatch("keyup", binding);
      }
    }
    this.activeCounts.clear();
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
}
