import { shouldEnableRuntimeControls, type BootProgressSnapshot } from "./boot-progress";

type RuntimePrepFailureSnapshot = Pick<BootProgressSnapshot, "failed" | "frame" | "started">;

export function shouldEnableControlsAfterPrepFailure(snapshot: RuntimePrepFailureSnapshot): boolean {
  return !snapshot.failed && shouldEnableRuntimeControls({
    ...snapshot,
    hasCanvas: true,
    hasEmulator: true,
    hasGameManager: true,
    hasLoaderScript: true
  });
}
