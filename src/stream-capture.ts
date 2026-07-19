export const STREAM_CAPTURE_WIDTH = 512;
export const STREAM_CAPTURE_HEIGHT = 448;
export const STREAM_CAPTURE_FPS = 30;

const STREAM_CAPTURE_SAMPLE_WIDTH = 32;
const STREAM_CAPTURE_SAMPLE_HEIGHT = 28;

export interface StreamCaptureSource {
  canvas: HTMLCanvasElement;
  audioContext?: AudioContext;
  gainNodes?: readonly AudioNode[];
}

export type StreamCaptureSourceProvider = () => StreamCaptureSource;

export type StreamCaptureFrameReadback = "ok" | "not-ready" | "tainted" | "failed";

export interface StreamCaptureFrameSample {
  readback: StreamCaptureFrameReadback;
  pixels: Uint8ClampedArray | null;
  detail: string | null;
}

export interface StreamCaptureVideoStageSamples {
  source: StreamCaptureFrameSample;
  bridge: StreamCaptureFrameSample;
  staging: StreamCaptureFrameSample;
}

export interface StreamCaptureSnapshot {
  width: number;
  height: number;
  fps: number;
  videoTrackCount: number;
  audioTrackCount: number;
  audioContextState: AudioContextState | "unavailable";
  audioLevelRms: number;
  videoPath: "bridge";
  bridgeReady: boolean;
  bridgePlayError: string | null;
  sourceContextType: "webgl2" | "webgl" | "2d" | "unknown";
  sourcePreserveDrawingBuffer: boolean | null;
}

export interface StreamCaptureSession {
  stream: MediaStream;
  getSnapshot(): StreamCaptureSnapshot;
  sampleVideoStages(): StreamCaptureVideoStageSamples;
  resumeAudio(): Promise<boolean>;
  stop(): void;
}

interface CaptureDocument {
  body: Pick<HTMLElement, "appendChild">;
  createElement(tagName: "canvas"): HTMLCanvasElement;
  createElement(tagName: "video"): HTMLVideoElement;
}

interface StreamCaptureEnvironment {
  document: CaptureDocument;
  createMediaStream(tracks: MediaStreamTrack[]): MediaStream;
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
}

interface SourceContextSnapshot {
  type: StreamCaptureSnapshot["sourceContextType"];
  preserveDrawingBuffer: boolean | null;
}

function defaultEnvironment(): StreamCaptureEnvironment {
  return {
    document,
    createMediaStream: (tracks) => new MediaStream(tracks),
    requestAnimationFrame: (callback) => requestAnimationFrame(callback),
    cancelAnimationFrame: (handle) => cancelAnimationFrame(handle)
  };
}

function calculateRms(analyser: AnalyserNode | undefined): number {
  if (!analyser) {
    return 0;
  }

  const samples = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(samples);
  let sumOfSquares = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sumOfSquares += normalized * normalized;
  }
  return samples.length === 0 ? 0 : Math.sqrt(sumOfSquares / samples.length);
}

function probeSourceContext(canvas: HTMLCanvasElement): SourceContextSnapshot {
  try {
    // The emulator has already initialized this canvas. Asking for a different
    // context kind then returns null instead of replacing the existing context.
    const webgl2 = canvas.getContext("webgl2");
    if (webgl2) {
      return {
        type: "webgl2",
        preserveDrawingBuffer: webgl2.getContextAttributes()?.preserveDrawingBuffer ?? null
      };
    }

    const webgl = canvas.getContext("webgl");
    if (webgl) {
      return {
        type: "webgl",
        preserveDrawingBuffer: webgl.getContextAttributes()?.preserveDrawingBuffer ?? null
      };
    }

    if (canvas.getContext("2d")) {
      return { type: "2d", preserveDrawingBuffer: null };
    }
  } catch {
    // Context inspection is diagnostic-only and must not prevent capture.
  }

  return { type: "unknown", preserveDrawingBuffer: null };
}

function notReadySample(detail: string): StreamCaptureFrameSample {
  return { readback: "not-ready", pixels: null, detail };
}

function errorDetail(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }
  return String(error);
}

function isSecurityError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "SecurityError";
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

export class StreamCaptureAdapter {
  private activeSession: StreamCaptureSession | undefined;

