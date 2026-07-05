import type { GameId } from "./catalog";
import type { AutosaveRecord } from "./state-storage";

export type AutosaveStartMode =
  | { kind: "new" }
  | { autosave: AutosaveRecord; kind: "autosave" };

export type AutosaveStartDecision =
  | { autosave: AutosaveRecord; kind: "prompt" }
  | { kind: "start"; mode: AutosaveStartMode };

export type LoadAutosave = (gameId: GameId) => Promise<AutosaveRecord | null>;

export async function resolveAutosaveStartDecision(
  gameId: GameId,
  loadAutosave: LoadAutosave
): Promise<AutosaveStartDecision> {
  const autosave = await loadAutosave(gameId);
  return autosave
    ? { autosave, kind: "prompt" }
    : { kind: "start", mode: { kind: "new" } };
}

export function shouldRestoreAutosave(
  mode: AutosaveStartMode
): mode is Extract<AutosaveStartMode, { kind: "autosave" }> {
  return mode.kind === "autosave";
}
