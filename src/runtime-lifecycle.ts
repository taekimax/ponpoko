export interface RuntimePageLifecycleContext {
  disposeEmulator: () => void;
  isGameActive: () => boolean;
  isRuntimePlayable: () => boolean;
  pauseEmulator: () => void;
  releaseAllInputs: () => void;
  releaseWakeLock: () => void;
  requestWakeLock: () => void;
  saveActiveAutosave: () => void;
  startAutosave: () => void;
  startEmulator: () => void;
  stopAutosave: () => void;
  stopBootDebugPanel: () => void;
  stopBootProgressMonitor: () => void;
  stopEmulatorChromeSuppression: () => void;
  stopManualStateStatusTimer: () => void;
  stopStartupAssist: () => void;
  suppressEmulatorChrome: () => void;
}

export interface RuntimePageHideEvent {
  persisted: boolean;
}

export interface RuntimePageShowEvent {
  persisted: boolean;
}

export function handleRuntimePageHide(event: RuntimePageHideEvent, context: RuntimePageLifecycleContext): void {
  context.saveActiveAutosave();
  context.releaseAllInputs();
  context.stopAutosave();
  context.releaseWakeLock();

  if (event.persisted && context.isGameActive()) {
    if (context.isRuntimePlayable()) {
      context.pauseEmulator();
    }
    return;
  }

  context.disposeEmulator();
  context.stopStartupAssist();
  context.stopBootProgressMonitor();
  context.stopEmulatorChromeSuppression();
  context.stopBootDebugPanel();
  context.stopManualStateStatusTimer();
}

export function handleRuntimePageShow(event: RuntimePageShowEvent, context: RuntimePageLifecycleContext): void {
  if (!event.persisted || !context.isGameActive()) {
    return;
  }

  context.requestWakeLock();
  context.suppressEmulatorChrome();
  if (context.isRuntimePlayable()) {
    context.startEmulator();
    context.startAutosave();
  }
}