  constructor(
    private readonly getSource: StreamCaptureSourceProvider,
    private readonly environment: StreamCaptureEnvironment = defaultEnvironment()
  ) {}

  start(): StreamCaptureSession {
    this.stop();

    const source = this.getSource();
    const sourceContext = probeSourceContext(source.canvas);
    const bridgeVideo = this.environment.document.createElement("video");
    const stagingCanvas = this.environment.document.createElement("canvas");
    stagingCanvas.width = STREAM_CAPTURE_WIDTH;
    stagingCanvas.height = STREAM_CAPTURE_HEIGHT;
    for (const element of [bridgeVideo, stagingCanvas]) {
      element.setAttribute("aria-hidden", "true");
      element.setAttribute(
        "style",
        "position:fixed;left:0;top:0;width:1px;height:1px;pointer-events:none;z-index:2147483646"
      );
    }
    bridgeVideo.muted = true;
    bridgeVideo.autoplay = true;
    bridgeVideo.playsInline = true;

    const audioContext = source.audioContext;
    const gainNodes = source.gainNodes ?? [];
    let stopped = false;
    let animationFrame: number | undefined;
    let analyser: AnalyserNode | undefined;
    let destination: MediaStreamAudioDestinationNode | undefined;
    let sourceVideoTracks: MediaStreamTrack[] = [];
    let videoTracks: MediaStreamTrack[] = [];
    let audioTracks: MediaStreamTrack[] = [];
    let bridgePlayError: string | null = null;
    let bridgePlayAttempts = 0;
    let bridgePlayInFlight = false;
    let bridgePlaybackConfirmed = false;
    let bridgeRetryPending = false;
    let session: StreamCaptureSession | undefined;
    let sourceScratch: HTMLCanvasElement | undefined;
    let bridgeScratch: HTMLCanvasElement | undefined;
    let stagingScratch: HTMLCanvasElement | undefined;
    const connectedGains: AudioNode[] = [];

    const confirmBridgePlayback = (): void => {
      if (stopped) {
        return;
      }
      bridgePlaybackConfirmed = true;
      bridgePlayInFlight = false;
      bridgeRetryPending = false;
      bridgePlayError = null;
    };

    const rejectBridgePlayback = (
      error: unknown,
      attempt: number,
      sourceAtAttempt: MediaProvider | null
    ): void => {
      if (
        stopped ||
        bridgePlaybackConfirmed ||
        attempt !== bridgePlayAttempts ||
        bridgeVideo.srcObject !== sourceAtAttempt
      ) {
        return;
      }

      bridgePlayInFlight = false;
      if (isAbortError(error) && bridgePlayAttempts < 2) {
        // A source reset can abort a pending Safari play promise even though the
        // same muted MediaStream becomes playable immediately afterward. Retry
        // once, after the element has current data, instead of permanently
        // latching that transient cancellation.
        bridgePlayError = null;
        bridgeRetryPending = true;
        return;
      }
      bridgePlayError = errorDetail(error);
    };

    const attemptBridgePlayback = (): void => {
      if (
        stopped ||
        bridgePlaybackConfirmed ||
        bridgePlayInFlight ||
        bridgePlayAttempts >= 2 ||
        !bridgeVideo.srcObject ||
        bridgeVideo.readyState < (bridgePlayAttempts === 0 ? 1 : 2) ||
        (bridgePlayAttempts > 0 && !bridgeRetryPending)
      ) {
        return;
      }

      bridgeRetryPending = false;
      bridgePlayInFlight = true;
      const attempt = ++bridgePlayAttempts;
      const sourceAtAttempt = bridgeVideo.srcObject;
      try {
        void bridgeVideo.play().then(
          () => {
            if (
              !stopped &&
              attempt === bridgePlayAttempts &&
              bridgeVideo.srcObject === sourceAtAttempt
            ) {
              confirmBridgePlayback();
            }
          },
          (error: unknown) => rejectBridgePlayback(error, attempt, sourceAtAttempt)
        );
      } catch (error) {
        rejectBridgePlayback(error, attempt, sourceAtAttempt);
      }
    };

    bridgeVideo.addEventListener("playing", confirmBridgePlayback);
    bridgeVideo.addEventListener("loadedmetadata", attemptBridgePlayback);
    bridgeVideo.addEventListener("canplay", attemptBridgePlayback);

    const cleanup = (): void => {
      if (stopped) {
        return;
      }
      stopped = true;
      if (animationFrame !== undefined) {
        this.environment.cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
      }
      for (const gain of connectedGains) {
        if (analyser) {
          try {
            gain.disconnect(analyser);
          } catch {
            // The runtime may have already retired this OpenAL source.
          }
        }
      }
      if (analyser && destination) {
        try {
          analyser.disconnect(destination);
        } catch {
          // The runtime may already have torn down its audio graph.
        }
      }
      try {
        bridgeVideo.pause();
      } catch {
        // A page lifecycle handler may already have retired the element.
      }
      try {
        bridgeVideo.srcObject = null;
      } catch {
        // A page lifecycle handler may already have retired the element.
      }
      for (const track of new Set([...sourceVideoTracks, ...videoTracks, ...audioTracks])) {
        try {
          track.stop();
        } catch {
          // A peer or page lifecycle handler may already have ended the track.
        }
      }
      for (const element of [bridgeVideo, stagingCanvas]) {
        try {
          element.remove();
        } catch {
          // A page render may already have removed the capture element.
        }
      }
      if (session && this.activeSession === session) {
        this.activeSession = undefined;
      }
    };

    const createScratch = (): HTMLCanvasElement => {
      const scratch = this.environment.document.createElement("canvas");
      scratch.width = STREAM_CAPTURE_SAMPLE_WIDTH;
      scratch.height = STREAM_CAPTURE_SAMPLE_HEIGHT;
      return scratch;
    };

    const sampleStage = (
      target: CanvasImageSource,
      scratch: () => HTMLCanvasElement,
      ready: boolean,
      notReadyDetail: string
    ): StreamCaptureFrameSample => {
      if (!ready) {
        return notReadySample(notReadyDetail);
      }

      try {
        const sampleCanvas = scratch();
        const context = sampleCanvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          return { readback: "failed", pixels: null, detail: "2D readback context unavailable" };
        }
        context.drawImage(
          target,
          0,
          0,
          STREAM_CAPTURE_SAMPLE_WIDTH,
          STREAM_CAPTURE_SAMPLE_HEIGHT
        );
        const pixels = context.getImageData(
          0,
          0,
          STREAM_CAPTURE_SAMPLE_WIDTH,
          STREAM_CAPTURE_SAMPLE_HEIGHT
        ).data;
        if (pixels.length === 0) {
          return notReadySample("readback returned no pixels");
        }
        return { readback: "ok", pixels: new Uint8ClampedArray(pixels), detail: null };
      } catch (error) {
        if (isSecurityError(error)) {
          return { readback: "tainted", pixels: null, detail: errorDetail(error) };
        }
        return { readback: "failed", pixels: null, detail: errorDetail(error) };
      }
    };

