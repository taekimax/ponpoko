import { describe, expect, it, vi } from "vitest";
import { handleRuntimePageHide, handleRuntimePageShow, type RuntimePageLifecycleContext } from "../src/runtime-lifecycle";

describe("runtime page lifecycle", () => {
  it("pauses rather than disposes when iPhone Safari keeps the page in BFCache", () => {
    const context = createContext({ gameActive: true, runtimePlayable: true });

    handleRuntimePageHide({ persisted: true }, context);

    expect(context.saveActiveAutosave).toHaveBeenCalledTimes(1);
    expect(context.releaseAllInputs).toHaveBeenCalledTimes(1);
    expect(context.stopAutosave).toHaveBeenCalledTimes(1);
    expect(context.pauseEmulator).toHaveBeenCalledTimes(1);
    expect(context.disposeEmulator).not.toHaveBeenCalled();
    expect(context.releaseWakeLock).toHaveBeenCalledTimes(1);
    expect(context.stopStartupAssist).not.toHaveBeenCalled();
    expect(context.stopBootProgressMonitor).not.toHaveBeenCalled();
  });

  it("restarts lightweight runtime services after a BFCache restore", () => {
    const context = createContext({ gameActive: true, runtimePlayable: true });

    handleRuntimePageShow({ persisted: true }, context);

    expect(context.startEmulator).toHaveBeenCalledTimes(1);
    expect(context.requestWakeLock).toHaveBeenCalledTimes(1);
    expect(context.startAutosave).toHaveBeenCalledTimes(1);
    expect(context.suppressEmulatorChrome).toHaveBeenCalledTimes(1);
  });

  it("does not tear down a booting game when iPhone Safari enters BFCache", () => {
    const context = createContext({ gameActive: true, runtimePlayable: false });

    handleRuntimePageHide({ persisted: true }, context);

    expect(context.saveActiveAutosave).toHaveBeenCalledTimes(1);
    expect(context.releaseAllInputs).toHaveBeenCalledTimes(1);
    expect(context.stopAutosave).toHaveBeenCalledTimes(1);
    expect(context.releaseWakeLock).toHaveBeenCalledTimes(1);
    expect(context.pauseEmulator).not.toHaveBeenCalled();
    expect(context.disposeEmulator).not.toHaveBeenCalled();
    expect(context.stopStartupAssist).not.toHaveBeenCalled();
    expect(context.stopBootProgressMonitor).not.toHaveBeenCalled();
    expect(context.stopEmulatorChromeSuppression).not.toHaveBeenCalled();
  });

  it("restores wake/chrome for a booting game without forcing emulator start", () => {
    const context = createContext({ gameActive: true, runtimePlayable: false });

    handleRuntimePageShow({ persisted: true }, context);

    expect(context.requestWakeLock).toHaveBeenCalledTimes(1);
    expect(context.suppressEmulatorChrome).toHaveBeenCalledTimes(1);
    expect(context.startEmulator).not.toHaveBeenCalled();
    expect(context.startAutosave).not.toHaveBeenCalled();
  });

  it("fully disposes when the page is leaving without BFCache", () => {
    const context = createContext({ gameActive: true, runtimePlayable: true });

    handleRuntimePageHide({ persisted: false }, context);

    expect(context.pauseEmulator).not.toHaveBeenCalled();
    expect(context.disposeEmulator).toHaveBeenCalledTimes(1);
    expect(context.stopStartupAssist).toHaveBeenCalledTimes(1);
    expect(context.stopBootProgressMonitor).toHaveBeenCalledTimes(1);
    expect(context.stopEmulatorChromeSuppression).toHaveBeenCalledTimes(1);
    expect(context.stopBootDebugPanel).toHaveBeenCalledTimes(1);
    expect(context.stopManualStateStatusTimer).toHaveBeenCalledTimes(1);
  });
});

function createContext({
  gameActive,
  runtimePlayable
}: {
  gameActive: boolean;
  runtimePlayable: boolean;
}): RuntimePageLifecycleContext {
  return {
    disposeEmulator: vi.fn(),
    isGameActive: () => gameActive,
    isRuntimePlayable: () => runtimePlayable,
    pauseEmulator: vi.fn(),
    releaseAllInputs: vi.fn(),
    releaseWakeLock: vi.fn(),
    requestWakeLock: vi.fn(),
    saveActiveAutosave: vi.fn(),
    startAutosave: vi.fn(),
    startEmulator: vi.fn(),
    stopAutosave: vi.fn(),
    stopBootDebugPanel: vi.fn(),
    stopBootProgressMonitor: vi.fn(),
    stopEmulatorChromeSuppression: vi.fn(),
    stopManualStateStatusTimer: vi.fn(),
    stopStartupAssist: vi.fn(),
    suppressEmulatorChrome: vi.fn()
  };
}
