import { describe, expect, it, vi } from "vitest";
import {
  STREAM_CAPTURE_HEIGHT,
  STREAM_CAPTURE_WIDTH,
  StreamCaptureAdapter,
  type StreamCaptureFrameReadback
} from "../src/stream-capture";

function track(kind: "audio" | "video") {
  return {
    contentHint: "",
    kind,
    requestFrame: vi.fn(),
    stop: vi.fn()
  } as unknown as MediaStreamTrack;
}

function stream(tracks: MediaStreamTrack[]) {
  return {
    getAudioTracks: () => tracks.filter((item) => item.kind === "audio"),
    getVideoTracks: () => tracks.filter((item) => item.kind === "video")
  } as unknown as MediaStream;
}

type SampleMode = StreamCaptureFrameReadback | "empty" | "no-context";

function harness(options: {
  audio?: boolean;
  bridgeHeight?: number;
  bridgeReady?: boolean;
  bridgeWidth?: number;
  playError?: Error;
  playErrors?: Error[];
  playPromise?: Promise<void>;
  sampleModes?: Partial<Record<"source" | "bridge" | "staging", SampleMode>>;
  sourceContextType?: "webgl2" | "webgl" | "2d" | "unknown";
  sourceHeight?: number;
  sourcePreserveDrawingBuffer?: boolean;
  sourceWidth?: number;
  stagingContext?: boolean;
} = {}) {
  const sourceVideoTrack = track("video");
  const outputVideoTrack = track("video");
  const audioTrack = track("audio");
  const drawContext = {
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    imageSmoothingEnabled: true
  };
  const staging = {
    captureStream: vi.fn(() => stream([outputVideoTrack])),
    getContext: vi.fn(() => (options.stagingContext === false ? null : drawContext)),
    height: 0,
    remove: vi.fn(),
    setAttribute: vi.fn(),
    width: 0
  } as unknown as HTMLCanvasElement;

  const sourceContextType = options.sourceContextType ?? "webgl2";
  const sourceGlContext = {
    getContextAttributes: vi.fn(() => ({
      preserveDrawingBuffer: options.sourcePreserveDrawingBuffer ?? false
    }))
  };
  const source2dContext = {};
  const source = {
    captureStream: vi.fn(() => stream([sourceVideoTrack])),
    getContext: vi.fn((kind: string) => {
      if (kind === sourceContextType && (kind === "webgl2" || kind === "webgl")) {
        return sourceGlContext;
      }
      if (kind === "2d" && sourceContextType === "2d") {
        return source2dContext;
      }
      return null;
    }),
    height: options.sourceHeight ?? 240,
    width: options.sourceWidth ?? 320
  } as unknown as HTMLCanvasElement;

  const bridgeListeners = new Map<string, Set<() => void>>();
  const playErrors = [...(options.playErrors ?? (options.playError ? [options.playError] : []))];
  let playPromiseUsed = false;
  let bridgePaused = true;
  const bridge = {
    addEventListener: vi.fn((type: string, listener: () => void) => {
      const listeners = bridgeListeners.get(type) ?? new Set<() => void>();
      listeners.add(listener);
      bridgeListeners.set(type, listeners);
    }),
    autoplay: false,
    muted: false,
    pause: vi.fn(),
    get paused() {
      return bridgePaused;
    },
    play: vi.fn(() => {
      if (options.playPromise && !playPromiseUsed) {
        playPromiseUsed = true;
        return options.playPromise;
      }
      const error = playErrors.shift();
      if (error) {
        return Promise.reject(error);
      }
      bridgePaused = false;
      return Promise.resolve();
    }),
    playsInline: false,
    readyState: options.bridgeReady === false ? 0 : 2,
    remove: vi.fn(),
    setAttribute: vi.fn(),
    srcObject: null,
    videoHeight: options.bridgeHeight ?? 240,
    videoWidth: options.bridgeWidth ?? 320
  } as unknown as HTMLVideoElement;

  const gain = { connect: vi.fn(), disconnect: vi.fn() } as unknown as AudioNode;
  const analyser = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 4,
    getByteTimeDomainData: vi.fn((data: Uint8Array) => data.fill(192))
  } as unknown as AnalyserNode;
  const destination = { stream: stream([audioTrack]) } as MediaStreamAudioDestinationNode;
  let audioState: AudioContextState = "suspended";
  const audioContext = {
    createAnalyser: vi.fn(() => analyser),
    createMediaStreamDestination: vi.fn(() => destination),
    get state() {
      return audioState;
    },
    resume: vi.fn(async () => {
      audioState = "running";
    })
  } as unknown as AudioContext;

  const sampleOrder = ["source", "bridge", "staging"] as const;
  const scratchCanvases: HTMLCanvasElement[] = [];
  const scratchContexts: Array<{
    drawImage: ReturnType<typeof vi.fn>;
    getImageData: ReturnType<typeof vi.fn>;
  }> = [];
  const createScratch = (stage: (typeof sampleOrder)[number]): HTMLCanvasElement => {
    const mode = options.sampleModes?.[stage] ?? "ok";
    const securityError = new Error(`${stage} is tainted`);
    securityError.name = "SecurityError";
    const context = {
      drawImage: vi.fn(() => {
        if (mode === "tainted") {
          throw securityError;
        }
        if (mode === "failed") {
          throw new Error(`${stage} readback failed`);
        }
      }),
      getImageData: vi.fn(() => ({
        data:
          mode === "empty"
            ? new Uint8ClampedArray()
            : new Uint8ClampedArray(32 * 28 * 4).fill(sampleOrder.indexOf(stage) + 1)
      }))
    };
    const scratch = {
      getContext: vi.fn(() => (mode === "no-context" ? null : context)),
      height: 0,
      width: 0
    } as unknown as HTMLCanvasElement;
    scratchCanvases.push(scratch);
    scratchContexts.push(context);
    return scratch;
  };

  const frameCallbacks = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const createdStreams: MediaStreamTrack[][] = [];
  let audioEnabled = options.audio ?? false;
  let canvasCreationCount = 0;
  const environment = {
    cancelAnimationFrame: vi.fn((id: number) => frameCallbacks.delete(id)),
    createMediaStream: vi.fn((tracks: MediaStreamTrack[]) => {
      createdStreams.push(tracks);
      return stream(tracks);
    }),
    document: {
      body: { appendChild: vi.fn() },
      createElement: vi.fn((tagName: "canvas" | "video") => {
        if (tagName === "video") {
          return bridge;
        }
        canvasCreationCount += 1;
        if (canvasCreationCount === 1) {
          return staging;
        }
        return createScratch(sampleOrder[canvasCreationCount - 2]);
      }) as unknown as {
        (tagName: "canvas"): HTMLCanvasElement;
        (tagName: "video"): HTMLVideoElement;
      }
    },
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      const id = ++nextFrame;
      frameCallbacks.set(id, callback);
      return id;
    })
  };
  const adapter = new StreamCaptureAdapter(
    () => ({
      canvas: source,
      ...(audioEnabled ? { audioContext, gainNodes: [gain] } : {})
    }),
    environment
  );

  return {
    adapter,
    analyser,
    audioContext,
    audioTrack,
    bridge,
    dispatchBridgeEvent: (type: string) => {
      for (const listener of bridgeListeners.get(type) ?? []) {
        listener();
      }
    },
    createdStreams,
    destination,
    drawContext,
    enableAudio: () => {
      audioEnabled = true;
    },
    environment,
    frameCallbacks,
    gain,
    outputVideoTrack,
    scratchCanvases,
    scratchContexts,
    source,
    sourceVideoTrack,
    staging
  };
}