    try {
      this.environment.document.body.appendChild(bridgeVideo);
      this.environment.document.body.appendChild(stagingCanvas);

      const sourceStream = source.canvas.captureStream(STREAM_CAPTURE_FPS);
      sourceVideoTracks = sourceStream.getVideoTracks();
      if (sourceVideoTracks.length === 0) {
        throw new Error("Source canvas capture produced no video track");
      }
      for (const track of sourceVideoTracks) {
        track.contentHint = "motion";
      }
      bridgeVideo.srcObject = sourceStream;
      if (bridgeVideo.readyState >= 1) {
        attemptBridgePlayback();
      }

      const context = stagingCanvas.getContext("2d", {
        alpha: false,
        willReadFrequently: true
      });
      if (!context) {
        throw new Error("Unable to create the stream capture staging canvas context");
      }
      context.imageSmoothingEnabled = false;
      context.fillStyle = "#000";
      context.fillRect(0, 0, STREAM_CAPTURE_WIDTH, STREAM_CAPTURE_HEIGHT);

      const drawFrame = (): void => {
        if (
          bridgeVideo.readyState < 2 ||
          bridgeVideo.videoWidth <= 0 ||
          bridgeVideo.videoHeight <= 0
        ) {
          return;
        }
        const scale = Math.min(
          STREAM_CAPTURE_WIDTH / bridgeVideo.videoWidth,
          STREAM_CAPTURE_HEIGHT / bridgeVideo.videoHeight
        );
        const width = bridgeVideo.videoWidth * scale;
        const height = bridgeVideo.videoHeight * scale;
        context.drawImage(
          bridgeVideo,
          (STREAM_CAPTURE_WIDTH - width) / 2,
          (STREAM_CAPTURE_HEIGHT - height) / 2,
          width,
          height
        );
      };

      const stagingStream = stagingCanvas.captureStream(STREAM_CAPTURE_FPS);
      videoTracks = stagingStream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error("Staging canvas capture produced no video track");
      }
      for (const track of videoTracks) {
        track.contentHint = "motion";
      }

      analyser =
        audioContext && gainNodes.length > 0 ? audioContext.createAnalyser() : undefined;
      destination =
        audioContext && analyser ? audioContext.createMediaStreamDestination() : undefined;
      audioTracks = destination?.stream.getAudioTracks() ?? [];
      if (analyser && destination) {
        analyser.fftSize = 256;
        for (const gain of gainNodes) {
          gain.connect(analyser);
          connectedGains.push(gain);
        }
        analyser.connect(destination);
      }
      const stream = this.environment.createMediaStream([...videoTracks, ...audioTracks]);

      let lastDrawAt = 0;
      const frameInterval = 1000 / STREAM_CAPTURE_FPS;
      const animate = (timestamp: number): void => {
        if (stopped) {
          return;
        }
        if (bridgeRetryPending && bridgeVideo.readyState >= 2) {
          attemptBridgePlayback();
        }
        if (timestamp - lastDrawAt >= frameInterval) {
          drawFrame();
          lastDrawAt = timestamp;
        }
        animationFrame = this.environment.requestAnimationFrame(animate);
      };
      animationFrame = this.environment.requestAnimationFrame(animate);

      session = {
        stream,
        getSnapshot: () => ({
          width: STREAM_CAPTURE_WIDTH,
          height: STREAM_CAPTURE_HEIGHT,
          fps: STREAM_CAPTURE_FPS,
          videoTrackCount: stream.getVideoTracks().length,
          audioTrackCount: stream.getAudioTracks().length,
          audioContextState: audioContext?.state ?? "unavailable",
          audioLevelRms: calculateRms(analyser),
          videoPath: "bridge",
          bridgeReady:
            !stopped &&
            bridgeVideo.readyState >= 2 &&
            bridgeVideo.videoWidth > 0 &&
            bridgeVideo.videoHeight > 0,
          bridgePlayError,
          sourceContextType: sourceContext.type,
          sourcePreserveDrawingBuffer: sourceContext.preserveDrawingBuffer
        }),
        sampleVideoStages: () => {
          if (stopped) {
            const stoppedSample = notReadySample("capture stopped");
            return {
              source: { ...stoppedSample },
              bridge: { ...stoppedSample },
              staging: { ...stoppedSample }
            };
          }

          return {
            source: sampleStage(
              source.canvas,
              () => (sourceScratch ??= createScratch()),
              source.canvas.width > 0 && source.canvas.height > 0,
              "source canvas has no dimensions"
            ),
            bridge: sampleStage(
              bridgeVideo,
              () => (bridgeScratch ??= createScratch()),
              bridgeVideo.readyState >= 2 &&
                bridgeVideo.videoWidth > 0 &&
                bridgeVideo.videoHeight > 0,
              "bridge video is not ready"
            ),
            staging: sampleStage(
              stagingCanvas,
              () => (stagingScratch ??= createScratch()),
              stagingCanvas.width > 0 && stagingCanvas.height > 0,
              "staging canvas has no dimensions"
            )
          };
        },
        resumeAudio: () => this.resumeSourceAudio(),
        stop: cleanup
      };
      this.activeSession = session;
      return session;
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  stop(): void {
    this.activeSession?.stop();
  }

  getSnapshot(): StreamCaptureSnapshot | null {
    return this.activeSession?.getSnapshot() ?? null;
  }

  resumeAudio(): Promise<boolean> {
    return this.resumeSourceAudio();
  }

  private async resumeSourceAudio(): Promise<boolean> {
    const audioContext = this.getSource().audioContext;
    if (!audioContext) {
      return false;
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    return audioContext.state === "running";
  }
}