describe("StreamCaptureAdapter", () => {
  it("bridges direct WebGL capture into the exact 512x448 30fps software canvas", () => {
    const subject = harness({
      bridgeHeight: 240,
      bridgeWidth: 320,
      sourceContextType: "webgl2",
      sourcePreserveDrawingBuffer: false
    });
    const session = subject.adapter.start();

    expect(subject.source.captureStream).toHaveBeenCalledWith(30);
    expect(subject.staging.captureStream).toHaveBeenCalledWith(30);
    expect(subject.staging).toMatchObject({
      height: STREAM_CAPTURE_HEIGHT,
      width: STREAM_CAPTURE_WIDTH
    });
    expect(subject.staging.getContext).toHaveBeenCalledWith("2d", {
      alpha: false,
      willReadFrequently: true
    });
    expect(subject.bridge).toMatchObject({
      autoplay: true,
      muted: true,
      playsInline: true,
      srcObject: expect.anything()
    });
    expect(subject.bridge.play).toHaveBeenCalledOnce();
    expect(subject.environment.document.body.appendChild).toHaveBeenCalledWith(subject.bridge);
    expect(subject.environment.document.body.appendChild).toHaveBeenCalledWith(subject.staging);
    for (const element of [subject.bridge, subject.staging]) {
      expect(element.setAttribute).toHaveBeenCalledWith("aria-hidden", "true");
      expect(element.setAttribute).toHaveBeenCalledWith(
        "style",
        expect.stringMatching(/left:0;top:0;width:1px;height:1px;pointer-events:none/)
      );
    }

    expect(subject.drawContext.fillRect).toHaveBeenCalledOnce();
    expect(subject.drawContext.fillRect).toHaveBeenCalledWith(0, 0, 512, 448);
    expect(subject.drawContext.fillStyle).toBe("#000");
    expect(subject.drawContext.imageSmoothingEnabled).toBe(false);
    expect(subject.createdStreams[0]).toEqual([subject.outputVideoTrack]);
    expect(subject.sourceVideoTrack.contentHint).toBe("motion");
    expect(subject.outputVideoTrack.contentHint).toBe("motion");

    const firstAnimationFrame = [...subject.frameCallbacks.values()][0];
    firstAnimationFrame(34);
    expect(subject.drawContext.drawImage).toHaveBeenCalledWith(
      subject.bridge,
      0,
      32,
      512,
      384
    );
    expect(subject.drawContext.fillRect).toHaveBeenCalledOnce();
    expect((subject.sourceVideoTrack as CanvasCaptureMediaStreamTrack).requestFrame).not.toHaveBeenCalled();
    expect((subject.outputVideoTrack as CanvasCaptureMediaStreamTrack).requestFrame).not.toHaveBeenCalled();
    expect(session.getSnapshot()).toMatchObject({
      audioContextState: "unavailable",
      audioTrackCount: 0,
      bridgePlayError: null,
      bridgeReady: true,
      fps: 30,
      height: 448,
      sourceContextType: "webgl2",
      sourcePreserveDrawingBuffer: false,
      videoPath: "bridge",
      videoTrackCount: 1,
      width: 512
    });
  });

  it("keeps initial black while the bridge is not ready and preserves play rejection", async () => {
    const blocked = new Error("autoplay rejected");
    blocked.name = "NotAllowedError";
    const subject = harness({
      bridgeReady: false,
      playError: blocked
    });
    const session = subject.adapter.start();

    Object.assign(subject.bridge, { readyState: 1 });
    subject.dispatchBridgeEvent("loadedmetadata");
    await Promise.resolve();
    const firstAnimationFrame = [...subject.frameCallbacks.values()][0];
    firstAnimationFrame(34);

    expect(subject.drawContext.drawImage).not.toHaveBeenCalled();
    expect(subject.drawContext.fillRect).toHaveBeenCalledOnce();
    expect(session.getSnapshot()).toMatchObject({
      bridgePlayError: "autoplay rejected",
      bridgeReady: false
    });
    expect(subject.bridge.play).toHaveBeenCalledOnce();
    expect(session.sampleVideoStages().bridge).toEqual({
      detail: "bridge video is not ready",
      pixels: null,
      readback: "not-ready"
    });
  });

  it("retries one current AbortError after bridge data is ready", async () => {
    const aborted = new Error("The operation was aborted");
    aborted.name = "AbortError";
    const subject = harness({ playErrors: [aborted] });
    const session = subject.adapter.start();

    await Promise.resolve();
    expect(subject.bridge.play).toHaveBeenCalledOnce();
    expect(session.getSnapshot().bridgePlayError).toBeNull();

    const firstAnimationFrame = [...subject.frameCallbacks.values()][0];
    firstAnimationFrame(34);
    await Promise.resolve();

    expect(subject.bridge.play).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot()).toMatchObject({
      bridgePlayError: null,
      bridgeReady: true
    });
  });

  it("ignores a late bridge rejection after the capture session is stopped", async () => {
    let rejectPlay: (reason?: unknown) => void = () => undefined;
    const pendingPlay = new Promise<void>((_resolve, reject) => {
      rejectPlay = reject;
    });
    const subject = harness({ playPromise: pendingPlay });
    const session = subject.adapter.start();

    session.stop();
    const aborted = new Error("late abort");
    aborted.name = "AbortError";
    rejectPlay(aborted);
    await Promise.resolve();

    expect(session.getSnapshot().bridgePlayError).toBeNull();
    expect(subject.adapter.getSnapshot()).toBeNull();
  });

  it("lazily samples source, bridge, and staging with independent 32x28 canvases", () => {
    const subject = harness();
    const session = subject.adapter.start();

    expect(subject.scratchCanvases).toHaveLength(0);
    const samples = session.sampleVideoStages();

    expect(subject.scratchCanvases).toHaveLength(3);
    expect(new Set(subject.scratchCanvases).size).toBe(3);
    for (const scratch of subject.scratchCanvases) {
      expect(scratch).toMatchObject({ height: 28, width: 32 });
      expect(scratch.getContext).toHaveBeenCalledWith("2d", { willReadFrequently: true });
    }
    expect(subject.scratchContexts[0].drawImage).toHaveBeenCalledWith(subject.source, 0, 0, 32, 28);
    expect(subject.scratchContexts[1].drawImage).toHaveBeenCalledWith(subject.bridge, 0, 0, 32, 28);
    expect(subject.scratchContexts[2].drawImage).toHaveBeenCalledWith(subject.staging, 0, 0, 32, 28);
    expect(samples.source).toMatchObject({ readback: "ok", detail: null });
    expect(samples.bridge).toMatchObject({ readback: "ok", detail: null });
    expect(samples.staging).toMatchObject({ readback: "ok", detail: null });
    expect(samples.source.pixels).not.toBe(samples.bridge.pixels);
    expect(samples.bridge.pixels).not.toBe(samples.staging.pixels);

    session.sampleVideoStages();
    expect(subject.scratchCanvases).toHaveLength(3);
  });

  it("classifies tainted, failed, empty, and stopped stage readbacks", () => {
    const subject = harness({
      sampleModes: { source: "tainted", bridge: "failed", staging: "empty" }
    });
    const session = subject.adapter.start();
    const samples = session.sampleVideoStages();

    expect(samples.source).toMatchObject({ readback: "tainted", pixels: null });
    expect(samples.bridge).toEqual({
      readback: "failed",
      pixels: null,
      detail: "bridge readback failed"
    });
    expect(samples.staging).toEqual({
      readback: "not-ready",
      pixels: null,
      detail: "readback returned no pixels"
    });

    session.stop();
    expect(session.sampleVideoStages()).toEqual({
      source: { readback: "not-ready", pixels: null, detail: "capture stopped" },
      bridge: { readback: "not-ready", pixels: null, detail: "capture stopped" },
      staging: { readback: "not-ready", pixels: null, detail: "capture stopped" }
    });
  });

  it("builds the owned OpenAL graph, reports RMS, and resumes a fresh source context", async () => {
    const subject = harness({ audio: true, sourceContextType: "2d" });
    const session = subject.adapter.start();

    expect(subject.gain.connect).toHaveBeenCalledWith(subject.analyser);
    expect(subject.analyser.connect).toHaveBeenCalledWith(subject.destination);
    expect(subject.createdStreams[0]).toEqual([
      subject.outputVideoTrack,
      subject.audioTrack
    ]);
    expect(session.getSnapshot()).toMatchObject({
      audioContextState: "suspended",
      audioLevelRms: 0.5,
      audioTrackCount: 1,
      sourceContextType: "2d",
      sourcePreserveDrawingBuffer: null
    });

    await expect(session.resumeAudio()).resolves.toBe(true);
    expect(subject.audioContext.resume).toHaveBeenCalledOnce();
    expect(session.getSnapshot().audioContextState).toBe("running");

    const videoSubject = harness();
    const videoSession = videoSubject.adapter.start();
    await expect(videoSession.resumeAudio()).resolves.toBe(false);
    videoSubject.enableAudio();
    await expect(videoSession.resumeAudio()).resolves.toBe(true);
    expect(videoSubject.audioContext.resume).toHaveBeenCalledOnce();
  });

  it("stops every owned bridge, track, animation, and audio edge", () => {
    const subject = harness({ audio: true });
    const session = subject.adapter.start();
    const animationFrame = [...subject.frameCallbacks.keys()][0];

    session.stop();

    expect(subject.environment.cancelAnimationFrame).toHaveBeenCalledWith(animationFrame);
    expect(subject.gain.disconnect).toHaveBeenCalledWith(subject.analyser);
    expect(subject.analyser.disconnect).toHaveBeenCalledWith(subject.destination);
    expect(subject.sourceVideoTrack.stop).toHaveBeenCalledOnce();
    expect(subject.outputVideoTrack.stop).toHaveBeenCalledOnce();
    expect(subject.audioTrack.stop).toHaveBeenCalledOnce();
    expect(subject.bridge.pause).toHaveBeenCalledOnce();
    expect(subject.bridge.srcObject).toBeNull();
    expect(subject.bridge.remove).toHaveBeenCalledOnce();
    expect(subject.staging.remove).toHaveBeenCalledOnce();
    expect(subject.adapter.getSnapshot()).toBeNull();
  });

  it("rolls back source bridge resources when staging initialization fails", () => {
    const subject = harness({ stagingContext: false });

    expect(() => subject.adapter.start()).toThrow(
      "Unable to create the stream capture staging canvas context"
    );
    expect(subject.sourceVideoTrack.stop).toHaveBeenCalledOnce();
    expect(subject.outputVideoTrack.stop).not.toHaveBeenCalled();
    expect(subject.bridge.pause).toHaveBeenCalledOnce();
    expect(subject.bridge.srcObject).toBeNull();
    expect(subject.bridge.remove).toHaveBeenCalledOnce();
    expect(subject.staging.remove).toHaveBeenCalledOnce();
    expect(subject.frameCallbacks).toHaveLength(0);
    expect(subject.environment.createMediaStream).not.toHaveBeenCalled();
    expect(subject.adapter.getSnapshot()).toBeNull();
  });

  it("rolls back both video tracks and audio resources when graph construction fails", () => {
    const subject = harness({ audio: true });
    vi.mocked(subject.analyser.connect).mockImplementationOnce(() => {
      throw new Error("audio graph construction failed");
    });

    expect(() => subject.adapter.start()).toThrow("audio graph construction failed");
    expect(subject.gain.disconnect).toHaveBeenCalledWith(subject.analyser);
    expect(subject.analyser.disconnect).toHaveBeenCalledWith(subject.destination);
    expect(subject.sourceVideoTrack.stop).toHaveBeenCalledOnce();
    expect(subject.outputVideoTrack.stop).toHaveBeenCalledOnce();
    expect(subject.audioTrack.stop).toHaveBeenCalledOnce();
    expect(subject.bridge.pause).toHaveBeenCalledOnce();
    expect(subject.bridge.srcObject).toBeNull();
    expect(subject.bridge.remove).toHaveBeenCalledOnce();
    expect(subject.staging.remove).toHaveBeenCalledOnce();
    expect(subject.frameCallbacks).toHaveLength(0);
    expect(subject.environment.createMediaStream).not.toHaveBeenCalled();
    expect(subject.adapter.getSnapshot()).toBeNull();
  });
});
